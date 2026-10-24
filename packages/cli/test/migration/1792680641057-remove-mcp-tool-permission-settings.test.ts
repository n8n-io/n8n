import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { jsonParse } from 'n8n-workflow';

const MIGRATION_NAME = 'RemoveMcpToolPermissionSettings1792680641057';
const SETTINGS_KEY = 'instanceAi.settings';

describe('RemoveMcpToolPermissionSettings migration', () => {
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
	});

	beforeEach(async () => {
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function seedSettings(value: string) {
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('settings')} ("key", "value", "loadOnStartup")
				 VALUES (:key, :value, :loadOnStartup)`,
				{ key: SETTINGS_KEY, value, loadOnStartup: true },
			);
		});
	}

	async function readSettingValue(): Promise<string | Record<string, unknown> | undefined> {
		return await withContext(async ({ escape, runQuery }) => {
			const rows = await runQuery<Array<{ value: string | Record<string, unknown> }>>(
				`SELECT ${escape.columnName('value')} AS "value"
				 FROM ${escape.tableName('settings')}
				 WHERE ${escape.columnName('key')} = :key`,
				{ key: SETTINGS_KEY },
			);
			return rows[0]?.value;
		});
	}

	async function readSettings(): Promise<Record<string, unknown> | undefined> {
		const value = await readSettingValue();
		if (value === undefined) return undefined;
		return typeof value === 'string' ? jsonParse<Record<string, unknown>>(value) : value;
	}

	async function migrate() {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
	}

	it('removes the MCP permissions and keeps other settings', async () => {
		await seedSettings(
			JSON.stringify({
				enabled: true,
				mcpAccessEnabled: false,
				permissions: {
					createWorkflow: 'blocked',
					mcpRead: 'blocked',
					mcpWrite: 'always_allow',
				},
			}),
		);

		await migrate();

		expect(await readSettings()).toEqual({
			enabled: true,
			mcpAccessEnabled: false,
			permissions: { createWorkflow: 'blocked' },
		});
	});

	it('leaves settings without the MCP permissions unchanged', async () => {
		const settings = { enabled: true, permissions: { createWorkflow: 'blocked' } };
		await seedSettings(JSON.stringify(settings));

		await migrate();

		expect(await readSettings()).toEqual(settings);
	});

	it('leaves settings without permissions unchanged', async () => {
		const settings = { enabled: true };
		await seedSettings(JSON.stringify(settings));

		await migrate();

		expect(await readSettings()).toEqual(settings);
	});

	it('skips settings that are not valid JSON', async () => {
		await seedSettings('not json');

		await migrate();

		expect(await readSettingValue()).toBe('not json');
	});

	it('leaves the settings row absent when none is saved', async () => {
		await migrate();

		expect(await readSettingValue()).toBeUndefined();
	});
});
