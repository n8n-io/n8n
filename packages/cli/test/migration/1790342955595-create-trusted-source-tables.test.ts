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

const MIGRATION_NAME = 'CreateTrustedSourceTables1790342955595';

const SOURCE_TABLE = 'trusted_source';
const IDENTITY_TABLE = 'trusted_source_identity';
const USER_TABLE = 'user';

describe('CreateTrustedSourceTables migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertUser({ escape, runQuery }: TestMigrationContext, id: string) {
		await runQuery(
			`INSERT INTO ${escape.tableName(USER_TABLE)} (${['id', 'email', 'roleSlug'].map(escape.columnName).join(', ')})
			 VALUES (:id, :email, :roleSlug)`,
			{ id, email: `${id}@example.com`, roleSlug: 'global:owner' },
		);
	}

	async function insertSource(
		{ escape, runQuery }: TestMigrationContext,
		id: string,
		overrides: { name?: string; issuer?: string } = {},
	) {
		const now = new Date();
		await runQuery(
			`INSERT INTO ${escape.tableName(SOURCE_TABLE)}
			 (${['id', 'name', 'type', 'issuer', 'managedBy', 'status', 'configVersion', 'config', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
			 VALUES (:id, :name, :type, :issuer, :managedBy, :status, :configVersion, :config, :createdAt, :updatedAt)`,
			{
				id,
				name: overrides.name ?? `source-${id}`,
				type: 'oauth2',
				issuer: overrides.issuer ?? `https://issuer.example.com/${id}`,
				managedBy: 'admin',
				status: 'unchecked',
				configVersion: 1,
				config: 'encrypted',
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertIdentity(
		{ escape, runQuery }: TestMigrationContext,
		sourceId: string,
		subject: string,
		userId: string,
	) {
		const now = new Date();
		await runQuery(
			`INSERT INTO ${escape.tableName(IDENTITY_TABLE)}
			 (${['sourceId', 'subject', 'userId', 'provenance', 'status', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
			 VALUES (:sourceId, :subject, :userId, :provenance, :status, :createdAt, :updatedAt)`,
			{
				sourceId,
				subject,
				userId,
				provenance: 'admin',
				status: 'active',
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function countRows(
		{ escape, runQuery }: TestMigrationContext,
		table: string,
		column: string,
		value: string,
	) {
		const rows = await runQuery<Array<{ c: number | string }>>(
			`SELECT COUNT(*) AS ${escape.columnName('c')} FROM ${escape.tableName(table)} WHERE ${escape.columnName(column)} = :value`,
			{ value },
		);
		return Number(rows[0].c);
	}

	async function getTable(context: TestMigrationContext, table: string) {
		return await context.queryRunner.getTable(`${context.tablePrefix}${table}`);
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	describe('Up migration', () => {
		it('creates the trusted_source table with the expected columns and indexes', async () => {
			await withContext(async (context) => {
				const table = await getTable(context, SOURCE_TABLE);
				expect(table).toBeDefined();

				for (const column of [
					'id',
					'name',
					'type',
					'issuer',
					'managedBy',
					'status',
					'configVersion',
					'config',
					'createdAt',
					'updatedAt',
				]) {
					expect(table?.findColumnByName(column), column).toMatchObject({ isNullable: false });
				}
				for (const column of ['lastError', 'lastCheckedAt']) {
					expect(table?.findColumnByName(column), column).toMatchObject({ isNullable: true });
				}

				const uniqueIndexColumns = table?.indices
					.filter((index) => index.isUnique)
					.map((index) => index.columnNames)
					.sort();
				expect(uniqueIndexColumns).toEqual([['issuer'], ['name']]);
			});
		});

		it('creates the trusted_source_identity table with the expected columns and a non-unique userId index', async () => {
			await withContext(async (context) => {
				const table = await getTable(context, IDENTITY_TABLE);
				expect(table).toBeDefined();

				for (const column of [
					'sourceId',
					'subject',
					'userId',
					'provenance',
					'status',
					'createdAt',
					'updatedAt',
				]) {
					expect(table?.findColumnByName(column), column).toMatchObject({ isNullable: false });
				}
				expect(table?.findColumnByName('lastSeenAt')).toMatchObject({ isNullable: true });

				const userIdIndex = table?.indices.find(
					(index) => index.columnNames.length === 1 && index.columnNames[0] === 'userId',
				);
				expect(userIdIndex).toMatchObject({ isUnique: false });
			});
		});

		it('rejects a second source with the same issuer or the same name', async () => {
			await withContext(async (context) => {
				const issuer = `https://issuer.example.com/${randomUUID()}`;
				const name = `name-${randomUUID()}`;
				await insertSource(context, randomUUID(), { issuer, name });

				await expect(insertSource(context, randomUUID(), { issuer })).rejects.toThrow();
				await expect(insertSource(context, randomUUID(), { name })).rejects.toThrow();

				const otherId = randomUUID();
				await insertSource(context, otherId);
				expect(await countRows(context, SOURCE_TABLE, 'id', otherId)).toBe(1);
			});
		});

		it('keys identities by source and subject', async () => {
			await withContext(async (context) => {
				const userId = randomUUID();
				const firstSourceId = randomUUID();
				const secondSourceId = randomUUID();
				await insertUser(context, userId);
				await insertSource(context, firstSourceId);
				await insertSource(context, secondSourceId);
				await insertIdentity(context, firstSourceId, 'subject-1', userId);

				await expect(insertIdentity(context, firstSourceId, 'subject-1', userId)).rejects.toThrow();

				await insertIdentity(context, secondSourceId, 'subject-1', userId);
				expect(await countRows(context, IDENTITY_TABLE, 'userId', userId)).toBe(2);
			});
		});

		it('deletes the identities of a deleted source and keeps the user', async () => {
			await withContext(async (context) => {
				const userId = randomUUID();
				const sourceId = randomUUID();
				await insertUser(context, userId);
				await insertSource(context, sourceId);
				await insertIdentity(context, sourceId, 'subject-1', userId);

				await context.runQuery(
					`DELETE FROM ${context.escape.tableName(SOURCE_TABLE)} WHERE ${context.escape.columnName('id')} = :id`,
					{ id: sourceId },
				);

				expect(await countRows(context, IDENTITY_TABLE, 'sourceId', sourceId)).toBe(0);
				expect(await countRows(context, USER_TABLE, 'id', userId)).toBe(1);
			});
		});

		it('deletes the identities of a deleted user and keeps the source', async () => {
			await withContext(async (context) => {
				const userId = randomUUID();
				const sourceId = randomUUID();
				await insertUser(context, userId);
				await insertSource(context, sourceId);
				await insertIdentity(context, sourceId, 'subject-1', userId);

				await context.runQuery(
					`DELETE FROM ${context.escape.tableName(USER_TABLE)} WHERE ${context.escape.columnName('id')} = :id`,
					{ id: userId },
				);

				expect(await countRows(context, IDENTITY_TABLE, 'userId', userId)).toBe(0);
				expect(await countRows(context, SOURCE_TABLE, 'id', sourceId)).toBe(1);
			});
		});
	});

	describe('Down migration', () => {
		it('drops both tables and can be applied again', async () => {
			await undoLastSingleMigration();

			await withContext(async (context) => {
				expect(await context.queryRunner.hasTable(`${context.tablePrefix}${SOURCE_TABLE}`)).toBe(
					false,
				);
				expect(await context.queryRunner.hasTable(`${context.tablePrefix}${IDENTITY_TABLE}`)).toBe(
					false,
				);
			});

			await runSingleMigration(MIGRATION_NAME);

			await withContext(async (context) => {
				expect(await context.queryRunner.hasTable(`${context.tablePrefix}${SOURCE_TABLE}`)).toBe(
					true,
				);
				expect(await context.queryRunner.hasTable(`${context.tablePrefix}${IDENTITY_TABLE}`)).toBe(
					true,
				);
			});
		});
	});
});
