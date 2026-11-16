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

	async function getIndex(context: TestMigrationContext, table: string, name: string) {
		if (context.isSqlite) {
			const columns = await context.runQuery<Array<{ name: string }>>(
				'SELECT name FROM pragma_index_info(:name) ORDER BY seqno',
				{ name },
			);
			const lists = await context.runQuery<Array<{ unique: number }>>(
				'SELECT "unique" FROM pragma_index_list(:table) WHERE name = :name',
				{ table: `${context.tablePrefix}${table}`, name },
			);
			return { columnNames: columns.map((c) => c.name), isUnique: lists[0]?.unique === 1 };
		}
		const columns = await context.runQuery<Array<{ name: string }>>(
			`SELECT a.attname AS name
			 FROM pg_index i
			 JOIN pg_class c ON c.oid = i.indexrelid
			 CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
			 JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
			 WHERE c.relname = :name
			 ORDER BY k.ord`,
			{ name },
		);
		const unique = await context.runQuery<Array<{ indisunique: boolean }>>(
			`SELECT i.indisunique FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relname = :name`,
			{ name },
		);
		return { columnNames: columns.map((c) => c.name), isUnique: unique[0]?.indisunique === true };
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
			leaseKind: 'trigger',
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
					'fencingTokenCounter',
					'syncLockRoundId',
					'syncLockExpiresAt',
					'lastFullSyncAt',
					'createdAt',
					'updatedAt',
				].sort(),
			);
			expect(await columns('lease_session')).toEqual(
				[
					'id',
					'leaseKind',
					'hostId',
					'bootId',
					'leaseDurationSeconds',
					'expiresAt',
					'createdAt',
				].sort(),
			);
			expect(await columns('lease')).toEqual(
				[
					'leaseKind',
					'key',
					'data',
					'dataHash',
					'fanOutGroup',
					'leaseSessionId',
					'fencingToken',
					'claimedAt',
					'readyAt',
					'revoked',
					'revokedAt',
					'failedStartAttempts',
					'nextStartAttemptAt',
					'lastError',
					'lastErrorAt',
					'createdAt',
					'updatedAt',
				].sort(),
			);
		});
	});

	it.each([
		['lease_kind', ['kind', 'fencingTokenCounter', 'createdAt', 'updatedAt']],
		[
			'lease_session',
			['id', 'leaseKind', 'hostId', 'bootId', 'leaseDurationSeconds', 'expiresAt', 'createdAt'],
		],
		[
			'lease',
			[
				'leaseKind',
				'key',
				'data',
				'dataHash',
				'fencingToken',
				'revoked',
				'failedStartAttempts',
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
		['lease_kind', 'fencingTokenCounter', zero],
		['lease', 'fencingToken', zero],
		['lease', 'failedStartAttempts', zero],
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
		['lease', ['leaseKind', 'key']],
	])('sets the primary key of %s', async (name, expected) => {
		await withContext(async (context) => {
			const table = await getTable(context, name);
			expect(table.primaryColumns.map((c) => c.name).sort()).toEqual([...expected].sort());
		});
	});

	it.each([
		['lease_session', 'lease_session_leaseKind_expiresAt', ['leaseKind', 'expiresAt']],
		['lease', 'lease_leaseKind_leaseSessionId', ['leaseKind', 'leaseSessionId']],
		['lease', 'lease_leaseKind_fanOutGroup', ['leaseKind', 'fanOutGroup']],
	])('creates the non-unique index on %s named %s', async (name, suffix, expected) => {
		await withContext(async (context) => {
			const index = await getIndex(context, name, `IDX_${context.tablePrefix}${suffix}`);
			expect(index.columnNames).toEqual(expected);
			expect(index.isUnique).toBe(false);
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
			await expect(insertKind(context, { fencingTokenCounter: 0 })).resolves.not.toThrow();
			await expect(insertKind(context, { fencingTokenCounter: -1 })).rejects.toThrow(
				`CHK_${context.tablePrefix}lease_kind_fencingTokenCounter`,
			);
		});
	});

	it.each(['fencingToken', 'failedStartAttempts'])(
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
