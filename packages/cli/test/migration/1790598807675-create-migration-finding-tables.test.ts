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

const MIGRATION_NAME = 'CreateMigrationFindingTables1790598807675';
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

	async function insertWorkflow(workflowId: string): Promise<void> {
		await withContext(async (context) => {
			const table = context.escape.tableName('workflow_entity');
			await context.runQuery(
				`INSERT INTO ${table} ("id", "name", "active", "nodes", "connections", "versionId", "createdAt", "updatedAt")
				 VALUES (:id, :name, false, '[]', '{}', :versionId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				{ id: workflowId, name: `wf ${workflowId}`, versionId: `version-${workflowId}` },
			);
		});
	}

	async function insertFinding(
		workflowId: string,
		{ ruleId = 'rule-a', status = 'open' }: { ruleId?: string; status?: string } = {},
	): Promise<void> {
		await withContext(async (context) => {
			const table = context.escape.tableName('migration_finding');
			await context.runQuery(
				`INSERT INTO ${table} ("targetVersion", "ruleId", "workflowId", "status", "statusChangedAt")
				 VALUES ('v3', :ruleId, :workflowId, :status, CURRENT_TIMESTAMP)`,
				{ ruleId, workflowId, status },
			);
		});
	}

	async function countFindings(workflowId: string): Promise<number> {
		return await withContext(async (context) => {
			const table = context.escape.tableName('migration_finding');
			const rows = await context.runQuery<Array<{ count: number | string }>>(
				`SELECT COUNT(*) AS count FROM ${table} WHERE "workflowId" = :workflowId`,
				{ workflowId },
			);
			return Number(rows[0].count);
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

	it('rejects a second finding for the same target version, rule and workflow', async () => {
		await runSingleMigration(MIGRATION_NAME);
		await insertWorkflow('wf-1');
		await insertFinding('wf-1');

		await expect(insertFinding('wf-1')).rejects.toThrow();
		// A different rule for the same workflow is still allowed.
		await insertFinding('wf-1', { ruleId: 'rule-b' });
		expect(await countFindings('wf-1')).toBe(2);
	});

	it('deletes the findings of a deleted workflow', async () => {
		await runSingleMigration(MIGRATION_NAME);
		await insertWorkflow('wf-1');
		await insertWorkflow('wf-2');
		await insertFinding('wf-1');
		await insertFinding('wf-2');

		await withContext(async (context) => {
			const table = context.escape.tableName('workflow_entity');
			await context.runQuery(`DELETE FROM ${table} WHERE "id" = :id`, { id: 'wf-1' });
		});

		expect(await countFindings('wf-1')).toBe(0);
		expect(await countFindings('wf-2')).toBe(1);
	});

	it('limits status to the known values', async () => {
		await runSingleMigration(MIGRATION_NAME);
		await insertWorkflow('wf-1');
		await insertFinding('wf-1', { status: 'wont_fix' });

		await expect(insertFinding('wf-1', { ruleId: 'rule-b', status: 'bogus' })).rejects.toThrow();
	});
});
