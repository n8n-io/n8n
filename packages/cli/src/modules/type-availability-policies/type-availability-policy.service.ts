import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';

import { TypeAvailabilityPolicyAttachmentRepository } from './database/repositories/type-availability-policy-attachment.repository';
import { TypeAvailabilityPolicyScopeRepository } from './database/repositories/type-availability-policy-scope.repository';
import { TypeAvailabilityPolicyRepository } from './database/repositories/type-availability-policy.repository';
import type { TypeAvailabilityPolicy } from './database/entities/type-availability-policy.entity';
import type { TypeAvailabilityPolicyScope } from './database/entities/type-availability-policy-scope.entity';
import { evaluateComposedType, orderedAttachments, type ComposedVerdict } from './policy-evaluator';
import type { PolicyAction, PolicyAttachment, PolicyRule } from './policy-rule.types';
import { lintRulesForShadowing, type ShadowWarning } from './policy-shadow-lint';

/**
 * A scope that has never been written has no row. That "unconfigured" state behaves as
 * allow-all, and reports version `0` — so a first write sends `expectedVersion: 0`. There is
 * no row to lock at that point, so `createScopeOrConflict` decides which of two racing first
 * writes wins.
 */
const UNCONFIGURED_VERSION = 0;

/** One attachment slot as the API accepts it, before the scope it belongs to is known. */
export type AttachmentInput = {
	readonly policyId: string;
	readonly priority: number;
	readonly isFloor: boolean;
};

/**
 * A scope's composed effective policy: its own `defaultAction` plus every attached policy's
 * rules, flattened into the order the evaluator would apply them. `scopeId: null` means the
 * scope has never been written (allow-all, version `0`) — the caller decides whether to
 * still lazily create it, so this method never writes.
 */
export type EffectivePolicy = {
	readonly scopeId: string | null;
	readonly kind: string;
	readonly projectId: string | null;
	readonly defaultAction: PolicyAction;
	readonly version: number;
	readonly rules: readonly PolicyRule[];
	readonly attachments: readonly PolicyAttachment[];
};

/** One type's composed verdict, as `evaluateComposedTypes` reports it. */
export type ComposedTypeVerdict = ComposedVerdict & { readonly name: string };

type PolicyDocumentWrite = {
	readonly policy: TypeAvailabilityPolicy;
	readonly warnings: readonly ShadowWarning[];
};

function flattenRules(attachments: readonly PolicyAttachment[]): PolicyRule[] {
	return orderedAttachments(attachments).flatMap((attachment) => [...attachment.rules]);
}

function rulesContainDelegate(rules: readonly PolicyRule[]): boolean {
	return rules.some((rule) => rule.action === 'delegate');
}

const DELEGATE_RULE_AT_PROJECT_SCOPE = 'A rule cannot use action "delegate" at project scope';

/**
 * `delegate` is only satisfiable at instance scope. A project write never accepts it — not in
 * a rule's `action` (already rejected by `PutProjectPolicyDto`'s schema) and not in
 * `defaultAction`, which lives on the `policy_scope` row rather than in the policy document, so
 * the DTO's rule-level check does not cover it on its own. Defense in depth: a future caller
 * reaching this service directly, not only through the project controller, still can't write an
 * unsatisfiable `delegate` on a project row.
 *
 * The composed write is not the only way rules reach a project row: `replaceAttachments` and
 * `updatePolicyDocument` guard the same invariant on their own paths.
 */
function assertNoDelegateAtProjectScope(
	projectId: string | null,
	defaultAction: PolicyAction,
	rules: readonly PolicyRule[] = [],
): void {
	if (projectId === null) return;

	if (defaultAction === 'delegate') {
		throw new UserError('defaultAction cannot be "delegate" at project scope');
	}
	if (rulesContainDelegate(rules)) {
		throw new UserError(DELEGATE_RULE_AT_PROJECT_SCOPE);
	}
}

