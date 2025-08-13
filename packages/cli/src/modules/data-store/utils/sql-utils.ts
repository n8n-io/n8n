import {
	DATA_STORE_COLUMN_REGEX,
	type DataStoreRows,
	type DataStoreCreateColumnSchema,
} from '@n8n/api-types';
import { DslColumn } from '@n8n/db';
import type { DataSourceOptions } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import type { DataStoreUserTableName } from '../data-store.types';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

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

function dataStoreColumnTypeToSql(
	type: DataStoreCreateColumnSchema['type'],
	dbType: DataSourceOptions['type'],
) {
	switch (type) {
		case 'string':
			return 'TEXT';
		case 'number':
			return 'FLOAT';
		case 'boolean':
			return 'BOOLEAN';
		case 'date':
			if (dbType === 'postgres') {
				return 'TIMESTAMP';
			}
			return 'DATETIME';
		default:
			throw new NotFoundError(`Unsupported field type: ${type as string}`);
	}
}

function columnToWildcardAndType(
	column: DataStoreCreateColumnSchema,
	dbType: DataSourceOptions['type'],
) {
	return `${quoteIdentifier(column.name, dbType)} ${dataStoreColumnTypeToSql(column.type, dbType)}`;
}

function isValidColumnName(name: string) {
	// Only allow alphanumeric and underscore
	return DATA_STORE_COLUMN_REGEX.test(name);
}

export function addColumnQuery(
	tableName: DataStoreUserTableName,
	column: DataStoreCreateColumnSchema,
	dbType: DataSourceOptions['type'],
) {
	// API requests should already conform to this, but better safe than sorry
	if (!isValidColumnName(column.name)) {
		throw new UnexpectedError('bad column name');
	}

	const quotedTableName = quoteIdentifier(tableName, dbType);

	return `ALTER TABLE ${quotedTableName} ADD ${columnToWildcardAndType(column, dbType)}`;
}

export function deleteColumnQuery(
	tableName: DataStoreUserTableName,
	column: string,
	dbType: DataSourceOptions['type'],
): string {
	const quotedTableName = quoteIdentifier(tableName, dbType);
	return `ALTER TABLE ${quotedTableName} DROP COLUMN ${quoteIdentifier(column, dbType)}`;
}

export function buildInsertQuery(
	tableName: DataStoreUserTableName,
	rows: DataStoreRows,
	columns: Array<{ name: string; type: string }>,
	dbType: DataSourceOptions['type'] = 'sqlite',
): [string, unknown[]] {
	if (rows.length === 0 || Object.keys(rows[0]).length === 0) {
		return ['', []];
	}

	const keys = Object.keys(rows[0]);
	const quotedKeys = keys.map((key) => quoteIdentifier(key, dbType)).join(', ');
	const quotedTableName = quoteIdentifier(tableName, dbType);

	const columnTypeMap = buildColumnTypeMap(columns);
	const parameters: unknown[] = [];
	const valuePlaceholders: string[] = [];
	let placeholderIndex = 1;

	for (const row of rows) {
		const rowPlaceholders = keys.map((key) => {
			const value = normalizeValue(row[key], columnTypeMap[key], dbType);
			parameters.push(value);
			return getPlaceholder(placeholderIndex++, dbType);
		});
		valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
	}

	const query = `INSERT INTO ${quotedTableName} (${quotedKeys}) VALUES ${valuePlaceholders.join(', ')}`;
	return [query, parameters];
}

export function buildUpdateQuery(
	tableName: DataStoreUserTableName,
	row: Record<string, unknown>,
	columns: Array<{ name: string; type: string }>,
	matchFields: string[],
	dbType: DataSourceOptions['type'] = 'sqlite',
): [string, unknown[]] {
	if (Object.keys(row).length === 0 || matchFields.length === 0) {
		return ['', []];
	}

	const updateKeys = Object.keys(row).filter((key) => !matchFields.includes(key));
	if (updateKeys.length === 0) {
		return ['', []];
	}

	const quotedTableName = quoteIdentifier(tableName, dbType);
	const columnTypeMap = buildColumnTypeMap(columns);

	const parameters: unknown[] = [];
	let placeholderIndex = 1;

	const setClause = updateKeys
		.map((key) => {
			const value = normalizeValue(row[key], columnTypeMap[key], dbType);
			parameters.push(value);
			return `${quoteIdentifier(key, dbType)} = ${getPlaceholder(placeholderIndex++, dbType)}`;
		})
		.join(', ');

	const whereClause = matchFields
		.map((key) => {
			const value = normalizeValue(row[key], columnTypeMap[key], dbType);
			parameters.push(value);
			return `${quoteIdentifier(key, dbType)} = ${getPlaceholder(placeholderIndex++, dbType)}`;
		})
		.join(' AND ');

	const query = `UPDATE ${quotedTableName} SET ${setClause} WHERE ${whereClause}`;
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
		case 'mysql':
		case 'mariadb':
			return `\`${name}\``;
		case 'postgres':
		case 'sqlite':
		default:
			return `"${name}"`;
	}
}

export function toTableName(dataStoreId: string): DataStoreUserTableName {
	return `data_store_user_${dataStoreId}`;
}

function normalizeValue(
	value: unknown,
	columnType: string | undefined,
	dbType: DataSourceOptions['type'],
): unknown {
	if (['mysql', 'mariadb'].includes(dbType)) {
		if (columnType === 'date') {
			if (
				value instanceof Date ||
				(typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/))
			) {
				return toMySQLDateTimeString(value);
			}
		}
	}
	return value;
}

function toMySQLDateTimeString(date: Date | string, convertFromDate = true): string {
	const dateString = convertFromDate
		? date instanceof Date
			? date.toISOString()
			: date
		: (date as string);
	return dateString.replace('T', ' ').replace('Z', '');
}

export function getPlaceholder(index: number, dbType: DataSourceOptions['type']): string {
	return dbType.includes('postgres') ? `$${index}` : '?';
}

function buildColumnTypeMap(
	columns: Array<{ name: string; type: string }>,
): Record<string, string> {
	return Object.fromEntries(columns.map((col) => [col.name, col.type]));
}
