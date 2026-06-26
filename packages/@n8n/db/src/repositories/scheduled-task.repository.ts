import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { ScheduledTask, ScheduledTaskStatus } from '../entities/scheduled-task';

interface ScheduledTaskId {
	id: number;
}

@Service()
export class ScheduledTaskRepository extends Repository<ScheduledTask> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		super(ScheduledTask, dataSource.manager);
	}

	async claimDueTasks(
		batchSize: number,
		claimedBy: string,
		leaseMs: number,
		lookaheadMs: number,
	): Promise<ScheduledTask[]> {
		if (this.globalConfig.database.type === 'postgresdb') {
			return await this.claimDueTasksPostgres(batchSize, claimedBy, leaseMs, lookaheadMs);
		}

		return await this.claimDueTasksSqlite(batchSize, claimedBy, leaseMs, lookaheadMs);
	}

	private async claimDueTasksPostgres(
		batchSize: number,
		claimedBy: string,
		leaseMs: number,
		lookaheadMs: number,
	): Promise<ScheduledTask[]> {
		const tableName = this.getTableName('scheduled_task');

		const [rows]: [ScheduledTaskId[], number] = await this.query(
			`UPDATE ${tableName}
				 SET "status" = '${ScheduledTaskStatus.Running}',
				 "claimedBy" = $1,
				 "leaseExpiresAt" = CURRENT_TIMESTAMP(3) + ($2 * INTERVAL '1 millisecond'),
				 "startedAt" = CURRENT_TIMESTAMP(3),
				 "updatedAt" = CURRENT_TIMESTAMP(3)
				 WHERE "id" IN (
					 SELECT "id" FROM ${tableName}
					 WHERE "status" = '${ScheduledTaskStatus.Pending}'
					 AND "runAt" <= CURRENT_TIMESTAMP(3) + ($3 * INTERVAL '1 millisecond')
					 ORDER BY "runAt" ASC
					 LIMIT $4
					 FOR UPDATE SKIP LOCKED
				 )
				 RETURNING "id"`,
			[claimedBy, leaseMs, lookaheadMs, batchSize],
		);

		return await this.findTasksByIds(rows.map(({ id }) => id));
	}

	private async claimDueTasksSqlite(
		batchSize: number,
		claimedBy: string,
		leaseMs: number,
		lookaheadMs: number,
	): Promise<ScheduledTask[]> {
		return await this.manager.transaction(async (tx) => {
			const tableName = this.getTableName('scheduled_task');

			const rows = await tx.query<ScheduledTaskId[]>(
				`SELECT "id" FROM ${tableName}
				 WHERE "status" = ?
				 AND "runAt" <= STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '+' || (? / 1000.0) || ' seconds')
				 ORDER BY "runAt" ASC
				 LIMIT ?`,
				[ScheduledTaskStatus.Pending, lookaheadMs, batchSize],
			);
			const ids = rows.map(({ id }) => id);
			if (ids.length === 0) return [];

			await tx.query(
				`UPDATE ${tableName}
				 SET "status" = ?,
				 "claimedBy" = ?,
				 "leaseExpiresAt" = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '+' || (? / 1000.0) || ' seconds'),
				 "startedAt" = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'),
				 "updatedAt" = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
				 WHERE "status" = ?
				 AND "id" IN (${ids.map(() => '?').join(', ')})`,
				[ScheduledTaskStatus.Running, claimedBy, leaseMs, ScheduledTaskStatus.Pending, ...ids],
			);

			return await this.findTasksByIds(ids, tx);
		});
	}

	async recordExecution(taskId: number, claimedBy: string, executionId: string): Promise<void> {
		const tableName = this.getTableName('scheduled_task');

		if (this.globalConfig.database.type === 'postgresdb') {
			await this.query(
				`UPDATE ${tableName}
				 SET "executionId" = $1,
				 "updatedAt" = CURRENT_TIMESTAMP(3)
				 WHERE "id" = $2
				 AND "status" = $3
				 AND "claimedBy" = $4`,
				[executionId, taskId, ScheduledTaskStatus.Running, claimedBy],
			);
			return;
		}

		await this.query(
			`UPDATE ${tableName}
			 SET "executionId" = ?,
			 "updatedAt" = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
			 WHERE "id" = ?
			 AND "status" = ?
			 AND "claimedBy" = ?`,
			[executionId, taskId, ScheduledTaskStatus.Running, claimedBy],
		);
	}

	async markSucceeded(taskId: number, claimedBy: string): Promise<void> {
		const tableName = this.getTableName('scheduled_task');

		if (this.globalConfig.database.type === 'postgresdb') {
			await this.query(
				`UPDATE ${tableName}
				 SET "status" = $1,
				 "finishedAt" = CURRENT_TIMESTAMP(3),
				 "leaseExpiresAt" = NULL,
				 "updatedAt" = CURRENT_TIMESTAMP(3)
				 WHERE "id" = $2
				 AND "status" = $3
				 AND "claimedBy" = $4`,
				[ScheduledTaskStatus.Succeeded, taskId, ScheduledTaskStatus.Running, claimedBy],
			);
			return;
		}

		await this.query(
			`UPDATE ${tableName}
			 SET "status" = ?,
			 "finishedAt" = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'),
			 "leaseExpiresAt" = NULL,
			 "updatedAt" = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
			 WHERE "id" = ?
			 AND "status" = ?
			 AND "claimedBy" = ?`,
			[ScheduledTaskStatus.Succeeded, taskId, ScheduledTaskStatus.Running, claimedBy],
		);
	}

	async markFailed(taskId: number, claimedBy: string, error: string): Promise<void> {
		const tableName = this.getTableName('scheduled_task');

		if (this.globalConfig.database.type === 'postgresdb') {
			await this.query(
				`UPDATE ${tableName}
				 SET "status" = $1,
				 "finishedAt" = CURRENT_TIMESTAMP(3),
				 "leaseExpiresAt" = NULL,
				 "errorMessage" = $2,
				 "updatedAt" = CURRENT_TIMESTAMP(3)
				 WHERE "id" = $3
				 AND "status" = $4
				 AND "claimedBy" = $5`,
				[ScheduledTaskStatus.Failed, error, taskId, ScheduledTaskStatus.Running, claimedBy],
			);
			return;
		}

		await this.query(
			`UPDATE ${tableName}
			 SET "status" = ?,
			 "finishedAt" = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'),
			 "leaseExpiresAt" = NULL,
			 "errorMessage" = ?,
			 "updatedAt" = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
			 WHERE "id" = ?
			 AND "status" = ?
			 AND "claimedBy" = ?`,
			[ScheduledTaskStatus.Failed, error, taskId, ScheduledTaskStatus.Running, claimedBy],
		);
	}

	async countByStatus() {
		return await this.createQueryBuilder('task')
			.select('task.status', 'status')
			.addSelect('COUNT(*)', 'count')
			.groupBy('task.status')
			.getRawMany<{ status: ScheduledTaskStatus; count: string }>();
	}

	private getTableName(name: string): string {
		const { tablePrefix } = this.globalConfig.database;
		return this.manager.connection.driver.escape(`${tablePrefix}${name}`);
	}

	private async findTasksByIds(ids: number[], manager = this.manager): Promise<ScheduledTask[]> {
		if (ids.length === 0) return [];

		const tasks = await manager.find(ScheduledTask, { where: { id: In(ids) } });
		const order = new Map(ids.map((id, index) => [id, index]));

		return tasks.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
	}
}
