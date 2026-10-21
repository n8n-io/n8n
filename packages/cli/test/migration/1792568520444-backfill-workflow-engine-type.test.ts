import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import type { MigrationInterface, QueryRunner } from '@n8n/typeorm';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'BackfillWorkflowEngineType1792568520444';

/** Settings as stored before the migration, keyed by workflow ID. */
const seeds = {
	sqlNull: null,
	jsonNull: 'null',
	spacedJsonNull: ' null',
	emptyObject: '{}',
	executionOrder: '{"executionOrder":"v1"}',
	engineV2: '{"engineType":"v2"}',
	engineV1: '{"engineType":"v1","executionOrder":"v0"}',
	engineNull: '{"engineType":null}',
	array: '[]',
	string: '"x"',
	invalidJson: 'not json',
} as const;

type SeedId = keyof typeof seeds;

describe('BackfillWorkflowEngineType Migration', () => {
	let dataSource: DataSource;
	let isPostgres: boolean;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);

		const context = createTestMigrationContext(dataSource);
		isPostgres = context.isPostgres;
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);

		const seedContext = createTestMigrationContext(dataSource);
		for (const [id, settings] of Object.entries(seeds)) {
			// Postgres validates `json` columns, so invalid JSON can't exist there.
			if (id === 'invalidJson' && isPostgres) continue;
			await insertWorkflow(seedContext, id, settings);
		}
		await seedContext.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertWorkflow(
		context: TestMigrationContext,
		id: string,
		settings: string | null,
	): Promise<void> {
		const table = context.escape.tableName('workflow_entity');
		const columns = ['id', 'name', 'active', 'nodes', 'connections', 'settings', 'versionId']
			.map((name) => context.escape.columnName(name))
			.join(', ');

		await context.runQuery(
			`INSERT INTO ${table} (${columns}) VALUES (:id, :name, :active, :nodes, :connections, :settings, :versionId)`,
			{
				id,
				name: `Workflow ${id}`,
				active: false,
				nodes: '[]',
				connections: '{}',
				settings,
				versionId: randomUUID(),
			},
		);
	}

	async function readSettings(): Promise<Record<string, string | null>> {
		const context = createTestMigrationContext(dataSource);
		const table = context.escape.tableName('workflow_entity');
		const idColumn = context.escape.columnName('id');
		const settingsColumn = context.escape.columnName('settings');
		// Postgres returns a `json` column parsed; read the stored text instead.
		const settingsSelect = context.isPostgres ? `${settingsColumn}::text` : settingsColumn;

		const rows = await context.runQuery<Array<{ id: string; settings: string | null }>>(
			`SELECT ${idColumn} AS id, ${settingsSelect} AS settings FROM ${table}`,
		);
		await context.queryRunner.release();

		return Object.fromEntries(rows.map((row) => [row.id, row.settings]));
	}

	function parsed(stored: Record<string, string | null>, id: SeedId): unknown {
		const value = stored[id];
		return value === null ? null : JSON.parse(value);
	}

	/** Settings that are not a JSON object must keep their exact stored text. */
	function expectNonObjectsUnchanged(stored: Record<string, string | null>) {
		expect(stored.array).toBe(seeds.array);
		expect(stored.string).toBe(seeds.string);
		if (!isPostgres) expect(stored.invalidJson).toBe(seeds.invalidJson);
	}

	function expectUpResult(stored: Record<string, string | null>) {
		expect(parsed(stored, 'sqlNull')).toEqual({ engineType: 'v1' });
		expect(parsed(stored, 'jsonNull')).toEqual({ engineType: 'v1' });
		expect(parsed(stored, 'spacedJsonNull')).toEqual({ engineType: 'v1' });
		expect(parsed(stored, 'emptyObject')).toEqual({ engineType: 'v1' });
		expect(parsed(stored, 'executionOrder')).toEqual({ executionOrder: 'v1', engineType: 'v1' });
		expect(parsed(stored, 'engineV2')).toEqual({ engineType: 'v2' });
		expect(parsed(stored, 'engineV1')).toEqual({ engineType: 'v1', executionOrder: 'v0' });
		expect(parsed(stored, 'engineNull')).toEqual({ engineType: null });
		expectNonObjectsUnchanged(stored);
	}

	it('sets engine v1 on settings without an engine and keeps every other value', async () => {
		expectUpResult(await readSettings());
	});

	it('changes nothing when up runs again', async () => {
		const migrations = dataSource.options.migrations as Array<
			new () => MigrationInterface & { up(queryRunner: QueryRunner): Promise<void> }
		>;
		const Migration = migrations.find((migration) => migration.name === MIGRATION_NAME);
		if (!Migration) throw new Error(`Migration ${MIGRATION_NAME} not found`);
		const before = await readSettings();

		const queryRunner = dataSource.createQueryRunner();
		await new Migration().up(queryRunner);
		await queryRunner.release();

		const after = await readSettings();
		expect(after).toEqual(before);
		expectUpResult(after);
	});

	it('removes engine v1 on down and keeps every other value', async () => {
		await undoLastSingleMigration();

		const stored = await readSettings();
		expect(parsed(stored, 'sqlNull')).toEqual({});
		expect(parsed(stored, 'jsonNull')).toEqual({});
		expect(parsed(stored, 'spacedJsonNull')).toEqual({});
		expect(parsed(stored, 'emptyObject')).toEqual({});
		expect(parsed(stored, 'executionOrder')).toEqual({ executionOrder: 'v1' });
		expect(parsed(stored, 'engineV2')).toEqual({ engineType: 'v2' });
		expect(parsed(stored, 'engineV1')).toEqual({ executionOrder: 'v0' });
		expect(parsed(stored, 'engineNull')).toEqual({ engineType: null });
		expectNonObjectsUnchanged(stored);
	});
});
