import { Service } from '@n8n/di';
import { DataSource, In, Not } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import type {
	DataTableAutomationStatus,
	DataTableRowAutomation as RowAutomation,
} from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { BaseRepository } from './base-repository';
import { DataTableRowAutomation } from '../entities/data-table-row-automation';
import { ExecutionEntity } from '../entities/execution-entity';
import { WorkflowEntity } from '../entities/workflow-entity';
import { type OperationContext, TransactionRunner } from '../services/transaction';

type RowAutomationState = Pick<
	DataTableRowAutomation,
	'dataTableId' | 'rowId' | 'workflowId' | 'nodeId' | 'status' | 'executionId' | 'error'
>;

@Service()
export class DataTableRowAutomationRepository extends BaseRepository<DataTableRowAutomation> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(DataTableRowAutomation, dataSource.manager, transactionRunner);
	}

	async setStatus(entries: RowAutomationState[], trx?: EntityManager): Promise<void> {
		if (entries.length === 0) return;
		await (trx ?? this.manager)
			.createQueryBuilder()
			.insert()
			.into(DataTableRowAutomation)
			.values(entries.map((entry) => ({ id: randomUUID(), ...entry, updatedAt: new Date() })))
			.orUpdate(
				['status', 'executionId', 'error', 'updatedAt'],
				['dataTableId', 'rowId', 'workflowId', 'nodeId'],
			)
			.execute();
	}

	/** Runs for every finished execution, so it must stay one indexed update. */
	async finishExecution(
		executionId: string,
		status: DataTableAutomationStatus,
		error: string | null,
	): Promise<void> {
		await this.update({ executionId }, { status, error });
	}

	async findForRows(
		dataTableId: string,
		rowIds: number[],
	): Promise<Array<RowAutomation & { rowId: number }>> {
		if (rowIds.length === 0) return [];
		const { entities, raw } = await this.createQueryBuilder('automation')
			.leftJoin(WorkflowEntity, 'workflow', 'workflow.id = automation.workflowId')
			.leftJoin(ExecutionEntity, 'execution', 'execution.id = automation.executionId')
			.addSelect('workflow.name', 'workflowName')
			.addSelect('execution.id', 'existingExecutionId')
			.where('automation.dataTableId = :dataTableId', { dataTableId })
			.andWhere('automation.rowId IN (:...rowIds)', { rowIds })
			.getRawAndEntities<{ workflowName: string | null; existingExecutionId: string | null }>();

		return entities.map(({ id: _, dataTableId: __, ...entity }, index) => ({
			...entity,
			workflowName: raw[index].workflowName ?? null,
			executionExists: raw[index].existingExecutionId !== null,
		}));
	}

	/** Removes state for rows that no longer exist in the table's row storage. */
	async deleteOrphans(
		dataTableId: string,
		rowsTableName: string,
		trx?: EntityManager,
	): Promise<void> {
		const manager = trx ?? this.manager;
		const escape = (name: string) => manager.connection.driver.escape(name);
		await manager
			.createQueryBuilder()
			.delete()
			.from(DataTableRowAutomation)
			.where(`${escape('dataTableId')} = :dataTableId`, { dataTableId })
			.andWhere(`${escape('rowId')} NOT IN (SELECT ${escape('id')} FROM ${escape(rowsTableName)})`)
			.execute();
	}

	async deleteForTable(dataTableId: string, trx?: EntityManager): Promise<void> {
		await (trx ?? this.manager).delete(DataTableRowAutomation, { dataTableId });
	}

	/** Clears the state of trigger nodes that the workflow no longer publishes. */
	async deleteForWorkflowExcept(
		workflowId: string,
		keepNodeIds: string[],
		ctx: OperationContext = {},
	): Promise<void> {
		await this.managerFor(ctx).delete(DataTableRowAutomation, {
			workflowId,
			...(keepNodeIds.length > 0 ? { nodeId: Not(In(keepNodeIds)) } : {}),
		});
	}
}
