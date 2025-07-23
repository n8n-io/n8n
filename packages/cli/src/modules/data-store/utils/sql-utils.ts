import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { DataStoreColumn, DataStoreColumnType } from '../data-store.types';
import { z } from 'zod';

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

function dataStoreColumnTypeToZod(fieldType: DataStoreColumnType) {
	switch (fieldType) {
		case 'string':
			return z.string();
		case 'number':
			return z.number();
		case 'boolean':
			return z.boolean();
		case 'date':
			return z.date();
		default:
			throw new NotFoundError(`Unsupported field type: ${fieldType as string}`);
	}
}

export function createUserTableQuery(
	tableName: string,
	columns: DataStoreColumn[],
): [string, string[]] {
	const columnSql = columns.map((column) => `\`?\` ${dataStoreColumnTypeToSql(column.type)}`);
	const columnsFieldQuery = columnSql.length > 0 ? `, ${columnSql.join(', ')}` : '';
	return [
		`CREATE TABLE IF NOT EXISTS ? (id VARCHAR(36) PRIMARY KEY${columnsFieldQuery})`,
		[tableName, ...columns.map((x) => x.name)],
	];
}
