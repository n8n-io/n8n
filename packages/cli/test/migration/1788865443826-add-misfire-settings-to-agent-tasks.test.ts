import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddMisfireSettingsToAgentTasks1788865443826';

describe('AddMisfireSettingsToAgentTasks migration', () => {
	let dataSource: DataSource;
	let agentId: string;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		let context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);

		// A task definition that predates the migration.
		context = createTestMigrationContext(dataSource);
		const projectId = randomUUID();
		agentId = randomUUID();
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, 'team', :createdAt, :updatedAt)`,
			{ id: projectId, name: 'Project', createdAt: now, updatedAt: now },
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('agents')} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
			 VALUES (:id, :name, :projectId, :integrations, :tools, :skills, :createdAt, :updatedAt)`,
			{
				id: agentId,
				name: 'Agent',
				projectId,
				integrations: '[]',
				tools: '{}',
				skills: '{}',
				createdAt: now,
				updatedAt: now,
			},
		);
		await insertTask(context, 'existing', {});
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insertTask(
		context: TestMigrationContext,
		id: string,
		misfire: { policy?: string; graceSeconds?: number },
	) {
		const now = new Date();
		const table = context.escape.tableName('agent_task_definition');
		const hasMisfireColumns = misfire.policy !== undefined || misfire.graceSeconds !== undefined;
		const columns = hasMisfireColumns ? ', "misfirePolicy", "misfireGraceSeconds"' : '';
		const values = hasMisfireColumns ? ', :policy, :graceSeconds' : '';
		await context.runQuery(
			`INSERT INTO ${table} ("id", "agentId", "name", "objective", "cronExpression", "createdAt", "updatedAt"${columns})
			 VALUES (:id, :agentId, 'Task', 'Report', '0 9 * * *', :createdAt, :updatedAt${values})`,
			{
				id,
				agentId,
				createdAt: now,
				updatedAt: now,
				policy: misfire.policy ?? null,
				graceSeconds: misfire.graceSeconds ?? null,
			},
		);
	}

	async function taskRows(context: TestMigrationContext) {
		return await context.runQuery<Array<Record<string, unknown>>>(
			`SELECT * FROM ${context.escape.tableName('agent_task_definition')} ORDER BY "id"`,
		);
	}

	it('keeps existing rows on the default and enforces the policy vocabulary', async () => {
		const context = createTestMigrationContext(dataSource);

		await insertTask(context, 'coalescing', { policy: 'coalesce', graceSeconds: 900 });
		await expect(insertTask(context, 'bogus', { policy: 'other' })).rejects.toThrow();

		const rows = await taskRows(context);
		expect(rows.map((row) => [row.id, row.misfirePolicy, row.misfireGraceSeconds])).toEqual([
			['coalescing', 'coalesce', 900],
			['existing', null, null],
		]);
		await context.queryRunner.release();
	});

	it('reverts with rows present, dropping the columns and their check', async () => {
		let context = createTestMigrationContext(dataSource);
		await insertTask(context, 'coalescing', { policy: 'coalesce', graceSeconds: 900 });
		await context.queryRunner.release();

		await undoLastSingleMigration();

		context = createTestMigrationContext(dataSource);
		const rows = await taskRows(context);
		expect(rows.map((row) => row.id)).toEqual(['coalescing', 'existing']);
		expect(rows[0]).not.toHaveProperty('misfirePolicy');
		expect(rows[0]).not.toHaveProperty('misfireGraceSeconds');
		// A row the old vocabulary would have rejected inserts once the check is gone.
		await insertTask(context, 'after-revert', {});
		await context.queryRunner.release();
	});
});
