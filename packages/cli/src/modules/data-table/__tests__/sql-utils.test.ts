import { addColumnQuery, deleteColumnQuery } from '../utils/sql-utils';

describe('sql-utils', () => {
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
});
