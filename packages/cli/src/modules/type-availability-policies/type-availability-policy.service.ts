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
	 * Sets the scope's default action, creating the scope on first write. The version check
	 * runs inside the same transaction as the write, so two racing first-writes can't both
	 * see "no row yet" and both succeed — the loser's `expectedVersion: 0` no longer matches.
	 */
	async setDefaultAction(
		kind: string,
		projectId: string | null,
		defaultAction: PolicyAction,
		expectedVersion: number,
		updatedBy: string,
	): Promise<TypeAvailabilityPolicyScope> {
		const result = await this.transactionRunner.run({}, async (ctx) => {
			const scope = await this.scopeRepository.findScopeByKindAndProject(kind, projectId, ctx);
			const currentVersion = scope?.version ?? UNCONFIGURED_VERSION;

			if (currentVersion !== expectedVersion) {
				throw new ConflictError(
					`Policy scope has changed since it was last read (expected version ${expectedVersion}, found ${currentVersion})`,
				);
			}

			const before = scope ? { defaultAction: scope.defaultAction, version: scope.version } : null;

			const after = scope
				? ((await this.scopeRepository.updateDefaultAction(
						scope.id,
						defaultAction,
						updatedBy,
						ctx,
					)) ?? scope)
				: await this.scopeRepository.createScope(
						{ kind, projectId, defaultAction, updatedBy },
						ctx,
					);

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

	async updatePolicyDocument(
		policyId: string,
		rules: readonly PolicyRule[],
		updatedBy: string,
	): Promise<PolicyDocumentWrite> {
		const warnings = lintRulesForShadowing(rules);

		const existing = await this.policyRepository.findById(policyId, {});
		if (!existing) {
			throw new NotFoundError(`Policy document not found: ${policyId}`);
		}

		const updated = await this.policyRepository.updateRules(policyId, rules, updatedBy, {});
		if (!updated) {
			throw new NotFoundError(`Policy document not found: ${policyId}`);
		}

		this.eventService.emit('node-type-policy-document-updated', {
			updatedBy,
			kind: existing.kind,
			policyId,
			before: { rules: existing.rules, version: existing.version },
			after: { rules: updated.rules, version: updated.version },
		});

		return { policy: updated, warnings };
	}

	/**
	 * Refuses to delete a policy that is still attached to any scope — the attachment FK is
	 * `RESTRICT`, so this checks first and reports a clean count instead of letting a raw SQL
	 * constraint violation reach the caller.
	 */
	async deletePolicyDocument(policyId: string, updatedBy: string): Promise<void> {
		const existing = await this.policyRepository.findById(policyId, {});
		if (!existing) {
			throw new NotFoundError(`Policy document not found: ${policyId}`);
		}

		const attachedScopeIds = await this.attachmentRepository.listScopeIdsAttachedToPolicy(
			policyId,
			{},
		);
		if (attachedScopeIds.length > 0) {
			throw new ConflictError(
				`Cannot delete policy document: still attached to ${attachedScopeIds.length} scope(s)`,
			);
		}

		await this.policyRepository.deletePolicy(policyId, {});

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
	 */
	async replaceAttachments(
		scopeId: string,
		attachments: readonly AttachmentInput[],
		updatedBy: string,
	): Promise<{ attachments: readonly PolicyAttachment[]; version: number }> {
		assertNoDuplicateAttachmentSlots(attachments);

		const result = await this.transactionRunner.run({}, async (ctx) => {
			const scope = await this.scopeRepository.findScopeById(scopeId, ctx);
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
			const scope = await this.scopeRepository.findScopeByKindAndProject(kind, projectId, ctx);
			const currentVersion = scope?.version ?? UNCONFIGURED_VERSION;

			if (currentVersion !== expectedVersion) {
				throw new ConflictError(
					`Policy scope has changed since it was last read (expected version ${expectedVersion}, found ${currentVersion})`,
				);
			}

			const scopeBefore = scope
				? { defaultAction: scope.defaultAction, version: scope.version }
				: null;

			const scopeId = scope
				? scope.id
				: (
						await this.scopeRepository.createScope(
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

			const existingAttachments = scope
				? await this.attachmentRepository.listAttachmentsForScope(scopeId, ctx)
				: [];
			const existingDocumentId = existingAttachments[0]?.policyId ?? null;

			let documentBefore: { rules: readonly PolicyRule[]; version: number } | null = null;
			let documentAfter: { rules: readonly PolicyRule[]; version: number };
			let documentCreated: boolean;
			let policyId: string;

			if (existingDocumentId) {
				const before = await this.policyRepository.findById(existingDocumentId, ctx);
				documentBefore = before ? { rules: before.rules, version: before.version } : null;

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
}