/** Mirrors the DTO-level check in `ReplaceAttachmentsDto`, as a defensive service-level guard. */
function assertNoDuplicateAttachmentSlots(attachments: readonly AttachmentInput[]): void {
	const seenPolicyIds = new Set<string>();
	const seenSlots = new Set<string>();

	for (const attachment of attachments) {
		if (seenPolicyIds.has(attachment.policyId)) {
			throw new UserError(`Duplicate policyId in attachment list: ${attachment.policyId}`);
		}
		seenPolicyIds.add(attachment.policyId);

		const slot = `${attachment.isFloor}:${attachment.priority}`;
		if (seenSlots.has(slot)) {
			throw new UserError(
				`Duplicate (isFloor, priority) pair in attachment list: isFloor=${attachment.isFloor}, priority=${attachment.priority}`,
			);
		}
		seenSlots.add(slot);
	}
}

/**
 * Service for node type availability policies. Every read and write is parameterized by
 * `(kind, projectId)`, where `projectId: null` means instance scope — so a later ticket can
 * reuse this same service for project scope without reshaping it.
 */
@Service()
export class TypeAvailabilityPolicyService {
	constructor(
		private readonly policyRepository: TypeAvailabilityPolicyRepository,
		private readonly scopeRepository: TypeAvailabilityPolicyScopeRepository,
		private readonly attachmentRepository: TypeAvailabilityPolicyAttachmentRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly eventService: EventService,
	) {}

	/**
	 * Never creates a scope row on read — an unconfigured scope reports allow-all with
	 * version `0` rather than being materialized just because someone looked at it.
	 */
	async getEffectivePolicy(
		kind: string,
		projectId: string | null,
		ctx: OperationContext = {},
	): Promise<EffectivePolicy> {
		const scope = await this.scopeRepository.findScopeByKindAndProject(kind, projectId, ctx);
		if (!scope) {
			return {
				scopeId: null,
				kind,
				projectId,
				defaultAction: 'allow',
				version: UNCONFIGURED_VERSION,
				rules: [],
				attachments: [],
			};
		}

		const attachments = await this.attachmentRepository.listAttachmentsForScope(scope.id, ctx);

		return {
			scopeId: scope.id,
			kind,
			projectId,
			defaultAction: scope.defaultAction,
			version: scope.version,
			rules: flattenRules(attachments),
			attachments,
		};
	}

	/**
	 * Sets the scope's default action, creating the scope on first write.
	 *
	 * On Postgres the scope row is locked for the duration of the transaction, so a racing
	 * writer blocks on the read until this one commits, then re-reads the bumped version and
	 * correctly fails the `expectedVersion` check — instead of both writers reading the same
	 * version and one silently overwriting the other's change. A first write has no row to
	 * lock; `createScopeOrConflict` covers that case.
	 */
	async setDefaultAction(
		kind: string,
		projectId: string | null,
		defaultAction: PolicyAction,
		expectedVersion: number,
		updatedBy: string,
	): Promise<TypeAvailabilityPolicyScope> {
		assertNoDelegateAtProjectScope(projectId, defaultAction);

		const result = await this.transactionRunner.run({}, async (ctx) => {
			const scope = await this.scopeRepository.findScopeByKindAndProject(
				kind,
				projectId,
				ctx,
				true,
			);
			const currentVersion = scope?.version ?? UNCONFIGURED_VERSION;

			if (currentVersion !== expectedVersion) {
				throw new ConflictError(
					`Policy scope has changed since it was last read (expected version ${expectedVersion}, found ${currentVersion})`,
				);
			}

			if (!scope) {
				const created = await this.createScopeOrConflict(
					{ kind, projectId, defaultAction, updatedBy },
					ctx,
				);
				return { before: null, after: created };
			}

			const before = { defaultAction: scope.defaultAction, version: scope.version };
			const after =
				(await this.scopeRepository.updateDefaultAction(scope.id, defaultAction, updatedBy, ctx)) ??
				scope;

			return { before, after };
		});

		this.eventService.emit('node-type-policy-scope-updated', {
			updatedBy,
			kind,
			projectId,
			scopeId: result.after.id,
			before: result.before,
			after: { defaultAction: result.after.defaultAction, version: result.after.version },
		});

		return result.after;
	}

	/**
	 * `FOR UPDATE` finds nothing to lock when the scope has no row yet, so two first writes
	 * can both pass the `expectedVersion: 0` check. Insert-or-ignore lets exactly one of them
	 * create the row; the other learns it lost and reports the same conflict a stale version
	 * would, instead of a raw unique-index error.
	 */
	private async createScopeOrConflict(
		input: {
			kind: string;
			projectId: string | null;
			defaultAction: PolicyAction;
			updatedBy: string;
		},
		ctx: OperationContext,
	): Promise<TypeAvailabilityPolicyScope> {
		const { scope, created } = await this.scopeRepository.createScopeIfAbsent(input, ctx);
		if (!created) {
			throw new ConflictError(
				`Policy scope was created concurrently (expected version ${UNCONFIGURED_VERSION}, found ${scope.version})`,
			);
		}

		return scope;
	}

