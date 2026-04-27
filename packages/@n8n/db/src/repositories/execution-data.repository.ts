import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { DateUtils } from '@n8n/typeorm/util/DateUtils';
import chunk from 'lodash/chunk';
import type { IWorkflowBase } from 'n8n-workflow';

import { ExecutionData, ExecutionEntity, WorkflowHistory } from '../entities';

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

	/**
	 * Return the workflow snapshots for every execution started since `date`.
	 *
	 * Versioned executions (post-cutover) carry a `workflowVersionId` and have
	 * no snapshot; their nodes/connections live in `workflow_history` instead.
	 * For those rows we prefer the history record. Pre-cutover or unsaved-workflow
	 * executions still fall back to the snapshot.
	 */
	async getWorkflowsExecutedSince(date: Date): Promise<IWorkflowBase[]> {
		const rows = await this.manager
			.createQueryBuilder(ExecutionEntity, 'execution')
			.leftJoin('execution.executionData', 'executionData')
			.leftJoin(WorkflowHistory, 'wh', 'wh.versionId = execution.workflowVersionId')
			.select([
				'executionData.workflowData AS "snapshotData"',
				'wh.nodes AS "historyNodes"',
				'wh.connections AS "historyConnections"',
				'wh.name AS "historyName"',
				'wh.settings AS "historySettings"',
				'execution.workflowVersionId AS "versionId"',
				'execution.workflowId AS "workflowId"',
			])
			.where('execution.startedAt >= :date', {
				date: DateUtils.mixedDateToUtcDatetimeString(date),
			})
			.getRawMany<{
				snapshotData: IWorkflowBase | null;
				historyNodes: IWorkflowBase['nodes'] | null;
				historyConnections: IWorkflowBase['connections'] | null;
				historyName: string | null;
				historySettings: IWorkflowBase['settings'] | null;
				versionId: string | null;
				workflowId: string | null;
			}>();

		const result: IWorkflowBase[] = [];
		for (const row of rows) {
			if (row.versionId && row.historyNodes) {
				result.push({
					...(row.snapshotData ?? ({} as IWorkflowBase)),
					id: row.workflowId ?? row.snapshotData?.id ?? '',
					name: row.historyName ?? row.snapshotData?.name ?? '',
					nodes: row.historyNodes,
					connections: row.historyConnections ?? {},
					...(row.historySettings ? { settings: row.historySettings } : {}),
				} as IWorkflowBase);
			} else if (row.snapshotData) {
				result.push(row.snapshotData);
			}
		}
		return result;
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
