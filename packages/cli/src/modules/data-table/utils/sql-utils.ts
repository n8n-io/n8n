import {
	dataTableColumnNameSchema,
	DATA_TABLE_COLUMN_ERROR_MESSAGE,
	type DataTableCreateColumnSchema,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { DslColumn } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DataSourceOptions } from '@n8n/typeorm';
import type {
	DataTableColumnJsType,
	DataTableColumnType,
	DataTableRawRowsReturn,
	DataTableRowReturn,
	DataTableRowsReturn,
} from 'n8n-workflow';
import { DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP, UnexpectedError } from 'n8n-workflow';

import type { DataTableColumn } from '../data-table-column.entity';
import type { DataTableUserTableName } from '../data-table.types';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

export function toDslColumns(columns: DataTableCreateColumnSchema[]): DslColumn[] {
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

function dataTableColumnTypeToSql(
	type: DataTableCreateColumnSchema['type'],
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
	column: DataTableCreateColumnSchema,
	dbType: DataSourceOptions['type'],
) {
	return `${quoteIdentifier(column.name, dbType)} ${dataTableColumnTypeToSql(column.type, dbType)}`;
}

export function isValidColumnName(name: string) {
	return dataTableColumnNameSchema.safeParse(name).success;
}

export function addColumnQuery(
	tableName: DataTableUserTableName,
	column: DataTableCreateColumnSchema,
	dbType: DataSourceOptions['type'],
) {
	// API requests should already conform to this, but better safe than sorry
	if (!isValidColumnName(column.name)) {
		throw new UnexpectedError(DATA_TABLE_COLUMN_ERROR_MESSAGE);
	}

	const quotedTableName = quoteIdentifier(tableName, dbType);

	return `ALTER TABLE ${quotedTableName} ADD ${columnToWildcardAndType(column, dbType)}`;
}

export function deleteColumnQuery(
	tableName: DataTableUserTableName,
	column: string,
	dbType: DataSourceOptions['type'],
): string {
	const quotedTableName = quoteIdentifier(tableName, dbType);
	return `ALTER TABLE ${quotedTableName} DROP COLUMN ${quoteIdentifier(column, dbType)}`;
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

function hasRowReturnData(data: unknown): data is DataTableRowReturn {
	return (
		typeof data === 'object' &&
		data !== null &&
		'id' in data &&
		isNumber(data.id) &&
		'createdAt' in data &&
		(isDate(data.createdAt) || typeof data.createdAt === 'string') &&
		'updatedAt' in data &&
		(isDate(data.updatedAt) || typeof data.updatedAt === 'string')
	);
}

function hasRowId(data: unknown): data is Pick<DataTableRowReturn, 'id'> {
	return typeof data === 'object' && data !== null && 'id' in data && isNumber(data.id);
}

export function extractReturningData(raw: unknown): DataTableRowReturn[] {
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

// Convert date objects or strings to dates in UTC
function normalizeDate(value: DataTableColumnJsType): Date | null {
	if (value instanceof Date) return value;

	if (typeof value === 'string') {
		// sqlite returns date strings without timezone information, but we store them as UTC
		const parsed = new Date(value.endsWith('Z') ? value : value + 'Z');
		if (!isNaN(parsed.getTime())) return parsed;
	}

	if (typeof value === 'number') {
		const parsed = new Date(value);
		if (!isNaN(parsed.getTime())) return parsed;
	}

	return null;
}

// Normalize rows fetched from the database according to the column types
export function normalizeRows(
	rows: DataTableRawRowsReturn,
	columns: DataTableColumn[],
): DataTableRowsReturn {
	const typeMap: Record<string, DataTableColumnType> = {
		...Object.fromEntries(columns.map((col) => [col.name, col.type])),
		// we need to normalize system dates as well
		...DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP,
	};
	return rows.map((row) => {
		const { id, createdAt, updatedAt, ...rest } = row;

		const normalized: DataTableRowReturn = {
			...rest,
			id,
			createdAt: normalizeDate(createdAt) ?? new Date(), // fallback should not happen
			updatedAt: normalizeDate(updatedAt) ?? new Date(), // fallback should not happen
		};

		for (const [key, value] of Object.entries(rest)) {
			const type = typeMap[key];

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
				normalized[key] = normalizeDate(value) ?? value; // fallback to original value
			}
		}
		return normalized;
	});
}

/**
 * Format a date value (Date object or ISO string) for database storage.
 * Converts to database-specific format.
 */
function formatDateForDatabase(
	value: DataTableColumnJsType,
	dbType?: DataSourceOptions['type'],
): string {
	let date: Date;

	if (value instanceof Date) {
		date = value;
	} else if (typeof value === 'string') {
		date = new Date(value);
	} else {
		throw new UnexpectedError(
			`Expected Date object or ISO date string, got ${typeof value}: ${String(value)}`,
		);
	}

	if (isNaN(date.getTime())) {
		throw new UnexpectedError(`Invalid date: ${String(value)}`);
	}

	// These dbs use DATETIME format without 'T' and 'Z'
	if (dbType && ['sqlite', 'sqlite-pooled', 'mysql', 'mariadb'].includes(dbType)) {
		return date.toISOString().replace('T', ' ').replace('Z', '');
	}

	return date.toISOString();
}

/**
 * Normalize a value for database operations based on column type.
 * For date columns, accepts both Date objects and ISO date strings.
 * Converts them to database-specific format.
 */
export function normalizeValueForDatabase(
	value: DataTableColumnJsType,
	columnType: string | undefined,
	dbType?: DataSourceOptions['type'],
): DataTableColumnJsType {
	if (columnType === 'date' && value !== null) {
		return formatDateForDatabase(value, dbType);
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

export function toTableName(dataTableId: string): DataTableUserTableName {
	const { tablePrefix } = Container.get(GlobalConfig).database;
	return `${tablePrefix}data_table_user_${dataTableId}`;
}

export function toTableId(tableName: DataTableUserTableName) {
	return tableName.replace(/.*data_table_user_/, '');
}
