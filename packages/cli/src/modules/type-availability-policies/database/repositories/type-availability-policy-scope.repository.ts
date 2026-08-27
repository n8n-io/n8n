import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
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

			scope.defaultAction = defaultAction;
			scope.version += 1;
			scope.updatedBy = updatedBy;

			return await tx.save(TypeAvailabilityPolicyScope, scope);
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

	/** Bumps every scope in one statement, for a policy edit fanning out to its scopes. */
	async bumpVersions(ids: string[], ctx: OperationContext): Promise<void> {
		if (ids.length === 0) return;
		await this.managerFor(ctx).increment(
			TypeAvailabilityPolicyScope,
			{ id: In(ids) },
			'version',
			1,
		);
	}
}
