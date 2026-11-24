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

const MIGRATION_NAME = 'AddDescriptionToCredentials1789558029357';

describe('AddDescriptionToCredentials migration', () => {
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
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	/** A credential owned by a project, so the incoming share row is exercised too. */
	async function seedCredential(): Promise<{ credentialId: string; projectId: string }> {
		const credentialId = randomUUID();
		const projectId = randomUUID();
		const now = new Date();

		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
				 VALUES (:projectId, 'Project', 'personal', :now, :now)`,
				{ projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('credentials_entity')}
				   ("id", "name", "data", "type", "createdAt", "updatedAt")
				 VALUES (:credentialId, 'Reporting DB', 'encrypted', 'testApi', :now, :now)`,
				{ credentialId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('shared_credentials')}
				   ("credentialsId", "projectId", "role", "createdAt", "updatedAt")
				 VALUES (:credentialId, :projectId, :role, :now, :now)`,
				{ credentialId, projectId, role: 'credential:owner', now },
			);
		});

		return { credentialId, projectId };
	}

	async function columnNames(context: TestMigrationContext): Promise<string[]> {
		if (context.isSqlite) {
			const rows: Array<{ name: string }> = await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName('credentials_entity')})`,
			);
			return rows.map((row) => row.name);
		}
		const rows: Array<{ column_name: string }> = await context.queryRunner.query(
			'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
			[`${context.tablePrefix}credentials_entity`],
		);
		return rows.map((row) => row.column_name);
	}

	async function countShares(context: TestMigrationContext): Promise<number> {
		const rows = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS "count" FROM ${context.escape.tableName('shared_credentials')}`,
		);
		return Number(rows[0]?.count ?? 0);
	}

	it('reads an existing credential back with a null description', async () => {
		const { credentialId } = await seedCredential();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await columnNames(context)).toContain('description');

			const rows = await context.runQuery<Array<{ description: string | null }>>(
				`SELECT "description" FROM ${context.escape.tableName('credentials_entity')} WHERE "id" = :credentialId`,
				{ credentialId },
			);
			expect(rows).toEqual([{ description: null }]);
		});
	});

	it('keeps rows that hold a foreign key to the credential', async () => {
		await seedCredential();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await countShares(context)).toBe(1);
		});
	});

	it('stores and reads back a written description', async () => {
		const { credentialId } = await seedCredential();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const description = 'Read-only key for the reporting database. Do not use for writes.';
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`UPDATE ${escape.tableName('credentials_entity')} SET "description" = :description WHERE "id" = :credentialId`,
				{ description, credentialId },
			);
			const rows = await runQuery<Array<{ description: string | null }>>(
				`SELECT "description" FROM ${escape.tableName('credentials_entity')} WHERE "id" = :credentialId`,
				{ credentialId },
			);
			expect(rows).toEqual([{ description }]);
		});
	});

	it('drops the column and preserves the credential', async () => {
		const { credentialId } = await seedCredential();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await columnNames(context)).not.toContain('description');

			const rows = await context.runQuery<Array<{ id: string }>>(
				`SELECT "id" FROM ${context.escape.tableName('credentials_entity')} WHERE "id" = :credentialId`,
				{ credentialId },
			);
			expect(rows).toEqual([{ id: credentialId }]);
			expect(await countShares(context)).toBe(1);
		});
	});
});