	async createPolicyDocument(
		kind: string,
		rules: readonly PolicyRule[],
		updatedBy: string,
	): Promise<PolicyDocumentWrite> {
		const warnings = lintRulesForShadowing(rules);

		const policy = await this.policyRepository.createPolicy({ kind, rules, updatedBy }, {});

		this.eventService.emit('node-type-policy-document-created', {
			updatedBy,
			kind,
			policyId: policy.id,
			after: { rules: policy.rules, version: policy.version },
		});

		return { policy, warnings };
	}

	/**
	 * Replaces a policy document's rules, guarded by optimistic concurrency: `expectedVersion`
	 * must match the document's current version, checked and written inside one transaction
	 * that (on Postgres) holds the document's row lock (see
	 * `TypeAvailabilityPolicyRepository.findById`).
	 *
	 * Also bumps every scope this document is attached to, in the same transaction — a scope's
	 * `version` is its clients' freshness signal for the *effective* policy, and this document's
	 * rules are part of that even though the edit never touches the scope row directly. The
	 * bump is skipped when the rules did not change, matching `updateRules`' own no-op.
	 */
	async updatePolicyDocument(
		policyId: string,
		rules: readonly PolicyRule[],
		expectedVersion: number,
		updatedBy: string,
	): Promise<PolicyDocumentWrite> {
		const warnings = lintRulesForShadowing(rules);

		const result = await this.transactionRunner.run({}, async (ctx) => {
			// Scopes before the document: `setEffectivePolicy` locks its scope and then writes
			// the document, and every path must take the two in the same order or they deadlock.
			const attachedScopeIds = await this.attachmentRepository.listScopeIdsAttachedToPolicy(
				policyId,
				ctx,
			);
			const lockedScopeIds = await this.scopeRepository.lockScopesByIds(attachedScopeIds, ctx);

			// A document attached to a project scope is part of that project's policy, so the
			// same `delegate` rejection as a direct project write applies to editing it.
			if (
				rulesContainDelegate(rules) &&
				(await this.scopeRepository.containsProjectScope(lockedScopeIds, ctx))
			) {
				throw new UserError(DELEGATE_RULE_AT_PROJECT_SCOPE);
			}

			const existing = await this.policyRepository.findById(policyId, ctx, true);
			if (!existing) {
				throw new NotFoundError(`Policy document not found: ${policyId}`);
			}

			if (existing.version !== expectedVersion) {
				throw new ConflictError(
					`Policy document has changed since it was last read (expected version ${expectedVersion}, found ${existing.version})`,
				);
			}

			const updated = await this.policyRepository.updateRules(policyId, rules, updatedBy, ctx);
			// Defensive: the row was found above, and on Postgres it is locked, so it cannot be
			// gone here.
			if (!updated) {
				throw new NotFoundError(`Policy document not found: ${policyId}`);
			}

			if (updated.version !== existing.version) {
				// An attachment that committed between the scope read above and the document lock
				// belongs to a scope this transaction does not hold. Locking it now would be
				// document → scope, the order that deadlocks, so refuse and let the client retry.
				const locked = new Set(lockedScopeIds);
				const scopeIdsNow = await this.attachmentRepository.listScopeIdsAttachedToPolicy(
					policyId,
					ctx,
				);
				if (scopeIdsNow.some((id) => !locked.has(id))) {
					throw new ConflictError(
						'Policy document was attached to another scope while it was being updated',
					);
				}

				await this.scopeRepository.bumpVersions(lockedScopeIds, ctx);
			}

			return { existing, updated };
		});

		this.eventService.emit('node-type-policy-document-updated', {
			updatedBy,
			kind: result.existing.kind,
			policyId,
			before: { rules: result.existing.rules, version: result.existing.version },
			after: { rules: result.updated.rules, version: result.updated.version },
		});

		return { policy: result.updated, warnings };
	}

