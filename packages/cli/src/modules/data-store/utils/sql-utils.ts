import type { DataSourceOptions } from '@n8n/typeorm';
import { z } from 'zod';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type {
	DataStoreColumn,
	DataStoreColumnType,
	DataStoreRows,
	DataStoreUserTableName,
} from '../data-store.types';
import { UnexpectedError } from 'n8n-workflow';

function dataStoreColumnTypeToSql(type: DataStoreColumnType) {
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

function columnToWildcardAndType(column: DataStoreColumn) {
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
	columns: DataStoreColumn[],
	dbType: DataSourceOptions['type'],
): [string, string[]] {
	const columnSql = columns.map(columnToWildcardAndType);
	const columnsFieldQuery = columnSql.length > 0 ? `, ${columnSql.join(', ')}` : '';

	const primaryKeyType = getPrimaryKeyAutoIncrement(dbType);

	// The tableName here is selected by us based on the automatically generated id, not user input
	// @Review: Any way to insert columns using wildcards?
	return [
		`CREATE TABLE IF NOT EXISTS ${tableName} (id ${primaryKeyType} ${columnsFieldQuery})`,
		[],
	];
}

function isValidColumnName(name: string) {
	// Only allow alphanumeric and underscore
	return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

export function addColumnQuery(
	tableName: DataStoreUserTableName,
	column: DataStoreColumn,
): [string, string[]] {
	// @Review: What to do about sql injection here?
	if (!isValidColumnName(column.name)) throw new Error('bad column name');
	return [`ALTER TABLE ${tableName} ADD ${columnToWildcardAndType(column)}`, []];
}

export function deleteColumnQuery(
	tableName: DataStoreUserTableName,
	column: string,
): [string, string[]] {
	return [`ALTER TABLE ${tableName} DROP COLUMN \`${column}\``, []];
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
