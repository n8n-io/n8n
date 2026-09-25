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

const MIGRATION_NAME = 'CreateMigrationFindingTables1790279031670';
const TABLES = ['migration_finding', 'migration_finding_sync'];

describe('CreateMigrationFindingTables migration', () => {
	let dataSource: DataSource;

	// Each case starts from the pre-migration schema, so the cases stay independent.
	beforeEach(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterEach(async () => {
		await Container.get(DbConnection).close();
	});

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function hasTable(name: string): Promise<boolean> {
		return await withContext(
			async (context) => await context.queryRunner.hasTable(`${context.tablePrefix}${name}`),
		);
	}

	async function insertSyncRecord(targetVersion: string): Promise<void> {
		await withContext(async (context) => {
			const table = context.escape.tableName('migration_finding_sync');
			await context.runQuery(
				`INSERT INTO ${table} ("targetVersion", "syncedAt", "ruleSetFingerprint") VALUES (:targetVersion, :syncedAt, :fingerprint)`,
				{ targetVersion, syncedAt: new Date(), fingerprint: 'fp' },
			);
		});
	}

	it('creates both tables, removes them on revert, and creates them again', async () => {
		await runSingleMigration(MIGRATION_NAME);
		for (const table of TABLES) expect(await hasTable(table)).toBe(true);

		await undoLastSingleMigration();
		for (const table of TABLES) expect(await hasTable(table)).toBe(false);
		// The referenced table must survive the revert.
		expect(await hasTable('workflow_entity')).toBe(true);

		await runSingleMigration(MIGRATION_NAME);
		for (const table of TABLES) expect(await hasTable(table)).toBe(true);
	});

	it('limits targetVersion to the known versions', async () => {
		await runSingleMigration(MIGRATION_NAME);
		await insertSyncRecord('v3');

		await expect(insertSyncRecord('v9')).rejects.toThrow();
	});
});
