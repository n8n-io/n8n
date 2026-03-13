import { DataSource, In, Not, Repository } from '@n8n/typeorm';

import { WorkflowStepExecution } from '../entities';
import { TERMINAL_STATUSES } from '../enums';

export class WorkflowStepExecutionRepository extends Repository<WorkflowStepExecution> {
	constructor(dataSource: DataSource) {
		super(WorkflowStepExecution, dataSource.manager);
	}

	async findByExecutionId(executionId: string): Promise<WorkflowStepExecution[]> {
		return await this.find({
			where: { executionId },
			order: { createdAt: 'ASC' },
		});
	}

	async countNonTerminal(executionId: string): Promise<number> {
		return await this.count({
			where: {
				executionId,
				status: Not(In(TERMINAL_STATUSES)),
			},
		});
	}
}
