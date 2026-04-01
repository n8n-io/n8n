import { SqlValidator, SqlValidationError } from '../utils/sql-validator';

const allowedTables = ['orders', 'customers'];

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
			const result = pgValidator.validate('SELECT * FROM orders', allowedTables);
			expect(result.type).toBe('select');
		});

		it('should accept SELECT with JOIN, WHERE, GROUP BY, ORDER BY, LIMIT', () => {
			const result = pgValidator.validate(
				'SELECT o.amount, c.name FROM orders o JOIN customers c ON o.cid = c.id WHERE o.amount > 100 GROUP BY c.name HAVING COUNT(*) > 1 ORDER BY o.amount DESC LIMIT 10',
				allowedTables,
			);
			expect(result.type).toBe('select');
			expect(result.tables).toEqual(expect.arrayContaining(['orders', 'customers']));
		});

		it('should reject INSERT', () => {
			expect(() =>
				pgValidator.validate('INSERT INTO orders (id) VALUES (1)', allowedTables),
			).toThrow(SqlValidationError);
		});

		it('should reject UPDATE', () => {
			expect(() => pgValidator.validate("UPDATE orders SET name = 'x'", allowedTables)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject DELETE', () => {
			expect(() => pgValidator.validate('DELETE FROM orders', allowedTables)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject DROP TABLE', () => {
			expect(() => pgValidator.validate('DROP TABLE orders', allowedTables)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject empty input', () => {
			expect(() => pgValidator.validate('', allowedTables)).toThrow(SqlValidationError);
		});

		it('should reject whitespace-only input', () => {
			expect(() => pgValidator.validate('   ', allowedTables)).toThrow(SqlValidationError);
		});
	});

	// ── Allowed expressions ─────────────────────────────────────

	describe('allowed expressions', () => {
		it('should accept aggregate functions', () => {
			const result = pgValidator.validate(
				'SELECT COUNT(*), SUM(amount), AVG(amount), MIN(amount), MAX(amount) FROM orders',
				allowedTables,
			);
			expect(result.functions).toEqual(
				expect.arrayContaining(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']),
			);
		});

		it('should accept nested allowed functions', () => {
			expect(() =>
				pgValidator.validate('SELECT COALESCE(SUM(amount), 0) FROM orders', allowedTables),
			).not.toThrow();
		});

		it('should accept CASE WHEN expressions', () => {
			expect(() =>
				pgValidator.validate(
					"SELECT CASE WHEN amount > 50 THEN 'high' ELSE 'low' END FROM orders",
					allowedTables,
				),
			).not.toThrow();
		});

		it('should accept CAST expressions', () => {
			expect(() =>
				pgValidator.validate('SELECT CAST(amount AS TEXT) FROM orders', allowedTables),
			).not.toThrow();
		});

		it('should accept IN with literal list', () => {
			expect(() =>
				pgValidator.validate(
					"SELECT * FROM orders WHERE status IN ('active', 'pending')",
					allowedTables,
				),
			).not.toThrow();
		});

		it('should accept BETWEEN', () => {
			expect(() =>
				pgValidator.validate('SELECT * FROM orders WHERE amount BETWEEN 10 AND 100', allowedTables),
			).not.toThrow();
		});

		it('should accept LIKE', () => {
			expect(() =>
				pgValidator.validate("SELECT * FROM orders WHERE name LIKE '%test%'", allowedTables),
			).not.toThrow();
		});

		it('should accept IS NULL / IS NOT NULL', () => {
			expect(() =>
				pgValidator.validate('SELECT * FROM orders WHERE name IS NOT NULL', allowedTables),
			).not.toThrow();
		});

		it('should accept LEFT JOIN', () => {
			expect(() =>
				pgValidator.validate(
					'SELECT * FROM orders o LEFT JOIN customers c ON o.cid = c.id',
					allowedTables,
				),
			).not.toThrow();
		});

		it('should accept arithmetic operators', () => {
			expect(() =>
				pgValidator.validate('SELECT amount * 2 + 1 FROM orders', allowedTables),
			).not.toThrow();
		});

		it('should accept DISTINCT', () => {
			expect(() =>
				pgValidator.validate('SELECT DISTINCT name FROM orders', allowedTables),
			).not.toThrow();
		});
	});

	// ── Rejected constructs (strict allowlist) ──────────────────

	describe('rejected constructs', () => {
		it('should reject WITH/CTE expressions', () => {
			expect(() =>
				pgValidator.validate('WITH cte AS (SELECT * FROM orders) SELECT * FROM cte', allowedTables),
			).toThrow(SqlValidationError);
		});

		it('should reject UNION', () => {
			expect(() =>
				pgValidator.validate('SELECT id FROM orders UNION SELECT id FROM customers', allowedTables),
			).toThrow(SqlValidationError);
		});

		it('should reject subqueries in WHERE', () => {
			expect(() =>
				pgValidator.validate(
					'SELECT * FROM orders WHERE id IN (SELECT order_id FROM customers)',
					allowedTables,
				),
			).toThrow(SqlValidationError);
		});

		it('should reject derived tables (subqueries in FROM)', () => {
			expect(() =>
				pgValidator.validate('SELECT * FROM (SELECT * FROM orders) AS sub', allowedTables),
			).toThrow(SqlValidationError);
		});

		it('should reject SELECT INTO', () => {
			expect(() =>
				pgValidator.validate('SELECT * INTO newtable FROM orders', allowedTables),
			).toThrow(SqlValidationError);
		});

		it('should reject dangerous functions', () => {
			expect(() =>
				pgValidator.validate("SELECT pg_read_file('/etc/passwd') FROM orders", allowedTables),
			).toThrow(SqlValidationError);
		});

		it('should reject window functions (OVER clause)', () => {
			expect(() =>
				pgValidator.validate('SELECT COUNT(*) OVER () FROM orders', allowedTables),
			).toThrow(SqlValidationError);
		});
	});

	// ── Security regression suite ───────────────────────────────

	describe('security regression suite', () => {
		it('should reject schema-qualified table references', () => {
			expect(() =>
				pgValidator.validate('SELECT * FROM public.credentials_entity', ['credentials_entity']),
			).toThrow(SqlValidationError);
		});

		it('should reject information_schema access', () => {
			expect(() =>
				pgValidator.validate('SELECT * FROM information_schema.tables', allowedTables),
			).toThrow(SqlValidationError);
		});

		it('should reject semicolon injection with multiple statements', () => {
			expect(() => pgValidator.validate('SELECT 1; DROP TABLE users', allowedTables)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject SET search_path', () => {
			expect(() => pgValidator.validate('SET search_path TO evil', allowedTables)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject unauthorized table access', () => {
			expect(() => pgValidator.validate('SELECT * FROM credentials', allowedTables)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject unauthorized table via UNION', () => {
			expect(() =>
				pgValidator.validate(
					'SELECT id FROM orders UNION SELECT id FROM credentials',
					allowedTables,
				),
			).toThrow(SqlValidationError);
		});

		it('should reject unauthorized table via subquery', () => {
			expect(() =>
				pgValidator.validate(
					'SELECT * FROM orders WHERE id IN (SELECT id FROM credentials)',
					allowedTables,
				),
			).toThrow(SqlValidationError);
		});
	});

	// ── SQLite dialect ──────────────────────────────────────────

	describe('SQLite dialect', () => {
		it('should accept a simple SELECT', () => {
			const result = sqliteValidator.validate('SELECT * FROM orders', allowedTables);
			expect(result.type).toBe('select');
		});

		it('should reject ATTACH DATABASE', () => {
			expect(() =>
				sqliteValidator.validate("ATTACH DATABASE '/tmp/evil.db' AS evil", allowedTables),
			).toThrow(SqlValidationError);
		});

		it('should reject load_extension function', () => {
			expect(() =>
				sqliteValidator.validate(
					"SELECT load_extension('/tmp/evil.so') FROM orders",
					allowedTables,
				),
			).toThrow(SqlValidationError);
		});

		it('should accept sqlite-specific functions like STRFTIME', () => {
			expect(() =>
				sqliteValidator.validate("SELECT STRFTIME('%Y', created_at) FROM orders", allowedTables),
			).not.toThrow();
		});

		it('should reject sqlite_master access', () => {
			expect(() => sqliteValidator.validate('SELECT * FROM sqlite_master', allowedTables)).toThrow(
				SqlValidationError,
			);
		});
	});

	// ── Table & function extraction ─────────────────────────────

	describe('table extraction', () => {
		it('should extract tables from a simple query', () => {
			const result = pgValidator.validate('SELECT * FROM orders', allowedTables);
			expect(result.tables).toEqual(['orders']);
		});

		it('should extract tables from a JOIN', () => {
			const result = pgValidator.validate(
				'SELECT * FROM orders o JOIN customers c ON o.cid = c.id',
				allowedTables,
			);
			expect(result.tables).toEqual(expect.arrayContaining(['orders', 'customers']));
		});
	});

	describe('function extraction', () => {
		it('should extract function names from a query', () => {
			const result = pgValidator.validate(
				'SELECT COUNT(*), SUM(amount) FROM orders',
				allowedTables,
			);
			expect(result.functions).toEqual(expect.arrayContaining(['COUNT', 'SUM']));
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
				'SELECT * FROM orders o JOIN customers c ON o.cid = c.id',
				allowedTables,
				tableMapping,
			);

			expect(result.rewrittenSql).toContain('n8n_data_table_user_abc123');
			expect(result.rewrittenSql).toContain('n8n_data_table_user_def456');
			expect(result.rewrittenSql).not.toContain('"orders"');
			expect(result.rewrittenSql).not.toContain('"customers"');
		});

		it('should reject when table mapping is missing an entry', () => {
			const tableMapping = new Map([['orders', 'n8n_data_table_user_abc123']]);

			expect(() =>
				pgValidator.validateAndRewrite(
					'SELECT * FROM orders o JOIN customers c ON o.cid = c.id',
					allowedTables,
					tableMapping,
				),
			).toThrow(SqlValidationError);
		});
	});
});
