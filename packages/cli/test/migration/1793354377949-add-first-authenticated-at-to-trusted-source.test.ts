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

const MIGRATION_NAME = 'AddFirstAuthenticatedAtToTrustedSource1793354377949';

const SOURCE_TABLE = 'trusted_source';
const IDENTITY_TABLE = 'trusted_source_identity';
const USER_TABLE = 'user';
const COLUMN = 'firstAuthenticatedAt';

describe('AddFirstAuthenticatedAtToTrustedSource migration', () => {
	let dataSource: DataSource;
	const userId = randomUUID();
	const sourceId = randomUUID();

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

	async function insertSource({ escape, runQuery }: TestMigrationContext, id: string) {
		const now = new Date();
		await runQuery(
			`INSERT INTO ${escape.tableName(SOURCE_TABLE)}
			 (${['id', 'name', 'type', 'issuer', 'managedBy', 'status', 'configVersion', 'config', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
			 VALUES (:id, :name, :type, :issuer, :managedBy, :status, :configVersion, :config, :createdAt, :updatedAt)`,
			{
				id,
				name: `source-${id}`,
				type: 'oauth2',
				issuer: `https://issuer.example.com/${id}`,
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
		source: string,
		user: string,
	) {
		const now = new Date();
		await runQuery(
			`INSERT INTO ${escape.tableName(IDENTITY_TABLE)}
			 (${['sourceId', 'subject', 'userId', 'provenance', 'status', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
			 VALUES (:sourceId, :subject, :userId, :provenance, :status, :createdAt, :updatedAt)`,
			{
				sourceId: source,
				subject: 'subject-1',
				userId: user,
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
		const rows = await runQuery<{ c: number | string }[]>(
			`SELECT COUNT(*) AS ${escape.columnName('c')} FROM ${escape.tableName(table)} WHERE ${escape.columnName(column)} = :value`,
			{ value },
		);
		return Number(rows[0].c);
	}

	async function getColumn(context: TestMigrationContext) {
		const table = await context.queryRunner.getTable(`${context.tablePrefix}${SOURCE_TABLE}`);
		return table?.findColumnByName(COLUMN);
	}

	/** One source with one binding exists before the migration runs, so a recreate must keep both. */
	async function expectRowsKept(context: TestMigrationContext) {
		expect(await countRows(context, SOURCE_TABLE, 'id', sourceId)).toBe(1);
		expect(await countRows(context, IDENTITY_TABLE, 'sourceId', sourceId)).toBe(1);
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
		await withContext(async (context) => {
			await insertUser(context, userId);
			await insertSource(context, sourceId);
			await insertIdentity(context, sourceId, userId);
		});
		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('adds a nullable firstAuthenticatedAt column that defaults to null', async () => {
		await withContext(async (context) => {
			expect(await getColumn(context)).toMatchObject({ isNullable: true });

			const rows = await context.runQuery<{ v: unknown }[]>(
				`SELECT ${context.escape.columnName(COLUMN)} AS ${context.escape.columnName('v')} FROM ${context.escape.tableName(SOURCE_TABLE)} WHERE ${context.escape.columnName('id')} = :id`,
				{ id: sourceId },
			);
			expect(rows[0].v).toBeNull();
		});
	});

	it('keeps existing sources and their bindings', async () => {
		await withContext(expectRowsKept);
	});

	it('drops the column on down, keeps the rows, and can be applied again', async () => {
		await undoLastSingleMigration();

		await withContext(async (context) => {
			expect(await getColumn(context)).toBeUndefined();
			await expectRowsKept(context);
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			expect(await getColumn(context)).toMatchObject({ isNullable: true });
			await expectRowsKept(context);
		});
	});
});
