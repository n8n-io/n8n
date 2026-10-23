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

const MIGRATION_NAME = 'AllowSendingInstanceReportStatus1790774580617';
const TABLE = 'instance_monitoring_report';

describe('AllowSendingInstanceReportStatus Migration', () => {
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

	async function withContext<T>(run: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await run(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertReport(context: TestMigrationContext, status: string): Promise<string> {
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(TABLE)}
			   ("id", "dataPoints", "status", "createdAt", "updatedAt")
			 VALUES (:id, '[]', :status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ id, status },
		);
		return id;
	}

	async function statuses(context: TestMigrationContext): Promise<Record<string, string>> {
		const rows = (await context.queryRunner.query(
			`SELECT "id", "status" FROM ${context.escape.tableName(TABLE)}`,
		)) as Array<{ id: string; status: string }>;
		return Object.fromEntries(rows.map((row) => [row.id, row.status]));
	}

	describe('up', () => {
		it('accepts a sending report after the migration and still rejects an unknown status', async () => {
			await withContext(async (context) => {
				await expect(insertReport(context, 'sending')).rejects.toThrow();
			});

			await runSingleMigration(MIGRATION_NAME);

			await withContext(async (context) => {
				await expect(insertReport(context, 'sending')).resolves.toBeDefined();
				await expect(insertReport(context, 'unknown')).rejects.toThrow();
			});
		});
	});

	describe('down', () => {
		it('resets sending reports to pending and rejects sending again', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const ids = await withContext(async (context) => ({
				sending: await insertReport(context, 'sending'),
				pending: await insertReport(context, 'pending'),
				delivered: await insertReport(context, 'delivered'),
				skipped: await insertReport(context, 'skipped_after_max_retries'),
			}));

			await undoLastSingleMigration();

			await withContext(async (context) => {
				expect(await statuses(context)).toEqual({
					[ids.sending]: 'pending',
					[ids.pending]: 'pending',
					[ids.delivered]: 'delivered',
					[ids.skipped]: 'skipped_after_max_retries',
				});
				await expect(insertReport(context, 'sending')).rejects.toThrow();
			});
		});
	});
});
