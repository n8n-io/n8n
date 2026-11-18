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

import { indexColumnsInOrder } from './shared/index-columns';

const MIGRATION_NAME = 'CreateLeaseTables1794906454000';

const TABLES = ['lease_kind', 'lease_session', 'lease'];

const isSqlite = (process.env.DB_TYPE ?? 'sqlite') === 'sqlite';
const zero = isSqlite ? '0' : "'0'";

const varchar = (length: number) => [isSqlite ? 'varchar' : 'character varying', `${length}`];
const uuid = isSqlite ? ['varchar', ''] : ['uuid', ''];
const bigint = ['bigint', ''];
const int = ['integer', ''];
const json = isSqlite ? ['text', ''] : ['json', ''];
const timestamp = isSqlite ? ['datetime', ''] : ['timestamp with time zone', ''];

const newKind = () => `k-${randomUUID().slice(0, 8)}`;

const REQUIRED_VALUES: Record<string, () => Record<string, unknown>> = {
	lease_kind: () => ({ kind: newKind() }),
	lease_session: () => ({
		id: randomUUID(),
		hostId: 'host-1',
		bootId: randomUUID(),
		leaseDurationSeconds: 30,
		expiresAt: '2026-01-02 03:04:05.678',
	}),
	lease: () => ({ key: randomUUID(), data: '{}', dataHash: 'hash' }),
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

	async function primaryKeyColumnsInOrder(context: TestMigrationContext, name: string) {
		const rows = context.isSqlite
			? await context.runQuery<Array<{ name: string }>>(
					'SELECT name FROM pragma_table_info(:table) WHERE pk > 0 ORDER BY pk',
					{ table: `${context.tablePrefix}${name}` },
				)
			: await context.runQuery<Array<{ name: string }>>(
					`SELECT a.attname AS name
					 FROM pg_index i
					 CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
					 JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
					 WHERE i.indrelid = to_regclass('${context.escape.tableName(name)}') AND i.indisprimary
					 ORDER BY k.ord`,
				);
		return rows.map((row) => row.name);
	}

	async function insertRow(
		context: TestMigrationContext,
		table: string,
		values: Record<string, unknown>,
	) {
		const row = { ...REQUIRED_VALUES[table](), ...values };
		if (table !== 'lease_kind' && !('leaseKind' in row)) row.leaseKind = await insertKind(context);
		const columns = Object.keys(row);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(table)} (${columns.map((c) => `"${c}"`).join(', ')})
			 VALUES (${columns.map((c) => `:${c}`).join(', ')})`,
			row,
		);
	}

	async function insertKind(context: TestMigrationContext) {
		const kind = newKind();
		await insertRow(context, 'lease_kind', { kind });
		return kind;
	}

	async function countRows(context: TestMigrationContext, table: string, leaseKind: string) {
		const [{ count }] = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS count FROM ${context.escape.tableName(table)} WHERE "leaseKind" = :leaseKind`,
			{ leaseKind },
		);
		return Number(count);
	}

	it.each([
		[
			'lease_kind',
			{
				kind: varchar(24),
				fencingTokenCounter: bigint,
				syncLockRoundId: uuid,
				syncLockExpiresAt: timestamp,
				lastFullSyncAt: timestamp,
				createdAt: timestamp,
				updatedAt: timestamp,
			},
			['kind', 'fencingTokenCounter', 'createdAt', 'updatedAt'],
		],
		[
			'lease_session',
			{
				id: uuid,
				leaseKind: varchar(24),
				hostId: varchar(255),
				bootId: uuid,
				leaseDurationSeconds: int,
				expiresAt: timestamp,
				createdAt: timestamp,
			},
			['id', 'leaseKind', 'hostId', 'bootId', 'leaseDurationSeconds', 'expiresAt', 'createdAt'],
		],
		[
			'lease',
			{
				leaseKind: varchar(24),
				key: varchar(255),
				data: json,
				dataHash: varchar(64),
				leaseSessionId: uuid,
				fencingToken: bigint,
				claimedAt: timestamp,
				readyAt: timestamp,
				revokedAt: timestamp,
				createdAt: timestamp,
				updatedAt: timestamp,
			},
			['leaseKind', 'key', 'data', 'dataHash', 'fencingToken', 'createdAt', 'updatedAt'],
		],
	])(
		'creates %s with its column types, lengths and NOT NULL constraints',
		async (name, columns, notNull) => {
			await withContext(async (context) => {
				const table = await getTable(context, name);

				expect(Object.fromEntries(table.columns.map((c) => [c.name, [c.type, c.length]]))).toEqual(
					columns,
				);
				expect(
					table.columns
						.filter((c) => !c.isNullable)
						.map((c) => c.name)
						.sort(),
				).toEqual([...notNull].sort());
			});
		},
	);

	it.each([
		['lease_kind', 'fencingTokenCounter', zero],
		['lease', 'fencingToken', zero],
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
			expect(await primaryKeyColumnsInOrder(context, name)).toEqual(expected);
		});
	});

	it.each([
		['lease_session_leaseKind_expiresAt', ['leaseKind', 'expiresAt']],
		['lease_leaseKind_leaseSessionId', ['leaseKind', 'leaseSessionId']],
	])('creates the index %s over its columns in order', async (name, expected) => {
		await withContext(async (context) => {
			expect(await indexColumnsInOrder(context, name)).toEqual(expected);
		});
	});

	it('keeps leaseSessionId, fencingToken and revokedAt out of unique indexes', async () => {
		await withContext(async (context) => {
			const table = await getTable(context, 'lease');
			const guarded = ['leaseSessionId', 'fencingToken', 'revokedAt'];

			const uniqueColumns = [
				...table.indices.filter((i) => i.isUnique).flatMap((i) => i.columnNames),
				...table.uniques.flatMap((u) => u.columnNames),
			];
			expect(uniqueColumns.filter((c) => guarded.includes(c))).toEqual([]);
		});
	});

	it.each(['lease_session', 'lease'])(
		'references lease_kind.kind from %s.leaseKind with ON DELETE CASCADE',
		async (name) => {
			await withContext(async (context) => {
				const table = await getTable(context, name);
				expect(table.foreignKeys).toHaveLength(1);
				expect(table.foreignKeys[0]).toMatchObject({
					columnNames: ['leaseKind'],
					referencedTableName: `${context.tablePrefix}lease_kind`,
					referencedColumnNames: ['kind'],
					onDelete: 'CASCADE',
				});
			});
		},
	);

	it.each(['lease_session', 'lease'])(
		'accepts a %s row with an existing kind and rejects an unknown kind',
		async (name) => {
			await withContext(async (context) => {
				const leaseKind = await insertKind(context);
				await expect(insertRow(context, name, { leaseKind })).resolves.not.toThrow();
				await expect(insertRow(context, name, { leaseKind: 'missing-kind' })).rejects.toThrow(
					isSqlite ? 'FOREIGN KEY constraint failed' : `FK_${context.tablePrefix}${name}_leaseKind`,
				);
			});
		},
	);

	it('deletes the sessions and leases of a deleted lease_kind', async () => {
		await withContext(async (context) => {
			const leaseKind = await insertKind(context);
			await insertRow(context, 'lease_session', { leaseKind });
			await insertRow(context, 'lease', { leaseKind });

			expect(await countRows(context, 'lease_session', leaseKind)).toBe(1);
			expect(await countRows(context, 'lease', leaseKind)).toBe(1);

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('lease_kind')} WHERE "kind" = :leaseKind`,
				{ leaseKind },
			);

			expect(await countRows(context, 'lease_session', leaseKind)).toBe(0);
			expect(await countRows(context, 'lease', leaseKind)).toBe(0);
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
