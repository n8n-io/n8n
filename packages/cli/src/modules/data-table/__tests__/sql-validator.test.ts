import { SqlValidator, SqlValidationError, type TableColumnSchema } from '../utils/sql-validator';

const tableSchemas: TableColumnSchema[] = [
	{
		name: 'orders',
		columns: ['id', 'createdAt', 'updatedAt', 'amount', 'status', 'name', 'cid', 'created_at'],
	},
	{
		name: 'customers',
		columns: ['id', 'createdAt', 'updatedAt', 'name', 'order_id', 'oid'],
	},
];

describe('SqlValidator', () => {
	let pgValidator: SqlValidator;
	let sqliteValidator: SqlValidator;

	beforeEach(() => {
		pgValidator = new SqlValidator('postgres');
		sqliteValidator = new SqlValidator('sqlite');
	});

	// ── Basic statement validation ──────────────────────────────

	describe('statement type validation', () => {
		it('should accept a simple SELECT', () => {
			const result = pgValidator.validate('SELECT * FROM orders', tableSchemas);
			expect(result.type).toBe('select');
		});

		it('should accept SELECT with JOIN, WHERE, GROUP BY, ORDER BY, LIMIT', () => {
			const result = pgValidator.validate(
				'SELECT orders.amount, customers.name FROM orders JOIN customers ON orders.cid = customers.id WHERE orders.amount > 100 GROUP BY customers.name HAVING COUNT(*) > 1 ORDER BY orders.amount DESC LIMIT 10',
				tableSchemas,
			);
			expect(result.type).toBe('select');
			expect(result.tables).toEqual(expect.arrayContaining(['orders', 'customers']));
		});

		it('should reject INSERT', () => {
			expect(() =>
				pgValidator.validate('INSERT INTO orders (id) VALUES (1)', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject UPDATE', () => {
			expect(() => pgValidator.validate("UPDATE orders SET name = 'x'", tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject DELETE', () => {
			expect(() => pgValidator.validate('DELETE FROM orders', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject DROP TABLE', () => {
			expect(() => pgValidator.validate('DROP TABLE orders', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject empty input', () => {
			expect(() => pgValidator.validate('', tableSchemas)).toThrow(SqlValidationError);
		});

		it('should reject whitespace-only input', () => {
			expect(() => pgValidator.validate('   ', tableSchemas)).toThrow(SqlValidationError);
		});
	});

	// ── Allowed expressions ─────────────────────────────────────

	describe('allowed expressions', () => {
		it('should accept aggregate functions', () => {
			const result = pgValidator.validate(
				'SELECT COUNT(*), SUM(amount), AVG(amount), MIN(amount), MAX(amount) FROM orders',
				tableSchemas,
			);
			expect(result.functions).toEqual(
				expect.arrayContaining(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']),
			);
		});

		it('should accept nested allowed functions', () => {
			expect(() =>
				pgValidator.validate('SELECT COALESCE(SUM(amount), 0) FROM orders', tableSchemas),
			).not.toThrow();
		});

		it('should accept CASE WHEN expressions', () => {
			expect(() =>
				pgValidator.validate(
					"SELECT CASE WHEN amount > 50 THEN 'high' ELSE 'low' END FROM orders",
					tableSchemas,
				),
			).not.toThrow();
		});

		it('should accept CAST expressions', () => {
			expect(() =>
				pgValidator.validate('SELECT CAST(amount AS TEXT) FROM orders', tableSchemas),
			).not.toThrow();
		});

		it('should accept IN with literal list', () => {
			expect(() =>
				pgValidator.validate(
					"SELECT * FROM orders WHERE status IN ('active', 'pending')",
					tableSchemas,
				),
			).not.toThrow();
		});

		it('should accept BETWEEN', () => {
			expect(() =>
				pgValidator.validate('SELECT * FROM orders WHERE amount BETWEEN 10 AND 100', tableSchemas),
			).not.toThrow();
		});

		it('should accept LIKE', () => {
			expect(() =>
				pgValidator.validate("SELECT * FROM orders WHERE name LIKE '%test%'", tableSchemas),
			).not.toThrow();
		});

		it('should accept IS NULL / IS NOT NULL', () => {
			expect(() =>
				pgValidator.validate('SELECT * FROM orders WHERE name IS NOT NULL', tableSchemas),
			).not.toThrow();
		});

		it('should accept LEFT JOIN', () => {
			expect(() =>
				pgValidator.validate(
					'SELECT * FROM orders LEFT JOIN customers ON orders.cid = customers.id',
					tableSchemas,
				),
			).not.toThrow();
		});

		it('should accept arithmetic operators', () => {
			expect(() =>
				pgValidator.validate('SELECT amount * 2 + 1 FROM orders', tableSchemas),
			).not.toThrow();
		});

		it('should accept DISTINCT', () => {
			expect(() =>
				pgValidator.validate('SELECT DISTINCT name FROM orders', tableSchemas),
			).not.toThrow();
		});

		it('should accept string concatenation with ||', () => {
			expect(() =>
				pgValidator.validate("SELECT name || ' - ' || status FROM orders", tableSchemas),
			).not.toThrow();
		});

		it('should accept OFFSET', () => {
			expect(() =>
				pgValidator.validate('SELECT * FROM orders LIMIT 10 OFFSET 20', tableSchemas),
			).not.toThrow();
		});

		it('should accept multiple tables in FROM with comma', () => {
			const result = pgValidator.validate(
				'SELECT * FROM orders, customers WHERE orders.cid = customers.id',
				tableSchemas,
			);
			expect(result.tables).toEqual(expect.arrayContaining(['orders', 'customers']));
		});

		it('should accept modulo operator', () => {
			expect(() =>
				pgValidator.validate('SELECT amount % 10 FROM orders', tableSchemas),
			).not.toThrow();
		});

		it('should accept table-qualified column references', () => {
			expect(() =>
				pgValidator.validate('SELECT orders.amount, orders.status FROM orders', tableSchemas),
			).not.toThrow();
		});
	});

	// ── Rejected constructs ─────────────────────────────────────

	describe('rejected constructs', () => {
		it('should reject WITH/CTE expressions', () => {
			expect(() =>
				pgValidator.validate('WITH cte AS (SELECT * FROM orders) SELECT * FROM cte', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject UNION', () => {
			expect(() =>
				pgValidator.validate('SELECT id FROM orders UNION SELECT id FROM customers', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject subqueries in WHERE', () => {
			expect(() =>
				pgValidator.validate(
					'SELECT * FROM orders WHERE id IN (SELECT order_id FROM customers)',
					tableSchemas,
				),
			).toThrow(SqlValidationError);
		});

		it('should reject derived tables (subqueries in FROM)', () => {
			expect(() =>
				pgValidator.validate('SELECT * FROM (SELECT * FROM orders)', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject SELECT INTO', () => {
			expect(() =>
				pgValidator.validate('SELECT * INTO newtable FROM orders', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject dangerous functions', () => {
			expect(() =>
				pgValidator.validate("SELECT pg_read_file('/etc/passwd') FROM orders", tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject window functions (OVER keyword)', () => {
			expect(() =>
				pgValidator.validate('SELECT COUNT(*) OVER () FROM orders', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject EXISTS with subquery', () => {
			expect(() =>
				pgValidator.validate(
					'SELECT * FROM orders WHERE EXISTS (SELECT 1 FROM customers)',
					tableSchemas,
				),
			).toThrow(SqlValidationError);
		});

		it('should reject implicit table aliases (unknown identifiers)', () => {
			// 'o' after 'orders' is not after AS, not a table/column/function → rejected
			expect(() => pgValidator.validate('SELECT o.amount FROM orders o', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should allow column aliases with AS', () => {
			expect(() =>
				pgValidator.validate('SELECT SUM(amount) AS revenue FROM orders', tableSchemas),
			).not.toThrow();
		});

		it('should reject disallowed CAST types', () => {
			expect(() =>
				pgValidator.validate('SELECT CAST(id AS regclass) FROM orders', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should allow valid CAST types', () => {
			expect(() =>
				pgValidator.validate('SELECT CAST(id AS TEXT) FROM orders', tableSchemas),
			).not.toThrow();
		});
	});

	// ── Closed-world identifier validation ──────────────────────

	describe('closed-world identifier validation', () => {
		it('should reject unknown identifiers (not a table, column, or function)', () => {
			expect(() => pgValidator.validate('SELECT evil FROM orders', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject SQL keywords as identifiers when not in allowed set', () => {
			// INTO is not in ALLOWED_KEYWORDS, becomes an identifier, fails closed-world check
			expect(() =>
				pgValidator.validate('SELECT * INTO newtable FROM orders', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject columns that do not exist in the referenced table', () => {
			expect(() =>
				pgValidator.validate('SELECT orders.nonexistent FROM orders', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should accept columns that exist in the referenced table', () => {
			expect(() =>
				pgValidator.validate('SELECT orders.amount FROM orders', tableSchemas),
			).not.toThrow();
		});

		it('should accept standalone columns that exist in any allowed table', () => {
			expect(() =>
				pgValidator.validate('SELECT amount, status FROM orders', tableSchemas),
			).not.toThrow();
		});

		it('should reject standalone columns not in any allowed table', () => {
			expect(() => pgValidator.validate('SELECT secret_column FROM orders', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});
	});

	// ── Token-level validation ──────────────────────────────────

	describe('token-level validation', () => {
		it('should reject line comments (--)', () => {
			expect(() => pgValidator.validate('SELECT * FROM orders -- WHERE 1=1', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject block comments (/* */)', () => {
			expect(() =>
				pgValidator.validate('SELECT * /* comment */ FROM orders', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject semicolons', () => {
			expect(() =>
				pgValidator.validate('SELECT * FROM orders; DROP TABLE users', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject double-quoted identifiers', () => {
			expect(() => pgValidator.validate('SELECT "amount" FROM orders', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject backtick-quoted identifiers', () => {
			expect(() => pgValidator.validate('SELECT `amount` FROM orders', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject :: cast syntax', () => {
			expect(() => pgValidator.validate('SELECT amount::text FROM orders', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject dollar-quoted strings', () => {
			expect(() => pgValidator.validate('SELECT $$evil$$ FROM orders', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject @ symbols', () => {
			expect(() => pgValidator.validate('SELECT @variable FROM orders', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject unterminated string literals', () => {
			expect(() =>
				pgValidator.validate("SELECT * FROM orders WHERE name = 'unterminated", tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should accept escaped single quotes in strings', () => {
			expect(() =>
				pgValidator.validate("SELECT * FROM orders WHERE name = 'it''s'", tableSchemas),
			).not.toThrow();
		});

		it('should reject schema-qualified function calls', () => {
			expect(() =>
				pgValidator.validate(
					"SELECT pg_catalog.pg_read_file('/etc/passwd') FROM orders",
					tableSchemas,
				),
			).toThrow(SqlValidationError);
		});
	});

	// ── Security regression suite ───────────────────────────────

	describe('security regression suite', () => {
		it('should reject schema-qualified table references', () => {
			expect(() =>
				pgValidator.validate('SELECT * FROM public.credentials_entity', [
					{ name: 'credentials_entity', columns: ['id'] },
				]),
			).toThrow(SqlValidationError);
		});

		it('should reject information_schema access', () => {
			expect(() =>
				pgValidator.validate('SELECT * FROM information_schema.tables', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject semicolon injection with multiple statements', () => {
			expect(() => pgValidator.validate('SELECT 1; DROP TABLE users', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject SET search_path', () => {
			expect(() => pgValidator.validate('SET search_path TO evil', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject unauthorized table access', () => {
			expect(() => pgValidator.validate('SELECT * FROM credentials', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject unauthorized table via UNION', () => {
			expect(() =>
				pgValidator.validate(
					'SELECT id FROM orders UNION SELECT id FROM credentials',
					tableSchemas,
				),
			).toThrow(SqlValidationError);
		});

		it('should reject unauthorized table via subquery', () => {
			expect(() =>
				pgValidator.validate(
					'SELECT * FROM orders WHERE id IN (SELECT id FROM credentials)',
					tableSchemas,
				),
			).toThrow(SqlValidationError);
		});

		it('should reject BEGIN transaction', () => {
			expect(() =>
				pgValidator.validate('BEGIN; SELECT * FROM orders; COMMIT', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject CREATE TABLE', () => {
			expect(() => pgValidator.validate('CREATE TABLE evil (id INT)', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject ALTER TABLE', () => {
			expect(() =>
				pgValidator.validate('ALTER TABLE orders ADD COLUMN evil TEXT', tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject TRUNCATE', () => {
			expect(() => pgValidator.validate('TRUNCATE orders', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject GRANT', () => {
			expect(() => pgValidator.validate('GRANT ALL ON orders TO evil', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject EXPLAIN', () => {
			expect(() => pgValidator.validate('EXPLAIN SELECT * FROM orders', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject COPY', () => {
			expect(() => pgValidator.validate("COPY orders TO '/tmp/data.csv'", tableSchemas)).toThrow(
				SqlValidationError,
			);
		});
	});

	// ── SQLite dialect ──────────────────────────────────────────

	describe('SQLite dialect', () => {
		it('should accept a simple SELECT', () => {
			const result = sqliteValidator.validate('SELECT * FROM orders', tableSchemas);
			expect(result.type).toBe('select');
		});

		it('should reject ATTACH DATABASE', () => {
			expect(() =>
				sqliteValidator.validate("ATTACH DATABASE '/tmp/evil.db' AS evil", tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should reject load_extension function', () => {
			expect(() =>
				sqliteValidator.validate("SELECT load_extension('/tmp/evil.so') FROM orders", tableSchemas),
			).toThrow(SqlValidationError);
		});

		it('should accept sqlite-specific functions like STRFTIME', () => {
			expect(() =>
				sqliteValidator.validate("SELECT STRFTIME('%Y', created_at) FROM orders", tableSchemas),
			).not.toThrow();
		});

		it('should reject sqlite_master access', () => {
			expect(() => sqliteValidator.validate('SELECT * FROM sqlite_master', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject PRAGMA', () => {
			expect(() => sqliteValidator.validate('PRAGMA table_info(orders)', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject DETACH', () => {
			expect(() => sqliteValidator.validate('DETACH DATABASE evil', tableSchemas)).toThrow(
				SqlValidationError,
			);
		});
	});

	// ── Table & function extraction ─────────────────────────────

	describe('table extraction', () => {
		it('should extract tables from a simple query', () => {
			const result = pgValidator.validate('SELECT * FROM orders', tableSchemas);
			expect(result.tables).toEqual(['orders']);
		});

		it('should extract tables from a JOIN', () => {
			const result = pgValidator.validate(
				'SELECT * FROM orders JOIN customers ON orders.cid = customers.id',
				tableSchemas,
			);
			expect(result.tables).toEqual(expect.arrayContaining(['orders', 'customers']));
		});

		it('should extract tables from comma-separated FROM', () => {
			const result = pgValidator.validate(
				'SELECT * FROM orders, customers WHERE orders.id = customers.order_id',
				tableSchemas,
			);
			expect(result.tables).toEqual(expect.arrayContaining(['orders', 'customers']));
		});

		it('should extract tables from LEFT JOIN', () => {
			const result = pgValidator.validate(
				'SELECT * FROM orders LEFT JOIN customers ON orders.cid = customers.id',
				tableSchemas,
			);
			expect(result.tables).toEqual(expect.arrayContaining(['orders', 'customers']));
		});
	});

	describe('function extraction', () => {
		it('should extract function names from a query', () => {
			const result = pgValidator.validate('SELECT COUNT(*), SUM(amount) FROM orders', tableSchemas);
			expect(result.functions).toEqual(expect.arrayContaining(['COUNT', 'SUM']));
		});

		it('should extract nested function names', () => {
			const result = pgValidator.validate(
				'SELECT COALESCE(SUM(amount), 0) FROM orders',
				tableSchemas,
			);
			expect(result.functions).toEqual(expect.arrayContaining(['COALESCE', 'SUM']));
		});
	});

	// ── validateAndRewrite ───────────────────────────────────────

	describe('validateAndRewrite', () => {
		it('should rewrite table names from logical to physical', () => {
			const tableMapping = new Map([
				['orders', 'n8n_data_table_user_abc123'],
				['customers', 'n8n_data_table_user_def456'],
			]);

			const result = pgValidator.validateAndRewrite(
				'SELECT * FROM orders JOIN customers ON orders.cid = customers.id',
				tableSchemas,
				tableMapping,
			);

			expect(result.rewrittenSql).toContain('n8n_data_table_user_abc123');
			expect(result.rewrittenSql).toContain('n8n_data_table_user_def456');
		});

		it('should preserve query structure during rewriting', () => {
			const tableMapping = new Map([['orders', 'n8n_data_table_user_abc123']]);

			const result = pgValidator.validateAndRewrite(
				'SELECT amount, status FROM orders WHERE amount > 100 ORDER BY amount DESC LIMIT 10',
				[tableSchemas[0]],
				tableMapping,
			);

			expect(result.rewrittenSql).toContain('n8n_data_table_user_abc123');
			expect(result.rewrittenSql).toContain('WHERE amount > 100');
			expect(result.rewrittenSql).toContain('ORDER BY amount DESC');
			expect(result.rewrittenSql).toContain('LIMIT 10');
		});

		it('should reject when table mapping is missing an entry', () => {
			const tableMapping = new Map([['orders', 'n8n_data_table_user_abc123']]);

			expect(() =>
				pgValidator.validateAndRewrite(
					'SELECT * FROM orders JOIN customers ON orders.cid = customers.id',
					tableSchemas,
					tableMapping,
				),
			).toThrow(SqlValidationError);
		});

		it('should rewrite comma-separated FROM tables', () => {
			const tableMapping = new Map([
				['orders', 'n8n_data_table_user_abc123'],
				['customers', 'n8n_data_table_user_def456'],
			]);

			const result = pgValidator.validateAndRewrite(
				'SELECT * FROM orders, customers WHERE orders.id = customers.oid',
				tableSchemas,
				tableMapping,
			);

			expect(result.rewrittenSql).toContain('n8n_data_table_user_abc123');
			expect(result.rewrittenSql).toContain('n8n_data_table_user_def456');
		});
	});
});
