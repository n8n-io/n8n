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

const migration = 'AddAgentImportSourceIds1791428341218';
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
			`SELECT "id", "name", "projectId", "revision" FROM ${escape.tableName('agents')}`,
		),
		tasks: await runQuery(
			`SELECT "id", "agentId", "objective" FROM ${escape.tableName('agent_task_definition')}`,
		),
		history: await runQuery(
			`SELECT "versionId", "agentId", "author" FROM ${escape.tableName('agent_history')}`,
		),
	}));
}

it('adds nullable source identities and preserves Agent child records through apply and revert', async () => {
	await withContext(async ({ escape, runQuery }) => {
		await runQuery(
			`INSERT INTO ${escape.tableName('project')} ("id", "name", "type") VALUES ('project', 'Project', 'team')`,
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('agents')} ("id", "name", "projectId") VALUES ('agent', 'Agent', 'project')`,
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
		for (const [table, owner, source] of [
			['agents', 'projectId', 'sourceAgentId'],
			['agent_task_definition', 'agentId', 'sourceTaskId'],
		]) {
			const schema = await queryRunner.getTable(`${tablePrefix}${table}`);
			expect(schema?.columns.find(({ name }) => name === source)).toMatchObject({
				isNullable: true,
			});
			expect(schema?.indices).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ columnNames: [owner, source], isUnique: false }),
				]),
			);
			expect(
				await runQuery(`SELECT ${escape.columnName(source)} FROM ${escape.tableName(table)}`),
			).toEqual([{ [source]: null }]);
			await runQuery(
				`UPDATE ${escape.tableName(table)} SET ${escape.columnName(source)} = 'source'`,
			);
		}
	});

	await undoLastSingleMigration();
	expect(await records()).toEqual(before);
	await withContext(async ({ queryRunner, tablePrefix }) => {
		for (const [table, source] of [
			['agents', 'sourceAgentId'],
			['agent_task_definition', 'sourceTaskId'],
		]) {
			const schema = await queryRunner.getTable(`${tablePrefix}${table}`);
			expect(schema?.columns.some(({ name }) => name === source)).toBe(false);
			expect(schema?.indices.some(({ columnNames }) => columnNames.includes(source))).toBe(false);
		}
	});
});
