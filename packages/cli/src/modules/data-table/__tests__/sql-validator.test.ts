import { SqlValidationError, SqlValidator } from '../utils/sql-validator';

describe('SqlValidator', () => {
	const pgValidator = new SqlValidator('postgres');
	const sqliteValidator = new SqlValidator('sqlite');
	const allowedTables = ['orders', 'customers'];

	describe('statement type validation (postgres)', () => {
		it('should accept a simple SELECT statement', () => {
			const result = pgValidator.validate('SELECT * FROM orders', allowedTables);

			expect(result.type).toBe('select');
		});

		it('should reject INSERT statements', () => {
			expect(() =>
				pgValidator.validate('INSERT INTO orders (id) VALUES (1)', allowedTables),
			).toThrow(SqlValidationError);
		});

		it('should reject UPDATE statements', () => {
			expect(() => pgValidator.validate('UPDATE orders SET id = 1', allowedTables)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject DELETE statements', () => {
			expect(() => pgValidator.validate('DELETE FROM orders', allowedTables)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject DROP TABLE statements', () => {
			expect(() => pgValidator.validate('DROP TABLE orders', allowedTables)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject empty input', () => {
			expect(() => pgValidator.validate('', allowedTables)).toThrow(SqlValidationError);
		});

		it('should reject whitespace-only input', () => {
			expect(() => pgValidator.validate('   \t\n  ', allowedTables)).toThrow(SqlValidationError);
		});
	});

	describe('table allowlist (postgres)', () => {
		it('should accept a query referencing only allowed tables', () => {
			const result = pgValidator.validate(
				'SELECT * FROM orders JOIN customers ON orders.id = customers.order_id',
				allowedTables,
			);

			expect(result.tables).toEqual(expect.arrayContaining(['orders', 'customers']));
		});

		it('should reject a query referencing an unauthorized table', () => {
			expect(() => pgValidator.validate('SELECT * FROM credentials_entity', allowedTables)).toThrow(
				SqlValidationError,
			);
		});

		it('should reject a subquery accessing an unauthorized table', () => {
			expect(() =>
				pgValidator.validate(
					'SELECT * FROM orders WHERE id IN (SELECT order_id FROM secret_data)',
					allowedTables,
				),
			).toThrow(SqlValidationError);
		});

		it('should reject a UNION with an unauthorized table', () => {
			expect(() =>
				pgValidator.validate(
					'SELECT id FROM orders UNION SELECT id FROM credentials_entity',
					allowedTables,
				),
			).toThrow(SqlValidationError);
		});
	});

	describe('function allowlist (postgres)', () => {
		it('should accept allowed aggregate functions', () => {
			const result = pgValidator.validate(
				'SELECT COUNT(*), SUM(amount) FROM orders',
				allowedTables,
			);

			expect(result.functions).toEqual(expect.arrayContaining(['COUNT', 'SUM']));
		});

		it('should accept nested allowed functions', () => {
			const result = pgValidator.validate(
				'SELECT COALESCE(SUM(amount), 0) FROM orders',
				allowedTables,
			);

			expect(result.functions).toEqual(expect.arrayContaining(['COALESCE', 'SUM']));
		});

		it('should reject dangerous functions like pg_read_file', () => {
			expect(() =>
				pgValidator.validate("SELECT pg_read_file('/etc/passwd')", allowedTables),
			).toThrow(SqlValidationError);
		});
	});

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

		it('should reject SELECT INTO (table creation)', () => {
			expect(() =>
				pgValidator.validate('SELECT * INTO newtable FROM orders', allowedTables),
			).toThrow(SqlValidationError);
		});

		it('should reject SELECT INTO OUTFILE (file exfiltration)', () => {
			expect(() =>
				pgValidator.validate("SELECT * FROM orders INTO OUTFILE '/tmp/dump.csv'", allowedTables),
			).toThrow(SqlValidationError);
		});
	});

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
				sqliteValidator.validate("SELECT load_extension('evil')", allowedTables),
			).toThrow(SqlValidationError);
		});

		it('should accept sqlite-specific functions like STRFTIME', () => {
			const result = sqliteValidator.validate(
				"SELECT STRFTIME('%Y', created_at) FROM orders",
				allowedTables,
			);

			expect(result.functions).toContain('STRFTIME');
		});

		it('should reject sqlite_master access', () => {
			expect(() => sqliteValidator.validate('SELECT * FROM sqlite_master', allowedTables)).toThrow(
				SqlValidationError,
			);
		});
	});

	describe('table extraction', () => {
		it('should extract tables from a simple query', () => {
			const result = pgValidator.validate('SELECT * FROM orders', allowedTables);

			expect(result.tables).toEqual(['orders']);
		});

		it('should extract tables from a JOIN', () => {
			const result = pgValidator.validate(
				'SELECT o.id FROM orders o JOIN customers c ON o.cid = c.id',
				allowedTables,
			);

			expect(result.tables).toEqual(expect.arrayContaining(['orders', 'customers']));
			expect(result.tables).toHaveLength(2);
		});

		it('should extract tables from a subquery', () => {
			const result = pgValidator.validate(
				'SELECT * FROM orders WHERE cid IN (SELECT id FROM customers)',
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
			expect(result.functions).toHaveLength(2);
		});
	});

	describe('validateAndRewrite', () => {
		it('should rewrite table names from logical to physical', () => {
			const tableMapping = new Map([
				['orders', 'dt_phys_abc123'],
				['customers', 'dt_phys_def456'],
			]);

			const result = pgValidator.validateAndRewrite(
				'SELECT o.id FROM orders o JOIN customers c ON o.cid = c.id',
				allowedTables,
				tableMapping,
			);

			expect(result.rewrittenSql).toContain('dt_phys_abc123');
			expect(result.rewrittenSql).toContain('dt_phys_def456');
			// The FROM clause should no longer reference original logical table names
			expect(result.rewrittenSql).not.toMatch(/FROM\s+"?orders"?/i);
			expect(result.rewrittenSql).not.toMatch(/JOIN\s+"?customers"?/i);
		});

		it('should pass whiteListCheck defense-in-depth after rewriting', () => {
			const tableMapping = new Map([['orders', 'dt_phys_abc123']]);

			const result = pgValidator.validateAndRewrite(
				'SELECT * FROM orders WHERE id = 1',
				['orders'],
				tableMapping,
			);

			expect(result.rewrittenSql).toContain('dt_phys_abc123');
			expect(result.type).toBe('select');
		});

		it('should rewrite tables in subqueries', () => {
			const tableMapping = new Map([
				['orders', 'dt_phys_abc123'],
				['customers', 'dt_phys_def456'],
			]);

			const result = pgValidator.validateAndRewrite(
				'SELECT * FROM orders WHERE cid IN (SELECT id FROM customers)',
				allowedTables,
				tableMapping,
			);

			expect(result.rewrittenSql).toContain('dt_phys_abc123');
			expect(result.rewrittenSql).toContain('dt_phys_def456');
		});

		it('should reject when table mapping is missing an entry', () => {
			const tableMapping = new Map([['orders', 'dt_phys_abc123']]);

			expect(() =>
				pgValidator.validateAndRewrite(
					'SELECT * FROM orders JOIN customers ON orders.id = customers.order_id',
					allowedTables,
					tableMapping,
				),
			).toThrow(SqlValidationError);
		});
	});
});
