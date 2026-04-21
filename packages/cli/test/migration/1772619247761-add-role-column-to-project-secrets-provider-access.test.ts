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
			const now = new Date();
			const projectTable = context.escape.tableName('project');
			await context.runQuery(
				`INSERT INTO ${projectTable} ("id", "name", "type", "createdAt", "updatedAt") VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
				{ id: 'test-proj', name: 'Test', type: 'team', createdAt: now, updatedAt: now },
			);
			const connectionTable = context.escape.tableName('secrets_provider_connection');
			await context.runQuery(
				`INSERT INTO ${connectionTable} ("providerKey", "type", "encryptedSettings", "isEnabled", "createdAt", "updatedAt") VALUES (:providerKey, :type, :encryptedSettings, :isEnabled, :createdAt, :updatedAt)`,
				{
					providerKey: 'test-key',
					type: 'vault',
					encryptedSettings: '{}',
					isEnabled: false,
					createdAt: now,
					updatedAt: now,
				},
			);
			const [{ id: connId }] = await context.runQuery<Array<{ id: number }>>(
				`SELECT "id" FROM ${connectionTable} WHERE "providerKey" = :providerKey`,
				{ providerKey: 'test-key' },
			);
			return connId;
		}

		async function insertAccess(context: TestMigrationContext, connId: number, role: string) {
			const now = new Date();
			const accessTable = context.escape.tableName(table);
			await context.runQuery(
				`INSERT INTO ${accessTable} ("secretsProviderConnectionId", "projectId", "role", "createdAt", "updatedAt") VALUES (:connId, :projectId, :role, :createdAt, :updatedAt)`,
				{ connId, projectId: 'test-proj', role, createdAt: now, updatedAt: now },
			);
		}

		it('should accept valid role values', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);
			const connId = await insertPrerequisiteData(context);

			await insertAccess(context, connId, 'secretsProviderConnection:owner');

			const accessTable = context.escape.tableName(table);
			const rows = await context.runQuery<Array<{ role: string }>>(
				`SELECT "role" FROM ${accessTable} WHERE "projectId" = :projectId`,
				{ projectId: 'test-proj' },
			);
			expect(rows).toHaveLength(1);
			expect(rows[0].role).toBe('secretsProviderConnection:owner');

			await context.queryRunner.release();
		});

		it('should reject invalid role values via check constraint', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);
			const connId = await insertPrerequisiteData(context);

			await expect(insertAccess(context, connId, 'invalid-role')).rejects.toThrow();

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
