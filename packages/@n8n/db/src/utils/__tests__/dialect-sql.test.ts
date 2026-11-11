import { toDialectQuery, toSqlitePlaceholders } from '../dialect-sql';

describe('toSqlitePlaceholders', () => {
	it('rewrites placeholders in order', () => {
		expect(toSqlitePlaceholders('SELECT * FROM t WHERE a = $1 AND b = $2', ['x', 2])).toEqual({
			sql: 'SELECT * FROM t WHERE a = ? AND b = ?',
			params: ['x', 2],
		});
	});

	it('repeats the parameter of a repeated placeholder', () => {
		expect(toSqlitePlaceholders('a = $1 OR b = $1', ['x'])).toEqual({
			sql: 'a = ? OR b = ?',
			params: ['x', 'x'],
		});
	});

	it('orders parameters by where their placeholders appear', () => {
		expect(toSqlitePlaceholders('a = $2 AND b = $1', ['first', 'second'])).toEqual({
			sql: 'a = ? AND b = ?',
			params: ['second', 'first'],
		});
	});

	it('reads $10 as one placeholder', () => {
		const params = Array.from({ length: 10 }, (_, i) => i + 1);
		expect(toSqlitePlaceholders('a = $10', params)).toEqual({ sql: 'a = ?', params: [10] });
	});

	it('leaves SQL without placeholders unchanged', () => {
		expect(toSqlitePlaceholders('SELECT 1', [])).toEqual({ sql: 'SELECT 1', params: [] });
	});

	it('throws for a placeholder without a parameter', () => {
		expect(() => toSqlitePlaceholders('a = $2', ['x'])).toThrow('Placeholder $2 has no parameter');
		expect(() => toSqlitePlaceholders('a = $0', ['x'])).toThrow('Placeholder $0 has no parameter');
	});
});

describe('toDialectQuery', () => {
	it('keeps Postgres SQL as written', () => {
		const params = ['x'];
		const query = toDialectQuery(true, 'a = $1', params);

		expect(query).toEqual({ sql: 'a = $1', params: ['x'] });
		expect(query.params).not.toBe(params);
	});

	it('rewrites placeholders for SQLite', () => {
		expect(toDialectQuery(false, 'a = $1', ['x'])).toEqual({ sql: 'a = ?', params: ['x'] });
	});
});
