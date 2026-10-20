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

const migration = 'AddSkillAssistantAvailability1792418677997';

describe('Skill Assistant availability migration', () => {
	let context: TestMigrationContext;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		context = createTestMigrationContext(Container.get(DataSource));
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(migration);
		context = createTestMigrationContext(Container.get(DataSource));
	});

	afterAll(async () => {
		await context?.queryRunner.release();
		await Container.get(DbConnection).close();
	});

	it('defaults existing and new skills to false and preserves versions through up/down/up', async () => {
		const table = context.escape.tableName('skill');
		const versions = context.escape.tableName('skill_version');
		const col = context.escape.columnName;
		await context.runQuery(
			`INSERT INTO ${table} (${col('id')}, ${col('source')}) VALUES ('existing', 'ui')`,
		);
		await context.runQuery(
			`INSERT INTO ${versions} (${col('id')}, ${col('skillId')}, ${col('version')}, ${col('name')}, ${col('description')}, ${col('instructions')}, ${col('contentHash')}) VALUES ('0199e890-7471-7000-8000-000000000001', 'existing', 1, 'Tone', 'Writing style', 'Be brief.', '${'a'.repeat(64)}')`,
		);
		await context.queryRunner.release();
		await runSingleMigration(migration);
		context = createTestMigrationContext(Container.get(DataSource));
		await context.runQuery(
			`INSERT INTO ${table} (${col('id')}, ${col('source')}) VALUES ('new', 'agent')`,
		);
		const readFlags = async () =>
			await context.runQuery<Array<{ availableToAssistant: boolean | number }>>(
				`SELECT ${col('availableToAssistant')} FROM ${table}`,
			);
		expect((await readFlags()).map((row) => Boolean(row.availableToAssistant))).toEqual([
			false,
			false,
		]);
		await context.runQuery(
			`UPDATE ${table} SET ${col('availableToAssistant')} = true WHERE ${col('id')} = 'existing'`,
		);
		expect((await readFlags()).filter((row) => Boolean(row.availableToAssistant))).toHaveLength(1);

		await context.queryRunner.release();
		await undoLastSingleMigration();
		await runSingleMigration(migration);
		context = createTestMigrationContext(Container.get(DataSource));
		expect((await readFlags()).map((row) => Boolean(row.availableToAssistant))).toEqual([
			false,
			false,
		]);
		expect(await context.runQuery(`SELECT ${col('instructions')} FROM ${versions}`)).toEqual([
			{ instructions: 'Be brief.' },
		]);
	});
});
