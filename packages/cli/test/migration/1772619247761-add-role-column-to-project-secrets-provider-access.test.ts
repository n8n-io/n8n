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

const MIGRATION_NAME = 'AddRoleColumnToProjectSecretsProviderAccess1772619247761';

const table = 'project_secrets_provider_access';

describe('AddRoleColumnToProjectSecretsProviderAccess Migration', () => {
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

	async function getColumnMeta(context: TestMigrationContext) {
		if (context.isSqlite) {
			const rows: Array<{ name: string; notnull: number; dflt_value: string | null }> =
				await context.queryRunner.query(`PRAGMA table_info(${context.escape.tableName(table)})`);
			return rows.find((r) => r.name === 'role');
		}
		const rows: Array<{
			column_name: string;
			is_nullable: string;
			column_default: string | null;
		}> = await context.queryRunner.query(
			'SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
			[`${context.tablePrefix}${table}`, 'role'],
		);
		return rows[0];
	}

	describe('up', () => {
		it('should add role as a NOT NULL column with default', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			const col = await getColumnMeta(context);
			expect(col).toBeDefined();

			if (context.isSqlite) {
				expect((col as { notnull: number }).notnull).toBe(1);
				expect((col as { dflt_value: string | null }).dflt_value).toBe(
					"'secretsProviderConnection:user'",
				);
			} else {
				expect((col as { is_nullable: string }).is_nullable).toBe('NO');
				expect((col as { column_default: string | null }).column_default).toContain(
					'secretsProviderConnection:user',
				);
			}

			await context.queryRunner.release();
		});

		async function insertPrerequisiteData(context: TestMigrationContext) {
			const projectTable = context.escape.tableName('project');
			await context.queryRunner.query(
				`INSERT INTO ${projectTable} ("id", "name", "type", "createdAt", "updatedAt") VALUES ('test-proj', 'Test', 'team', datetime('now'), datetime('now'))`,
			);
			const connectionTable = context.escape.tableName('secrets_provider_connection');
			await context.queryRunner.query(
				`INSERT INTO ${connectionTable} ("providerKey", "type", "encryptedSettings", "isEnabled", "createdAt", "updatedAt") VALUES ('test-key', 'vault', '{}', 0, datetime('now'), datetime('now'))`,
			);
			const [{ id: connId }] = await context.queryRunner.query(
				`SELECT "id" FROM ${connectionTable} WHERE "providerKey" = 'test-key'`,
			);
			return connId as number;
		}

		it('should accept valid role values', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);
			const connId = await insertPrerequisiteData(context);
			const accessTable = context.escape.tableName(table);

			await context.queryRunner.query(
				`INSERT INTO ${accessTable} ("secretsProviderConnectionId", "projectId", "role", "createdAt", "updatedAt") VALUES (${connId}, 'test-proj', 'secretsProviderConnection:owner', datetime('now'), datetime('now'))`,
			);

			const rows = await context.queryRunner.query(
				`SELECT "role" FROM ${accessTable} WHERE "projectId" = 'test-proj'`,
			);
			expect(rows).toHaveLength(1);
			expect(rows[0].role).toBe('secretsProviderConnection:owner');

			await context.queryRunner.release();
		});

		it('should reject invalid role values via check constraint', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);
			const connId = await insertPrerequisiteData(context);
			const accessTable = context.escape.tableName(table);

			await expect(
				context.queryRunner.query(
					`INSERT INTO ${accessTable} ("secretsProviderConnectionId", "projectId", "role", "createdAt", "updatedAt") VALUES (${connId}, 'test-proj', 'invalid-role', datetime('now'), datetime('now'))`,
				),
			).rejects.toThrow();

			await context.queryRunner.release();
		});
	});

	describe('down', () => {
		it('should remove the role column', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			expect(await getColumnMeta(context)).toBeUndefined();
			await context.queryRunner.release();
		});
	});
});