	/**
	 * Refuses to delete a policy that is still attached to any scope — the attachment FK is
	 * `RESTRICT`, so this checks first and reports a clean count instead of letting a raw SQL
	 * constraint violation reach the caller.
	 *
	 * The check and the delete share one transaction that (on Postgres) holds the document's
	 * row lock. An attachment insert takes a key-share lock on the document it points at, so a
	 * concurrent attach waits for this transaction rather than landing between the two.
	 */
	async deletePolicyDocument(policyId: string, updatedBy: string): Promise<void> {
		const existing = await this.transactionRunner.run({}, async (ctx) => {
			const policy = await this.policyRepository.findById(policyId, ctx, true);
			if (!policy) {
				throw new NotFoundError(`Policy document not found: ${policyId}`);
			}

			const attachedScopeIds = await this.attachmentRepository.listScopeIdsAttachedToPolicy(
				policyId,
				ctx,
			);
			if (attachedScopeIds.length > 0) {
				throw new ConflictError(
					`Cannot delete policy document: still attached to ${attachedScopeIds.length} scope(s)`,
				);
			}

			await this.policyRepository.deletePolicy(policyId, ctx);

			return policy;
		});

		this.eventService.emit('node-type-policy-document-deleted', {
			updatedBy,
			kind: existing.kind,
			policyId,
			before: { rules: existing.rules, version: existing.version },
		});
	}

	async getPolicyDocument(policyId: string): Promise<TypeAvailabilityPolicy | null> {
		return await this.policyRepository.findById(policyId, {});
	}

	async listPolicyDocuments(kind: string): Promise<TypeAvailabilityPolicy[]> {
		return await this.policyRepository.findByKind(kind, {});
	}

	/**
	 * Replaces every attachment on one scope, keyed by `scopeId` rather than `(kind,
	 * projectId)` — a caller replacing attachments already holds a scope id from a prior
	 * `getEffectivePolicy`/`setDefaultAction` call, and a scope row is shared by both instance
	 * and project scope, so this stays reusable without resolving `(kind, projectId)` again.
	 *
	 * No `expectedVersion` check: the real `ReplaceAttachmentsDto` from IAM-1328 carries no
	 * version field (unlike `PutInstancePolicyDto`), so this endpoint is last-write-wins. The
	 * write still runs in one transaction with the scope's version bump, so a concurrent
	 * reader never observes the attachments changed without the version moving.
	 *
	 * The scope is still locked up front — not for a version check, but so this path takes
	 * the scope before it touches any policy row (the attachment inserts key-share the
	 * policies), the same scope → policy order every other write path uses.
	 */
	async replaceAttachments(
		scopeId: string,
		attachments: readonly AttachmentInput[],
		updatedBy: string,
	): Promise<{ attachments: readonly PolicyAttachment[]; version: number }> {
		assertNoDuplicateAttachmentSlots(attachments);

		const result = await this.transactionRunner.run({}, async (ctx) => {
			const scope = await this.scopeRepository.findScopeById(scopeId, ctx, true);
			if (!scope) {
				throw new NotFoundError(`Policy scope not found: ${scopeId}`);
			}

			// Attaching a document to a project scope makes its rules that project's policy, so
			// a document carrying `delegate` is rejected the same way a direct project write is.
			// The documents are read under the same row lock `updatePolicyDocument` takes, so a
			// concurrent edit cannot slip a `delegate` in between this check and the attach: one
			// of the two waits, and the loser either sees the new rules here or fails that path's
			// own "attached while updating" conflict check.
			if (scope.projectId !== null && attachments.length > 0) {
				const policies = await this.policyRepository.findManyByIds(
					attachments.map((a) => a.policyId),
					ctx,
					true,
				);
				if (policies.some((policy) => rulesContainDelegate(policy.rules))) {
					throw new UserError(DELEGATE_RULE_AT_PROJECT_SCOPE);
				}
			}

			const before = await this.attachmentRepository.listAttachmentsForScope(scopeId, ctx);

			await this.attachmentRepository.replaceAttachmentsForScope(
				scopeId,
				attachments.map((a) => ({
					policyId: a.policyId,
					priority: a.priority,
					isFloor: a.isFloor,
				})),
				ctx,
			);
			await this.scopeRepository.bumpVersion(scopeId, ctx);

			const after = await this.attachmentRepository.listAttachmentsForScope(scopeId, ctx);
			const scopeAfter = await this.scopeRepository.findScopeById(scopeId, ctx);

			return {
				kind: scope.kind,
				projectId: scope.projectId,
				before,
				after,
				versionBefore: scope.version,
				versionAfter: scopeAfter?.version ?? scope.version + 1,
			};
		});

		this.eventService.emit('node-type-policy-attachments-updated', {
			updatedBy,
			kind: result.kind,
			projectId: result.projectId,
			scopeId,
			before: { attachments: result.before, version: result.versionBefore },
			after: { attachments: result.after, version: result.versionAfter },
		});

		return { attachments: result.after, version: result.versionAfter };
	}

