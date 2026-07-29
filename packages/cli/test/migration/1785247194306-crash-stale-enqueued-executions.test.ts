import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { nanoid } from 'nanoid';

const MIGRATION_NAME = 'CrashStaleEnqueuedExecutions1785247194306';

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

type ExecutionRow = {
	status: string;
	startedAt: Date | string | null;
	stoppedAt: Date | string | null;
	waitTill: Date | string | null;
};

describe('CrashStaleEnqueuedExecutions migration', () => {
	let dataSource: DataSource;
	let workflowId: string;
	let originalExecutionMode: GlobalConfig['executions']['mode'];

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertWorkflow(context: TestMigrationContext) {
		const table = context.escape.tableName('workflow_entity');
		const c = (name: string) => context.escape.columnName(name);
		const id = nanoid(16);

		await context.runQuery(
			`INSERT INTO ${table} (${c('id')}, ${c('name')}, ${c('active')}, ${c('nodes')},
			   ${c('connections')}, ${c('createdAt')}, ${c('updatedAt')}, ${c('triggerCount')}, ${c('versionId')})
			 VALUES (:id, :name, :active, :nodes, :connections, :createdAt, :updatedAt, :triggerCount, :versionId)`,
			{
				id,
				name: 'wf',
				active: false,
				nodes: '[]',
				connections: '{}',
				createdAt: new Date(),
				updatedAt: new Date(),
				triggerCount: 0,
				versionId: nanoid(),
			},
		);

		return id;
	}

	async function insertExecution(
		context: TestMigrationContext,
		row: { status: string; createdAt: Date; waitTill?: Date },
	) {
		const table = context.escape.tableName('execution_entity');
		const c = (name: string) => context.escape.columnName(name);

		await context.runQuery(
			`INSERT INTO ${table} (${c('finished')}, ${c('mode')}, ${c('status')},
			   ${c('createdAt')}, ${c('startedAt')}, ${c('waitTill')}, ${c('workflowId')})
			 VALUES (:finished, :mode, :status, :createdAt, NULL, :waitTill, :workflowId)`,
			{
				finished: false,
				mode: 'trigger',
				status: row.status,
				createdAt: row.createdAt,
				waitTill: row.waitTill ?? null,
				workflowId,
			},
		);
	}

	/** Ordered by `createdAt` so rows come back in the order the test seeded them. */
	async function fetchExecutions(context: TestMigrationContext) {
		const table = context.escape.tableName('execution_entity');
		const c = (name: string) => context.escape.columnName(name);

		return await context.runQuery<ExecutionRow[]>(
			`SELECT ${c('status')}, ${c('startedAt')}, ${c('stoppedAt')}, ${c('waitTill')}
			 FROM ${table} ORDER BY ${c('createdAt')}`,
		);
	}

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
		originalExecutionMode = Container.get(GlobalConfig).executions.mode;
	});

	beforeEach(async () => {
		Container.get(GlobalConfig).executions.mode = 'regular';
		await withContext(async (context) => {
			await context.queryRunner.clearDatabase();
		});
		await initDbUpToMigration(MIGRATION_NAME);
		workflowId = await withContext(insertWorkflow);
	});

	afterAll(async () => {
		Container.get(GlobalConfig).executions.mode = originalExecutionMode;
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	test('crashes an execution enqueued before the cutoff', async () => {
		await withContext(async (context) => {
			await insertExecution(context, {
				status: 'new',
				createdAt: daysAgo(8),
				waitTill: daysAgo(7),
			});
		});

		await runSingleMigration(MIGRATION_NAME);

		const [execution] = await withContext(fetchExecutions);
		expect(execution.status).toBe('crashed');
		expect(execution.stoppedAt).not.toBeNull();
		// it never ran, and nothing should be able to pick it back up
		expect(execution.startedAt).toBeNull();
		expect(execution.waitTill).toBeNull();
	});

	test('leaves an execution enqueued after the cutoff untouched', async () => {
		await withContext(async (context) => {
			await insertExecution(context, { status: 'new', createdAt: daysAgo(8) });
			await insertExecution(context, { status: 'new', createdAt: daysAgo(6) });
		});

		await runSingleMigration(MIGRATION_NAME);

		const [stale, recent] = await withContext(fetchExecutions);
		expect(stale.status).toBe('crashed');
		expect(recent.status).toBe('new');
		expect(recent.stoppedAt).toBeNull();
	});

	test('leaves stale enqueued executions untouched in queue mode', async () => {
		Container.get(GlobalConfig).executions.mode = 'queue';
		await withContext(async (context) => {
			await insertExecution(context, {
				status: 'new',
				createdAt: daysAgo(8),
				waitTill: daysAgo(7),
			});
		});

		await runSingleMigration(MIGRATION_NAME);

		const [execution] = await withContext(fetchExecutions);
		expect(execution.status).toBe('new');
		expect(execution.stoppedAt).toBeNull();
		expect(execution.waitTill).not.toBeNull();
	});

	test.each(['waiting', 'running', 'success', 'error'])(
		'leaves an old %s execution untouched',
		async (status) => {
			await withContext(async (context) => {
				await insertExecution(context, { status, createdAt: daysAgo(8) });
			});

			await runSingleMigration(MIGRATION_NAME);

			const [execution] = await withContext(fetchExecutions);
			expect(execution.status).toBe(status);
			expect(execution.stoppedAt).toBeNull();
		},
	);

	test('is a no-op when there is nothing enqueued', async () => {
		await withContext(async (context) => {
			await insertExecution(context, { status: 'success', createdAt: daysAgo(8) });
		});

		await expect(runSingleMigration(MIGRATION_NAME)).resolves.not.toThrow();

		const executions = await withContext(fetchExecutions);
		expect(executions).toHaveLength(1);
	});
});
