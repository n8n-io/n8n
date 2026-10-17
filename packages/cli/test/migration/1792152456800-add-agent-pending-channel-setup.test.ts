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

const migration = 'AddAgentPendingChannelSetup1792152456800';
let dataSource: DataSource;

async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
	const context = createTestMigrationContext(dataSource);
	try {
		return await fn(context);
	} finally {
		await context.queryRunner.release();
	}
}

beforeAll(async () => {
	await Container.get(DbConnection).init();
	dataSource = Container.get(DataSource);
	await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
	await initDbUpToMigration(migration);
});
afterAll(async () => await Container.get(DbConnection).close());

async function records() {
	return await withContext(async ({ escape, runQuery }) => ({
		agents: await runQuery(
			`SELECT "id", "integrations", "revision" FROM ${escape.tableName('agents')}`,
		),
		tasks: await runQuery(
			`SELECT "id", "agentId", "objective" FROM ${escape.tableName('agent_task_definition')}`,
		),
		history: await runQuery(
			`SELECT "versionId", "agentId" FROM ${escape.tableName('agent_history')}`,
		),
	}));
}

it('adds empty pending state and preserves configured channels and child records through revert', async () => {
	await withContext(async ({ escape, runQuery }) => {
		await runQuery(
			`INSERT INTO ${escape.tableName('project')} ("id", "name", "type") VALUES ('project', 'Project', 'team')`,
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('agents')} ("id", "name", "projectId", "integrations") VALUES ('agent', 'Agent', 'project', :integrations)`,
			{ integrations: JSON.stringify([{ type: 'slack', credentialId: 'configured' }]) },
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('agent_task_definition')} ("id", "agentId", "name", "objective", "cronExpression") VALUES ('task', 'agent', 'Task', 'Keep this objective', '0 9 * * *')`,
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('agent_history')} ("versionId", "agentId", "author") VALUES ('version', 'agent', 'Test User')`,
		);
	});
	const before = await records();
	await runSingleMigration(migration);
	expect(await records()).toEqual(before);
	await withContext(async ({ escape, runQuery, queryRunner, tablePrefix }) => {
		const schema = await queryRunner.getTable(`${tablePrefix}agents`);
		expect(schema?.columns.find(({ name }) => name === 'pendingChannelSetup')).toMatchObject({
			isNullable: true,
		});
		expect(
			await runQuery(`SELECT "pendingChannelSetup" FROM ${escape.tableName('agents')}`),
		).toEqual([{ pendingChannelSetup: null }]);
		await runQuery(`UPDATE ${escape.tableName('agents')} SET "pendingChannelSetup" = :pending`, {
			pending: JSON.stringify({
				requested: [{ integration: { type: 'slack', credentialId: 'incoming' }, setupId: 'setup' }],
			}),
		});
	});
	await undoLastSingleMigration();
	expect(await records()).toEqual(before);
	await runSingleMigration(migration);
	expect(await records()).toEqual(before);
});
