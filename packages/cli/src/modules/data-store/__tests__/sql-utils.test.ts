import type { DataStoreColumn } from '@n8n/api-types';

import {
	createUserTableQuery,
	addColumnQuery,
	deleteColumnQuery,
	insertIntoQuery,
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

	describe('insertIntoQuery', () => {
		it('should generate a valid SQL query for inserting rows into a table', () => {
			const tableName = 'data_store_user_abc';
			const rows = [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			];

			const [query, parameters] = insertIntoQuery(tableName, rows);

			expect(query).toBe('INSERT INTO data_store_user_abc (name,age) VALUES (?,?),(?,?)');
			expect(parameters).toEqual(['Alice', 30, 'Bob', 25]);
		});

		it('should return an empty query and parameters when rows are empty', () => {
			const tableName = 'data_store_user_abc';
			const rows: [] = [];

			const [query, parameters] = insertIntoQuery(tableName, rows);

			expect(query).toBe('');
			expect(parameters).toEqual([]);
		});

		it('should return an empty query and parameters when rows have no keys', () => {
			const tableName = 'data_store_user_abc';
			const rows = [{}];

			const [query, parameters] = insertIntoQuery(tableName, rows);

			expect(query).toBe('');
			expect(parameters).toEqual([]);
		});
	});
});
