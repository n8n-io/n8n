import type { DataTableColumnType } from 'n8n-workflow';

import type { DataTableColumn } from '../data-table-column.entity';
import {
	addColumnQuery,
	deleteColumnQuery,
	normalizeRows,
	normalizeValueForDatabase,
	toSqliteGlobFromPercent,
} from '../utils/sql-utils';

describe('sql-utils', () => {
	describe('normalizeRows', () => {
		const createColumn = (name: string, type: DataTableColumnType): DataTableColumn =>
			({
				id: '1',
				name,
				type,
				dataTableId: 'test-table',
				createdAt: new Date(),
				updatedAt: new Date(),
			}) as DataTableColumn;

		it('should normalize boolean values from numbers', () => {
			const columns = [createColumn('active', 'boolean')];
			const rows = [
				{ id: 1, active: 1, createdAt: new Date(), updatedAt: new Date() },
				{ id: 2, active: 0, createdAt: new Date(), updatedAt: new Date() },
			];

			const result = normalizeRows(rows, columns);

			expect(result[0].active).toEqual(true);
			expect(result[1].active).toEqual(false);
		});

		it('should normalize boolean values from strings', () => {
			const columns = [createColumn('active', 'boolean')];
			const rows = [
				{ id: 1, active: '1', createdAt: new Date(), updatedAt: new Date() },
				{ id: 2, active: '0', createdAt: new Date(), updatedAt: new Date() },
			];

			const result = normalizeRows(rows, columns);

			expect(result[0].active).toEqual(true);
			expect(result[1].active).toEqual(false);
		});

		it('should keep boolean values as-is when already boolean', () => {
			const columns = [createColumn('active', 'boolean')];
			const rows = [
				{ id: 1, active: true, createdAt: new Date(), updatedAt: new Date() },
				{ id: 2, active: false, createdAt: new Date(), updatedAt: new Date() },
			];

			const result = normalizeRows(rows, columns);

			expect(result[0].active).toEqual(true);
			expect(result[1].active).toEqual(false);
		});

		it('should keep date values unchanged for Date objects', () => {
			const columns = [createColumn('birthday', 'date')];
			const testDate = new Date('2024-01-15T10:30:00Z');
			const rows = [{ id: 1, birthday: testDate, createdAt: new Date(), updatedAt: new Date() }];

			const result = normalizeRows(rows, columns);

			expect(result[0].birthday).toEqual(testDate);
		});

		it('should normalize date values from ISO strings', () => {
			const columns = [createColumn('birthday', 'date')];
			const dateString = '2024-01-15T10:30:00Z';
			const rows = [{ id: 1, birthday: dateString, createdAt: dateString, updatedAt: dateString }];

			const result = normalizeRows(rows, columns);

			expect(result[0].birthday).toEqual(new Date(dateString));
			expect(result[0].createdAt).toEqual(new Date(dateString));
			expect(result[0].updatedAt).toEqual(new Date(dateString));
		});

		it('should normalize date values from strings of sqlite format', () => {
			const columns = [createColumn('birthday', 'date')];
			const dateString = '2024-01-15 10:30:00';
			const rows = [{ id: 1, birthday: dateString, createdAt: dateString, updatedAt: dateString }];

			const result = normalizeRows(rows, columns);

			expect(result[0].birthday).toEqual(new Date('2024-01-15T10:30:00Z'));
			expect(result[0].createdAt).toEqual(new Date('2024-01-15T10:30:00Z'));
			expect(result[0].updatedAt).toEqual(new Date('2024-01-15T10:30:00Z'));
		});

		it('should normalize date values from timestamps', () => {
			const columns = [createColumn('birthday', 'date')];
			const timestamp = 1705318200000; // 2024-01-15T10:30:00Z
			const rows = [{ id: 1, birthday: timestamp, createdAt: timestamp, updatedAt: timestamp }];

			const result = normalizeRows(rows, columns);

			expect(result[0].birthday).toEqual(new Date(timestamp));
			expect(result[0].createdAt).toEqual(new Date(timestamp));
			expect(result[0].updatedAt).toEqual(new Date(timestamp));
		});

		it('should handle invalid date strings gracefully', () => {
			const columns = [createColumn('birthday', 'date')];
			const rows = [
				{ id: 1, birthday: 'not-a-date', createdAt: new Date(), updatedAt: new Date() },
			];

			const result = normalizeRows(rows, columns);

			expect(result[0].birthday).toBe('not-a-date');
		});

		it('should handle null date values', () => {
			const columns = [createColumn('birthday', 'date')];
			const rows = [{ id: 1, birthday: null, createdAt: new Date(), updatedAt: new Date() }];

			const result = normalizeRows(rows, columns);

			expect(result[0].birthday).toBeNull();
		});

		it('should handle multiple rows', () => {
			const columns = [
				createColumn('name', 'string'),
				createColumn('age', 'number'),
				createColumn('active', 'boolean'),
			];
			const date = new Date();
			const rows = [
				{
					id: 1,
					name: 'John Doe',
					age: 30,
					active: 1,
					createdAt: date,
					updatedAt: date,
				},
				{
					id: 2,
					name: 'Jane Doe',
					age: 25,
					active: 0,
					createdAt: date,
					updatedAt: date,
				},
				{
					id: 3,
					name: 'Jim Doe',
					age: 35,
					active: true,
					createdAt: date,
					updatedAt: date,
				},
			];

			const result = normalizeRows(rows, columns);

			expect(result).toEqual([
				{
					id: 1,
					active: true,
					age: 30,
					name: 'John Doe',
					createdAt: date,
					updatedAt: date,
				},
				{
					id: 2,
					active: false,
					age: 25,
					name: 'Jane Doe',
					createdAt: date,
					updatedAt: date,
				},
				{
					id: 3,
					active: true,
					age: 35,
					name: 'Jim Doe',
					createdAt: date,
					updatedAt: date,
				},
			]);
		});

		it('should handle empty rows array', () => {
			const columns = [createColumn('active', 'boolean')];

			const result = normalizeRows([], columns);

			expect(result).toEqual([]);
		});
	});

	describe('addColumnQuery', () => {
		it('should generate a valid SQL query for adding columns to a table, sqlite', () => {
			const tableName = 'data_table_user_abc';
			const column = { name: 'email', type: 'number' as const };

			const query = addColumnQuery(tableName, column, 'sqlite');

			expect(query).toBe('ALTER TABLE "data_table_user_abc" ADD "email" REAL');
		});

		it('should generate a valid SQL query for adding columns to a table, postgres', () => {
			const tableName = 'data_table_user_abc';
			const column = { name: 'email', type: 'number' as const };

			const query = addColumnQuery(tableName, column, 'postgres');

			expect(query).toBe('ALTER TABLE "data_table_user_abc" ADD "email" DOUBLE PRECISION');
		});

		it('should generate a valid SQL query for adding columns to a table, mysql', () => {
			const tableName = 'data_table_user_abc';
			const column = { name: 'email', type: 'number' as const };

			const query = addColumnQuery(tableName, column, 'mysql');

			expect(query).toBe('ALTER TABLE `data_table_user_abc` ADD `email` DOUBLE');
		});

		it('should generate a valid SQL query for adding columns to a table, mariadb', () => {
			const tableName = 'data_table_user_abc';
			const column = { name: 'email', type: 'number' as const };

			const query = addColumnQuery(tableName, column, 'mariadb');

			expect(query).toBe('ALTER TABLE `data_table_user_abc` ADD `email` DOUBLE');
		});
	});

	describe('deleteColumnQuery', () => {
		it('should generate a valid SQL query for deleting columns from a table', () => {
			const tableName = 'data_table_user_abc';
			const column = 'email';

			const query = deleteColumnQuery(tableName, column, 'sqlite');

			expect(query).toBe('ALTER TABLE "data_table_user_abc" DROP COLUMN "email"');
		});
	});

	describe('normalizeValueForDatabase', () => {
		it('should return value unchanged for non-date column types', () => {
			expect(normalizeValueForDatabase('test', 'string')).toBe('test');
			expect(normalizeValueForDatabase(123, 'number')).toBe(123);
			expect(normalizeValueForDatabase(true, 'boolean')).toBe(true);
		});

		it('should return null for null', () => {
			expect(normalizeValueForDatabase(null, 'string')).toBeNull();
			expect(normalizeValueForDatabase(null, 'number')).toBeNull();
			expect(normalizeValueForDatabase(null, 'boolean')).toBeNull();
			expect(normalizeValueForDatabase(null, 'date')).toBeNull();
		});

		describe('date columns', () => {
			it.each([
				['sqlite', '2024-01-15 10:30:00.123'],
				['sqlite-pooled', '2024-01-15 10:30:00.123'],
				['mysql', '2024-01-15 10:30:00.123'],
				['mariadb', '2024-01-15 10:30:00.123'],
				['postgres', '2024-01-15T10:30:00.123Z'],
			] as const)('should format Date object for %s', (dbType, expected) => {
				const result = normalizeValueForDatabase(
					new Date('2024-01-15T10:30:00.123Z'),
					'date',
					dbType,
				);

				expect(result).toBe(expected);
			});

			it.each([
				['sqlite', '2024-01-15 10:30:00.123'],
				['sqlite-pooled', '2024-01-15 10:30:00.123'],
				['mysql', '2024-01-15 10:30:00.123'],
				['mariadb', '2024-01-15 10:30:00.123'],
				['postgres', '2024-01-15T10:30:00.123Z'],
			] as const)('should format ISO date string for %s', (dbType, expected) => {
				const result = normalizeValueForDatabase('2024-01-15T10:30:00.123Z', 'date', dbType);

				expect(result).toBe(expected);
			});

			it('should throw on invalid date string', () => {
				expect(() => normalizeValueForDatabase('not-a-date', 'date', 'sqlite')).toThrow(
					'Invalid date',
				);
			});

			it('should throw on invalid date value', () => {
				expect(() =>
					normalizeValueForDatabase('2024-99-99T10:30:00.123Z', 'date', 'sqlite'),
				).toThrow('Invalid date');
			});

			it('should throw for unsupported value types', () => {
				expect(() => normalizeValueForDatabase(true, 'date')).toThrow(
					'Expected Date object or ISO date string',
				);
				expect(() => normalizeValueForDatabase(false, 'date')).toThrow(
					'Expected Date object or ISO date string',
				);
				expect(() => normalizeValueForDatabase(123, 'date')).toThrow(
					'Expected Date object or ISO date string',
				);
			});
		});
	});

	describe('toSqliteGlobFromPercent', () => {
		it('should convert % to *', () => {
			expect(toSqliteGlobFromPercent('test%')).toBe('test*');
			expect(toSqliteGlobFromPercent('%test')).toBe('*test');
			expect(toSqliteGlobFromPercent('%test%')).toBe('*test*');
		});

		it('should escape [ with [[]', () => {
			expect(toSqliteGlobFromPercent('test[abc')).toBe('test[[]abc');
		});

		it('should escape ] with []]', () => {
			expect(toSqliteGlobFromPercent('test]abc')).toBe('test[]]abc');
		});

		it('should escape * with [*]', () => {
			expect(toSqliteGlobFromPercent('test*abc')).toBe('test[*]abc');
		});

		it('should escape ? with [?]', () => {
			expect(toSqliteGlobFromPercent('test?abc')).toBe('test[?]abc');
		});

		it('should handle multiple special characters', () => {
			expect(toSqliteGlobFromPercent('%test*[abc]?%')).toBe('*test[*][[]abc[]][?]*');
		});

		it('should handle empty string', () => {
			expect(toSqliteGlobFromPercent('')).toBe('');
		});

		it('should keep regular characters unchanged', () => {
			expect(toSqliteGlobFromPercent('abc123')).toBe('abc123');
			expect(toSqliteGlobFromPercent('test_value')).toBe('test_value');
		});
	});
});
