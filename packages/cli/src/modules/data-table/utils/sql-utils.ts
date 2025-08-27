import { DATA_STORE_COLUMN_REGEX, type DataStoreCreateColumnSchema } from '@n8n/api-types';
import { DslColumn } from '@n8n/db';
import type { DataSourceOptions } from '@n8n/typeorm';
import type {
	DataStoreColumnJsType,
	DataStoreRows,
	DataStoreRowReturn,
	DataStoreRowsReturn,
} from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import type { DataStoreUserTableName } from '../data-store.types';
import type { DataTableColumn } from '../data-table-column.entity';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

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

type WithInsertId = { insertId: number };

const isArrayOf = <T>(data: unknown, itemGuard: (x: unknown) => x is T): data is T[] =>
	Array.isArray(data) && data.every(itemGuard);

const isNumber = (value: unknown): value is number => {
	return typeof value === 'number' && Number.isFinite(value);
};

const isDate = (value: unknown): value is Date => {
	return value instanceof Date;
};

function hasInsertId(data: unknown): data is WithInsertId {
	return typeof data === 'object' && data !== null && 'insertId' in data && isNumber(data.insertId);
}

function hasRowReturnData(data: unknown): data is DataStoreRowReturn {
	return (
		typeof data === 'object' &&
		data !== null &&
		'id' in data &&
		isNumber(data.id) &&
		'createdAt' in data &&
		isDate(data.createdAt) &&
		'updatedAt' in data &&
		isDate(data.updatedAt)
	);
}

function hasRowId(data: unknown): data is Pick<DataStoreRowReturn, 'id'> {
	return typeof data === 'object' && data !== null && 'id' in data && isNumber(data.id);
}

export function extractReturningData(raw: unknown): DataStoreRowReturn[] {
	if (!isArrayOf(raw, hasRowReturnData)) {
		throw new UnexpectedError(
			`Expected INSERT INTO raw to be { id: number; createdAt: string; updatedAt: string }[] on Postgres or MariaDB. Is '${JSON.stringify(raw)}'`,
		);
	}

	return raw;
}

export function extractInsertedIds(raw: unknown, dbType: DataSourceOptions['type']): number[] {
	switch (dbType) {
		case 'postgres':
		case 'mariadb': {
			if (!isArrayOf(raw, hasRowId)) {
				throw new UnexpectedError(
					`Expected INSERT INTO raw to be { id: number }[] on Postgres or MariaDB. Is '${JSON.stringify(raw)}'`,
				);
			}
			return raw.map((r) => r.id);
		}
		case 'mysql': {
			if (!hasInsertId(raw)) {
				throw new UnexpectedError('Expected INSERT INTO raw.insertId: number for MySQL');
			}
			return [raw.insertId];
		}
		case 'sqlite':
		default: {
			if (!isNumber(raw)) {
				throw new UnexpectedError('Expected INSERT INTO raw to be a number for SQLite');
			}
			return [raw];
		}
	}
}

export function normalizeRows(rows: DataStoreRowsReturn, columns: DataTableColumn[]) {
	// we need to normalize system dates as well
	const systemColumns = [
		{ name: 'createdAt', type: 'date' },
		{ name: 'updatedAt', type: 'date' },
	];

	const typeMap = new Map([...columns, ...systemColumns].map((col) => [col.name, col.type]));
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
				// Convert date objects or strings to dates in UTC
				let dateObj: Date | null = null;

				if (value instanceof Date) {
					dateObj = value;
				} else if (typeof value === 'string') {
					// sqlite returns date strings without timezone information, but we store them as UTC
					const parsed = new Date(value.endsWith('Z') ? value : value + 'Z');
					if (!isNaN(parsed.getTime())) {
						dateObj = parsed;
					}
				} else if (typeof value === 'number') {
					const parsed = new Date(value);
					if (!isNaN(parsed.getTime())) {
						dateObj = parsed;
					}
				}

				normalized[key] = dateObj ?? value;
			}
		}
		return normalized;
	});
}

export function normalizeValue(
	value: DataStoreColumnJsType,
	columnType: string | undefined,
	dbType: DataSourceOptions['type'],
): DataStoreColumnJsType {
	if (['mysql', 'mariadb'].includes(dbType)) {
		if (columnType === 'date') {
			if (value instanceof Date) {
				return value;
			} else if (typeof value === 'string') {
				const date = new Date(value);
				if (!isNaN(date.getTime())) {
					return date;
				}
			}
		}
	}

	return value;
}

/**
 * Convert a LIKE-style pattern (only % is wildcard) into a SQLite GLOB pattern.
 */
export function toSqliteGlobFromPercent(input: string): string {
	const out: string[] = [];
	for (const ch of String(input ?? '')) {
		if (ch === '%') out.push('*');
		else if (ch === '[') out.push('[[]');
		else if (ch === ']') out.push('[]]');
		else if (ch === '*') out.push('[*]');
		else if (ch === '?') out.push('[?]');
		else out.push(ch);
	}
	return out.join('');
}

/**
 * LIKE escaper for DBs where we use ESCAPE '\'.
 * Keep '%' as wildcard; make '_' literal; escape the escape char itself.
 */
export function escapeLikeSpecials(input: string): string {
	return input
		.replace(/\\/g, '\\\\') // escape the escape char itself
		.replace(/_/g, '\\_'); // make '_' literal ('%' stays a wildcard)
}
