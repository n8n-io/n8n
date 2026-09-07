import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { Brackets, DataSource, Repository } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import {
	DataTableTriggerDelivery,
	DataTableTriggerDeliveryStatus as Status,
} from '../entities/data-table-trigger-delivery';

export type DataTableTriggerDeliveryFence = {
	id: string;
	claimedBy: string;
	leaseEpoch: number;
};

@Service()
export class DataTableTriggerDeliveryRepository extends Repository<DataTableTriggerDelivery> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		super(DataTableTriggerDelivery, dataSource.manager);
	}

	async claimNext(claimedBy: string, leaseMs: number): Promise<DataTableTriggerDelivery | null> {
		const leaseExpiresAt = new Date(Date.now() + leaseMs);
		if (this.globalConfig.database.type === 'postgresdb') {
			const tableName = this.getTableName();
			const [rows]: [DataTableTriggerDelivery[], number] = await this.query(
				`UPDATE ${tableName}
				 SET "status" = '${Status.InProgress}',
				     "claimedBy" = $1,
				     "leaseEpoch" = "leaseEpoch" + 1,
				     "leaseExpiresAt" = $2,
				     "attempts" = "attempts" + 1,
				     "updatedAt" = CURRENT_TIMESTAMP(3)
				 WHERE "id" = (
					SELECT "id" FROM ${tableName}
					WHERE (
						"status" = '${Status.Pending}'
						AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= CURRENT_TIMESTAMP(3))
					) OR (
						"status" = '${Status.InProgress}'
						AND "leaseExpiresAt" <= CURRENT_TIMESTAMP(3)
					)
					ORDER BY "createdAt" ASC, "id" ASC
					LIMIT 1
					FOR UPDATE SKIP LOCKED
				 )
				 RETURNING *`,
				[claimedBy, leaseExpiresAt],
			);
			return rows[0] ?? null;
		}

		return await this.manager.transaction(async (trx) => {
			const delivery = await trx
				.createQueryBuilder(DataTableTriggerDelivery, 'delivery')
				.where(
					new Brackets((query) => {
						query.where('delivery.status = :pending', { pending: Status.Pending }).andWhere(
							new Brackets((due) => {
								due
									.where('delivery.nextAttemptAt IS NULL')
									.orWhere('delivery.nextAttemptAt <= :now', { now: new Date() });
							}),
						);
					}),
				)
				.orWhere(
					new Brackets((query) => {
						query
							.where('delivery.status = :inProgress', { inProgress: Status.InProgress })
							.andWhere('delivery.leaseExpiresAt <= :now', { now: new Date() });
					}),
				)
				.orderBy('delivery.createdAt', 'ASC')
				.addOrderBy('delivery.id', 'ASC')
				.getOne();
			if (!delivery) return null;

			await trx.update(
				DataTableTriggerDelivery,
				{ id: delivery.id },
				{
					status: Status.InProgress,
					claimedBy,
					leaseEpoch: delivery.leaseEpoch + 1,
					leaseExpiresAt,
					attempts: delivery.attempts + 1,
				},
			);

			delivery.status = Status.InProgress;
			delivery.claimedBy = claimedBy;
			delivery.leaseEpoch += 1;
			delivery.leaseExpiresAt = leaseExpiresAt;
			delivery.attempts += 1;
			return delivery;
		});
	}

	async markCompleted(fence: DataTableTriggerDeliveryFence, executionId: string): Promise<void> {
		await this.transition(
			fence,
			{
				status: Status.Completed,
				executionId,
				dispatchedAt: new Date(),
				finishedAt: new Date(),
				leaseExpiresAt: null,
				error: null,
			},
			Status.Completed,
		);
	}

	async markCancelled(fence: DataTableTriggerDeliveryFence, error: string): Promise<void> {
		await this.transition(
			fence,
			{
				status: Status.Cancelled,
				finishedAt: new Date(),
				leaseExpiresAt: null,
				error,
			},
			Status.Cancelled,
		);
	}

	async markFailed(fence: DataTableTriggerDeliveryFence, error: string): Promise<void> {
		await this.transition(
			fence,
			{
				status: Status.Failed,
				finishedAt: new Date(),
				leaseExpiresAt: null,
				error,
			},
			Status.Failed,
		);
	}

	async scheduleRetry(
		fence: DataTableTriggerDeliveryFence,
		error: string,
		nextAttemptAt: Date,
	): Promise<void> {
		await this.transition(
			fence,
			{
				status: Status.Pending,
				claimedBy: null,
				leaseExpiresAt: null,
				nextAttemptAt,
				error,
			},
			Status.Pending,
		);
	}

	async deleteExpired(
		completedBefore: Date,
		failedBefore: Date,
		batchSize: number,
	): Promise<number> {
		const tableName = this.getTableName();
		if (this.globalConfig.database.type === 'postgresdb') {
			const [row]: Array<{ count: string | number }> = await this.query(
				`WITH deleted AS (
					DELETE FROM ${tableName}
					WHERE "id" IN (
						SELECT "id" FROM ${tableName}
						WHERE (
							"status" IN ('${Status.Completed}', '${Status.Cancelled}')
							AND "finishedAt" < $1
						) OR (
							"status" = '${Status.Failed}'
							AND "finishedAt" < $2
						)
						LIMIT $3
					)
					RETURNING "id"
				)
				SELECT COUNT(*) AS "count" FROM deleted`,
				[completedBefore, failedBefore, batchSize],
			);
			return Number(row.count);
		}

		return await this.manager.transaction(async (trx) => {
			await trx.query(
				`DELETE FROM ${tableName}
				 WHERE "id" IN (
					SELECT "id" FROM ${tableName}
					WHERE (
						"status" IN ('${Status.Completed}', '${Status.Cancelled}')
						AND "finishedAt" < ?
					) OR (
						"status" = '${Status.Failed}'
						AND "finishedAt" < ?
					)
					LIMIT ?
				 )`,
				[completedBefore, failedBefore, batchSize],
			);
			const [{ count }]: Array<{ count: number }> = await trx.query('SELECT changes() AS count');
			return count;
		});
	}

	private async transition(
		fence: DataTableTriggerDeliveryFence,
		update: Partial<DataTableTriggerDelivery>,
		target: Status,
	): Promise<void> {
		const result = await this.update(
			{
				id: fence.id,
				claimedBy: fence.claimedBy,
				leaseEpoch: fence.leaseEpoch,
				status: Status.InProgress,
			},
			update,
		);
		if (result.affected !== 1) {
			throw new UnexpectedError(
				`Could not fence Data Table trigger delivery ${fence.id} while moving it to '${target}'`,
			);
		}
	}

	private getTableName(): string {
		const { tablePrefix } = this.globalConfig.database;
		return this.manager.connection.driver.escape(`${tablePrefix}data_table_trigger_delivery`);
	}
}
