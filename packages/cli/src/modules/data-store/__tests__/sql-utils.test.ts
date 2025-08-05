import type { DataStoreColumn } from '@n8n/api-types';
import type { DataStoreRows } from 'n8n-workflow';

import {
	createUserTableQuery,
	addColumnQuery,
	deleteColumnQuery,
	buildInsertQuery,
	buildUpdateQuery,
	splitRowsByExistence,
} from '../utils/sql-utils';

describe('sql-utils', () => {
	describe('createUserTableQuery', () => {
		it('should generate a valid SQL query for creating a user table with columns', () => {
			const tableName = 'data_store_user_abc';
			const columns = [
				{ dataStoreId: '1', name: 'name', type: 'string' },
				{ dataStoreId: '2', name: 'age', type: 'number' },
			] satisfies DataStoreColumn[];

			const query = createUserTableQuery(tableName, columns, 'sqlite');
			expect(query).toBe(
				'CREATE TABLE IF NOT EXISTS data_store_user_abc (id INTEGER PRIMARY KEY AUTOINCREMENT , `name` TEXT, `age` FLOAT)',
			);
		});

		it('should generate a valid SQL query for creating a user table without columns', () => {
			const tableName = 'data_store_user_abc';
			const columns: [] = [];

			const query = createUserTableQuery(tableName, columns, 'postgres');

			expect(query).toBe(
				'CREATE TABLE IF NOT EXISTS data_store_user_abc (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY )',
			);
		});
	});

	describe('addColumnQuery', () => {
		it('should generate a valid SQL query for adding columns to a table', () => {
			const tableName = 'data_store_user_abc';
			const column = { name: 'email', type: 'number' as const };

			const query = addColumnQuery(tableName, column);

			expect(query).toBe('ALTER TABLE data_store_user_abc ADD `email` FLOAT');
		});
	});

	describe('deleteColumnQuery', () => {
		it('should generate a valid SQL query for deleting columns from a table', () => {
			const tableName = 'data_store_user_abc';
			const column = 'email';

			const query = deleteColumnQuery(tableName, column);

			expect(query).toBe('ALTER TABLE data_store_user_abc DROP COLUMN `email`');
		});
	});

	describe('buildInsertQuery', () => {
		it('should generate a valid SQL query for inserting rows into a table', () => {
			const tableName = 'data_store_user_abc';
			const rows = [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			];

			const [query, parameters] = buildInsertQuery(tableName, rows);

			expect(query).toBe('INSERT INTO data_store_user_abc ("name", "age") VALUES (?,?),(?,?)');
			expect(parameters).toEqual(['Alice', 30, 'Bob', 25]);
		});

		it('should return an empty query and parameters when rows are empty', () => {
			const tableName = 'data_store_user_abc';
			const rows: [] = [];

			const [query, parameters] = buildInsertQuery(tableName, rows);

			expect(query).toBe('');
			expect(parameters).toEqual([]);
		});

		it('should return an empty query and parameters when rows have no keys', () => {
			const tableName = 'data_store_user_abc';
			const rows = [{}];

			const [query, parameters] = buildInsertQuery(tableName, rows);

			expect(query).toBe('');
			expect(parameters).toEqual([]);
		});
	});

	describe('buildUpdateQuery', () => {
		it('should generate a valid SQL update query with one match field', () => {
			const tableName = 'data_store_user_abc';
			const row = { name: 'Alice', age: 30, city: 'Paris' };
			const matchFields = ['name'];

			const [query, parameters] = buildUpdateQuery(tableName, row, matchFields);

			expect(query).toBe('UPDATE data_store_user_abc SET "age" = ?, "city" = ? WHERE "name" = ?');
			expect(parameters).toEqual([30, 'Paris', 'Alice']);
		});

		it('should generate a valid SQL update query with multiple match fields', () => {
			const tableName = 'data_store_user_abc';
			const row = { name: 'Alice', age: 30, city: 'Paris' };
			const matchFields = ['name', 'city'];

			const [query, parameters] = buildUpdateQuery(tableName, row, matchFields);

			expect(query).toBe(
				'UPDATE data_store_user_abc SET "age" = ? WHERE "name" = ? AND "city" = ?',
			);
			expect(parameters).toEqual([30, 'Alice', 'Paris']);
		});

		it('should return empty query and parameters if row is empty', () => {
			const tableName = 'data_store_user_abc';
			const row = {};
			const matchFields = ['id'];

			const [query, parameters] = buildUpdateQuery(tableName, row, matchFields);

			expect(query).toBe('');
			expect(parameters).toEqual([]);
		});

		it('should return empty query and parameters if matchFields is empty', () => {
			const tableName = 'data_store_user_abc';
			const row = { name: 'Alice', age: 30 };
			const matchFields: string[] = [];

			const [query, parameters] = buildUpdateQuery(tableName, row, matchFields);

			expect(query).toBe('');
			expect(parameters).toEqual([]);
		});

		it('should return empty query and parameters if only matchFields are present in row', () => {
			const tableName = 'data_store_user_abc';
			const row = { id: 1 };
			const matchFields = ['id'];

			const [query, parameters] = buildUpdateQuery(tableName, row, matchFields);

			expect(query).toBe('');
			expect(parameters).toEqual([]);
		});
	});

	describe('splitRowsByExistence', () => {
		it('should correctly separate rows into insert and update based on matchFields', () => {
			const existing = [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			];
			const matchFields = ['name'];
			const rows: DataStoreRows = [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 26 },
				{ name: 'Charlie', age: 35 },
			];

			const { rowsToInsert, rowsToUpdate } = splitRowsByExistence(existing, matchFields, rows);

			expect(rowsToUpdate).toEqual([
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 26 },
			]);
			expect(rowsToInsert).toEqual([{ name: 'Charlie', age: 35 }]);
		});

		it('should treat rows as new if matchFields combination does not exist', () => {
			const existing = [{ name: 'Bob', city: 'Berlin' }];
			const matchFields = ['name', 'city'];
			const rows: DataStoreRows = [{ name: 'Alice', city: 'Berlin' }];

			const { rowsToInsert, rowsToUpdate } = splitRowsByExistence(existing, matchFields, rows);

			expect(rowsToUpdate).toEqual([]);
			expect(rowsToInsert).toEqual([{ name: 'Alice', city: 'Berlin' }]);
		});

		it('should insert all rows if existing set is empty', () => {
			const existing: Array<Record<string, unknown>> = [];
			const matchFields = ['name'];
			const rows: DataStoreRows = [{ name: 'Alice' }, { name: 'Bob' }];

			const { rowsToInsert, rowsToUpdate } = splitRowsByExistence(existing, matchFields, rows);

			expect(rowsToUpdate).toEqual([]);
			expect(rowsToInsert).toEqual(rows);
		});

		it('should update all rows if all keys match existing', () => {
			const existing = [{ name: 'Alice' }, { name: 'Bob' }];
			const matchFields = ['name'];
			const rows: DataStoreRows = [{ name: 'Alice' }, { name: 'Bob' }];

			const { rowsToInsert, rowsToUpdate } = splitRowsByExistence(existing, matchFields, rows);

			expect(rowsToInsert).toEqual([]);
			expect(rowsToUpdate).toEqual(rows);
		});

		it('should handle empty input rows', () => {
			const existing = [{ name: 'Alice' }];
			const matchFields = ['name'];
			const rows: DataStoreRows = [];

			const { rowsToInsert, rowsToUpdate } = splitRowsByExistence(existing, matchFields, rows);

			expect(rowsToInsert).toEqual([]);
			expect(rowsToUpdate).toEqual([]);
		});
	});
});
