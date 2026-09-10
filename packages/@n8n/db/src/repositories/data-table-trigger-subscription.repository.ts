import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import type { DataTableTriggerEvent } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { BaseRepository } from './base-repository';
import { DataTableTriggerSubscription } from '../entities/data-table-trigger-subscription';
import { WorkflowEntity } from '../entities/workflow-entity';
import { type OperationContext, TransactionRunner } from '../services/transaction';

export type NewDataTableTriggerSubscription = {
	workflowId: string;
	nodeId: string;
	projectId: string;
	dataTableId: string;
	event: DataTableTriggerEvent;
	columnId: string | null;
};

@Service()
export class DataTableTriggerSubscriptionRepository extends BaseRepository<DataTableTriggerSubscription> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(DataTableTriggerSubscription, dataSource.manager, transactionRunner);
	}

	async replaceForWorkflow(
		workflowId: string,
		subscriptions: NewDataTableTriggerSubscription[],
		ctx: OperationContext = {},
	): Promise<void> {
		const manager = this.managerFor(ctx);
		await manager.delete(DataTableTriggerSubscription, { workflowId });
		if (subscriptions.length === 0) return;

		await manager.insert(
			DataTableTriggerSubscription,
			subscriptions.map((subscription) => ({
				...subscription,
				id: randomUUID(),
			})),
		);
	}

	async findMatching(
		dataTableId: string,
		event: DataTableTriggerEvent,
		columnIds: string[] = [],
		trx?: EntityManager,
	): Promise<DataTableTriggerSubscription[]> {
		const query = (trx ?? this.manager)
			.createQueryBuilder(DataTableTriggerSubscription, 'subscription')
			.where('subscription.dataTableId = :dataTableId', { dataTableId })
			.andWhere('subscription.event = :event', { event });

		if (event === 'columnUpdated') {
			if (columnIds.length === 0) return [];
			query.andWhere('subscription.columnId IN (:...columnIds)', { columnIds });
		}

		return await query.getMany();
	}

	/** The trigger nodes that listen to each table, with the workflow name for display. */
	async findByDataTableIds(
		dataTableIds: string[],
	): Promise<
		Array<{ dataTableId: string; workflowId: string; workflowName: string | null; nodeId: string }>
	> {
		if (dataTableIds.length === 0) return [];
		const { entities, raw } = await this.createQueryBuilder('subscription')
			.leftJoin(WorkflowEntity, 'workflow', 'workflow.id = subscription.workflowId')
			.addSelect('workflow.name', 'workflowName')
			.where('subscription.dataTableId IN (:...dataTableIds)', { dataTableIds })
			.getRawAndEntities<{ workflowName: string | null }>();
		return entities.map(({ dataTableId, workflowId, nodeId }, index) => ({
			dataTableId,
			workflowId,
			workflowName: raw[index].workflowName ?? null,
			nodeId,
		}));
	}

	async hasForColumn(dataTableId: string, columnId: string): Promise<boolean> {
		return await this.existsBy({ dataTableId, columnId });
	}

	async transferProject(
		fromProjectId: string,
		toProjectId: string,
		trx: EntityManager,
	): Promise<void> {
		await trx.update(
			DataTableTriggerSubscription,
			{ projectId: fromProjectId },
			{ projectId: toProjectId },
		);
	}
}
