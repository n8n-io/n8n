import type { QueryRunner } from '@n8n/typeorm';

import { Column } from './column';
import { CreateIndex, DropIndex } from './indices';
import {
	AddColumns,
	AddForeignKey,
	AddNotNull,
	CreateTable,
	DropColumns,
	DropEnumCheck,
	DropForeignKey,
	DropNotNull,
	DropTable,
} from './table';

type RecreatesOnSqliteAck = { ackThisRecreatesOnSqlite: true };

export const createSchemaBuilder = (tablePrefix: string, queryRunner: QueryRunner) => ({
	column: (name: string) => new Column(name),
	/* eslint-disable @typescript-eslint/promise-function-async */
	// NOTE: Do not add `async` to these functions, as that messes up the lazy-evaluation of LazyPromise
	createTable: (tableName: string) => new CreateTable(tableName, tablePrefix, queryRunner),

	dropTable: (tableName: string) => new DropTable(tableName, tablePrefix, queryRunner),

	/**
	 * Adds columns to an existing table.
	 *
	 * **WARNING — SQLite table recreation:** On SQLite, TypeORM implements this by
	 * recreating the entire table (create temp → copy data → drop original → rename).
	 * If other tables have incoming FK constraints with CASCADE on the target table,
	 * the DROP triggers cascading deletes and **wipes data from those tables**.
	 *
	 * **Mitigation:** On SQLite migrations, set `withFKsDisabled = true as const`
	 * when the target table has incoming FKs. For common migrations, add a
	 * SQLite-only subclass with the flag instead of setting it on the common class.
	 *
	 * **Safer alternative:** When all new columns are nullable or have defaults,
	 * raw `ALTER TABLE ADD COLUMN` avoids table recreation entirely.
	 *
	 * @see {@link BaseMigration.withFKsDisabled}
	 */
	addColumns: (tableName: string, columns: Column[], _opts: RecreatesOnSqliteAck) =>
		new AddColumns(tableName, columns, tablePrefix, queryRunner),

	/**
	 * Drops columns from an existing table.
	 *
	 * **WARNING — SQLite table recreation:** On SQLite, TypeORM implements this by
	 * recreating the entire table. If other tables have incoming FK constraints with
	 * CASCADE on the target table, the DROP triggers cascading deletes and **wipes
	 * data from those tables**.
	 *
	 * **Mitigation:** On SQLite migrations, set `withFKsDisabled = true as const`
	 * when the target table has incoming FKs. For common migrations, add a
	 * SQLite-only subclass with the flag instead of setting it on the common class.
	 *
	 * @see {@link BaseMigration.withFKsDisabled}
	 */
	dropColumns: (tableName: string, columnNames: string[], _opts: RecreatesOnSqliteAck) =>
		new DropColumns(tableName, columnNames, tablePrefix, queryRunner),

	/**
	 * Creates an index on the given table and column names.
	 *
	 * @param whereClause - The where clause to apply to the index to create a partial index.
	 */
	createIndex: (
		tableName: string,
		columnNames: string[],
		isUnique = false,
		customIndexName?: string,
		whereClause?: string,
	) =>
		new CreateIndex(
			tableName,
			columnNames,
			isUnique,
			tablePrefix,
			queryRunner,
			customIndexName,
			whereClause,
		),

	dropIndex: (
		tableName: string,
		columnNames: string[],
		{ customIndexName, skipIfMissing }: { customIndexName?: string; skipIfMissing?: boolean } = {
			skipIfMissing: false,
		},
	) =>
		new DropIndex(tableName, columnNames, tablePrefix, queryRunner, customIndexName, skipIfMissing),

	addForeignKey: (
		tableName: string,
		columnName: string,
		reference: [string, string],
		customConstraintName?: string,
		onDelete?: 'RESTRICT' | 'CASCADE' | 'NO ACTION' | 'SET NULL',
	) =>
		new AddForeignKey(
			tableName,
			columnName,
			reference,
			tablePrefix,
			queryRunner,
			customConstraintName,
			onDelete,
		),

	dropForeignKey: (
		tableName: string,
		columnName: string,
		reference: [string, string],
		customConstraintName?: string,
	) =>
		new DropForeignKey(
			tableName,
			columnName,
			reference,
			tablePrefix,
			queryRunner,
			customConstraintName,
		),

	/**
	 * Adds a NOT NULL constraint to an existing column.
	 *
	 * **WARNING — SQLite table recreation:** On SQLite, TypeORM implements
	 * `changeColumn` by recreating the entire table. If other tables have incoming
	 * FK constraints with CASCADE on the target table, the DROP triggers cascading
	 * deletes and **wipes data from those tables**.
	 *
	 * **Mitigation:** On SQLite migrations, set `withFKsDisabled = true as const`
	 * when the target table has incoming FKs. For common migrations, add a
	 * SQLite-only subclass with the flag instead of setting it on the common class.
	 *
	 * @see {@link BaseMigration.withFKsDisabled}
	 */
	addNotNull: (tableName: string, columnName: string, _opts: RecreatesOnSqliteAck) =>
		new AddNotNull(tableName, columnName, tablePrefix, queryRunner),

	/**
	 * Drops the NOT NULL constraint from an existing column.
	 *
	 * **WARNING — SQLite table recreation:** On SQLite, TypeORM implements
	 * `changeColumn` by recreating the entire table. If other tables have incoming
	 * FK constraints with CASCADE on the target table, the DROP triggers cascading
	 * deletes and **wipes data from those tables**.
	 *
	 * **Mitigation:** On SQLite migrations, set `withFKsDisabled = true as const`
	 * when the target table has incoming FKs. For common migrations, add a
	 * SQLite-only subclass with the flag instead of setting it on the common class.
	 *
	 * @see {@link BaseMigration.withFKsDisabled}
	 */
	dropNotNull: (tableName: string, columnName: string, _opts: RecreatesOnSqliteAck) =>
		new DropNotNull(tableName, columnName, tablePrefix, queryRunner),

	dropEnumCheck: (tableName: string, columnName: string) =>
		new DropEnumCheck(tableName, columnName, tablePrefix, queryRunner),

	/* eslint-enable */
});