	/**
	 * Composed write behind `PUT /instance` (and, later, its project-scope equivalent):
	 * atomically sets the scope's `defaultAction` and replaces the single rules document
	 * attached to it, lazily creating the scope and the document on first write.
	 *
	 * Not named in the parent ticket's guessed method list — added because the DTO for the
	 * composed endpoint carries one `version` for both facets, which can only be checked
	 * and written race-free inside one transaction. See the PR description for the tradeoff.
	 */
	async setEffectivePolicy(
		kind: string,
		projectId: string | null,
		input: { rules: readonly PolicyRule[]; defaultAction: PolicyAction },
		expectedVersion: number,
		updatedBy: string,
	): Promise<{
		scopeId: string;
		defaultAction: PolicyAction;
		version: number;
		rules: PolicyRule[];
		warnings: readonly ShadowWarning[];
	}> {
		assertNoDelegateAtProjectScope(projectId, input.defaultAction, input.rules);

		const warnings = lintRulesForShadowing(input.rules);

		const result = await this.transactionRunner.run({}, async (ctx) => {
			const scope = await this.scopeRepository.findScopeByKindAndProject(
				kind,
				projectId,
				ctx,
				true,
			);
			const currentVersion = scope?.version ?? UNCONFIGURED_VERSION;

			if (currentVersion !== expectedVersion) {
				throw new ConflictError(
					`Policy scope has changed since it was last read (expected version ${expectedVersion}, found ${currentVersion})`,
				);
			}

			const scopeBefore = scope
				? { defaultAction: scope.defaultAction, version: scope.version }
				: null;

			const existingAttachments = scope
				? await this.attachmentRepository.listAttachmentsForScope(scope.id, ctx)
				: [];

			// This write edits the scope's single document in place. It refuses when that would
			// reach further than the scope itself: several attachments (editing only the first
			// would silently leave the rest in force), or a document also attached elsewhere
			// (editing it would change every other scope that uses it — at project scope, that
			// would let a project admin rewrite the instance policy). Both states can only be
			// produced through the instance-only attachment management, so the same admin can
			// undo them there. Checked before any write, so a refusal leaves nothing to roll back.
			if (existingAttachments.length > 1) {
				throw new ConflictError(
					`Cannot replace the policy of a scope with ${existingAttachments.length} attached documents; manage its attachments instead`,
				);
			}

			const existingDocumentId = existingAttachments[0]?.policyId ?? null;

			// Lock the document before checking who else uses it: an attach elsewhere key-shares
			// the document row, so it waits for this transaction (or this one waits for it) and
			// the check below cannot be overtaken between reading the attachments and the edit.
			// Scope first, then document — the order every write path keeps.
			const existingDocument = existingDocumentId
				? await this.policyRepository.findById(existingDocumentId, ctx, true)
				: null;

			if (scope && existingDocumentId) {
				const attachedScopeIds = await this.attachmentRepository.listScopeIdsAttachedToPolicy(
					existingDocumentId,
					ctx,
				);
				if (attachedScopeIds.some((id) => id !== scope.id)) {
					throw new ConflictError(
						'Cannot replace a policy document that is attached to other scopes; manage its attachments instead',
					);
				}
			}

			const scopeId = scope
				? scope.id
				: (
						await this.createScopeOrConflict(
							{ kind, projectId, defaultAction: input.defaultAction, updatedBy },
							ctx,
						)
					).id;

			if (scope && scope.defaultAction !== input.defaultAction) {
				await this.scopeRepository.updateDefaultAction(
					scopeId,
					input.defaultAction,
					updatedBy,
					ctx,
				);
			}

			let documentBefore: { rules: readonly PolicyRule[]; version: number } | null = null;
			let documentAfter: { rules: readonly PolicyRule[]; version: number };
			let documentCreated: boolean;
			let policyId: string;

			if (existingDocumentId) {
				documentBefore = existingDocument
					? { rules: existingDocument.rules, version: existingDocument.version }
					: null;

				const updated = await this.policyRepository.updateRules(
					existingDocumentId,
					input.rules,
					updatedBy,
					ctx,
				);
				// The attachment's FK guarantees the policy row exists.
				if (!updated) {
					throw new NotFoundError(`Policy document not found: ${existingDocumentId}`);
				}

				documentAfter = { rules: updated.rules, version: updated.version };
				documentCreated = false;
				policyId = existingDocumentId;
			} else {
				const created = await this.policyRepository.createPolicy(
					{ kind, rules: input.rules, updatedBy },
					ctx,
				);
				documentAfter = { rules: created.rules, version: created.version };
				documentCreated = true;
				policyId = created.id;

				await this.attachmentRepository.replaceAttachmentsForScope(
					scopeId,
					[{ policyId, priority: 0, isFloor: false }],
					ctx,
				);
			}

			// This composed write always bumps the scope's freshness signal once, on top of
			// whatever `updateDefaultAction` bumped on its own — a document-only edit (no
			// `defaultAction` change) still must move the version, since it changes what the
			// scope effectively enforces.
			await this.scopeRepository.bumpVersion(scopeId, ctx);

			const scopeAfterRow = await this.scopeRepository.findScopeById(scopeId, ctx);
			const scopeAfter = {
				defaultAction: scopeAfterRow?.defaultAction ?? input.defaultAction,
				version: scopeAfterRow?.version ?? currentVersion + 1,
			};

			return {
				scopeId,
				scopeBefore,
				scopeAfter,
				documentBefore,
				documentAfter,
				documentCreated,
				policyId,
			};
		});

		this.eventService.emit('node-type-policy-scope-updated', {
			updatedBy,
			kind,
			projectId,
			scopeId: result.scopeId,
			before: result.scopeBefore,
			after: result.scopeAfter,
		});

		if (result.documentCreated) {
			this.eventService.emit('node-type-policy-document-created', {
				updatedBy,
				kind,
				policyId: result.policyId,
				after: result.documentAfter,
			});
		} else {
			this.eventService.emit('node-type-policy-document-updated', {
				updatedBy,
				kind,
				policyId: result.policyId,
				before: result.documentBefore ?? { rules: [], version: UNCONFIGURED_VERSION },
				after: result.documentAfter,
			});
		}

		return {
			scopeId: result.scopeId,
			defaultAction: result.scopeAfter.defaultAction,
			version: result.scopeAfter.version,
			rules: [...result.documentAfter.rules],
			warnings,
		};
	}

