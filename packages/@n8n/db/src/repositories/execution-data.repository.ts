import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { UpsertOptions } from '@n8n/typeorm/repository/UpsertOptions';

import { ExecutionData } from '../entities';

@Service()
export class ExecutionDataRepository extends Repository<ExecutionData> {
	constructor(dataSource: DataSource) {
		super(ExecutionData, dataSource.manager);
	}

	private toCompacted(data: QueryDeepPartialEntity<ExecutionData>) {
		// If we can source properties from the workflow history we drop them from
		const replacedProps = data.workflowVersionId
			? { name: undefined, nodes: undefined, connections: undefined }
			: {};

		return {
			...data,
			workflowData: { ...data.workflowData, ...replacedProps },
		};
	}

	async createExecutionDataForExecution(
		data: QueryDeepPartialEntity<ExecutionData>,
		transactionManager: EntityManager,
	) {
		const compacted = this.toCompacted(data);
		return await transactionManager.insert(ExecutionData, compacted);
	}

	async doUpsert(
		data: QueryDeepPartialEntity<ExecutionData>,
		constraints: string[] | UpsertOptions<ExecutionData>,
	) {
		const res = this.toCompacted(data);
		await this.upsert(res, constraints);
	}

	async findByExecutionIds(executionIds: string[]) {
		return await this.find({
			select: ['workflowData', 'workflowHistory'],
			where: {
				executionId: In(executionIds),
			},
			relations: {
				workflowHistory: true, // todo: is this query "smart" enough to only fetch each history once or is it worthwhile to collect versionIds in these executions and then query those separately and merge after?
			},
		}).then((executionData) => executionData.map((x) => x.getWorkflowData()));
	}

	async deleteMany(executionIds: string[]) {
		if (executionIds.length === 0) return;

		await this.delete({ executionId: In(executionIds) });
	}
}
