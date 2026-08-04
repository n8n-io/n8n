import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateSchedulerTables1784000000042';

describe('CreateSchedulerTables Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);

		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function indexExists(context: TestMigrationContext, name: string): Promise<boolean> {
		if (context.isSqlite) {
			const rows = await context.runQuery<unknown[]>(
				"SELECT name FROM sqlite_master WHERE type = 'index' AND name = :name",
				{ name },
			);
			return rows.length === 1;
		}
		const rows = await context.runQuery<unknown[]>(
			'SELECT indexname FROM pg_indexes WHERE indexname = :name',
			{ name },
		);
		return rows.length === 1;
	}

	async function insertPublishedWorkflow(context: TestMigrationContext): Promise<string> {
		const workflowId = randomUUID();
		const versionId = randomUUID();
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('workflow_entity')} ("id", "name", "active", "nodes", "connections", "triggerCount", "versionId", "createdAt", "updatedAt")
			 VALUES (:id, :name, :active, :nodes, :connections, :triggerCount, :versionId, :createdAt, :updatedAt)`,
			{
				id: workflowId,
				name: `Scheduler test workflow ${workflowId}`,
				active: false,
				nodes: '[]',
				connections: '{}',
				triggerCount: 0,
				versionId,
				createdAt: now,
				updatedAt: now,
			},
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('workflow_history')} ("versionId", "workflowId", "nodes", "connections", "authors", "createdAt", "updatedAt")
			 VALUES (:versionId, :workflowId, :nodes, :connections, :authors, :createdAt, :updatedAt)`,
			{
				versionId,
				workflowId,
				nodes: '[]',
				connections: '{}',
				authors: 'test',
				createdAt: now,
				updatedAt: now,
			},
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('workflow_published_version')} ("workflowId", "publishedVersionId", "createdAt", "updatedAt")
			 VALUES (:workflowId, :publishedVersionId, :createdAt, :updatedAt)`,
			{ workflowId, publishedVersionId: versionId, createdAt: now, updatedAt: now },
		);
		return workflowId;
	}

	async function insertJob(
		context: TestMigrationContext,
		overrides: { workflowId?: string } = {},
	): Promise<number> {
		const table = context.escape.tableName('scheduled_job');
		const now = new Date();
		const name = `job-${randomUUID()}`;
		await context.runQuery(
			`INSERT INTO ${table} ("name", "workflowId", "taskType", "kind", "cronExpression", "createdAt", "updatedAt")
			 VALUES (:name, :workflowId, :taskType, :kind, :cronExpression, :createdAt, :updatedAt)`,
			{
				name,
				workflowId: overrides.workflowId ?? null,
				taskType: 'scheduleTrigger',
				kind: 'cron',
				cronExpression: '* * * * *',
				createdAt: now,
				updatedAt: now,
			},
		);
		const [row] = await context.runQuery<Array<{ id: number }>>(
			`SELECT "id" FROM ${table} WHERE "name" = :name`,
			{ name },
		);
		return row.id;
	}

	describe('Up migration', () => {
		it('creates the scheduled_job and scheduled_task tables', async () => {
			const context = createTestMigrationContext(dataSource);
			const jobs = await context.runQuery<unknown[]>(
				`SELECT * FROM ${context.escape.tableName('scheduled_job')}`,
			);
			const tasks = await context.runQuery<unknown[]>(
				`SELECT * FROM ${context.escape.tableName('scheduled_task')}`,
			);
			expect(jobs).toEqual([]);
			expect(tasks).toEqual([]);
			await context.queryRunner.release();
		});

		it('creates all engine indexes', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				for (const suffix of [
					'scheduled_job_nextRunAt',
					'scheduled_job_workflowId',
					'scheduled_job_name',
					'scheduled_task_jobId_scheduledFor',
					'scheduled_task_runAt',
					'scheduled_task_leaseExpiresAt',
					'scheduled_task_finishedAt',
				]) {
					expect(await indexExists(context, `IDX_${context.tablePrefix}${suffix}`)).toBe(true);
				}
			} finally {
				await context.queryRunner.release();
			}
		});

		it('applies column defaults on insert', async () => {
			const context = createTestMigrationContext(dataSource);
			const jobId = await insertJob(context);

			const [job] = await context.runQuery<
				Array<{ enabled: boolean | number; maxAttempts: number }>
			>(
				`SELECT "enabled", "maxAttempts" FROM ${context.escape.tableName('scheduled_job')} WHERE "id" = :id`,
				{ id: jobId },
			);
			expect(Boolean(job.enabled)).toBe(true);
			expect(Number(job.maxAttempts)).toBe(1);
			await context.queryRunner.release();
		});

		it('auto-generates the scheduled_task primary key and applies status default', async () => {
			const context = createTestMigrationContext(dataSource);
			const jobId = await insertJob(context);
			const table = context.escape.tableName('scheduled_task');
			const scheduledFor = new Date('2026-02-02T02:02:02.000Z');

			await context.runQuery(
				`INSERT INTO ${table} ("jobId", "taskType", "scheduledFor", "runAt", "createdAt")
				 VALUES (:jobId, :taskType, :scheduledFor, :runAt, :createdAt)`,
				{
					jobId,
					taskType: 'scheduleTrigger',
					scheduledFor,
					runAt: scheduledFor,
					createdAt: new Date(),
				},
			);

			const [task] = await context.runQuery<Array<{ id: string | number; status: string }>>(
				`SELECT "id", "status" FROM ${table} WHERE "jobId" = :jobId AND "scheduledFor" = :scheduledFor`,
				{ jobId, scheduledFor },
			);
			expect(task.id).not.toBeNull();
			expect(task.status).toBe('pending');
			await context.queryRunner.release();
		});

		it('enforces the (jobId, scheduledFor) occurrence uniqueness', async () => {
			const context = createTestMigrationContext(dataSource);
			const jobId = await insertJob(context);
			const table = context.escape.tableName('scheduled_task');
			const scheduledFor = new Date('2026-01-01T00:00:00.000Z');
			const insert = async () =>
				await context.runQuery(
					`INSERT INTO ${table} ("jobId", "taskType", "scheduledFor", "runAt", "createdAt")
					 VALUES (:jobId, :taskType, :scheduledFor, :runAt, :createdAt)`,
					{
						jobId,
						taskType: 'scheduleTrigger',
						scheduledFor,
						runAt: scheduledFor,
						createdAt: new Date(),
					},
				);

			await insert();
			await expect(insert()).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('rejects an out-of-set kind via the CHECK constraint', async () => {
			const context = createTestMigrationContext(dataSource);
			const table = context.escape.tableName('scheduled_job');
			const now = new Date();
			await expect(
				context.runQuery(
					`INSERT INTO ${table} ("name", "taskType", "kind", "createdAt", "updatedAt")
					 VALUES (:name, :taskType, :kind, :createdAt, :updatedAt)`,
					{
						name: `job-${randomUUID()}`,
						taskType: 'scheduleTrigger',
						kind: 'bogus',
						createdAt: now,
						updatedAt: now,
					},
				),
			).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('allows multiple jobs on the same (workflowId, nodeId) trigger node', async () => {
			const context = createTestMigrationContext(dataSource);
			const table = context.escape.tableName('scheduled_job');
			const workflowId = await insertPublishedWorkflow(context);
			const nodeId = randomUUID();
			const now = new Date();
			const insert = async () =>
				await context.runQuery(
					`INSERT INTO ${table} ("name", "workflowId", "nodeId", "taskType", "kind", "cronExpression", "createdAt", "updatedAt")
					 VALUES (:name, :workflowId, :nodeId, :taskType, :kind, :cronExpression, :createdAt, :updatedAt)`,
					{
						name: `job-${randomUUID()}`,
						workflowId,
						nodeId,
						taskType: 'scheduleTrigger',
						kind: 'cron',
						cronExpression: '* * * * *',
						createdAt: now,
						updatedAt: now,
					},
				);

			await insert();
			await expect(insert()).resolves.not.toThrow();
			await context.queryRunner.release();
		});

		it('enforces name uniqueness across jobs', async () => {
			const context = createTestMigrationContext(dataSource);
			const table = context.escape.tableName('scheduled_job');
			const name = `job-${randomUUID()}`;
			const now = new Date();
			const insert = async () =>
				await context.runQuery(
					`INSERT INTO ${table} ("name", "taskType", "kind", "cronExpression", "createdAt", "updatedAt")
					 VALUES (:name, :taskType, :kind, :cronExpression, :createdAt, :updatedAt)`,
					{
						name,
						taskType: 'scheduleTrigger',
						kind: 'cron',
						cronExpression: '* * * * *',
						createdAt: now,
						updatedAt: now,
					},
				);

			await insert();
			await expect(insert()).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('allows multiple system jobs with no workflow or node', async () => {
			const context = createTestMigrationContext(dataSource);
			const table = context.escape.tableName('scheduled_job');
			const now = new Date();
			const insert = async () =>
				await context.runQuery(
					`INSERT INTO ${table} ("name", "taskType", "kind", "cronExpression", "createdAt", "updatedAt")
					 VALUES (:name, :taskType, :kind, :cronExpression, :createdAt, :updatedAt)`,
					{
						name: `job-${randomUUID()}`,
						taskType: 'scheduleTrigger',
						kind: 'cron',
						cronExpression: '* * * * *',
						createdAt: now,
						updatedAt: now,
					},
				);

			await insert();
			await expect(insert()).resolves.not.toThrow();
			await context.queryRunner.release();
		});

		it('allows multiple non-trigger jobs on the same workflow (NULL nodeId)', async () => {
			const context = createTestMigrationContext(dataSource);
			const table = context.escape.tableName('scheduled_job');
			const workflowId = await insertPublishedWorkflow(context);
			const now = new Date();
			const insert = async () =>
				await context.runQuery(
					`INSERT INTO ${table} ("name", "workflowId", "taskType", "kind", "cronExpression", "createdAt", "updatedAt")
					 VALUES (:name, :workflowId, :taskType, :kind, :cronExpression, :createdAt, :updatedAt)`,
					{
						name: `job-${randomUUID()}`,
						workflowId,
						taskType: 'scheduleTrigger',
						kind: 'cron',
						cronExpression: '* * * * *',
						createdAt: now,
						updatedAt: now,
					},
				);

			await insert();
			await expect(insert()).resolves.not.toThrow();
			await context.queryRunner.release();
		});

		it('requires cronExpression when kind is cron', async () => {
			const context = createTestMigrationContext(dataSource);
			const table = context.escape.tableName('scheduled_job');
			const now = new Date();
			await expect(
				context.runQuery(
					`INSERT INTO ${table} ("name", "taskType", "kind", "createdAt", "updatedAt")
					 VALUES (:name, :taskType, :kind, :createdAt, :updatedAt)`,
					{
						name: `job-${randomUUID()}`,
						taskType: 'scheduleTrigger',
						kind: 'cron',
						createdAt: now,
						updatedAt: now,
					},
				),
			).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('requires intervalSeconds when kind is interval', async () => {
			const context = createTestMigrationContext(dataSource);
			const table = context.escape.tableName('scheduled_job');
			const now = new Date();
			await expect(
				context.runQuery(
					`INSERT INTO ${table} ("name", "taskType", "kind", "createdAt", "updatedAt")
					 VALUES (:name, :taskType, :kind, :createdAt, :updatedAt)`,
					{
						name: `job-${randomUUID()}`,
						taskType: 'scheduleTrigger',
						kind: 'interval',
						createdAt: now,
						updatedAt: now,
					},
				),
			).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('requires fireAt when kind is one_off', async () => {
			const context = createTestMigrationContext(dataSource);
			const table = context.escape.tableName('scheduled_job');
			const now = new Date();
			await expect(
				context.runQuery(
					`INSERT INTO ${table} ("name", "taskType", "kind", "createdAt", "updatedAt")
					 VALUES (:name, :taskType, :kind, :createdAt, :updatedAt)`,
					{
						name: `job-${randomUUID()}`,
						taskType: 'scheduleTrigger',
						kind: 'one_off',
						createdAt: now,
						updatedAt: now,
					},
				),
			).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('rejects an out-of-set status via the CHECK constraint', async () => {
			const context = createTestMigrationContext(dataSource);
			const jobId = await insertJob(context);
			const table = context.escape.tableName('scheduled_task');
			const now = new Date();
			await expect(
				context.runQuery(
					`INSERT INTO ${table} ("jobId", "taskType", "scheduledFor", "runAt", "status", "createdAt")
					 VALUES (:jobId, :taskType, :scheduledFor, :runAt, :status, :createdAt)`,
					{ jobId, taskType: 't', scheduledFor: now, runAt: now, status: 'bogus', createdAt: now },
				),
			).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('rejects a running occurrence with no lease deadline via the CHECK constraint', async () => {
			const context = createTestMigrationContext(dataSource);
			const jobId = await insertJob(context);
			const table = context.escape.tableName('scheduled_task');
			const now = new Date();
			await expect(
				context.runQuery(
					`INSERT INTO ${table} ("jobId", "taskType", "scheduledFor", "runAt", "status", "leaseExpiresAt", "createdAt")
					 VALUES (:jobId, :taskType, :scheduledFor, :runAt, :status, :leaseExpiresAt, :createdAt)`,
					{
						jobId,
						taskType: 't',
						scheduledFor: now,
						runAt: now,
						status: 'running',
						leaseExpiresAt: null,
						createdAt: now,
					},
				),
			).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('accepts a running occurrence that carries a lease deadline', async () => {
			const context = createTestMigrationContext(dataSource);
			const jobId = await insertJob(context);
			const table = context.escape.tableName('scheduled_task');
			const now = new Date();
			await context.runQuery(
				`INSERT INTO ${table} ("jobId", "taskType", "scheduledFor", "runAt", "status", "leaseExpiresAt", "createdAt")
				 VALUES (:jobId, :taskType, :scheduledFor, :runAt, :status, :leaseExpiresAt, :createdAt)`,
				{
					jobId,
					taskType: 't',
					scheduledFor: now,
					runAt: now,
					status: 'running',
					leaseExpiresAt: new Date(now.getTime() + 30_000),
					createdAt: now,
				},
			);

			const [task] = await context.runQuery<Array<{ status: string }>>(
				`SELECT "status" FROM ${table} WHERE "jobId" = :jobId`,
				{ jobId },
			);
			expect(task.status).toBe('running');
			await context.queryRunner.release();
		});

		it('cascades deletes from scheduled_job to its scheduled_task rows', async () => {
			const context = createTestMigrationContext(dataSource);
			const jobId = await insertJob(context);
			const taskTable = context.escape.tableName('scheduled_task');
			const now = new Date();
			await context.runQuery(
				`INSERT INTO ${taskTable} ("jobId", "taskType", "scheduledFor", "runAt", "createdAt")
				 VALUES (:jobId, :taskType, :scheduledFor, :runAt, :createdAt)`,
				{ jobId, taskType: 't', scheduledFor: now, runAt: now, createdAt: now },
			);

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('scheduled_job')} WHERE "id" = :id`,
				{ id: jobId },
			);

			const remaining = await context.runQuery<unknown[]>(
				`SELECT * FROM ${taskTable} WHERE "jobId" = :jobId`,
				{ jobId },
			);
			expect(remaining).toEqual([]);
			await context.queryRunner.release();
		});

		it('cascades deletes from workflow_published_version to its scheduled_job rows', async () => {
			const context = createTestMigrationContext(dataSource);
			const workflowId = await insertPublishedWorkflow(context);
			const jobId = await insertJob(context, { workflowId });

			// Unpublishing drops the published-version row, which cascades to its jobs.
			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('workflow_published_version')} WHERE "workflowId" = :workflowId`,
				{ workflowId },
			);

			const remaining = await context.runQuery<unknown[]>(
				`SELECT * FROM ${context.escape.tableName('scheduled_job')} WHERE "id" = :id`,
				{ id: jobId },
			);
			expect(remaining).toEqual([]);
			await context.queryRunner.release();
		});

		it('rejects a workflow-bound job when the workflow is not published', async () => {
			const context = createTestMigrationContext(dataSource);
			const table = context.escape.tableName('scheduled_job');
			const now = new Date();
			// No workflow_published_version row for this id, so the FK must reject it.
			await expect(
				context.runQuery(
					`INSERT INTO ${table} ("name", "workflowId", "taskType", "kind", "cronExpression", "createdAt", "updatedAt")
					 VALUES (:name, :workflowId, :taskType, :kind, :cronExpression, :createdAt, :updatedAt)`,
					{
						name: `job-${randomUUID()}`,
						workflowId: randomUUID(),
						taskType: 'scheduleTrigger',
						kind: 'cron',
						cronExpression: '* * * * *',
						createdAt: now,
						updatedAt: now,
					},
				),
			).rejects.toThrow();
			await context.queryRunner.release();
		});
	});

	describe('Down migration', () => {
		it('drops both tables and can be re-applied', async () => {
			await dataSource.undoLastMigration({ transaction: 'each' });

			const context = createTestMigrationContext(dataSource);
			const jobTable = `${context.tablePrefix}scheduled_job`;
			const taskTable = `${context.tablePrefix}scheduled_task`;
			expect(await context.queryRunner.hasTable(jobTable)).toBe(false);
			expect(await context.queryRunner.hasTable(taskTable)).toBe(false);
			await context.queryRunner.release();

			// Round-trip: up() must run cleanly again after a full revert.
			await runSingleMigration(MIGRATION_NAME);
			const context2 = createTestMigrationContext(dataSource);
			expect(await context2.queryRunner.hasTable(jobTable)).toBe(true);
			expect(await context2.queryRunner.hasTable(taskTable)).toBe(true);
			await context2.queryRunner.release();
		});
	});
});
