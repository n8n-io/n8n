import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { DateUtils } from '@n8n/typeorm/util/DateUtils';
import chunk from 'lodash/chunk';

import { ExecutionData } from '../entities';

const BATCH_SIZE = 900;

@Service()
export class ExecutionDataRepository extends Repository<ExecutionData> {
	constructor(dataSource: DataSource) {
		super(ExecutionData, dataSource.manager);
	}

	async createExecutionDataForExecution(
		data: QueryDeepPartialEntity<ExecutionData>,
		transactionManager: EntityManager,
	) {
		return await transactionManager.insert(ExecutionData, data);
	}

	async getWorkflowsExecutedSince(date: Date) {
		return await this.createQueryBuilder('executionData')
			.select('executionData.workflowData')
			.innerJoin('executionData.execution', 'execution')
			.where('execution.startedAt >= :date', {
				date: DateUtils.mixedDateToUtcDatetimeString(date),
			})
			.getMany()
			.then((results) => results.map(({ workflowData }) => workflowData));
	}

	async deleteMany(executionIds: string[]) {
		if (executionIds.length === 0) return;

		const executionIdBatches = chunk(executionIds, BATCH_SIZE);
		await this.manager.transaction(async (transactionManager) => {
			for (const batch of executionIdBatches) {
				await transactionManager.delete(ExecutionData, { executionId: In(batch) });
			}
		});
	}
}
