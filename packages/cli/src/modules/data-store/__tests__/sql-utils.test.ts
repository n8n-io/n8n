import { createUserTableQuery, addColumnQuery, deleteColumnQuery } from '../utils/sql-utils';
import type { DataStoreColumn } from '../data-store.types';

describe('sql-utils', () => {
	describe('createUserTableQuery', () => {
		it('should generate a valid SQL query for creating a user table with columns', () => {
			const tableName = 'data_store_user_abc';
			const columns = [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			] satisfies DataStoreColumn[];

			const [query, columnNames] = createUserTableQuery(tableName, columns);

			expect(query).toBe(
				'CREATE TABLE IF NOT EXISTS data_store_user_abc (id VARCHAR(36) PRIMARY KEY, `?` TEXT, `?` FLOAT)',
			);
			expect(columnNames).toEqual(['name', 'age']);
		});

		it('should generate a valid SQL query for creating a user table without columns', () => {
			const tableName = 'data_store_user_abc';
			const columns: [] = [];

			const [query, columnNames] = createUserTableQuery(tableName, columns);

			expect(query).toBe(
				'CREATE TABLE IF NOT EXISTS data_store_user_abc (id VARCHAR(36) PRIMARY KEY)',
			);
			expect(columnNames).toEqual([]);
		});
	});

	describe('addColumnQuery', () => {
		it('should generate a valid SQL query for adding columns to a table', () => {
			const tableName = 'data_store_user_abc';
			const column = { name: 'email', type: 'number' as const };

			const [query, columnNames] = addColumnQuery(tableName, column);

			expect(query).toBe('ALTER TABLE data_store_user_abc ADD `?` FLOAT');
			expect(columnNames).toEqual(['email']);
		});
	});

	describe('deleteColumnQuery', () => {
		it('should generate a valid SQL query for deleting columns from a table', () => {
			const tableName = 'data_store_user_abc';
			const column = 'email';

			const [query, columnNames] = deleteColumnQuery(tableName, column);

			expect(query).toBe('ALTER TABLE data_store_user_abc DROP COLUMN ?');
			expect(columnNames).toEqual(['email']);
		});
	});
});
