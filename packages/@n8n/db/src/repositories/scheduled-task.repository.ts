import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { ScheduledTask, ScheduledTaskStatus } from '../entities/scheduled-task';

@Service()
export class ScheduledTaskRepository extends Repository<ScheduledTask> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		super(ScheduledTask, dataSource.manager);
	}

	async claimDueTasks(now: Date, batchSize: number, claimedBy: string, leaseExpiresAt: Date) {
		if (this.globalConfig.database.type === 'postgresdb') {
			return await this.claimDueTasksPostgres(now, batchSize, claimedBy, leaseExpiresAt);
		}

		return await this.claimDueTasksSqlite(now, batchSize, claimedBy, leaseExpiresAt);
	}

	private async claimDueTasksPostgres(
		now: Date,
		batchSize: number,
		claimedBy: string,
		leaseExpiresAt: Date,
	) {
		const tableName = this.getTableName('scheduled_task');

		const [rows]: [ScheduledTask[], number] = await this.query(
			`UPDATE ${tableName}
			 SET "status" = '${ScheduledTaskStatus.Running}',
			 "claimedBy" = $1,
			 "leaseExpiresAt" = $2,
			 "startedAt" = CURRENT_TIMESTAMP(3),
			 "updatedAt" = CURRENT_TIMESTAMP(3)
			 WHERE "id" IN (
				 SELECT "id" FROM ${tableName}
				 WHERE "status" = '${ScheduledTaskStatus.Pending}'
				 AND "runAt" <= $3
				 ORDER BY "runAt" ASC
				 LIMIT $4
				 FOR UPDATE SKIP LOCKED
			 )
			 RETURNING *`,
			[claimedBy, leaseExpiresAt, now, batchSize],
		);

		return rows;
	}

	private async claimDueTasksSqlite(
		now: Date,
		batchSize: number,
		claimedBy: string,
		leaseExpiresAt: Date,
	) {
		return await this.manager.transaction(async (tx) => {
			const tasks = await tx.find(ScheduledTask, {
				where: { status: ScheduledTaskStatus.Pending },
				order: { runAt: 'ASC' },
				take: batchSize,
			});
			const dueTasks = tasks.filter((task) => task.runAt.getTime() <= now.getTime());
			if (dueTasks.length === 0) return [];

			const ids = dueTasks.map(({ id }) => id);
			await tx.update(
				ScheduledTask,
				{ id: In(ids), status: ScheduledTaskStatus.Pending },
				{
					status: ScheduledTaskStatus.Running,
					claimedBy,
					leaseExpiresAt,
					startedAt: new Date(),
				},
			);

			return await tx.find(ScheduledTask, { where: { id: In(ids) } });
		});
	}

	async recordExecution(taskId: number, claimedBy: string, executionId: string) {
		await this.update(
			{ id: taskId, status: ScheduledTaskStatus.Running, claimedBy },
			{ executionId },
		);
	}

	async markSucceeded(taskId: number, claimedBy: string) {
		return await this.update(
			{ id: taskId, status: ScheduledTaskStatus.Running, claimedBy },
			{
				status: ScheduledTaskStatus.Succeeded,
				finishedAt: new Date(),
				leaseExpiresAt: null,
			},
		);
	}

	async markFailed(taskId: number, claimedBy: string, error: string) {
		return await this.update(
			{ id: taskId, status: ScheduledTaskStatus.Running, claimedBy },
			{
				status: ScheduledTaskStatus.Failed,
				finishedAt: new Date(),
				leaseExpiresAt: null,
				errorMessage: error,
			},
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
}
