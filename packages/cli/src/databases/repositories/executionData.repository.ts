import { Service } from 'typedi';
import type { EntityManager } from '@n8n/typeorm';
import type { IWorkflowBase } from 'n8n-workflow';
import { DataSource, In, Repository } from '@n8n/typeorm';
import { ExecutionData } from '../entities/ExecutionData';

export interface CreateExecutionDataOpts extends Pick<ExecutionData, 'data' | 'executionId'> {
	workflowData: Pick<IWorkflowBase, 'connections' | 'nodes' | 'name' | 'settings' | 'id'>;
}

@Service()
export class ExecutionDataRepository extends Repository<ExecutionData> {
	constructor(dataSource: DataSource) {
		super(ExecutionData, dataSource.manager);
	}

	async createExecutionDataForExecution(
		executionData: CreateExecutionDataOpts,
		transactionManager: EntityManager,
	) {
		const { data, executionId, workflowData } = executionData;

		return await transactionManager.insert(ExecutionData, {
			executionId,
			data,
			workflowData,
		});
	}

	async findByExecutionIds(executionIds: string[]) {
		return await this.find({
			select: ['workflowData'],
			where: {
				executionId: In(executionIds),
			},
		}).then((executionData) => executionData.map(({ workflowData }) => workflowData));
	}
}
