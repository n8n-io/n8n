import {
	BaseRepository,
	TransactionRunner,
	chunkIds,
	generateNanoId,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, type EntityManager } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import type { PolicyAction } from '../../policy-rule.types';
import { TypeAvailabilityPolicyScope } from '../entities/type-availability-policy-scope.entity';

type NewPolicyScope = {
	kind: string;
	projectId: string | null;
	defaultAction: PolicyAction;
	updatedBy: string;
};

@Service()
export class TypeAvailabilityPolicyScopeRepository extends BaseRepository<TypeAvailabilityPolicyScope> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TypeAvailabilityPolicyScope, dataSource.manager, transactionRunner);
	}

	/**
	 * `SELECT ... FOR UPDATE`, Postgres only. n8n's SQLite driver has one write connection
	 * behind a mutex and opens every transaction with `BEGIN IMMEDIATE`, so a write
	 * transaction already runs to completion before the next one starts — every read inside
	 * it sees the previous writer's commit, and no row lock is needed.
	 */
	private forUpdateLock(manager: EntityManager) {
		return manager.connection.options.type === 'postgres'
			? { lock: { mode: 'pessimistic_write' as const } }
			: {};
	}

	/**
	 * `projectId: null` looks up the instance scope. At most one row can match either way —
	 * the two partial unique indexes guarantee it.
	 *
	 * Pass `forUpdate: true` inside a write transaction that checks `expectedVersion`. Without
	 * it, this is a plain read: on Postgres, two concurrent writers can both read the same
	 * version, both pass the check, and the second commit silently overwrites the first. The
	 * row lock makes the second writer wait for the first to commit, then re-read the bumped
	 * version and correctly fail the check. A row that does not exist yet cannot be locked —
	 * first writes go through `createScopeIfAbsent` for that reason.
	 */
	async findScopeByKindAndProject(
		kind: string,
		projectId: string | null,
		ctx: OperationContext,
		forUpdate = false,
	): Promise<TypeAvailabilityPolicyScope | null> {
		const manager = this.managerFor(ctx);
		return await manager.findOne(TypeAvailabilityPolicyScope, {
			where: { kind, projectId: projectId ?? IsNull() },
			...(forUpdate ? this.forUpdateLock(manager) : {}),
		});
	}

	/** See `findScopeByKindAndProject` for `forUpdate`. */
	async findScopeById(
		id: string,
		ctx: OperationContext,
		forUpdate = false,
	): Promise<TypeAvailabilityPolicyScope | null> {
		const manager = this.managerFor(ctx);
		return await manager.findOne(TypeAvailabilityPolicyScope, {
			where: { id },
			...(forUpdate ? this.forUpdateLock(manager) : {}),
		});
	}

	/**
	 * Locks every named scope row, in id order, and returns the ids that exist.
	 *
	 * Every write path that touches both a scope and a policy document must lock the scope
	 * first: `setEffectivePolicy` locks its scope and then updates the document, so a path
	 * that locked the document first and then bumped scopes would deadlock against it on
	 * Postgres. Sorting keeps two callers that overlap on several scopes from deadlocking on
	 * each other the same way: the input is sorted so the batches lock in order, and each
	 * batch is `ORDER BY id` because Postgres locks the rows in the order the statement
	 * returns them, not in the order of the `IN` list.
	 *
	 * Must run inside a transaction — a row lock outside one is meaningless, and Postgres
	 * rejects it.
	 */
	async lockScopesByIds(ids: string[], ctx: OperationContext): Promise<string[]> {
		if (ids.length === 0) return [];

		const manager = this.managerFor(ctx);
		const found: string[] = [];
		for (const batch of chunkIds([...ids].sort())) {
			const rows = await manager.find(TypeAvailabilityPolicyScope, {
				select: { id: true },
				where: { id: In(batch) },
				order: { id: 'ASC' },
				...this.forUpdateLock(manager),
			});
			found.push(...rows.map((row) => row.id));
		}

		return found;
	}

	/**
	 * Inserts the scope row if `(kind, projectId)` has none yet, then reads back whichever row
	 * exists. `created: false` means a concurrent first write got there first.
	 *
	 * A plain "read null, then insert" lets two first writes both pass the version check and
	 * the loser hit the unique index with a raw driver error. Insert-or-ignore turns the
	 * loser's insert into a no-op instead — on Postgres it waits for the winner's commit, so
	 * the locked read-back returns the winner's row and the caller can report a conflict.
	 *
	 * Joins the caller's transaction when `ctx` carries one, so the read-back lock is held
	 * for the rest of the caller's work; opens one otherwise, since the lock needs it.
	 */
	async createScopeIfAbsent(
		input: NewPolicyScope,
		ctx: OperationContext,
	): Promise<{ scope: TypeAvailabilityPolicyScope; created: boolean }> {
		return await this.runInTransaction(ctx, async (tx, txCtx) => {
			const id = generateNanoId();
			await tx
				.createQueryBuilder()
				.insert()
				.into(TypeAvailabilityPolicyScope)
				.values(this.create({ ...input, id, version: 1 }))
				.orIgnore()
				.execute();

			const scope = await this.findScopeByKindAndProject(input.kind, input.projectId, txCtx, true);
			if (!scope) {
				throw new UnexpectedError('Policy scope is missing right after insert-or-ignore');
			}

			return { scope, created: scope.id === id };
		});
	}

	/**
	 * Sets the scope's default action, bumping `version` unless nothing changed.
	 *
	 * As with policy rules, the bump is computed by the database — a default-action edit
	 * racing an attachment change would otherwise write the same version twice, and the
	 * second change would inherit the first one's cache key.
	 */
	async updateDefaultAction(
		id: string,
		defaultAction: PolicyAction,
		updatedBy: string,
		ctx: OperationContext,
	): Promise<TypeAvailabilityPolicyScope | null> {
		return await this.runInTransaction(ctx, async (tx) => {
			const scope = await tx.findOneBy(TypeAvailabilityPolicyScope, { id });
			if (!scope) return null;
			if (scope.defaultAction === defaultAction) return scope;

			await tx.update(TypeAvailabilityPolicyScope, { id }, { defaultAction, updatedBy });
			await tx.increment(TypeAvailabilityPolicyScope, { id }, 'version', 1);

			return await tx.findOneBy(TypeAvailabilityPolicyScope, { id });
		});
	}

	/**
	 * Bumps the scope's freshness signal without touching its own fields.
	 *
	 * Call this under the same `ctx` as whatever changed the scope's *effective* policy —
	 * an attachment added, removed or reordered, or an attached policy's content edited —
	 * so the version and the change commit together.
	 */
	async bumpVersion(id: string, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).increment(TypeAvailabilityPolicyScope, { id }, 'version', 1);
	}

	/**
	 * Bumps every named scope, for a policy edit fanning out to the scopes it is attached to.
	 *
	 * Chunked, because one `IN (…)` binds a parameter per id and a policy may be attached to a
	 * scope in every project. Wrapped in a transaction so the chunks still land together for a
	 * caller that passed the root context — one statement was atomic on its own, several are
	 * not.
	 */
	async bumpVersions(ids: string[], ctx: OperationContext): Promise<void> {
		if (ids.length === 0) return;

		const batches = chunkIds(ids);
		if (batches.length === 1) {
			await this.managerFor(ctx).increment(
				TypeAvailabilityPolicyScope,
				{ id: In(batches[0]) },
				'version',
				1,
			);
			return;
		}

		await this.runInTransaction(ctx, async (tx) => {
			for (const batch of batches) {
				await tx.increment(TypeAvailabilityPolicyScope, { id: In(batch) }, 'version', 1);
			}
		});
	}
}
