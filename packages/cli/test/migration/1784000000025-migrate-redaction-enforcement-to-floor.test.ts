import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'MigrateRedactionEnforcementToFloor1784000000025';
const REDACTION_ENFORCEMENT_KEY = 'redaction.enforcement';

describe('MigrateRedactionEnforcementToFloor Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertSetting(context: TestMigrationContext, value: string): Promise<void> {
		const tableName = context.escape.tableName('settings');
		const keyCol = context.escape.columnName('key');
		const valueCol = context.escape.columnName('value');
		const loadOnStartupCol = context.escape.columnName('loadOnStartup');

		await context.runQuery(
			`INSERT INTO ${tableName} (${keyCol}, ${valueCol}, ${loadOnStartupCol}) VALUES (:key, :value, :loadOnStartup)`,
			{ key: REDACTION_ENFORCEMENT_KEY, value, loadOnStartup: true },
		);
	}

	async function getStoredValue(context: TestMigrationContext): Promise<string | undefined> {
		const tableName = context.escape.tableName('settings');
		const keyCol = context.escape.columnName('key');
		const valueCol = context.escape.columnName('value');

		const rows: Array<{ value: string }> = await context.runQuery(
			`SELECT ${valueCol} AS value FROM ${tableName} WHERE ${keyCol} = :key`,
			{ key: REDACTION_ENFORCEMENT_KEY },
		);

		return rows[0]?.value;
	}

	async function migrateValue(stored: string): Promise<string | undefined> {
		const context = createTestMigrationContext(dataSource);
		await insertSetting(context, stored);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		const value = await getStoredValue(postContext);
		await postContext.queryRunner.release();
		return value;
	}

	it.each([
		['{"enforced":false,"manual":false,"production":false}', 'off'],
		['{"enforced":true,"manual":false,"production":true}', 'production'],
		['{"enforced":true,"manual":true,"production":true}', 'all'],
		// Impossible-but-storable combinations normalise up to the strictest 'all'.
		['{"enforced":true,"manual":true,"production":false}', 'all'],
		['{"enforced":true,"manual":false,"production":false}', 'all'],
	])('maps stored boolean shape %s to floor "%s"', async (stored, expected) => {
		const value = await migrateValue(stored);
		expect(value).toBe(JSON.stringify(expected));
	});

	it('falls back to "all" for unparseable JSON', async () => {
		const value = await migrateValue('not-json');
		expect(value).toBe(JSON.stringify('all'));
	});

	it('falls back to "all" for valid JSON with the wrong shape', async () => {
		const value = await migrateValue('{"unexpected":true}');
		expect(value).toBe(JSON.stringify('all'));
	});

	it('leaves an already-migrated floor value untouched', async () => {
		const value = await migrateValue(JSON.stringify('production'));
		expect(value).toBe(JSON.stringify('production'));
	});

	it('does not create a row when none exists', async () => {
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		const value = await getStoredValue(postContext);
		expect(value).toBeUndefined();
		await postContext.queryRunner.release();
	});
});
