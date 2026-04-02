import { getAllowedFunctions, isAllowedFunction } from '../utils/sql-function-allowlist';

describe('sql-function-allowlist', () => {
	describe('getAllowedFunctions', () => {
		it('should return common and postgres-specific functions for postgres', () => {
			const functions = getAllowedFunctions('postgres');

			// Common functions
			expect(functions).toContain('COUNT');
			expect(functions).toContain('SUM');
			expect(functions).toContain('AVG');
			expect(functions).toContain('MIN');
			expect(functions).toContain('MAX');
			expect(functions).toContain('LOWER');
			expect(functions).toContain('UPPER');
			expect(functions).toContain('TRIM');
			expect(functions).toContain('LENGTH');
			expect(functions).toContain('SUBSTR');
			expect(functions).toContain('REPLACE');
			expect(functions).toContain('ABS');
			expect(functions).toContain('ROUND');
			expect(functions).toContain('COALESCE');
			expect(functions).toContain('NULLIF');
			expect(functions).toContain('CAST');

			// Postgres-specific functions
			expect(functions).toContain('STRING_AGG');
			expect(functions).toContain('EXTRACT');
			expect(functions).toContain('DATE_TRUNC');
			expect(functions).toContain('TO_CHAR');
			expect(functions).toContain('TO_DATE');
			expect(functions).toContain('CONCAT');
			expect(functions).toContain('CEIL');
			expect(functions).toContain('FLOOR');
			expect(functions).toContain('NOW');
			expect(functions).toContain('CURRENT_TIMESTAMP');
			expect(functions).toContain('CURRENT_DATE');
		});

		it('should return common and sqlite-specific functions for sqlite', () => {
			const functions = getAllowedFunctions('sqlite');

			// Common functions
			expect(functions).toContain('COUNT');
			expect(functions).toContain('SUM');
			expect(functions).toContain('AVG');
			expect(functions).toContain('MIN');
			expect(functions).toContain('MAX');
			expect(functions).toContain('LOWER');
			expect(functions).toContain('UPPER');
			expect(functions).toContain('TRIM');
			expect(functions).toContain('LENGTH');
			expect(functions).toContain('SUBSTR');
			expect(functions).toContain('REPLACE');
			expect(functions).toContain('ABS');
			expect(functions).toContain('ROUND');
			expect(functions).toContain('COALESCE');
			expect(functions).toContain('NULLIF');
			expect(functions).toContain('CAST');

			// SQLite-specific functions
			expect(functions).toContain('GROUP_CONCAT');
			expect(functions).toContain('STRFTIME');
			expect(functions).toContain('IFNULL');
			expect(functions).toContain('IIF');
			expect(functions).toContain('TYPEOF');
			expect(functions).toContain('DATE');
			expect(functions).toContain('DATETIME');
			expect(functions).toContain('CURRENT_TIMESTAMP');
			expect(functions).toContain('CURRENT_DATE');
		});

		it('should also return sqlite functions for sqlite-pooled', () => {
			const sqliteFunctions = getAllowedFunctions('sqlite');
			const sqlitePooledFunctions = getAllowedFunctions('sqlite-pooled');

			expect(sqlitePooledFunctions).toEqual(sqliteFunctions);
		});

		it('should not include sqlite-only functions in postgres allowlist', () => {
			const functions = getAllowedFunctions('postgres');

			expect(functions).not.toContain('GROUP_CONCAT');
			expect(functions).not.toContain('STRFTIME');
			expect(functions).not.toContain('IFNULL');
			expect(functions).not.toContain('IIF');
			expect(functions).not.toContain('TYPEOF');
		});

		it('should not include postgres-only functions in sqlite allowlist', () => {
			const functions = getAllowedFunctions('sqlite');

			expect(functions).not.toContain('STRING_AGG');
			expect(functions).not.toContain('EXTRACT');
			expect(functions).not.toContain('DATE_TRUNC');
			expect(functions).not.toContain('TO_CHAR');
			expect(functions).not.toContain('TO_DATE');
		});
	});

	describe('isAllowedFunction', () => {
		it('should return true for allowed functions regardless of case', () => {
			expect(isAllowedFunction('count', 'postgres')).toBe(true);
			expect(isAllowedFunction('COUNT', 'postgres')).toBe(true);
			expect(isAllowedFunction('Count', 'postgres')).toBe(true);
		});

		it('should return true for sqlite-specific allowed functions', () => {
			expect(isAllowedFunction('group_concat', 'sqlite')).toBe(true);
			expect(isAllowedFunction('GROUP_CONCAT', 'sqlite')).toBe(true);
		});

		it('should return true for postgres-specific allowed functions', () => {
			expect(isAllowedFunction('string_agg', 'postgres')).toBe(true);
			expect(isAllowedFunction('STRING_AGG', 'postgres')).toBe(true);
		});

		it('should return false for dangerous functions', () => {
			expect(isAllowedFunction('pg_read_file', 'postgres')).toBe(false);
			expect(isAllowedFunction('load_extension', 'sqlite')).toBe(false);
			expect(isAllowedFunction('pg_sleep', 'postgres')).toBe(false);
		});

		it('should return false for unknown functions', () => {
			expect(isAllowedFunction('unknown_func', 'postgres')).toBe(false);
			expect(isAllowedFunction('exec', 'sqlite')).toBe(false);
		});

		it('should return false for dialect-specific functions in the wrong dialect', () => {
			expect(isAllowedFunction('STRING_AGG', 'sqlite')).toBe(false);
			expect(isAllowedFunction('GROUP_CONCAT', 'postgres')).toBe(false);
		});
	});
});
