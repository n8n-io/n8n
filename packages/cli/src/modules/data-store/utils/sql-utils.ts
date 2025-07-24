import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type {
	DataStoreColumn,
	DataStoreColumnType,
	DataStoreUserTableName,
} from '../data-store.types';
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

function columnToWildcardAndType(column: DataStoreColumn) {
	return `\`?\` ${dataStoreColumnTypeToSql(column.type)}`;
}

export function createUserTableQuery(
	tableName: DataStoreUserTableName,
	columns: DataStoreColumn[],
): [string, string[]] {
	const columnSql = columns.map(columnToWildcardAndType);
	const columnsFieldQuery = columnSql.length > 0 ? `, ${columnSql.join(', ')}` : '';

	// The tableName here is selected by us based on the automatically generated id, not user input
	return [
		`CREATE TABLE IF NOT EXISTS ${tableName} (id VARCHAR(36) PRIMARY KEY${columnsFieldQuery})`,
		columns.map((x) => x.name),
	];
}

export function addColumnQuery(
	tableName: DataStoreUserTableName,
	columns: [DataStoreColumn, ...DataStoreColumn[]],
): [string, string[]] {
	const columnSql = columns.map(columnToWildcardAndType);
	const columnsFieldQuery = `, ${columnSql.join(', ')}`;

	return [`ALTER TABLE ${tableName} ADD ${columnsFieldQuery}`, columns.map((x) => x.name)];
}

export function deleteColumnQuery(
	tableName: DataStoreUserTableName,
	columns: [string, ...string[]],
): [string, string[]] {
	const columnSql = columns.map((_) => 'DROP COLUMN ?').join(', ');

	return [`ALTER TABLE ${tableName} ${columnSql}`, columns];
}
