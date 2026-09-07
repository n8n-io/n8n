import { DataTableConfig } from '@n8n/config';
import {
	DataTableMutationEventRepository,
	DataTableTriggerSubscriptionRepository,
	type DataTableTriggerSubscription,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import type {
	DataTableRowReturn,
	DataTableTriggerChange,
	DataTableTriggerEvent,
	DataTableTriggerOutput,
} from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import type { DataTableColumn } from './data-table-column.entity';

@Service()
export class DataTableMutationEventRecorder {
	constructor(
		private readonly config: DataTableConfig,
		private readonly subscriptionRepository: DataTableTriggerSubscriptionRepository,
		private readonly eventRepository: DataTableMutationEventRepository,
	) {}

	async hasSubscriptionForColumn(dataTableId: string, columnId: string): Promise<boolean> {
		if (!this.config.triggerEnabled) return false;
		return await this.subscriptionRepository.hasForColumn(dataTableId, columnId);
	}

	async findSubscriptions(
		dataTableId: string,
		event: DataTableTriggerEvent,
		columnIds: string[],
		trx: EntityManager,
	): Promise<DataTableTriggerSubscription[]> {
		if (!this.config.triggerEnabled) return [];
		return await this.subscriptionRepository.findMatching(dataTableId, event, columnIds, trx);
	}

	async recordInserted(
		dataTableId: string,
		rows: DataTableRowReturn[],
		subscriptions: DataTableTriggerSubscription[],
		trx: EntityManager,
	): Promise<void> {
		await this.recordRows('rowInserted', dataTableId, rows, subscriptions, trx);
	}

	async recordDeleted(
		dataTableId: string,
		rows: DataTableRowReturn[],
		subscriptions: DataTableTriggerSubscription[],
		trx: EntityManager,
	): Promise<void> {
		await this.recordRows('rowDeleted', dataTableId, rows, subscriptions, trx);
	}

	async recordUpdated(
		dataTableId: string,
		beforeRows: DataTableRowReturn[],
		afterRows: DataTableRowReturn[],
		columns: DataTableColumn[],
		subscriptions: DataTableTriggerSubscription[],
		trx: EntityManager,
	): Promise<void> {
		const beforeById = new Map(beforeRows.map((row) => [row.id, row]));
		const columnsById = new Map(columns.map((column) => [column.id, column]));
		const events = [];

		for (const row of afterRows) {
			const before = beforeById.get(row.id);
			if (!before) continue;

			const changesByColumnId = new Map<string, DataTableTriggerChange>();
			for (const subscription of subscriptions) {
				if (!subscription.columnId || changesByColumnId.has(subscription.columnId)) continue;
				const column = columnsById.get(subscription.columnId);
				if (!column) continue;

				const beforeValue = before[column.name] ?? null;
				const afterValue = row[column.name] ?? null;
				if (this.valuesEqual(beforeValue, afterValue)) continue;
				changesByColumnId.set(subscription.columnId, {
					columnId: subscription.columnId,
					columnName: column.name,
					before: beforeValue,
					after: afterValue,
				});
			}

			const changes = [...changesByColumnId.values()];
			if (changes.length === 0) continue;
			const changedColumnIds = new Set(changes.map((change) => change.columnId));
			const recipients = subscriptions
				.filter(
					(subscription) => subscription.columnId && changedColumnIds.has(subscription.columnId),
				)
				.map(({ workflowId, nodeId }) => ({ workflowId, nodeId }));
			const payload = this.createPayload('columnUpdated', dataTableId, row, changes);
			events.push({ payload, recipients });
		}

		await this.eventRepository.createWithDeliveries(events, trx);
	}

	private async recordRows(
		event: 'rowInserted' | 'rowDeleted',
		dataTableId: string,
		rows: DataTableRowReturn[],
		subscriptions: DataTableTriggerSubscription[],
		trx: EntityManager,
	): Promise<void> {
		const recipients = subscriptions.map(({ workflowId, nodeId }) => ({ workflowId, nodeId }));
		await this.eventRepository.createWithDeliveries(
			rows.map((row) => ({
				payload: this.createPayload(event, dataTableId, row),
				recipients,
			})),
			trx,
		);
	}

	private createPayload(
		event: DataTableTriggerEvent,
		dataTableId: string,
		row: DataTableRowReturn,
		changes?: DataTableTriggerChange[],
	): DataTableTriggerOutput {
		const eventId = randomUUID();
		return {
			eventId,
			event,
			dataTableId,
			rowId: row.id,
			occurredAt: new Date().toISOString(),
			row,
			...(changes ? { changes } : {}),
		};
	}

	private valuesEqual(left: unknown, right: unknown): boolean {
		if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime();
		return Object.is(left, right);
	}
}
