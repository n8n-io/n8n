import { isUniqueConstraintError, TransactionRunner, type OperationContext } from '@n8n/db';
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
import { orderedAttachments } from './policy-evaluator';
import type { PolicyAction, PolicyAttachment, PolicyRule } from './policy-rule.types';
import { lintRulesForShadowing, type ShadowWarning } from './policy-shadow-lint';

/**
 * A scope that has never been written has no row. That "unconfigured" state behaves as
 * allow-all, and reports version `0` — so a first write can send `expectedVersion: 0` and
 * a racing second first-write correctly sees a mismatch once the row exists.
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

type PolicyDocumentWrite = {
	readonly policy: TypeAvailabilityPolicy;
	readonly warnings: readonly ShadowWarning[];
};

function flattenRules(attachments: readonly PolicyAttachment[]): PolicyRule[] {
	return orderedAttachments(attachments).flatMap((attachment) => [...attachment.rules]);
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
	 *
	 * The scope and its attachments are read inside one `REPEATABLE READ` transaction, so both
	 * statements see the same snapshot — otherwise a write landing between them could pair a
	 * scope's new version with its old rules (or vice versa) in the response.
	 */
	async getEffectivePolicy(
		kind: string,
		projectId: string | null,
		ctx: OperationContext = {},
	): Promise<EffectivePolicy> {
		return await this.transactionRunner.run(
			ctx,
			async (txCtx) => {
				const scope = await this.scopeRepository.findScopeByKindAndProject(kind, projectId, txCtx);
				if (!scope) {
					return {
						scopeId: null,
						kind,
						projectId,
						defaultAction: 'allow' as const,
						version: UNCONFIGURED_VERSION,
						rules: [],
						attachments: [],
					};
				}

				const attachments = await this.attachmentRepository.listAttachmentsForScope(
					scope.id,
					txCtx,
				);

				return {
					scopeId: scope.id,
					kind,
					projectId,
					defaultAction: scope.defaultAction,
					version: scope.version,
					rules: flattenRules(attachments),
					attachments,
				};
			},
			{ isolationLevel: 'REPEATABLE READ' },
		);
	}

	/**
	 * Sets the scope's default action, creating the scope on first write. The version check
	 * runs inside the same transaction as the write, so two racing first-writes can't both
	 * see "no row yet" and both succeed — the loser's `expectedVersion: 0` no longer matches.
	 *
	 * Uses the same hardening as `setEffectivePolicy`: a pessimistic-write-locked read (so a
	 * second concurrent call blocks instead of racing past the version check), and a
	 * try/catch around the first-write `createScope` that turns a unique-constraint loss
	 * into a `ConflictError` instead of a raw constraint violation.
	 */
	async setDefaultAction(
		kind: string,
		projectId: string | null,
		defaultAction: PolicyAction,
		expectedVersion: number,
		updatedBy: string,
	): Promise<TypeAvailabilityPolicyScope> {
		const result = await this.transactionRunner.run({}, async (ctx) => {
			const scope = await this.scopeRepository.findScopeByKindAndProjectForUpdate(
				kind,
				projectId,
				ctx,
			);
			const currentVersion = scope?.version ?? UNCONFIGURED_VERSION;

			if (currentVersion !== expectedVersion) {
				throw new ConflictError(
					`Policy scope has changed since it was last read (expected version ${expectedVersion}, found ${currentVersion})`,
				);
			}

			const before = scope ? { defaultAction: scope.defaultAction, version: scope.version } : null;

			let after: TypeAvailabilityPolicyScope;

			if (scope) {
				after =
					(await this.scopeRepository.updateDefaultAction(
						scope.id,
						defaultAction,
						updatedBy,
						ctx,
					)) ?? scope;
			} else {
				try {
					after = await this.scopeRepository.createScope(
						{ kind, projectId, defaultAction, updatedBy },
						ctx,
					);
				} catch (error) {
					// Two racing first-writes both saw "no row yet" and both reached the
					// insert; the loser hits the unique `(kind, projectId)` index instead of
					// the `expectedVersion` check above. Report it the same way: a conflict,
					// not a raw constraint violation.
					if (isUniqueConstraintError(error)) {
						throw new ConflictError(
							'Policy scope has changed since it was last read (concurrent first write)',
						);
					}
					throw error;
				}
			}

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
	 * Reads and writes the document inside one transaction — `updateRules` returns the
	 * pre-write row as its `before`, read under the same transaction as the write, so a
	 * concurrent edit landing between a separate "before" read and the write can no longer
	 * make the audit event's "before" stale.
	 *
	 * Also fans the version bump out to every scope this policy is attached to: a scope's
	 * effective policy is a function of its attachments' content, so a real content change
	 * here must move those scopes' `version` too, or their optimistic-concurrency check and
	 * any cache keyed on it would miss the drift.
	 *
	 * Lock-ordering convention: this method locks the attached scopes *before* calling
	 * `updateRules` (which locks the policy row), so its effective lock order is
	 * scope(s) → policy — the same order `setEffectivePolicy` follows (scope, then policy via
	 * `updateRules`). Two write paths taking opposite orders on overlapping rows can deadlock
	 * on Postgres, so any future write path touching both a scope and a policy row must
	 * follow this same scope-then-policy order.
	 *
	 * Scoped by `kind`: a policy document belongs to exactly one `kind`, and this rejects an
	 * id that resolves to a document of a different kind with a 404, the same response as a
	 * plain unknown id — this is currently unreachable (only one `kind` is ever used), but
	 * keeps a future second-kind caller of this service from reaching another kind's document
	 * by guessing its UUID.
	 */
	async updatePolicyDocument(
		policyId: string,
		kind: string,
		rules: readonly PolicyRule[],
		updatedBy: string,
	): Promise<PolicyDocumentWrite> {
		const warnings = lintRulesForShadowing(rules);

		const result = await this.transactionRunner.run({}, async (ctx) => {
			// Attachments aren't being modified here, so a plain read is enough to know which
			// scopes are affected — but those scope rows must be locked before `updateRules`
			// locks the policy row below, to keep this method's lock order matching
			// `setEffectivePolicy`'s (see the lock-ordering note above).
			const attachedScopeIds = await this.attachmentRepository.listScopeIdsAttachedToPolicy(
				policyId,
				ctx,
			);
			if (attachedScopeIds.length > 0) {
				await this.scopeRepository.lockScopesByIds(attachedScopeIds, ctx);
			}

			const updateResult = await this.policyRepository.updateRules(
				policyId,
				rules,
				updatedBy,
				ctx,
				kind,
			);
			if (!updateResult) {
				throw new NotFoundError(`Policy document not found: ${policyId}`);
			}

			const { before, after } = updateResult;

			if (before.version !== after.version && attachedScopeIds.length > 0) {
				await this.scopeRepository.bumpVersions(attachedScopeIds, ctx);
			}

			return { before, after };
		});

		this.eventService.emit('node-type-policy-document-updated', {
			updatedBy,
			kind: result.after.kind,
			policyId,
			before: { rules: result.before.rules, version: result.before.version },
			after: { rules: result.after.rules, version: result.after.version },
		});

		return { policy: result.after, warnings };
	}

	/**
	 * Refuses to delete a policy that is still attached to any scope — the attachment FK is
	 * `RESTRICT`, so this checks first and reports a clean count instead of letting a raw SQL
	 * constraint violation reach the caller.
	 *
	 * The "not attached" check and the delete run inside one transaction, with a write lock
	 * taken on the policy row up front — see `TypeAvailabilityPolicyRepository.findByIdForUpdate`
	 * for why that lock (not just the transaction) is what actually closes the race against a
	 * concurrent attach.
	 *
	 * Scoped by `kind`, like `updatePolicyDocument` — see that method's doc comment.
	 */
	async deletePolicyDocument(policyId: string, kind: string, updatedBy: string): Promise<void> {
		const existing = await this.transactionRunner.run({}, async (ctx) => {
			const existing = await this.policyRepository.findByIdForUpdate(policyId, ctx);
			if (!existing || existing.kind !== kind) {
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

			return existing;
		});

		this.eventService.emit('node-type-policy-document-deleted', {
			updatedBy,
			kind: existing.kind,
			policyId,
			before: { rules: existing.rules, version: existing.version },
		});
	}

	/**
	 * Scoped by `kind`, like `updatePolicyDocument` — see that method's doc comment. Returns
	 * `null` for a genuinely unknown id (the caller reports that as 404 too), but throws
	 * `NotFoundError` outright for an id that resolves to a document of a different kind, so
	 * both cases reach the caller as the same 404 either way.
	 */
	async getPolicyDocument(policyId: string, kind: string): Promise<TypeAvailabilityPolicy | null> {
		const policy = await this.policyRepository.findById(policyId, {});
		if (policy && policy.kind !== kind) {
			throw new NotFoundError(`Policy document not found: ${policyId}`);
		}

		return policy;
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
	 */
	async replaceAttachments(
		scopeId: string,
		attachments: readonly AttachmentInput[],
		updatedBy: string,
	): Promise<{ attachments: readonly PolicyAttachment[]; version: number }> {
		assertNoDuplicateAttachmentSlots(attachments);

		const result = await this.transactionRunner.run({}, async (ctx) => {
			// Locked, not a plain read: without it, a concurrent write to this same scope
			// (another `replaceAttachments` or `setEffectivePolicy` call) could commit between
			// this read and the actual replace below, making the "before" attachments/version
			// reported in the audit event stale.
			const scope = await this.scopeRepository.findScopeByIdForUpdate(scopeId, ctx);
			if (!scope) {
				throw new NotFoundError(`Policy scope not found: ${scopeId}`);
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
	 *
	 * Refuses a scope that already carries more than one attachment: this endpoint only ever
	 * writes a single document, so applying it to a multi-attachment scope would silently
	 * pick one attachment to keep and drop the rest. `PUT /scopes/:scopeId/attachments` is the
	 * right tool once a scope has grown past this endpoint's single-document shape.
	 *
	 * Lock-ordering convention: this method locks the scope first (via
	 * `findScopeByKindAndProjectForUpdate`) and only later touches the policy row (via
	 * `updateRules`), so its effective lock order is scope → policy. `updatePolicyDocument`
	 * follows the same order (it locks the attached scopes before calling `updateRules`) — see
	 * that method's doc comment. Any future write path touching both a scope and a policy row
	 * must follow this order too, or two such paths taking opposite orders on overlapping rows
	 * can deadlock on Postgres.
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
		const warnings = lintRulesForShadowing(input.rules);

		const result = await this.transactionRunner.run({}, async (ctx) => {
			// A pessimistic-write-locked read: a second concurrent call for the same
			// `(kind, projectId)` blocks here until this transaction commits or rolls back,
			// so it then correctly observes the bumped version and hits the conflict check
			// below instead of racing past it. A miss (scope not created yet) takes no lock.
			const scope = await this.scopeRepository.findScopeByKindAndProjectForUpdate(
				kind,
				projectId,
				ctx,
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

			let scopeId: string;

			if (scope) {
				scopeId = scope.id;

				if (scope.defaultAction !== input.defaultAction) {
					await this.scopeRepository.updateDefaultAction(
						scopeId,
						input.defaultAction,
						updatedBy,
						ctx,
					);
				}
			} else {
				try {
					const created = await this.scopeRepository.createScope(
						{ kind, projectId, defaultAction: input.defaultAction, updatedBy },
						ctx,
					);
					scopeId = created.id;
				} catch (error) {
					// Two racing first-writes both saw "no row yet" and both reached the
					// insert; the loser hits the unique `(kind, projectId)` index instead of
					// the `expectedVersion` check above. Report it the same way: a conflict,
					// not a raw constraint violation.
					if (isUniqueConstraintError(error)) {
						throw new ConflictError(
							'Policy scope has changed since it was last read (concurrent first write)',
						);
					}
					throw error;
				}
			}

			const existingAttachments = scope
				? await this.attachmentRepository.listAttachmentsForScope(scopeId, ctx)
				: [];

			if (existingAttachments.length > 1) {
				throw new UserError(
					'This scope has multiple attached policies; use PUT /scopes/:scopeId/attachments to manage them instead of PUT /instance.',
				);
			}

			const existingDocumentId = existingAttachments[0]?.policyId ?? null;

			let documentBefore: { rules: readonly PolicyRule[]; version: number } | null = null;
			let documentAfter: { rules: readonly PolicyRule[]; version: number };
			let documentCreated: boolean;
			let policyId: string;

			if (existingDocumentId) {
				const updateResult = await this.policyRepository.updateRules(
					existingDocumentId,
					input.rules,
					updatedBy,
					ctx,
				);
				// The attachment's FK guarantees the policy row exists.
				if (!updateResult) {
					throw new NotFoundError(`Policy document not found: ${existingDocumentId}`);
				}

				documentBefore = {
					rules: updateResult.before.rules,
					version: updateResult.before.version,
				};
				documentAfter = { rules: updateResult.after.rules, version: updateResult.after.version };
				documentCreated = false;
				policyId = existingDocumentId;

				// This document may also be attached to other scopes — a real content change
				// here changes what those scopes effectively enforce too, so their `version`
				// must move the same way `updatePolicyDocument` fans a bump out to every
				// attached scope. The current scope's own bump below covers only itself.
				if (updateResult.before.version !== updateResult.after.version) {
					const otherScopeIds = (
						await this.attachmentRepository.listScopeIdsAttachedToPolicy(existingDocumentId, ctx)
					).filter((id) => id !== scopeId);
					if (otherScopeIds.length > 0) {
						await this.scopeRepository.bumpVersions(otherScopeIds, ctx);
					}
				}
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
}
