import { DATA_STORE_COLUMN_REGEX, type DataStoreCreateColumnSchema } from '@n8n/api-types';
import { DslColumn } from '@n8n/db';
import type { DataSourceOptions } from '@n8n/typeorm';
import { UnexpectedError, type DataStoreRows } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { DataStoreUserTableName } from '../data-store.types';

export function toDslColumns(columns: DataStoreCreateColumnSchema[]): DslColumn[] {
	return columns.map((col) => {
		const name = new DslColumn(col.name.trim());

		switch (col.type) {
			case 'number':
				return name.int;
			case 'boolean':
				return name.bool;
			case 'string':
				return name.text;
			case 'date':
				return name.timestampTimezone();
			default:
				return name.text;
		}
	});
}

function dataStoreColumnTypeToSql(type: DataStoreCreateColumnSchema['type']) {
	switch (type) {
		case 'string':
			return 'TEXT';
		case 'number':
			return 'FLOAT';
		case 'boolean':
			return 'BOOLEAN';
		case 'date':
			return 'DATETIME'; // Postgres has no DATETIME
		default:
			throw new NotFoundError(`Unsupported field type: ${type as string}`);
	}
}

function columnToWildcardAndType(column: DataStoreCreateColumnSchema) {
	return `\`${column.name}\` ${dataStoreColumnTypeToSql(column.type)}`; // Postgres identifiers use double quotes
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
	// API requests should already conform to this, but better safe than sorry
	if (!isValidColumnName(column.name)) {
		throw new UnexpectedError('bad column name');
	}

	return `ALTER TABLE ${tableName} ADD ${columnToWildcardAndType(column)}`;
}

export function deleteColumnQuery(tableName: DataStoreUserTableName, column: string): string {
	return `ALTER TABLE ${tableName} DROP COLUMN \`${column}\``;
}

export function buildInsertQuery(
	tableName: DataStoreUserTableName,
	rows: DataStoreRows,
	dbType: DataSourceOptions['type'] = 'sqlite',
): [string, unknown[]] {
	if (rows.length === 0) {
		return ['', []];
	}

	const keys = Object.keys(rows[0]);

	if (keys.length === 0) {
		return ['', []];
	}

	const quotedKeys = keys.map((key) => quoteIdentifier(key, dbType)).join(', ');

	const wildcards = keys.map((_) => '?').join(',');
	const rowsQuery = Array(rows.length).fill(`(${wildcards})`).join(',');
	const parameters = Array(rows.length * keys.length);

	for (let i = 0; i < keys.length; ++i) {
		for (let j = 0; j < rows.length; ++j) {
			parameters[j * keys.length + i] = rows[j][keys[i]];
		}
	}
	const query = `INSERT INTO ${tableName} (${quotedKeys}) VALUES ${rowsQuery}`;

	return [query, parameters];
}

export function buildUpdateQuery(
	tableName: DataStoreUserTableName,
	row: Record<string, unknown>,
	matchFields: string[],
	dbType: DataSourceOptions['type'] = 'sqlite',
): [string, unknown[]] {
	if (Object.keys(row).length === 0 || matchFields.length === 0) {
		return ['', []];
	}

	const allKeys = Object.keys(row);
	const updateKeys = allKeys.filter((key) => !matchFields.includes(key));

	if (updateKeys.length === 0) {
		return ['', []];
	}

	const setClause = updateKeys.map((key) => `${quoteIdentifier(key, dbType)} = ?`).join(', ');

	const whereClause = matchFields.map((key) => `${quoteIdentifier(key, dbType)} = ?`).join(' AND ');

	const parameters = [...updateKeys.map((k) => row[k]), ...matchFields.map((k) => row[k])];

	const query = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;

	return [query, parameters];
}

export function splitRowsByExistence(
	existing: Array<Record<string, unknown>>,
	matchFields: string[],
	rows: DataStoreRows,
): { rowsToInsert: DataStoreRows; rowsToUpdate: DataStoreRows } {
	// Extracts only the fields relevant to matching and serializes them for comparison
	const getMatchKey = (row: Record<string, unknown>): string =>
		JSON.stringify(Object.fromEntries(matchFields.map((field) => [field, row[field]])));

	const existingSet = new Set(existing.map((row) => getMatchKey(row)));

	const rowsToUpdate: DataStoreRows = [];
	const rowsToInsert: DataStoreRows = [];

	for (const row of rows) {
		const key = getMatchKey(row);

		if (existingSet.has(key)) {
			rowsToUpdate.push(row);
		} else {
			rowsToInsert.push(row);
		}
	}

	return { rowsToInsert, rowsToUpdate };
}

export function quoteIdentifier(name: string, dbType: DataSourceOptions['type']): string {
	switch (dbType) {
		case 'postgres':
		case 'aurora-postgres':
		case 'sqlite':
		case 'sqlite-pooled':
		case 'better-sqlite3':
			return `"${name}"`;
		default:
			return `\`${name}\``;
	}
}

export function toTableName(dataStoreId: string): DataStoreUserTableName {
	return `data_store_user_${dataStoreId}`;
}
