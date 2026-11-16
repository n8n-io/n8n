import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection, Lease, LeaseKind, LeaseSession } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateLeaseTables1794818156000';

const TABLES = ['lease_kind', 'lease_session', 'lease'];

const isSqlite = (process.env.DB_TYPE ?? 'sqlite') === 'sqlite';
const zero = isSqlite ? '0' : "'0'";

const REQUIRED_VALUES: Record<string, () => Record<string, unknown>> = {
	lease_kind: () => ({ kind: `k-${randomUUID().slice(0, 8)}` }),
	lease: () => ({ leaseKind: 'trigger', key: randomUUID(), data: '{}', dataHash: 'hash' }),
};

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

	async function insertRow(
		context: TestMigrationContext,
		table: string,
		values: Record<string, unknown>,
	) {
		const row = { ...REQUIRED_VALUES[table](), ...values };
		const columns = Object.keys(row);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(table)} (${columns.map((c) => `"${c}"`).join(', ')})
			 VALUES (${columns.map((c) => `:${c}`).join(', ')})`,
			row,
		);
	}

	it.each([
		[
			'lease_kind',
			[
				'kind',
				'fencingTokenCounter',
				'syncLockRoundId',
				'syncLockExpiresAt',
				'lastFullSyncAt',
				'createdAt',
				'updatedAt',
			],
			['kind', 'fencingTokenCounter', 'createdAt', 'updatedAt'],
		],
		[
			'lease_session',
			['id', 'leaseKind', 'hostId', 'bootId', 'leaseDurationSeconds', 'expiresAt', 'createdAt'],
			['id', 'leaseKind', 'hostId', 'bootId', 'leaseDurationSeconds', 'expiresAt', 'createdAt'],
		],
		[
			'lease',
			[
				'leaseKind',
				'key',
				'data',
				'dataHash',
				'leaseSessionId',
				'fencingToken',
				'claimedAt',
				'readyAt',
				'revoked',
				'revokedAt',
				'createdAt',
				'updatedAt',
			],
			['leaseKind', 'key', 'data', 'dataHash', 'fencingToken', 'revoked', 'createdAt', 'updatedAt'],
		],
	])('creates %s with its columns and NOT NULL constraints', async (name, columns, notNull) => {
		await withContext(async (context) => {
			const table = await getTable(context, name);

			expect(table.columns.map((c) => c.name).sort()).toEqual([...columns].sort());
			expect(
				table.columns
					.filter((c) => !c.isNullable)
					.map((c) => c.name)
					.sort(),
			).toEqual([...notNull].sort());
		});
	});

	it.each([
		['lease_kind', 'fencingTokenCounter', zero],
		['lease', 'fencingToken', zero],
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

	it.each([
		['lease_kind', 'fencingTokenCounter'],
		['lease', 'fencingToken'],
	])('accepts a zero %s.%s and rejects a negative one', async (table, column) => {
		await withContext(async (context) => {
			await expect(insertRow(context, table, { [column]: 0 })).resolves.not.toThrow();
			await expect(insertRow(context, table, { [column]: -1 })).rejects.toThrow(
				`CHK_${context.tablePrefix}${table}_${column}`,
			);
		});
	});

	it.skipIf(isSqlite)('sets fillfactor 90 on the lease table on Postgres', async () => {
		await withContext(async (context) => {
			const [{ reloptions }] = await context.runQuery<Array<{ reloptions: string[] }>>(
				`SELECT reloptions FROM pg_class WHERE oid = to_regclass('${context.escape.tableName('lease')}')`,
			);
			expect(reloptions).toEqual(expect.arrayContaining(['fillfactor=90']));
		});
	});

	it('saves and reads back each lease entity', async () => {
		const kinds = dataSource.getRepository(LeaseKind);
		const sessions = dataSource.getRepository(LeaseSession);
		const leases = dataSource.getRepository(Lease);
		const kind = 'entity-round-trip';
		const sessionId = randomUUID();
		const bootId = randomUUID();
		const token = 2 ** 40;
		const syncLockExpiresAt = new Date('2026-01-02T03:04:05.678Z');
		const expiresAt = new Date('2026-01-02T03:05:05.678Z');
		const claimedAt = new Date('2026-01-02T03:06:05.678Z');

		await kinds.save(kinds.create({ kind, fencingTokenCounter: token, syncLockExpiresAt }));
		await sessions.save(
			sessions.create({
				id: sessionId,
				leaseKind: kind,
				hostId: 'host-1',
				bootId,
				leaseDurationSeconds: 30,
				expiresAt,
			}),
		);
		await leases.save(
			leases.create({
				leaseKind: kind,
				key: 'key-1',
				data: '{"a":1}',
				dataHash: 'hash',
				leaseSessionId: sessionId,
				fencingToken: token,
				claimedAt,
			}),
		);

		expect(await kinds.findOneByOrFail({ kind })).toMatchObject({
			fencingTokenCounter: token,
			syncLockRoundId: null,
			syncLockExpiresAt,
			lastFullSyncAt: null,
		});
		expect(await sessions.findOneByOrFail({ id: sessionId })).toMatchObject({
			leaseKind: kind,
			hostId: 'host-1',
			bootId,
			leaseDurationSeconds: 30,
			expiresAt,
		});
		expect(await leases.findOneByOrFail({ leaseKind: kind, key: 'key-1' })).toMatchObject({
			data: '{"a":1}',
			leaseSessionId: sessionId,
			fencingToken: token,
			claimedAt,
			readyAt: null,
			revoked: false,
			revokedAt: null,
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
