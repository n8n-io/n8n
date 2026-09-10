import {
	DataTableMutationEventRepository,
	DataTableRowAutomationRepository,
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
import { resolveEnumRows, resolveEnumValue } from './data-table-enum.utils';

type DataTableMutationListener = {
	event: DataTableTriggerEvent;
	columnId: string | null;
	handler: (payload: DataTableTriggerOutput) => void;
};

@Service()
export class DataTableMutationEventRecorder {
	private readonly listeners = new Map<string, Set<DataTableMutationListener>>();

	constructor(
		private readonly subscriptionRepository: DataTableTriggerSubscriptionRepository,
		private readonly eventRepository: DataTableMutationEventRepository,
		private readonly rowAutomationRepository: DataTableRowAutomationRepository,
	) {}

	listen(
		dataTableId: string,
		event: DataTableTriggerEvent,
		columnId: string | null,
		handler: (payload: DataTableTriggerOutput) => void,
	): () => void {
		const listener = { event, columnId, handler };
		const tableListeners = this.listeners.get(dataTableId) ?? new Set<DataTableMutationListener>();
		tableListeners.add(listener);
		this.listeners.set(dataTableId, tableListeners);

		return () => {
			tableListeners.delete(listener);
			if (tableListeners.size === 0) this.listeners.delete(dataTableId);
		};
	}

	hasListeners(dataTableId: string, event: DataTableTriggerEvent, columnIds: string[]): boolean {
		return [...(this.listeners.get(dataTableId) ?? [])].some(
			(listener) =>
				listener.event === event &&
				(event !== 'columnUpdated' ||
					(listener.columnId !== null && columnIds.includes(listener.columnId))),
		);
	}

	async prepareCapture(
		dataTableId: string,
		event: DataTableTriggerEvent,
		columnIds: string[],
		trx: EntityManager,
	): Promise<{ subscriptions: DataTableTriggerSubscription[]; shouldCapture: boolean }> {
		const subscriptions = await this.subscriptionRepository.findMatching(
			dataTableId,
			event,
			columnIds,
			trx,
		);
		return {
			subscriptions,
			shouldCapture: subscriptions.length > 0 || this.hasListeners(dataTableId, event, columnIds),
		};
	}

	async hasSubscriptionForColumn(dataTableId: string, columnId: string): Promise<boolean> {
		return await this.subscriptionRepository.hasForColumn(dataTableId, columnId);
	}

	async recordInserted(
		dataTableId: string,
		rows: DataTableRowReturn[],
		subscriptions: DataTableTriggerSubscription[],
		trx: EntityManager,
		columns: DataTableColumn[] = [],
	): Promise<void> {
		await this.recordRows('rowInserted', dataTableId, rows, subscriptions, trx, columns);
	}

	async recordDeleted(
		dataTableId: string,
		rows: DataTableRowReturn[],
		subscriptions: DataTableTriggerSubscription[],
		trx: EntityManager,
		columns: DataTableColumn[] = [],
	): Promise<void> {
		await this.recordRows('rowDeleted', dataTableId, rows, subscriptions, trx, columns);
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
		const watchedColumnIds = new Set([
			...subscriptions.flatMap((subscription) =>
				subscription.columnId ? [subscription.columnId] : [],
			),
			...[...(this.listeners.get(dataTableId) ?? [])].flatMap((listener) =>
				listener.event === 'columnUpdated' && listener.columnId ? [listener.columnId] : [],
			),
		]);
		const events = [];

		for (const row of afterRows) {
			const before = beforeById.get(row.id);
			if (!before) continue;

			const changesByColumnId = new Map<string, DataTableTriggerChange>();
			for (const columnId of watchedColumnIds) {
				const column = columnsById.get(columnId);
				if (!column) continue;

				const beforeValue = before[column.name] ?? null;
				const afterValue = row[column.name] ?? null;
				if (this.valuesEqual(beforeValue, afterValue)) continue;
				changesByColumnId.set(columnId, {
					columnId,
					columnName: column.name,
					before: resolveEnumValue(beforeValue, column),
					after: resolveEnumValue(afterValue, column),
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
			const [resolvedRow] = resolveEnumRows([row], columns);
			const payload = this.createPayload('columnUpdated', dataTableId, resolvedRow, changes);
			events.push({ payload, recipients });
		}

		await this.persistAndNotify(events, trx);
	}

	private async recordRows(
		event: 'rowInserted' | 'rowDeleted',
		dataTableId: string,
		rows: DataTableRowReturn[],
		subscriptions: DataTableTriggerSubscription[],
		trx: EntityManager,
		columns: DataTableColumn[],
	): Promise<void> {
		const recipients = subscriptions.map(({ workflowId, nodeId }) => ({ workflowId, nodeId }));
		await this.persistAndNotify(
			resolveEnumRows(rows, columns).map((row) => ({
				payload: this.createPayload(event, dataTableId, row),
				recipients,
			})),
			trx,
		);
	}

	private async persistAndNotify(
		events: Array<{
			payload: DataTableTriggerOutput;
			recipients: Array<{ workflowId: string; nodeId: string }>;
		}>,
		trx: EntityManager,
	): Promise<void> {
		const durableEvents = events.filter(({ recipients }) => recipients.length > 0);
		if (durableEvents.length > 0) {
			await this.eventRepository.createWithDeliveries(durableEvents, trx);
			await this.rowAutomationRepository.setStatus(
				durableEvents
					// A deleted row has no cell left to show a status in.
					.filter(({ payload }) => payload.event !== 'rowDeleted')
					.flatMap(({ payload, recipients }) =>
						recipients.map((recipient) => ({
							dataTableId: payload.dataTableId,
							rowId: payload.rowId,
							...recipient,
							status: 'waiting' as const,
							executionId: null,
							error: null,
						})),
					),
				trx,
			);
		}

		for (const { payload } of events) {
			this.notifyListeners(payload);
		}
	}

	private notifyListeners(payload: DataTableTriggerOutput): void {
		for (const listener of this.listeners.get(payload.dataTableId) ?? []) {
			if (listener.event !== payload.event) continue;
			if (
				payload.event === 'columnUpdated' &&
				(!listener.columnId ||
					!payload.changes?.some((change) => change.columnId === listener.columnId))
			) {
				continue;
			}
			setImmediate(() => {
				if (this.listeners.get(payload.dataTableId)?.has(listener)) {
					listener.handler(payload);
				}
			});
		}
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