	/**
	 * Composes the instance and project verdicts for one type, per `evaluateComposedType`.
	 */
	async evaluateComposedType(
		kind: string,
		projectId: string,
		typeName: string,
	): Promise<ComposedVerdict> {
		const { instance, project } = await this.readComposedScopes(kind, projectId);

		return evaluateComposedType(instance, project, typeName);
	}

	/**
	 * Composes the verdict for many types against one project, reading each scope once and
	 * evaluating in memory. There is no materialized effective set — recomputing every loaded
	 * type against a realistic rule list is cheaper than keeping a cached one fresh.
	 */
	async evaluateComposedTypes(
		kind: string,
		projectId: string,
		typeNames: readonly string[],
	): Promise<ComposedTypeVerdict[]> {
		const { instance, project } = await this.readComposedScopes(kind, projectId);

		return typeNames.map((name) => ({
			name,
			...evaluateComposedType(instance, project, name),
		}));
	}

	/**
	 * Reads both scopes in parallel — point-in-time snapshots, not one transaction, which is
	 * fine for an evaluation path (unlike a write).
	 */
	private async readComposedScopes(
		kind: string,
		projectId: string,
	): Promise<{ instance: EffectivePolicy; project: EffectivePolicy }> {
		const [instance, project] = await Promise.all([
			this.getEffectivePolicy(kind, null),
			this.getEffectivePolicy(kind, projectId),
		]);

		return { instance, project };
	}
}
