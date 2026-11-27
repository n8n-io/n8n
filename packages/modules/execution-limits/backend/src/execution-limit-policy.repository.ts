import { BaseRepository, chunkIds, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { ExecutionLimitPolicyAssignment } from './execution-limit-policy-assignment.entity';
import {
	ExecutionLimitPolicyGroupAssignment,
	type ExecutionLimitPolicyGroup,
} from './execution-limit-policy-group-assignment.entity';
import { ExecutionLimitPolicy } from './execution-limit-policy.entity';
import type { Policy, PolicyValues, ProjectPolicy } from './execution-limits.types';

class PolicyTable extends BaseRepository<ExecutionLimitPolicy> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ExecutionLimitPolicy, dataSource.manager, transactionRunner);
	}
}

function toPolicy({ id, name, maxExecutions }: ExecutionLimitPolicy): Policy {
	return { id, name, maxExecutions };
}

/** The only reader and writer of the execution limit policies and their assignments. */
@Service()
export class ExecutionLimitPolicyRepository {
	private readonly table: PolicyTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new PolicyTable(dataSource, transactionRunner);
	}

	/** Each policy of each project, or of the given projects. One row for each assignment. */
	async findProjectPolicies(
		ctx: OperationContext,
		projectIds?: string[],
	): Promise<ProjectPolicy[]> {
		if (!projectIds) return await this.queryProjectPolicies(ctx);

		const rows: ProjectPolicy[] = [];
		for (const batch of chunkIds(projectIds)) {
			rows.push(...(await this.queryProjectPolicies(ctx, batch)));
		}
		return rows;
	}

	async findPolicy(id: string, ctx: OperationContext): Promise<Policy | null> {
		const row = await this.table.managerFor(ctx).findOneBy(ExecutionLimitPolicy, { id });

		return row ? toPolicy(row) : null;
	}

	async findPolicyByName(name: string, ctx: OperationContext): Promise<Policy | null> {
		const row = await this.table.managerFor(ctx).findOneBy(ExecutionLimitPolicy, { name });

		return row ? toPolicy(row) : null;
	}

	async insertPolicy(policy: Policy, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).insert(ExecutionLimitPolicy, { ...policy });
	}

	async updatePolicy(id: string, values: PolicyValues, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).update(ExecutionLimitPolicy, { id }, { ...values });
	}

	/** The database also deletes the assignments of the policy. */
	async deletePolicy(id: string, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(ExecutionLimitPolicy, { id });
	}

	/** Gives each project this policy only. */
	async replacePoliciesOfProjects(
		policyId: string,
		projectIds: string[],
		ctx: OperationContext,
	): Promise<void> {
		await this.deletePoliciesOfProjects(projectIds, ctx);

		const manager = this.table.managerFor(ctx);
		for (const batch of chunkIds(projectIds)) {
			await manager.insert(
				ExecutionLimitPolicyAssignment,
				batch.map((projectId) => ({ policyId, projectId })),
			);
		}
	}

	async deletePoliciesOfProjects(projectIds: string[], ctx: OperationContext): Promise<void> {
		const manager = this.table.managerFor(ctx);

		for (const batch of chunkIds(projectIds)) {
			await manager.delete(ExecutionLimitPolicyAssignment, { projectId: In(batch) });
		}
	}

	/** The policy of the group: the lowest maximum when the group has several. */
	async findGroupPolicyId(
		group: ExecutionLimitPolicyGroup,
		ctx: OperationContext,
	): Promise<string | null> {
		const row = await this.table
			.managerFor(ctx)
			.createQueryBuilder(ExecutionLimitPolicyGroupAssignment, 'assignment')
			.innerJoin(ExecutionLimitPolicy, 'policy', 'policy.id = assignment.policyId')
			.select('policy.id', 'policyId')
			.where('assignment.group = :group', { group })
			.orderBy('policy.maxExecutions', 'ASC')
			.addOrderBy('policy.id', 'ASC')
			.getRawOne<{ policyId: string }>();

		return row?.policyId ?? null;
	}

	/** Gives the group this policy only. */
	async replaceGroupPolicy(
		policyId: string,
		group: ExecutionLimitPolicyGroup,
		ctx: OperationContext,
	): Promise<void> {
		await this.deleteGroupPolicy(group, ctx);
		await this.table
			.managerFor(ctx)
			.insert(ExecutionLimitPolicyGroupAssignment, { policyId, group });
	}

	async deleteGroupPolicy(group: ExecutionLimitPolicyGroup, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(ExecutionLimitPolicyGroupAssignment, { group });
	}

	private async queryProjectPolicies(
		ctx: OperationContext,
		projectIds?: string[],
	): Promise<ProjectPolicy[]> {
		const query = this.table
			.managerFor(ctx)
			.createQueryBuilder(ExecutionLimitPolicyAssignment, 'assignment')
			.innerJoin(ExecutionLimitPolicy, 'policy', 'policy.id = assignment.policyId')
			.select('assignment.projectId', 'projectId')
			.addSelect('policy.id', 'policyId')
			.addSelect('policy.name', 'name')
			.addSelect('policy.maxExecutions', 'maxExecutions')
			.orderBy('assignment.projectId', 'ASC')
			.addOrderBy('policy.maxExecutions', 'ASC')
			.addOrderBy('policy.id', 'ASC');
		if (projectIds) query.where('assignment.projectId IN (:...projectIds)', { projectIds });

		return await query.getRawMany<ProjectPolicy>();
	}
}
