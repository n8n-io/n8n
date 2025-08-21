import {
	DATA_STORE_COLUMN_REGEX,
	type DataStoreCreateColumnSchema,
	type DataStoreColumn,
} from '@n8n/api-types';
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
				return name.double;
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
			switch (dbType) {
				case 'postgres':
					return 'DOUBLE PRECISION';
				case 'mysql':
				case 'mariadb':
					return 'DOUBLE';
				case 'sqlite':
					return 'REAL';
				default:
					return 'DOUBLE';
			}
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

export function normalizeRows(rows: DataStoreRows, columns: DataStoreColumn[]) {
	const typeMap = new Map(columns.map((col) => [col.name, col.type]));
	return rows.map((row) => {
		const normalized = { ...row };
		for (const [key, value] of Object.entries(row)) {
			const type = typeMap.get(key);

			if (type === 'boolean') {
				// Convert boolean values to true/false
				if (typeof value === 'boolean') {
					normalized[key] = value;
				} else if (value === 1 || value === '1') {
					normalized[key] = true;
				} else if (value === 0 || value === '0') {
					normalized[key] = false;
				}
			}
			if (type === 'date' && value !== null && value !== undefined) {
				// Convert date objects or strings to ISO string
				let dateObj: Date | null = null;

				if (value instanceof Date) {
					dateObj = value;
				} else if (typeof value === 'string' || typeof value === 'number') {
					const parsed = new Date(value);
					if (!isNaN(parsed.getTime())) {
						dateObj = parsed;
					}
				}

				normalized[key] = dateObj ? dateObj.toISOString() : value;
			}
		}
		return normalized;
	});
}

export function normalizeValue(
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

export function buildColumnTypeMap(
	columns: Array<{ name: string; type: string }>,
): Record<string, string> {
	return Object.fromEntries(columns.map((col) => [col.name, col.type]));
}
