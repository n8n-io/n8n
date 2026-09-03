import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'DisableSsoLoginRedirectForExistingSsoInstances1788431666125';
const REDIRECT_KEY = 'sso.redirectLoginToSso';
const AUTH_METHOD_KEY = 'userManagement.authenticationMethod';

describe('DisableSsoLoginRedirectForExistingSsoInstances Migration', () => {
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

	async function insertSetting(context: TestMigrationContext, key: string, value: string) {
		const settings = context.escape.tableName('settings');
		const keyCol = context.escape.columnName('key');
		const valueCol = context.escape.columnName('value');
		const loadOnStartup = context.escape.columnName('loadOnStartup');
		await context.runQuery(
			`INSERT INTO ${settings} (${keyCol}, ${valueCol}, ${loadOnStartup}) VALUES (:key, :value, true)`,
			{ key, value },
		);
	}

	async function seedSettings(entries: Array<[string, string]>) {
		const context = createTestMigrationContext(dataSource);
		for (const [key, value] of entries) {
			await insertSetting(context, key, value);
		}
		await context.queryRunner.release();
	}

	async function readRedirectSetting(): Promise<string | undefined> {
		const context = createTestMigrationContext(dataSource);
		const settings = context.escape.tableName('settings');
		const keyCol = context.escape.columnName('key');
		const valueCol = context.escape.columnName('value');
		const rows = (await context.queryRunner.query(
			`SELECT ${valueCol} AS value FROM ${settings} WHERE ${keyCol} = '${REDIRECT_KEY}'`,
		)) as Array<{ value: string }>;
		await context.queryRunner.release();
		return rows[0]?.value;
	}

	it.each(['saml', 'oidc'])('disables the redirect for an instance using %s', async (method) => {
		await seedSettings([[AUTH_METHOD_KEY, method]]);

		await runSingleMigration(MIGRATION_NAME);

		expect(await readRedirectSetting()).toBe('false');
	});

	it('does not touch an instance using email authentication', async () => {
		await seedSettings([[AUTH_METHOD_KEY, 'email']]);

		await runSingleMigration(MIGRATION_NAME);

		expect(await readRedirectSetting()).toBeUndefined();
	});

	it('does not touch a new instance with no authentication method set', async () => {
		await runSingleMigration(MIGRATION_NAME);

		expect(await readRedirectSetting()).toBeUndefined();
	});

	it('does not override an already-set redirect value', async () => {
		await seedSettings([
			[AUTH_METHOD_KEY, 'saml'],
			[REDIRECT_KEY, 'true'],
		]);

		await runSingleMigration(MIGRATION_NAME);

		expect(await readRedirectSetting()).toBe('true');
	});
});
