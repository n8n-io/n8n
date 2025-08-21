import type { DataStoreRows } from 'n8n-workflow';

import {
	addColumnQuery,
	deleteColumnQuery,
	buildInsertQuery,
	splitRowsByExistence,
} from '../utils/sql-utils';

describe('sql-utils', () => {
	describe('addColumnQuery', () => {
		it('should generate a valid SQL query for adding columns to a table, sqlite', () => {
			const tableName = 'data_store_user_abc';
			const column = { name: 'email', type: 'number' as const };

			const query = addColumnQuery(tableName, column, 'sqlite');

			expect(query).toBe('ALTER TABLE "data_store_user_abc" ADD "email" REAL');
		});

		it('should generate a valid SQL query for adding columns to a table, postgres', () => {
			const tableName = 'data_store_user_abc';
			const column = { name: 'email', type: 'number' as const };

			const query = addColumnQuery(tableName, column, 'postgres');

			expect(query).toBe('ALTER TABLE "data_store_user_abc" ADD "email" DOUBLE PRECISION');
		});

		it('should generate a valid SQL query for adding columns to a table, mysql', () => {
			const tableName = 'data_store_user_abc';
			const column = { name: 'email', type: 'number' as const };

			const query = addColumnQuery(tableName, column, 'mysql');

			expect(query).toBe('ALTER TABLE `data_store_user_abc` ADD `email` DOUBLE');
		});

		it('should generate a valid SQL query for adding columns to a table, mariadb', () => {
			const tableName = 'data_store_user_abc';
			const column = { name: 'email', type: 'number' as const };

			const query = addColumnQuery(tableName, column, 'mariadb');

			expect(query).toBe('ALTER TABLE `data_store_user_abc` ADD `email` DOUBLE');
		});
	});

	describe('deleteColumnQuery', () => {
		it('should generate a valid SQL query for deleting columns from a table', () => {
			const tableName = 'data_store_user_abc';
			const column = 'email';

			const query = deleteColumnQuery(tableName, column, 'sqlite');

			expect(query).toBe('ALTER TABLE "data_store_user_abc" DROP COLUMN "email"');
		});
	});

	describe('buildInsertQuery', () => {
		it('should generate a valid SQL query for inserting rows into a table', () => {
			const tableName = 'data_store_user_abc';
			const columns = [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			];
			const rows = [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			];

			const [query, parameters] = buildInsertQuery(tableName, rows, columns, 'postgres');

			expect(query).toBe(
				'INSERT INTO "data_store_user_abc" ("name", "age") VALUES ($1, $2), ($3, $4)',
			);
			expect(parameters).toEqual(['Alice', 30, 'Bob', 25]);
		});

		it('should return an empty query and parameters when rows are empty', () => {
			const tableName = 'data_store_user_abc';
			const rows: [] = [];

			const [query, parameters] = buildInsertQuery(tableName, rows, []);

			expect(query).toBe('');
			expect(parameters).toEqual([]);
		});

		it('should return an empty query and parameters when rows have no keys', () => {
			const tableName = 'data_store_user_abc';
			const rows = [{}];

			const [query, parameters] = buildInsertQuery(tableName, rows, []);

			expect(query).toBe('');
			expect(parameters).toEqual([]);
		});

		it('should replace T and Z for MySQL', () => {
			const tableName = 'data_store_user_abc';
			const columns = [{ name: 'participatedAt', type: 'date' }];
			const rows = [
				{ participatedAt: new Date('2021-01-01') },
				{ participatedAt: new Date('2021-01-02') },
			];

			const [query, parameters] = buildInsertQuery(tableName, rows, columns, 'mysql');

			expect(query).toBe('INSERT INTO `data_store_user_abc` (`participatedAt`) VALUES (?), (?)');
			expect(parameters).toEqual(['2021-01-01 00:00:00.000', '2021-01-02 00:00:00.000']);
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
