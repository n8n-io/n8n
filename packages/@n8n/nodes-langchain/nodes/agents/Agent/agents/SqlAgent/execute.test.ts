import { detectBlockedSqlKeyword } from './execute';

describe('detectBlockedSqlKeyword', () => {
	describe('allowed queries', () => {
		test('returns undefined for a SELECT statement', () => {
			expect(detectBlockedSqlKeyword('SELECT * FROM users')).toBeUndefined();
		});

		test('returns undefined for SELECT with leading whitespace', () => {
			expect(detectBlockedSqlKeyword('   SELECT id FROM orders LIMIT 10')).toBeUndefined();
		});

		test('returns undefined for SELECT with a table name that contains a blocked keyword', () => {
			expect(
				detectBlockedSqlKeyword('SELECT * FROM insert_log WHERE created_at > NOW()'),
			).toBeUndefined();
		});

		test('returns undefined for SELECT with a value that contains a blocked keyword', () => {
			expect(detectBlockedSqlKeyword('SELECT * FROM test WHERE name = "INSERT"')).toBeUndefined();
		});
	});

	describe('blocked operations', () => {
		test.each([
			['INSERT', 'INSERT INTO users (name) VALUES ("eve")'],
			['UPDATE', 'UPDATE users SET name = "eve" WHERE id = 1'],
			['DELETE', 'DELETE FROM users WHERE id = 1'],
			['DROP', 'DROP TABLE users'],
			['TRUNCATE', 'TRUNCATE TABLE users'],
			['ALTER', 'ALTER TABLE users ADD COLUMN age INT'],
			['CREATE', 'CREATE TABLE evil (id INT)'],
			['REPLACE', 'REPLACE INTO users (id, name) VALUES (1, "eve")'],
			['MERGE', 'MERGE INTO users USING src ON users.id = src.id WHEN MATCHED THEN DELETE'],
			['INSERT', 'SELECT * FROM users; INSERT INTO audit (msg) VALUES (1)'],
			['INSERT', 'SELECT * FROM (INSERT INTO audit (msg) VALUES (1))'],
		])('returns "%s" for a %s statement', (keyword, sql) => {
			expect(detectBlockedSqlKeyword(sql)).toBe(keyword);
		});

		test('is case-insensitive', () => {
			expect(detectBlockedSqlKeyword('delete from users')).toBe('DELETE');
			expect(detectBlockedSqlKeyword('Insert Into users (name) values ("x")')).toBe('INSERT');
		});
	});

	describe('comment-based injection', () => {
		test('strips line comments before evaluating the first keyword', () => {
			expect(detectBlockedSqlKeyword('-- SELECT\nDELETE FROM users')).toBe('DELETE');
		});

		test('strips block comments before evaluating the first keyword', () => {
			expect(detectBlockedSqlKeyword('/* SELECT */ DROP TABLE users')).toBe('DROP');
		});

		test('returns undefined when a blocked keyword appears only inside a comment', () => {
			expect(detectBlockedSqlKeyword('/* DROP TABLE users */ SELECT 1')).toBeUndefined();
		});
	});
});
