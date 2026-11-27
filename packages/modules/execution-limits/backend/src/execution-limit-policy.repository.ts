import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { ExecutionLimitPolicyAssignment } from './execution-limit-policy-assignment.entity';
import { ExecutionLimitPolicy } from './execution-limit-policy.entity';
import type { ProjectLimit } from './execution-limits.types';

class AssignmentTable extends BaseRepository<ExecutionLimitPolicyAssignment> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ExecutionLimitPolicyAssignment, dataSource.manager, transactionRunner);
	}
}

/** Reads the execution limit policies and their assignments. */
@Service()
export class ExecutionLimitPolicyRepository {
	private readonly assignments: AssignmentTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.assignments = new AssignmentTable(dataSource, transactionRunner);
	}

	/**
	 * The limit of each project that has a policy. A project with several policies gets
	 * the lowest maximum.
	 */
	async findProjectLimits(ctx: OperationContext): Promise<ProjectLimit[]> {
		const rows = await this.assignments
			.managerFor(ctx)
			.createQueryBuilder(ExecutionLimitPolicyAssignment, 'assignment')
			.innerJoin(ExecutionLimitPolicy, 'policy', 'policy.id = assignment.policyId')
			.select('assignment.projectId', 'projectId')
			.addSelect('MIN(policy.maxExecutions)', 'maxExecutions')
			.groupBy('assignment.projectId')
			.getRawMany<{ projectId: string; maxExecutions: number | string }>();

		return rows.map(({ projectId, maxExecutions }) => ({
			projectId,
			maxExecutions: Number(maxExecutions),
		}));
	}
}
