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
import { jsonParse } from 'n8n-workflow';
import { nanoid } from 'nanoid';

<<<<<<<< HEAD:packages/cli/test/migration/1784000000011-add-custom-telemetry-tags-to-project.test.ts
const MIGRATION_NAME = 'AddCustomTelemetryTagsToProject1784000000011';
========
const MIGRATION_NAME = 'AddCustomTelemetryTagsToProject1784000000014';
>>>>>>>> 773514c6f4 (fixup! test(core): Add coverage for migration):packages/cli/test/migration/1784000000014-add-custom-telemetry-tags-to-project.test.ts

interface SqliteColumnInfo {
	name: string;
	notnull: number;
	dflt_value: string | null;
}

interface PgColumnInfo {
	column_name: string;
	is_nullable: string;
	column_default: string | null;
}

describe('AddCustomTelemetryTagsToProject Migration', () => {
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

	async function insertProject(context: TestMigrationContext, projectId: string) {
		const tableName = context.escape.tableName('project');
		await context.runQuery(
			`INSERT INTO ${tableName} (${context.escape.columnName('id')}, ${context.escape.columnName('name')}, ${context.escape.columnName('type')}, ${context.escape.columnName('createdAt')}, ${context.escape.columnName('updatedAt')})
			 VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
			{
				id: projectId,
				name: 'Test Project',
				type: 'team',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function getColumnMeta(
		context: TestMigrationContext,
		columnName: string,
	): Promise<SqliteColumnInfo | PgColumnInfo | undefined> {
		if (context.isSqlite) {
			const rows = (await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName('project')})`,
			)) as SqliteColumnInfo[];
			return rows.find((r) => r.name === columnName);
		}
		const rows = (await context.queryRunner.query(
			'SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
			[`${context.tablePrefix}project`, columnName],
		)) as PgColumnInfo[];
		return rows[0];
	}

	describe('up', () => {
		it('should add customTelemetryTags as NOT NULL with default []', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			const col = await getColumnMeta(context, 'customTelemetryTags');
			expect(col).toBeDefined();
			if (context.isSqlite) {
				expect((col as SqliteColumnInfo).notnull).toBe(1);
				expect((col as SqliteColumnInfo).dflt_value).toBe("'[]'");
			} else {
				expect((col as PgColumnInfo).is_nullable).toBe('NO');
				expect((col as PgColumnInfo).column_default).toContain('[]');
			}

			await context.queryRunner.release();
		});

		it('should set default [] on existing rows', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectId = nanoid(16);
			await insertProject(context, projectId);
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);

			const postContext = createTestMigrationContext(dataSource);
			const tableName = postContext.escape.tableName('project');
			const rows: Array<{ customTelemetryTags: string | Array<{ key: string; value: string }> }> =
				await postContext.runQuery(
					`SELECT ${postContext.escape.columnName('customTelemetryTags')} FROM ${tableName} WHERE ${postContext.escape.columnName('id')} = :id`,
					{ id: projectId },
				);
			const raw = rows[0].customTelemetryTags;
			const tags =
				typeof raw === 'string' ? jsonParse<Array<{ key: string; value: string }>>(raw) : raw;
			expect(tags).toEqual([]);

			await postContext.queryRunner.release();
		});
	});

	describe('down', () => {
		it('should remove customTelemetryTags column', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			expect(await getColumnMeta(context, 'customTelemetryTags')).toBeUndefined();
			await context.queryRunner.release();
		});
	});
});
