import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateLeaseTables1794818156000';

const TABLES = ['lease_kind', 'lease_session', 'lease'];

const isSqlite = (process.env.DB_TYPE ?? 'sqlite') === 'sqlite';
const zero = isSqlite ? '0' : "'0'";

describe('CreateLeaseTables migration', () => {
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

	async function withContext(fn: (context: TestMigrationContext) => Promise<void>) {
		const context = createTestMigrationContext(dataSource);
		try {
			await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function getTable(context: TestMigrationContext, name: string) {
		const table = await context.queryRunner.getTable(`${context.tablePrefix}${name}`);
		if (!table) throw new Error(`Table ${name} not found`);
		return table;
	}

	async function indexExists(context: TestMigrationContext, name: string) {
		const rows = context.isSqlite
			? await context.runQuery<unknown[]>(
					"SELECT name FROM sqlite_master WHERE type = 'index' AND name = :name",
					{ name },
				)
			: await context.runQuery<unknown[]>(
					'SELECT indexname FROM pg_indexes WHERE indexname = :name',
					{ name },
				);
		return rows.length === 1;
	}

	async function insertKind(context: TestMigrationContext, values: Record<string, unknown> = {}) {
		const row = { kind: `k-${randomUUID().slice(0, 8)}`, ...values };
		const columns = Object.keys(row);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('lease_kind')} (${columns.map((c) => `"${c}"`).join(', ')})
			 VALUES (${columns.map((c) => `:${c}`).join(', ')})`,
			row,
		);
	}

	async function insertLease(context: TestMigrationContext, values: Record<string, unknown> = {}) {
		const row = {
			kind: 'trigger',
			key: randomUUID(),
			data: '{}',
			dataHash: 'hash',
			...values,
		};
		const columns = Object.keys(row);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('lease')} (${columns.map((c) => `"${c}"`).join(', ')})
			 VALUES (${columns.map((c) => `:${c}`).join(', ')})`,
			row,
		);
	}

	it('creates the lease tables with their columns', async () => {
		await withContext(async (context) => {
			const columns = async (name: string) =>
				(await getTable(context, name)).columns.map((c) => c.name).sort();

			expect(await columns('lease_kind')).toEqual(
				[
					'kind',
					'tokenCounter',
					'syncHolder',
					'syncExpiresAt',
					'fullPassAt',
					'createdAt',
					'updatedAt',
				].sort(),
			);
			expect(await columns('lease_session')).toEqual(
				['id', 'kind', 'hostId', 'bootId', 'leaseSeconds', 'expiresAt', 'createdAt'].sort(),
			);
			expect(await columns('lease')).toEqual(
				[
					'kind',
					'key',
					'data',
					'dataHash',
					'group',
					'leaseSessionId',
					'fencingToken',
					'claimedAt',
					'readyAt',
					'revoked',
					'revokedAt',
					'startAttempts',
					'nextAttemptAt',
					'lastError',
					'lastErrorAt',
					'createdAt',
					'updatedAt',
				].sort(),
			);
		});
	});

	it.each([
		['lease_kind', ['kind', 'tokenCounter', 'createdAt', 'updatedAt']],
		['lease_session', ['id', 'kind', 'hostId', 'bootId', 'leaseSeconds', 'expiresAt', 'createdAt']],
		[
			'lease',
			[
				'kind',
				'key',
				'data',
				'dataHash',
				'fencingToken',
				'revoked',
				'startAttempts',
				'createdAt',
				'updatedAt',
			],
		],
	])('makes only the expected columns of %s NOT NULL', async (name, expected) => {
		await withContext(async (context) => {
			const table = await getTable(context, name);
			const notNull = table.columns.filter((c) => !c.isNullable).map((c) => c.name);
			expect(notNull.sort()).toEqual([...expected].sort());
		});
	});

	it.each([
		['lease_kind', 'tokenCounter', zero],
		['lease', 'fencingToken', zero],
		['lease', 'startAttempts', zero],
		['lease', 'revoked', isSqlite ? '0' : 'false'],
	])('sets the default of %s.%s to %s', async (name, column, expected) => {
		await withContext(async (context) => {
			const table = await getTable(context, name);
			expect(table.findColumnByName(column)?.default).toBe(expected);
		});
	});

	it.each([
		['lease_kind', ['kind']],
		['lease_session', ['id']],
		['lease', ['kind', 'key']],
	])('sets the primary key of %s', async (name, expected) => {
		await withContext(async (context) => {
			const table = await getTable(context, name);
			expect(table.primaryColumns.map((c) => c.name).sort()).toEqual([...expected].sort());
		});
	});

	it('creates the lookup indexes', async () => {
		await withContext(async (context) => {
			for (const suffix of [
				'lease_session_kind_expiresAt',
				'lease_kind_leaseSessionId',
				'lease_kind_group',
			]) {
				expect(await indexExists(context, `IDX_${context.tablePrefix}${suffix}`)).toBe(true);
			}
		});
	});

	it('keeps leaseSessionId, fencingToken and revoked out of unique indexes and foreign keys', async () => {
		await withContext(async (context) => {
			const table = await getTable(context, 'lease');
			const guarded = ['leaseSessionId', 'fencingToken', 'revoked'];

			const uniqueColumns = [
				...table.indices.filter((i) => i.isUnique).flatMap((i) => i.columnNames),
				...table.uniques.flatMap((u) => u.columnNames),
			];
			expect(uniqueColumns.filter((c) => guarded.includes(c))).toEqual([]);
			expect(table.foreignKeys).toEqual([]);
		});
	});

	it('accepts a zero token counter and rejects a negative one', async () => {
		await withContext(async (context) => {
			await expect(insertKind(context, { tokenCounter: 0 })).resolves.not.toThrow();
			await expect(insertKind(context, { tokenCounter: -1 })).rejects.toThrow(
				`CHK_${context.tablePrefix}lease_kind_tokenCounter`,
			);
		});
	});

	it.each(['fencingToken', 'startAttempts'])(
		'accepts a zero %s and rejects a negative one',
		async (column) => {
			await withContext(async (context) => {
				await expect(insertLease(context, { [column]: 0 })).resolves.not.toThrow();
				await expect(insertLease(context, { [column]: -1 })).rejects.toThrow(
					`CHK_${context.tablePrefix}lease_${column}`,
				);
			});
		},
	);

	it.skipIf(isSqlite)('sets fillfactor 90 on the lease table on Postgres', async () => {
		await withContext(async (context) => {
			const [{ reloptions }] = await context.runQuery<Array<{ reloptions: string[] }>>(
				`SELECT reloptions FROM pg_class WHERE oid = to_regclass('${context.escape.tableName('lease')}')`,
			);
			expect(reloptions).toEqual(expect.arrayContaining(['fillfactor=90']));
		});
	});

	it('drops the tables on down and can be re-applied', async () => {
		await undoLastSingleMigration();

		await withContext(async (context) => {
			for (const name of TABLES) {
				expect(await context.queryRunner.hasTable(`${context.tablePrefix}${name}`)).toBe(false);
			}
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			for (const name of TABLES) {
				expect(await context.queryRunner.hasTable(`${context.tablePrefix}${name}`)).toBe(true);
			}
		});
	});
});
