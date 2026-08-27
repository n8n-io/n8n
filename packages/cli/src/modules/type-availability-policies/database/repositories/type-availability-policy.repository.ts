import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import type { PolicyRule } from '../../policy-rule.types';
import { TypeAvailabilityPolicy } from '../entities/type-availability-policy.entity';

type NewPolicy = {
	kind: string;
	rules: readonly PolicyRule[];
	updatedBy: string;
};

/** Rules are an ordered document, so order is part of the content. */
function rulesEqual(a: readonly PolicyRule[], b: readonly PolicyRule[]): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

@Service()
export class TypeAvailabilityPolicyRepository extends BaseRepository<TypeAvailabilityPolicy> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TypeAvailabilityPolicy, dataSource.manager, transactionRunner);
	}

	async findById(id: string, ctx: OperationContext): Promise<TypeAvailabilityPolicy | null> {
		return await this.managerFor(ctx).findOneBy(TypeAvailabilityPolicy, { id });
	}

	async findManyByIds(ids: string[], ctx: OperationContext): Promise<TypeAvailabilityPolicy[]> {
		if (ids.length === 0) return [];
		return await this.managerFor(ctx).findBy(TypeAvailabilityPolicy, { id: In(ids) });
	}

	async createPolicy(input: NewPolicy, ctx: OperationContext): Promise<TypeAvailabilityPolicy> {
		const policy = this.create({
			kind: input.kind,
			rules: [...input.rules],
			updatedBy: input.updatedBy,
			version: 1,
		});

		return await this.managerFor(ctx).save(TypeAvailabilityPolicy, policy);
	}

	/**
	 * Replaces the rules document and bumps `version`. Returns `null` if no such policy.
	 *
	 * Unchanged content is a no-op that leaves `version` alone, so an env-bootstrap upsert
	 * repeated on every main during a rolling restart doesn't invalidate caches.
	 */
	async updateRules(
		id: string,
		rules: readonly PolicyRule[],
		updatedBy: string,
		ctx: OperationContext,
	): Promise<TypeAvailabilityPolicy | null> {
		return await this.runInTransaction(ctx, async (tx) => {
			const policy = await tx.findOneBy(TypeAvailabilityPolicy, { id });
			if (!policy) return null;
			if (rulesEqual(policy.rules, rules)) return policy;

			policy.rules = [...rules];
			policy.version += 1;
			policy.updatedBy = updatedBy;

			return await tx.save(TypeAvailabilityPolicy, policy);
		});
	}

	/**
	 * Callers must detach the policy from every scope first — the attachment FK is `RESTRICT`,
	 * so deleting one that is still attached throws rather than silently un-enforcing those
	 * scopes.
	 */
	async deletePolicy(id: string, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).delete(TypeAvailabilityPolicy, { id });
	}
}
