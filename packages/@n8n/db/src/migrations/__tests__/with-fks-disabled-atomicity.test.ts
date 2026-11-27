import { DataSource, type EntitySubscriberInterface } from '@n8n/typeorm';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type {
	IrreversibleMigration,
	Migration,
	MigrationContext,
	ReversibleMigration,
} from '../migration-types';

const MIGRATION_NAME = 'DropParentDescription1700000000001';

describe('SQLite withFKsDisabled migration atomicity (CAP-733)', () => {
	let tempDir: string;
	let previousUserFolder: string | undefined;
	let previousDbType: string | undefined;
	let wrapMigration: (migration: Migration) => void;
	let dataSource: DataSource | undefined;
	let dbCounter = 0;

	beforeAll(async () => {
		tempDir = mkdtempSync(join(tmpdir(), 'n8n-db-with-fks-disabled-'));
		previousUserFolder = process.env.N8N_USER_FOLDER;
		previousDbType = process.env.DB_TYPE;
		process.env.N8N_USER_FOLDER = tempDir;
		process.env.DB_TYPE = 'sqlite';

		// Load migration-helpers after env isolation because it reads GlobalConfig at import time.
		({ wrapMigration } = await import('../migration-helpers.js'));
	});

	function createDropDescriptionMigration(options: { withFKsDisabled: boolean }): Migration {
		if (options.withFKsDisabled) {
			class DropParentDescription1700000000001 implements IrreversibleMigration {
				withFKsDisabled = true as const;

				async up({ schemaBuilder: { dropColumns } }: MigrationContext) {
					await dropColumns('parent_items', ['description'], { recreatesOnSqlite: true });
				}
			}

			wrapMigration(DropParentDescription1700000000001);
			return DropParentDescription1700000000001;
		}

		class DropParentDescription1700000000001 implements IrreversibleMigration {
			async up({ schemaBuilder: { dropColumns } }: MigrationContext) {
				await dropColumns('parent_items', ['description'], { recreatesOnSqlite: true });
			}
		}

		wrapMigration(DropParentDescription1700000000001);
		return DropParentDescription1700000000001;
	}

	async function openSqliteDataSource(
		dbPath: string,
		migrations: Migration[],
	): Promise<DataSource> {
		const ds = new DataSource({
			type: 'sqlite-pooled',
			poolSize: 1,
			enableWAL: true,
			acquireTimeout: 10_000,
			destroyTimeout: 5_000,
			database: dbPath,
			migrations,
			migrationsTableName: 'migrations',
			synchronize: false,
		});
		await ds.initialize();
		return ds;
	}

	async function seedTables(ds: DataSource): Promise<void> {
		await ds.query(`
			CREATE TABLE "parent_items" (
				"id" varchar(36) PRIMARY KEY NOT NULL,
				"name" varchar(128) NOT NULL,
				"description" varchar(512)
			)
		`);
		await ds.query(`
			CREATE TABLE "child_items" (
				"id" varchar(36) PRIMARY KEY NOT NULL,
				"parentId" varchar(36) NOT NULL,
				CONSTRAINT "FK_child_parent" FOREIGN KEY ("parentId") REFERENCES "parent_items" ("id") ON DELETE CASCADE
			)
		`);
		await ds.query('INSERT INTO "parent_items" ("id", "name", "description") VALUES (?, ?, ?)', [
			'parent-1',
			'Alpha',
			'Legacy description',
		]);
		await ds.query('INSERT INTO "child_items" ("id", "parentId") VALUES (?, ?)', [
			'child-1',
			'parent-1',
		]);
	}

	async function getParentColumns(ds: DataSource): Promise<string[]> {
		const rows = await ds.query<Array<{ name: string }>>('PRAGMA table_info("parent_items")');
		return rows.map((row) => row.name);
	}

	async function countMigrationRecords(ds: DataSource, name: string): Promise<number> {
		const rows = await ds.query<Array<{ count: number }>>(
			'SELECT COUNT(*) AS "count" FROM "migrations" WHERE "name" = ?',
			[name],
		);
		return Number(rows[0].count);
	}

	afterEach(async () => {
		if (dataSource?.isInitialized) {
			await dataSource.destroy();
		}
		dataSource = undefined;
	});

	afterAll(() => {
		if (previousUserFolder === undefined) {
			delete process.env.N8N_USER_FOLDER;
		} else {
			process.env.N8N_USER_FOLDER = previousUserFolder;
		}
		if (previousDbType === undefined) {
			delete process.env.DB_TYPE;
		} else {
			process.env.DB_TYPE = previousDbType;
		}
		rmSync(tempDir, { recursive: true, force: true });
	});

	async function runWithPostCommitInterruption(ds: DataSource): Promise<void> {
		let interrupted = false;
		const crashAfterCommit: EntitySubscriberInterface = {
			afterTransactionCommit() {
				if (!interrupted) {
					interrupted = true;
					throw new Error('Simulated process stop after transaction commit');
				}
			},
		};
		ds.subscribers.push(crashAfterCommit);

		await expect(ds.runMigrations({ transaction: 'each' })).rejects.toThrow(
			'Transaction commit failed',
		);
		expect(interrupted).toBe(true);
	}

	async function getForeignKeysEnabled(ds: DataSource): Promise<number> {
		const rows = await ds.query<Array<{ foreign_keys: number }>>('PRAGMA foreign_keys');
		return Number(rows[0].foreign_keys);
	}

	function createReversibleDropDescriptionMigration(): Migration {
		class DropParentDescription1700000000001 implements ReversibleMigration {
			withFKsDisabled = true as const;

			async up({ schemaBuilder: { dropColumns } }: MigrationContext) {
				await dropColumns('parent_items', ['description'], { recreatesOnSqlite: true });
			}

			async down({ schemaBuilder: { addColumns, column } }: MigrationContext) {
				await addColumns('parent_items', [column('description').varchar(512)], {
					recreatesOnSqlite: true,
				});
			}
		}

		wrapMigration(DropParentDescription1700000000001);
		return DropParentDescription1700000000001;
	}

	function createFailingDropDescriptionMigration(): Migration {
		class DropParentDescription1700000000001 implements IrreversibleMigration {
			withFKsDisabled = true as const;

			async up({ schemaBuilder: { dropColumns } }: MigrationContext) {
				await dropColumns('parent_items', ['description'], { recreatesOnSqlite: true });
				throw new Error('Simulated failure after table rebuild');
			}
		}

		wrapMigration(DropParentDescription1700000000001);
		return DropParentDescription1700000000001;
	}

	it('drops the column, preserves CASCADE FK child rows, and records the migration', async () => {
		const dbPath = join(tempDir, `happy-${++dbCounter}.sqlite`);
		const migration = createDropDescriptionMigration({ withFKsDisabled: true });
		dataSource = await openSqliteDataSource(dbPath, [migration]);
		await seedTables(dataSource);

		await dataSource.runMigrations({ transaction: 'each' });

		expect(await getParentColumns(dataSource)).not.toContain('description');
		const childRows = await dataSource.query<Array<{ id: string }>>(
			'SELECT "id" FROM "child_items"',
		);
		expect(childRows).toEqual([{ id: 'child-1' }]);
		expect(await countMigrationRecords(dataSource, MIGRATION_NAME)).toBe(1);
		expect(await getForeignKeysEnabled(dataSource)).toBe(1);
	});

	it('commits the migration record atomically for a standard migration without withFKsDisabled', async () => {
		const dbPath = join(tempDir, `control-${++dbCounter}.sqlite`);
		const migration = createDropDescriptionMigration({ withFKsDisabled: false });
		dataSource = await openSqliteDataSource(dbPath, [migration]);
		await seedTables(dataSource);

		await runWithPostCommitInterruption(dataSource);

		// Simulate a fresh process boot on the same SQLite database file.
		await dataSource.destroy();
		dataSource = await openSqliteDataSource(dbPath, [migration]);

		const recordedAfterCrash = await countMigrationRecords(dataSource, MIGRATION_NAME);

		await expect(dataSource.runMigrations({ transaction: 'each' })).resolves.not.toThrow();

		expect(recordedAfterCrash).toBe(1);
		expect(await getParentColumns(dataSource)).not.toContain('description');
		expect(await countMigrationRecords(dataSource, MIGRATION_NAME)).toBe(1);
	});

	it('commits the migration record atomically with the schema change when withFKsDisabled is set', async () => {
		// Regression test for CAP-733:
		// runDisablingForeignKeys commits the table rebuild before MigrationExecutor
		// inserts the row into `migrations`. A stop right after commit leaves the
		// column dropped without a migration record, so every later boot fails.
		const dbPath = join(tempDir, `interrupted-${++dbCounter}.sqlite`);
		const migration = createDropDescriptionMigration({ withFKsDisabled: true });
		dataSource = await openSqliteDataSource(dbPath, [migration]);
		await seedTables(dataSource);

		await runWithPostCommitInterruption(dataSource);

		// Simulate a fresh process boot on the same SQLite database file.
		await dataSource.destroy();
		dataSource = await openSqliteDataSource(dbPath, [migration]);

		const recordedAfterCrash = await countMigrationRecords(dataSource, MIGRATION_NAME);

		await expect(dataSource.runMigrations({ transaction: 'each' })).resolves.not.toThrow();

		// The schema change and migration record must commit in the same transaction.
		expect(recordedAfterCrash).toBe(1);
		expect(await getParentColumns(dataSource)).not.toContain('description');
		const childRows = await dataSource.query<Array<{ id: string }>>(
			'SELECT "id" FROM "child_items"',
		);
		expect(childRows).toEqual([{ id: 'child-1' }]);
		expect(await countMigrationRecords(dataSource, MIGRATION_NAME)).toBe(1);
	});

	it('rolls back the schema change and re-enables foreign keys when a withFKsDisabled migration fails', async () => {
		const dbPath = join(tempDir, `failed-${++dbCounter}.sqlite`);
		const migration = createFailingDropDescriptionMigration();
		dataSource = await openSqliteDataSource(dbPath, [migration]);
		await seedTables(dataSource);

		await expect(dataSource.runMigrations({ transaction: 'each' })).rejects.toThrow(
			'Simulated failure after table rebuild',
		);

		expect(await getParentColumns(dataSource)).toContain('description');
		const childRows = await dataSource.query<Array<{ id: string }>>(
			'SELECT "id" FROM "child_items"',
		);
		expect(childRows).toEqual([{ id: 'child-1' }]);
		expect(await countMigrationRecords(dataSource, MIGRATION_NAME)).toBe(0);
		expect(await getForeignKeysEnabled(dataSource)).toBe(1);
	});

	it('preserves CASCADE FK child rows and atomically deletes the migration record on rollback', async () => {
		const dbPath = join(tempDir, `revert-${++dbCounter}.sqlite`);
		const migration = createReversibleDropDescriptionMigration();
		dataSource = await openSqliteDataSource(dbPath, [migration]);
		await seedTables(dataSource);

		await dataSource.runMigrations({ transaction: 'each' });
		expect(await getParentColumns(dataSource)).not.toContain('description');

		let interrupted = false;
		const crashAfterCommit: EntitySubscriberInterface = {
			afterTransactionCommit() {
				if (!interrupted) {
					interrupted = true;
					throw new Error('Simulated process stop after rollback commit');
				}
			},
		};
		dataSource.subscribers.push(crashAfterCommit);

		await expect(dataSource.undoLastMigration({ transaction: 'each' })).rejects.toThrow(
			'Transaction commit failed',
		);
		expect(interrupted).toBe(true);

		// Simulate a fresh process boot on the same SQLite database file.
		await dataSource.destroy();
		dataSource = await openSqliteDataSource(dbPath, [migration]);

		// Both the restored column and the deleted migration record must commit together.
		expect(await countMigrationRecords(dataSource, MIGRATION_NAME)).toBe(0);
		expect(await getParentColumns(dataSource)).toContain('description');
		const childRows = await dataSource.query<Array<{ id: string }>>(
			'SELECT "id" FROM "child_items"',
		);
		expect(childRows).toEqual([{ id: 'child-1' }]);
		expect(await getForeignKeysEnabled(dataSource)).toBe(1);

		await expect(dataSource.runMigrations({ transaction: 'each' })).resolves.not.toThrow();
		expect(await getParentColumns(dataSource)).not.toContain('description');
		expect(await countMigrationRecords(dataSource, MIGRATION_NAME)).toBe(1);
	});

	it('refuses to run a withFKsDisabled migration inside a transaction with foreign keys enabled', async () => {
		const dbPath = join(tempDir, `fk-guard-${++dbCounter}.sqlite`);
		const migration = createDropDescriptionMigration({ withFKsDisabled: true });
		dataSource = await openSqliteDataSource(dbPath, [migration]);
		await seedTables(dataSource);

		const queryRunner = dataSource.createQueryRunner();
		await queryRunner.startTransaction();
		try {
			const instance = new (
				migration as unknown as new () => {
					up: (qr: typeof queryRunner) => Promise<void>;
				}
			)();
			await expect(instance.up(queryRunner)).rejects.toThrow(
				'requires foreign keys to be disabled before starting a transaction',
			);
		} finally {
			await queryRunner.rollbackTransaction();
			await queryRunner.release();
		}

		expect(await getParentColumns(dataSource)).toContain('description');
		const childRows = await dataSource.query<Array<{ id: string }>>(
			'SELECT "id" FROM "child_items"',
		);
		expect(childRows).toEqual([{ id: 'child-1' }]);
	});
});
