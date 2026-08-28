import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';
import { isDeepStrictEqual } from 'node:util';

import type { PolicyRule } from '../../policy-rule.types';
import { TypeAvailabilityPolicy } from '../entities/type-availability-policy.entity';

type NewPolicy = {
	kind: string;
	rules: readonly PolicyRule[];
	updatedBy: string;
};

/**
 * Structural, not serialised: rule order is part of the content, but object-key order is
 * not. Comparing JSON text would report a change when a client happens to serialise
 * `{ action, id }` instead of `{ id, action }`, bumping the version and invalidating caches
 * for a policy that behaves identically.
 */
function rulesEqual(a: readonly PolicyRule[], b: readonly PolicyRule[]): boolean {
	return isDeepStrictEqual([...a], [...b]);
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
	 *
	 * The bump is computed by the database rather than from the row read above: two
	 * overlapping edits would otherwise both write `read version + 1`, losing a bump and
	 * with it the cache invalidation that version signals. Last writer still wins on the
	 * rules themselves — rejecting a caller's stale version needs an expected version from
	 * the client, which only the API layer can supply.
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

			await tx.update(TypeAvailabilityPolicy, { id }, { rules: [...rules], updatedBy });
			await tx.increment(TypeAvailabilityPolicy, { id }, 'version', 1);

			return await tx.findOneBy(TypeAvailabilityPolicy, { id });
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
