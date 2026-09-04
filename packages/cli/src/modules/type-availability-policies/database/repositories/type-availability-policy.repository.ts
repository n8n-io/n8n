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

	/**
	 * Same lookup as {@link findById}, but takes a row-level write lock on a match (Postgres
	 * only — SQLite has no equivalent). Must run inside an active transaction.
	 *
	 * Locking the policy row here is what closes the delete-vs-attach race: on Postgres, an
	 * `INSERT` into the attachment table takes a `FOR KEY SHARE` lock on the policy row it
	 * references, so holding `FOR UPDATE` on that same row makes a concurrent attach block
	 * until this transaction commits or rolls back, instead of slipping in between the
	 * "not attached" check and the delete.
	 *
	 * Lock-ordering convention: this delete path never locks a scope row in the same
	 * transaction, so it has nothing to order against `updateRules`'s scope-then-policy rule
	 * (see `TypeAvailabilityPolicyService` for why that order matters).
	 */
	async findByIdForUpdate(
		id: string,
		ctx: OperationContext,
	): Promise<TypeAvailabilityPolicy | null> {
		const manager = this.managerFor(ctx);

		return await manager.findOne(TypeAvailabilityPolicy, {
			where: { id },
			...(manager.connection.options.type === 'postgres'
				? { lock: { mode: 'pessimistic_write' as const } }
				: {}),
		});
	}

	async findManyByIds(ids: string[], ctx: OperationContext): Promise<TypeAvailabilityPolicy[]> {
		if (ids.length === 0) return [];
		return await this.managerFor(ctx).findBy(TypeAvailabilityPolicy, { id: In(ids) });
	}

	/** Every policy document of one kind, for the document-library listing screen. */
	async findByKind(kind: string, ctx: OperationContext): Promise<TypeAvailabilityPolicy[]> {
		return await this.managerFor(ctx).findBy(TypeAvailabilityPolicy, { kind });
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
	 * Returns both `before` and `after` — read inside the same transaction as the write — so
	 * a caller never has to pair this with a separate, non-transactional read for its "before"
	 * audit snapshot, which a concurrent edit could otherwise land in between and make stale.
	 *
	 * Unchanged content is a no-op that leaves `version` alone (before and after are then the
	 * same row), so an env-bootstrap upsert repeated on every main during a rolling restart
	 * doesn't invalidate caches.
	 *
	 * The bump is computed by the database rather than from the row read above: two
	 * overlapping edits would otherwise both write `read version + 1`, losing a bump and
	 * with it the cache invalidation that version signals. Last writer still wins on the
	 * rules themselves — rejecting a caller's stale version needs an expected version from
	 * the client, which only the API layer can supply.
	 *
	 * The initial "before" read takes a Postgres-only pessimistic write lock, the same way
	 * {@link findByIdForUpdate} does. A plain `SELECT` never blocks a concurrent writer under
	 * READ COMMITTED, so without the lock a concurrent transaction could still commit a
	 * change to this row between the read and the `update`/`increment` below, even though
	 * both run inside one transaction here.
	 *
	 * Lock-ordering convention: any write path that touches both a scope row and a policy
	 * row must lock the scope(s) first, then the policy — see `TypeAvailabilityPolicyService`
	 * for why (two opposite lock orders on overlapping rows can deadlock on Postgres). Since
	 * this method takes the policy lock, callers that also touch scope rows in the same
	 * transaction must acquire those scope locks before calling this method.
	 *
	 * `expectedKind`, when passed, is checked against the locked row *before* any write —
	 * a mismatch returns `null`, the same as a genuinely unknown id. This must happen before
	 * the update, not after: checking the kind only on the returned row would let the write
	 * land on a different kind's document before the caller ever finds out. Omit it for a
	 * caller that already knows the row's kind is correct by construction (e.g.
	 * `setEffectivePolicy`, which only ever calls this on a document an attachment invariant
	 * already ties to the right kind).
	 */
	async updateRules(
		id: string,
		rules: readonly PolicyRule[],
		updatedBy: string,
		ctx: OperationContext,
		expectedKind?: string,
	): Promise<{ before: TypeAvailabilityPolicy; after: TypeAvailabilityPolicy } | null> {
		return await this.runInTransaction(ctx, async (tx) => {
			const before = await tx.findOne(TypeAvailabilityPolicy, {
				where: { id },
				...(tx.connection.options.type === 'postgres'
					? { lock: { mode: 'pessimistic_write' as const } }
					: {}),
			});
			if (!before) return null;
			if (expectedKind !== undefined && before.kind !== expectedKind) return null;
			if (rulesEqual(before.rules, rules)) return { before, after: before };

			await tx.update(TypeAvailabilityPolicy, { id }, { rules: [...rules], updatedBy });
			await tx.increment(TypeAvailabilityPolicy, { id }, 'version', 1);

			// The row we just updated inside this same transaction: it cannot have vanished —
			// the `before ??` fallback only satisfies the type checker.
			const after = await tx.findOneBy(TypeAvailabilityPolicy, { id });
			return { before, after: after ?? before };
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
