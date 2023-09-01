import type { QueryRunner } from 'typeorm';
import { Column } from './Column';
import { AddColumns, CreateTable, DropColumns, DropTable } from './Table';
import { CreateIndex, DropIndex } from './Indices';

export const createSchemaBuilder = (tablePrefix: string, queryRunner: QueryRunner) => ({
	column: (name: string) => new Column(name),
	/* eslint-disable @typescript-eslint/promise-function-async */
	// NOTE: Do not add `async` to these functions, as that messes up the lazy-evaluation of LazyPromise
	createTable: (tableName: string) => new CreateTable(tableName, tablePrefix, queryRunner),

	dropTable: (tableName: string) => new DropTable(tableName, tablePrefix, queryRunner),

	addColumns: (tableName: string, columns: Column[]) =>
		new AddColumns(tableName, columns, tablePrefix, queryRunner),
	dropColumns: (tableName: string, columnNames: string[]) =>
		new DropColumns(tableName, columnNames, tablePrefix, queryRunner),

	createIndex: (
		tableName: string,
		columnNames: string[],
		isUnique = false,
		customIndexName?: string,
	) => new CreateIndex(tablePrefix, tableName, columnNames, isUnique, queryRunner, customIndexName),

	dropIndex: (tableName: string, columnNames: string[], customIndexName?: string) =>
		new DropIndex(tablePrefix, tableName, columnNames, queryRunner, customIndexName),

	/* eslint-enable */
});
