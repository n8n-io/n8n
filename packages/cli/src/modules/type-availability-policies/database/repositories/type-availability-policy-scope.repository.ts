import { BaseRepository, TransactionRunner, chunkIds, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull } from '@n8n/typeorm';

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
	 * `projectId: null` looks up the instance scope. At most one row can match either way —
	 * the two partial unique indexes guarantee it.
	 */
	async findScopeByKindAndProject(
		kind: string,
		projectId: string | null,
		ctx: OperationContext,
	): Promise<TypeAvailabilityPolicyScope | null> {
		return await this.managerFor(ctx).findOneBy(TypeAvailabilityPolicyScope, {
			kind,
			projectId: projectId ?? IsNull(),
		});
	}

	async findScopeById(
		id: string,
		ctx: OperationContext,
	): Promise<TypeAvailabilityPolicyScope | null> {
		return await this.managerFor(ctx).findOneBy(TypeAvailabilityPolicyScope, { id });
	}

	async createScope(
		input: NewPolicyScope,
		ctx: OperationContext,
	): Promise<TypeAvailabilityPolicyScope> {
		const scope = this.create({ ...input, version: 1 });

		return await this.managerFor(ctx).save(TypeAvailabilityPolicyScope, scope);
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
