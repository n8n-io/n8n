import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateGitConnectionTable1786547629549';

describe('CreateGitConnectionTable migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insertConnection(
		context: TestMigrationContext,
		overrides: {
			connectionType?: string;
			keyGeneratorType?: string | null;
		} = {},
	) {
		const table = context.escape.tableName('git_connection');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "repositoryUrl", "connectionType", "keyGeneratorType", "createdAt", "updatedAt")
			 VALUES (:id, :name, :repositoryUrl, :connectionType, :keyGeneratorType, :createdAt, :updatedAt)`,
			{
				id: randomUUID(),
				name: 'Deployments',
				repositoryUrl: 'https://example.com/org/repo.git',
				connectionType: overrides.connectionType ?? 'https',
				keyGeneratorType: overrides.keyGeneratorType ?? null,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	describe('Up migration', () => {
		it('creates a table that stores SSH and HTTPS connections', async () => {
			const context = createTestMigrationContext(dataSource);
			const table = context.escape.tableName('git_connection');
			await insertConnection(context, { connectionType: 'https' });
			await insertConnection(context, { connectionType: 'ssh', keyGeneratorType: 'ed25519' });

			const rows = await context.runQuery<
				Array<{ branchName: string | null; connectionType: string }>
			>(`SELECT "branchName", "connectionType" FROM ${table} ORDER BY "connectionType"`);
			expect(rows).toEqual([
				{ branchName: null, connectionType: 'https' },
				{ branchName: null, connectionType: 'ssh' },
			]);
			await context.queryRunner.release();
		});

		it('rejects an out-of-set connectionType via the CHECK constraint', async () => {
			const context = createTestMigrationContext(dataSource);
			await expect(insertConnection(context, { connectionType: 'bogus' })).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('rejects an out-of-set keyGeneratorType via the CHECK constraint', async () => {
			const context = createTestMigrationContext(dataSource);
			await expect(
				insertConnection(context, { connectionType: 'ssh', keyGeneratorType: 'bogus' }),
			).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('accepts a NULL keyGeneratorType (unset for HTTPS connections)', async () => {
			const context = createTestMigrationContext(dataSource);
			await expect(
				insertConnection(context, { connectionType: 'https', keyGeneratorType: null }),
			).resolves.not.toThrow();
			await context.queryRunner.release();
		});
	});

	describe('Down migration', () => {
		it('drops the table and can be re-applied', async () => {
			await dataSource.undoLastMigration({ transaction: 'each' });

			const context = createTestMigrationContext(dataSource);
			const table = `${context.tablePrefix}git_connection`;
			expect(await context.queryRunner.hasTable(table)).toBe(false);
			await context.queryRunner.release();

			// Round-trip: up() must run cleanly again after a full revert.
			await runSingleMigration(MIGRATION_NAME);
			const context2 = createTestMigrationContext(dataSource);
			expect(await context2.queryRunner.hasTable(table)).toBe(true);
			await context2.queryRunner.release();
		});
	});
});
