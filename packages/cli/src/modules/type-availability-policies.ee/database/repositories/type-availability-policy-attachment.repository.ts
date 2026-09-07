import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, type EntityManager } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';

import type { PolicyAttachment } from '../../policy-rule.types';
import { TypeAvailabilityPolicyAttachment } from '../entities/type-availability-policy-attachment.entity';
import { TypeAvailabilityPolicyScope } from '../entities/type-availability-policy-scope.entity';
import { TypeAvailabilityPolicy } from '../entities/type-availability-policy.entity';

type AttachmentSlot = {
	policyId: string;
	priority: number;
	isFloor: boolean;
};

@Service()
export class TypeAvailabilityPolicyAttachmentRepository extends BaseRepository<TypeAvailabilityPolicyAttachment> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TypeAvailabilityPolicyAttachment, dataSource.manager, transactionRunner);
	}

	/**
	 * The scope's attachments with each policy's rules resolved, in the shape the evaluator
	 * consumes. Unordered — ordering by floor then priority is the evaluator's job.
	 *
	 * An attachment whose policy row is missing is skipped; the `RESTRICT` FK means that
	 * should be unreachable, and dropping it beats evaluating a policy with no rules.
	 */
	async listAttachmentsForScope(
		scopeId: string,
		ctx: OperationContext,
	): Promise<PolicyAttachment[]> {
		const manager = this.managerFor(ctx);

		const attachments = await manager.findBy(TypeAvailabilityPolicyAttachment, { scopeId });
		if (attachments.length === 0) return [];

		const policies = await manager.findBy(TypeAvailabilityPolicy, {
			id: In(attachments.map((a) => a.policyId)),
		});
		const rulesByPolicyId = new Map(policies.map((p) => [p.id, p.rules]));

		return attachments.flatMap((attachment) => {
			const rules = rulesByPolicyId.get(attachment.policyId);
			if (!rules) return [];

			return [
				{
					policyId: attachment.policyId,
					rules,
					priority: attachment.priority,
					isFloor: attachment.isFloor,
				},
			];
		});
	}

	/**
	 * Replaces the scope's whole attachment list in one unit of work, mirroring the
	 * wholesale `PUT` the REST surface exposes. Reordering is a replace with new priorities.
	 *
	 * Throws if the new list repeats a policy or reuses a priority within one partition;
	 * the primary key and `uq_type_availability_attachment_slot` reject both.
	 *
	 * Does not bump the scope's version — callers thread the same `ctx` into
	 * `TypeAvailabilityPolicyScopeRepository.bumpVersion` so both land in one transaction.
	 */
	async replaceAttachmentsForScope(
		scopeId: string,
		attachments: readonly AttachmentSlot[],
		ctx: OperationContext,
	): Promise<void> {
		await this.runInTransaction(ctx, async (tx) => {
			await this.assertAttachableToScope(scopeId, attachments, tx);

			await tx.delete(TypeAvailabilityPolicyAttachment, { scopeId });
			if (attachments.length === 0) return;

			await tx.insert(
				TypeAvailabilityPolicyAttachment,
				attachments.map((a) => ({ scopeId, ...a })),
			);
		});
	}

	/**
	 * Rejects a policy whose `kind` differs from the scope's.
	 *
	 * The schema can't express this: `kind` lives on both parent tables but the attachment
	 * carries neither, and the migration DSL has no composite foreign key to tie them
	 * together. A mismatch would attach cleanly and then match nothing at evaluation time,
	 * so the scope would silently stop enforcing what it appears to enforce. This is the
	 * only write path for attachments, so the invariant is enforced here.
	 *
	 * What the check reads stays true until the insert not because it shares a transaction
	 * with it — at READ COMMITTED a concurrent commit is still visible to a later statement
	 * — but because `kind` is write-once (no method updates it) and the foreign key stops
	 * the policy being deleted out from under the insert.
	 *
	 * Missing rows are reported here too, rather than surfacing as an opaque FK violation.
	 * The scope is checked even when the new list is empty, so clearing the attachments of
	 * a scope that does not exist fails the same way attaching to it would.
	 */
	private async assertAttachableToScope(
		scopeId: string,
		attachments: readonly AttachmentSlot[],
		tx: EntityManager,
	): Promise<void> {
		const scope = await tx.findOne(TypeAvailabilityPolicyScope, {
			select: { id: true, kind: true },
			where: { id: scopeId },
		});
		if (!scope) {
			throw new UserError('Cannot attach policies to an unknown scope', { extra: { scopeId } });
		}

		if (attachments.length === 0) return;

		const policyIds = attachments.map((a) => a.policyId);
		const policies = await tx.find(TypeAvailabilityPolicy, {
			select: { id: true, kind: true },
			where: { id: In(policyIds) },
		});
		const kindByPolicyId = new Map(policies.map((p) => [p.id, p.kind]));

		for (const policyId of policyIds) {
			const kind = kindByPolicyId.get(policyId);

			if (kind === undefined) {
				throw new UserError('Cannot attach an unknown policy', { extra: { policyId, scopeId } });
			}

			if (kind !== scope.kind) {
				throw new UserError(`Cannot attach a "${kind}" policy to a "${scope.kind}" scope`, {
					extra: { policyId, scopeId },
				});
			}
		}
	}

	/** Every scope a policy is attached to — the reverse lookup a policy edit fans out over. */
	async listScopeIdsAttachedToPolicy(policyId: string, ctx: OperationContext): Promise<string[]> {
		const attachments = await this.managerFor(ctx).findBy(TypeAvailabilityPolicyAttachment, {
			policyId,
		});

		return attachments.map((a) => a.scopeId);
	}
}
