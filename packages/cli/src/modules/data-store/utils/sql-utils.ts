import { DATA_STORE_COLUMN_REGEX, type DataStoreCreateColumnSchema } from '@n8n/api-types';
import type { DataSourceOptions } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { DataStoreRows, DataStoreUserTableName } from '../data-store.types';

function dataStoreColumnTypeToSql(type: DataStoreCreateColumnSchema['type']) {
	switch (type) {
		case 'string':
			return 'TEXT';
		case 'number':
			return 'FLOAT';
		case 'boolean':
			return 'BOOLEAN';
		case 'date':
			return 'DATETIME';
		default:
			throw new NotFoundError(`Unsupported field type: ${type as string}`);
	}
}

function columnToWildcardAndType(column: DataStoreCreateColumnSchema) {
	return `\`${column.name}\` ${dataStoreColumnTypeToSql(column.type)}`;
}

function getPrimaryKeyAutoIncrement(dbType: DataSourceOptions['type']) {
	switch (dbType) {
		case 'sqlite':
		case 'sqlite-pooled':
		case 'better-sqlite3':
			return 'INTEGER PRIMARY KEY AUTOINCREMENT';
		case 'postgres':
		case 'aurora-postgres':
			return 'INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY';
		case 'mysql':
		case 'aurora-mysql':
		case 'mariadb':
			return 'INT AUTO_INCREMENT PRIMARY KEY';
	}

	throw new UnexpectedError('Unexpected database type');
}

export function createUserTableQuery(
	tableName: DataStoreUserTableName,
	columns: DataStoreCreateColumnSchema[],
	dbType: DataSourceOptions['type'],
) {
	if (columns.map((x) => x.name).some((name) => !isValidColumnName(name))) {
		throw new UnexpectedError('bad column name');
	}
	const columnSql = columns.map(columnToWildcardAndType);
	const columnsFieldQuery = columnSql.length > 0 ? `, ${columnSql.join(', ')}` : '';

	const primaryKeyType = getPrimaryKeyAutoIncrement(dbType);

	// The tableName here is selected by us based on the automatically generated id, not user input
	return `CREATE TABLE IF NOT EXISTS ${tableName} (id ${primaryKeyType} ${columnsFieldQuery})`;
}

function isValidColumnName(name: string) {
	// Only allow alphanumeric and underscore
	return DATA_STORE_COLUMN_REGEX.test(name);
}

export function addColumnQuery(
	tableName: DataStoreUserTableName,
	column: DataStoreCreateColumnSchema,
) {
	console.log(isValidColumnName(column.name), column.name);
	// API requests should already conform to this, but better safe than sorry
	if (!isValidColumnName(column.name)) {
		throw new UnexpectedError('bad column name');
	}

	return `ALTER TABLE ${tableName} ADD ${columnToWildcardAndType(column)}`;
}

export function deleteColumnQuery(tableName: DataStoreUserTableName, column: string): string {
	return `ALTER TABLE ${tableName} DROP COLUMN \`${column}\``;
}

export function insertIntoQuery(
	tableName: DataStoreUserTableName,
	rows: DataStoreRows,
): [string, unknown[]] {
	if (rows.length === 0) {
		return ['', []];
	}

	const keys = Object.keys(rows[0]);

	if (keys.length === 0) {
		return ['', []];
	}

	const wildcards = keys.map((_) => '?').join(',');
	const rowsQuery = Array(rows.length).fill(`(${wildcards})`).join(',');
	const parameters = Array(rows.length * keys.length);
	for (let i = 0; i < keys.length; ++i) {
		for (let j = 0; j < rows.length; ++j) {
			parameters[j * keys.length + i] = rows[j][keys[i]];
		}
	}
	return [`INSERT INTO ${tableName} (${keys.join(',')}) VALUES ${rowsQuery}`, parameters];
}
