import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import type { DataTableTriggerOutput } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { DataTableMutationEvent } from '../entities/data-table-mutation-event';
import {
	DataTableTriggerDelivery,
	DataTableTriggerDeliveryStatus,
} from '../entities/data-table-trigger-delivery';

export type NewDataTableMutationEvent = {
	payload: DataTableTriggerOutput;
	recipients: Array<{ workflowId: string; nodeId: string }>;
};

@Service()
export class DataTableMutationEventRepository extends Repository<DataTableMutationEvent> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		super(DataTableMutationEvent, dataSource.manager);
	}

	async createWithDeliveries(
		events: NewDataTableMutationEvent[],
		trx: EntityManager,
	): Promise<void> {
		if (events.length === 0) return;

		const eventRows = events.map(({ payload }) => ({
			id: payload.eventId,
			dataTableId: payload.dataTableId,
			rowId: payload.rowId,
			event: payload.event,
			payload,
			occurredAt: new Date(payload.occurredAt),
		}));
		const deliveryRows = events.flatMap(({ payload, recipients }) =>
			recipients.map((recipient) => ({
				id: randomUUID(),
				eventId: payload.eventId,
				workflowId: recipient.workflowId,
				nodeId: recipient.nodeId,
				executionId: null,
				status: DataTableTriggerDeliveryStatus.Pending,
				attempts: 0,
				claimedBy: null,
				leaseEpoch: 0,
				leaseExpiresAt: null,
				nextAttemptAt: null,
				dispatchedAt: null,
				finishedAt: null,
				error: null,
			})),
		);

		for (let offset = 0; offset < eventRows.length; offset += 100) {
			await trx.insert(DataTableMutationEvent, eventRows.slice(offset, offset + 100));
		}
		for (let offset = 0; offset < deliveryRows.length; offset += 100) {
			await trx.insert(DataTableTriggerDelivery, deliveryRows.slice(offset, offset + 100));
		}
	}

	async deleteOrphansOlderThan(cutoff: Date, batchSize: number): Promise<number> {
		const eventTable = this.getTableName('data_table_mutation_event');
		const deliveryTable = this.getTableName('data_table_trigger_delivery');
		if (this.globalConfig.database.type === 'postgresdb') {
			const [row]: Array<{ count: string | number }> = await this.query(
				`WITH deleted AS (
					DELETE FROM ${eventTable}
					WHERE "id" IN (
						SELECT event."id" FROM ${eventTable} event
						WHERE event."occurredAt" < $1
						AND NOT EXISTS (
							SELECT 1 FROM ${deliveryTable} delivery
							WHERE delivery."eventId" = event."id"
						)
						LIMIT $2
					)
					RETURNING "id"
				)
				SELECT COUNT(*) AS "count" FROM deleted`,
				[cutoff, batchSize],
			);
			return Number(row.count);
		}

		return await this.manager.transaction(async (trx) => {
			await trx.query(
				`DELETE FROM ${eventTable}
				 WHERE "id" IN (
					SELECT event."id" FROM ${eventTable} event
					WHERE event."occurredAt" < ?
					AND NOT EXISTS (
						SELECT 1 FROM ${deliveryTable} delivery
						WHERE delivery."eventId" = event."id"
					)
					LIMIT ?
				 )`,
				[cutoff, batchSize],
			);
			const [{ count }]: Array<{ count: number }> = await trx.query('SELECT changes() AS count');
			return count;
		});
	}

	private getTableName(name: string): string {
		const { tablePrefix } = this.globalConfig.database;
		return this.manager.connection.driver.escape(`${tablePrefix}${name}`);
	}
}
