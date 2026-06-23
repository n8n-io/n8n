import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, In, Not, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';

import { ScheduledJob } from '../entities/scheduled-job';
import type { ScheduledJobRecurrence } from '../entities/scheduled-job';
import { ScheduledTask, ScheduledTaskStatus } from '../entities/scheduled-task';

export interface UpsertScheduledJobInput {
	workflowId: string;
	nodeId: string;
	ruleIndex: number;
	cronExpression: string;
	timezone: string;
	recurrence: ScheduledJobRecurrence | null;
	nextRunAt: Date;
}

@Service()
export class ScheduledJobRepository extends Repository<ScheduledJob> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		super(ScheduledJob, dataSource.manager);
	}

	async replaceJobsForNode(workflowId: string, nodeId: string, jobs: UpsertScheduledJobInput[]) {
		await this.manager.transaction(async (tx) => {
			const ruleIndices = jobs.map(({ ruleIndex }) => ruleIndex);

			for (const job of jobs) {
				const existing = await tx.findOne(ScheduledJob, {
					where: { workflowId, nodeId, ruleIndex: job.ruleIndex },
				});
				const scheduleChanged =
					existing === null ||
					existing.cronExpression !== job.cronExpression ||
					existing.timezone !== job.timezone ||
					JSON.stringify(existing.recurrence) !== JSON.stringify(job.recurrence);

				await tx.upsert(
					ScheduledJob,
					{
						...job,
						enabled: true,
						nextRunAt:
							scheduleChanged || existing.nextRunAt === null ? job.nextRunAt : existing.nextRunAt,
						lastFiredAt: scheduleChanged ? null : existing.lastFiredAt,
						recurrenceLastValue: scheduleChanged ? null : existing.recurrenceLastValue,
					},
					['workflowId', 'nodeId', 'ruleIndex'],
				);
			}

			await tx.update(
				ScheduledJob,
				{
					workflowId,
					nodeId,
					...(ruleIndices.length > 0 ? { ruleIndex: Not(In(ruleIndices)) } : {}),
				},
				{ enabled: false, nextRunAt: null },
			);

			await tx.update(
				ScheduledTask,
				{ workflowId, nodeId, status: ScheduledTaskStatus.Pending },
				{ status: ScheduledTaskStatus.Cancelled, finishedAt: new Date() },
			);
		});
	}

	async disableJobsForNode(workflowId: string, nodeId: string) {
		await this.manager.transaction(async (tx) => {
			await tx.update(ScheduledJob, { workflowId, nodeId }, { enabled: false, nextRunAt: null });
			await tx.update(
				ScheduledTask,
				{ workflowId, nodeId, status: ScheduledTaskStatus.Pending },
				{ status: ScheduledTaskStatus.Cancelled, finishedAt: new Date() },
			);
		});
	}

	async hasJobsForNode(workflowId: string, nodeId: string) {
		return await this.exists({ where: { workflowId, nodeId } });
	}

	async disableJobsForWorkflow(workflowId: string) {
		await this.manager.transaction(async (tx) => {
			await tx.update(ScheduledJob, { workflowId }, { enabled: false, nextRunAt: null });
			await tx.update(
				ScheduledTask,
				{ workflowId, status: ScheduledTaskStatus.Pending },
				{ status: ScheduledTaskStatus.Cancelled, finishedAt: new Date() },
			);
		});
	}

	async claimDueJobs(
		horizon: Date,
		batchSize: number,
		tx: EntityManager = this.manager,
	): Promise<ScheduledJob[]> {
		if (this.globalConfig.database.type === 'postgresdb') {
			return await this.claimDueJobsPostgres(horizon, batchSize, tx);
		}

		return await this.claimDueJobsSqlite(horizon, batchSize, tx);
	}

	private async claimDueJobsPostgres(
		horizon: Date,
		batchSize: number,
		tx: EntityManager,
	): Promise<ScheduledJob[]> {
		const tableName = this.getTableName('scheduled_job');

		const [rows]: [ScheduledJob[], number] = await tx.query(
			`UPDATE ${tableName}
			 SET "updatedAt" = CURRENT_TIMESTAMP(3)
			 WHERE "id" IN (
				 SELECT "id" FROM ${tableName}
				 WHERE "enabled" = TRUE
				 AND "nextRunAt" IS NOT NULL
				 AND "nextRunAt" <= $1
				 ORDER BY "nextRunAt" ASC
				 LIMIT $2
				 FOR UPDATE SKIP LOCKED
			 )
			 RETURNING *`,
			[horizon, batchSize],
		);

		return rows;
	}

	private async claimDueJobsSqlite(
		horizon: Date,
		batchSize: number,
		tx: EntityManager,
	): Promise<ScheduledJob[]> {
		const rows = await tx.find(ScheduledJob, {
			where: { enabled: true },
			order: { nextRunAt: 'ASC' },
			take: batchSize,
		});

		const dueRows = rows.filter(
			(job) => job.nextRunAt !== null && job.nextRunAt.getTime() <= horizon.getTime(),
		);

		if (dueRows.length === 0) return [];

		await tx.update(
			ScheduledJob,
			{ id: In(dueRows.map(({ id }) => id)) },
			{ updatedAt: new Date() },
		);

		return dueRows;
	}

	async materializeOccurrences(
		job: ScheduledJob,
		occurrences: Date[],
		nextRunAt: Date,
		recurrenceLastValue: number | null,
		tx: EntityManager = this.manager,
	) {
		if (occurrences.length === 0) {
			await tx.update(
				ScheduledJob,
				{ id: job.id },
				{ nextRunAt, recurrenceLastValue, updatedAt: new Date() },
			);
			return 0;
		}

		const values = occurrences.map((scheduledFor) => ({
			jobId: job.id,
			workflowId: job.workflowId,
			nodeId: job.nodeId,
			scheduledFor,
			runAt: scheduledFor,
			status: ScheduledTaskStatus.Pending,
			attempts: 0,
			maxAttempts: 1,
		}));

		const result = await tx
			.createQueryBuilder()
			.insert()
			.into(ScheduledTask)
			.values(values)
			.orIgnore()
			.execute();

		await tx.update(
			ScheduledJob,
			{ id: job.id },
			{
				nextRunAt,
				recurrenceLastValue,
				lastFiredAt: occurrences.at(-1) ?? job.lastFiredAt,
				updatedAt: new Date(),
			},
		);

		return result.identifiers.length;
	}

	private getTableName(name: string): string {
		const { tablePrefix } = this.globalConfig.database;
		return this.manager.connection.driver.escape(`${tablePrefix}${name}`);
	}
}
