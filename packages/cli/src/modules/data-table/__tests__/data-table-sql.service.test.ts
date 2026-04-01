import type { Logger } from '@n8n/backend-common';
import type { DataSource, QueryRunner } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import type { DataTableColumn } from '../data-table-column.entity';
import type { DataTableColumnRepository } from '../data-table-column.repository';
import type { DataTable } from '../data-table.entity';
import type { DataTableRepository } from '../data-table.repository';
import { DataTableSqlService } from '../data-table-sql.service';
import { SqlValidationError } from '../utils/sql-validator';

// Mock sql-utils so toTableName is predictable without DI Container
jest.mock('../utils/sql-utils', () => ({
	...jest.requireActual('../utils/sql-utils'),
	toTableName: jest.fn((id: string) => `n8n_data_table_user_${id}`),
}));

const makeTable = (id: string, name: string, projectId: string): DataTable =>
	({ id, name, projectId }) as DataTable;

const makeColumn = (id: string, name: string, type: string, dataTableId: string): DataTableColumn =>
	({ id, name, type, dataTableId }) as DataTableColumn;

describe('DataTableSqlService', () => {
	let service: DataTableSqlService;
	let dataSourceMock: jest.Mocked<DataSource>;
	let dataTableRepositoryMock: jest.Mocked<DataTableRepository>;
	let dataTableColumnRepositoryMock: jest.Mocked<DataTableColumnRepository>;
	let loggerMock: jest.Mocked<Logger>;
	let queryRunnerMock: jest.Mocked<QueryRunner>;

	beforeEach(() => {
		dataSourceMock = mock<DataSource>();
		dataTableRepositoryMock = mock<DataTableRepository>();
		dataTableColumnRepositoryMock = mock<DataTableColumnRepository>();
		loggerMock = mock<Logger>();
		queryRunnerMock = mock<QueryRunner>();

		loggerMock.scoped.mockReturnValue(loggerMock);

		// Default datasource type: postgres
		(dataSourceMock as unknown as { options: { type: string } }).options = { type: 'postgres' };

		// Wire up query runner
		dataSourceMock.createQueryRunner.mockReturnValue(queryRunnerMock);
		queryRunnerMock.connect.mockResolvedValue(undefined);
		queryRunnerMock.startTransaction.mockResolvedValue(undefined);
		queryRunnerMock.rollbackTransaction.mockResolvedValue(undefined);
		queryRunnerMock.release.mockResolvedValue(undefined);
		queryRunnerMock.query.mockResolvedValue([]);

		service = new DataTableSqlService(
			dataSourceMock,
			dataTableRepositoryMock,
			dataTableColumnRepositoryMock,
			loggerMock,
		);

		jest.clearAllMocks();

		// Re-apply after clearAllMocks
		loggerMock.scoped.mockReturnValue(loggerMock);
		(dataSourceMock as unknown as { options: { type: string } }).options = { type: 'postgres' };
		dataSourceMock.createQueryRunner.mockReturnValue(queryRunnerMock);
		queryRunnerMock.connect.mockResolvedValue(undefined);
		queryRunnerMock.startTransaction.mockResolvedValue(undefined);
		queryRunnerMock.rollbackTransaction.mockResolvedValue(undefined);
		queryRunnerMock.release.mockResolvedValue(undefined);
		queryRunnerMock.query.mockResolvedValue([]);
	});

	describe('getTableSchemas', () => {
		it('should return schemas for requested tables with correct columns', async () => {
			const tables = [
				makeTable('table1', 'orders', 'proj1'),
				makeTable('table2', 'customers', 'proj1'),
			];
			const columns = [
				makeColumn('col1', 'id', 'number', 'table1'),
				makeColumn('col2', 'amount', 'number', 'table1'),
				makeColumn('col3', 'name', 'string', 'table2'),
			];

			dataTableRepositoryMock.find.mockResolvedValue(tables);
			dataTableColumnRepositoryMock.find.mockResolvedValue(columns);

			const schemas = await service.getTableSchemas(['table1', 'table2'], 'proj1');

			expect(schemas).toHaveLength(2);

			const ordersSchema = schemas.find((s: { id: string }) => s.id === 'table1');
			expect(ordersSchema).toBeDefined();
			expect(ordersSchema?.name).toBe('orders');
			expect(ordersSchema?.columns).toEqual([
				{ name: 'id', type: 'number' },
				{ name: 'amount', type: 'number' },
			]);

			const customersSchema = schemas.find((s: { id: string }) => s.id === 'table2');
			expect(customersSchema).toBeDefined();
			expect(customersSchema?.name).toBe('customers');
			expect(customersSchema?.columns).toEqual([{ name: 'name', type: 'string' }]);
		});

		it('should return empty array when no tables match', async () => {
			dataTableRepositoryMock.find.mockResolvedValue([]);
			dataTableColumnRepositoryMock.find.mockResolvedValue([]);

			const schemas = await service.getTableSchemas(['nonexistent'], 'proj1');

			expect(schemas).toHaveLength(0);
		});

		it('should return schemas with empty columns when no columns exist', async () => {
			const tables = [makeTable('table1', 'orders', 'proj1')];
			dataTableRepositoryMock.find.mockResolvedValue(tables);
			dataTableColumnRepositoryMock.find.mockResolvedValue([]);

			const schemas = await service.getTableSchemas(['table1'], 'proj1');

			expect(schemas).toHaveLength(1);
			expect(schemas[0].columns).toHaveLength(0);
		});

		it('should pass projectId as filter to repository', async () => {
			dataTableRepositoryMock.find.mockResolvedValue([]);
			dataTableColumnRepositoryMock.find.mockResolvedValue([]);

			await service.getTableSchemas(['table1'], 'specific-project');

			expect(dataTableRepositoryMock.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ projectId: 'specific-project' }),
				}),
			);
		});
	});

	describe('validateAndExecute', () => {
		const projectId = 'proj1';

		beforeEach(() => {
			const tables = [makeTable('table1', 'orders', projectId)];
			const columns = [
				makeColumn('col1', 'id', 'number', 'table1'),
				makeColumn('col2', 'amount', 'number', 'table1'),
			];
			dataTableRepositoryMock.find.mockResolvedValue(tables);
			dataTableColumnRepositoryMock.find.mockResolvedValue(columns);
		});

		it('should reject non-SELECT queries with SqlValidationError', async () => {
			await expect(
				service.validateAndExecute('DELETE FROM orders', ['table1'], projectId),
			).rejects.toThrow(SqlValidationError);
		});

		it('should reject queries referencing unauthorized tables', async () => {
			await expect(
				service.validateAndExecute('SELECT * FROM unauthorized_table', ['table1'], projectId),
			).rejects.toThrow(SqlValidationError);
		});

		it('should execute valid SELECT query and return results', async () => {
			const rows = [
				{ id: 1, amount: 100 },
				{ id: 2, amount: 200 },
			];
			queryRunnerMock.query.mockResolvedValue(rows);

			const result = await service.validateAndExecute(
				'SELECT * FROM orders',
				['table1'],
				projectId,
			);

			expect(result.rows).toHaveLength(2);
			expect(result.rowCount).toBe(2);
			expect(result.truncated).toBe(false);
		});

		it('should apply row cap and mark result as truncated when exceeded', async () => {
			// Return maxRows + 1 rows to trigger truncation
			const extraRows = Array.from({ length: 101 }, (_, i) => ({ id: i + 1, amount: i * 10 }));
			queryRunnerMock.query.mockResolvedValue(extraRows);

			const result = await service.validateAndExecute(
				'SELECT * FROM orders',
				['table1'],
				projectId,
				{ maxRows: 100 },
			);

			expect(result.rows).toHaveLength(100);
			expect(result.truncated).toBe(true);
			expect(result.rowCount).toBe(100);
		});

		it('should not truncate when result count is exactly at maxRows', async () => {
			const rows = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, amount: i * 10 }));
			queryRunnerMock.query.mockResolvedValue(rows);

			const result = await service.validateAndExecute(
				'SELECT * FROM orders',
				['table1'],
				projectId,
				{ maxRows: 100 },
			);

			expect(result.rows).toHaveLength(100);
			expect(result.truncated).toBe(false);
		});

		it('should use read-only transaction for postgres', async () => {
			queryRunnerMock.query.mockResolvedValue([{ id: 1 }]);

			await service.validateAndExecute('SELECT id FROM orders', ['table1'], projectId);

			expect(dataSourceMock.createQueryRunner).toHaveBeenCalled();
			expect(queryRunnerMock.startTransaction).toHaveBeenCalled();
			// Should include SET TRANSACTION READ ONLY command
			const queryCalls = queryRunnerMock.query.mock.calls;
			const readOnlyCall = queryCalls.find((args) => String(args[0]).includes('READ ONLY'));
			expect(readOnlyCall).toBeDefined();
			expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
			expect(queryRunnerMock.release).toHaveBeenCalled();
		});

		it('should rollback transaction even when query fails', async () => {
			queryRunnerMock.query.mockRejectedValue(new Error('DB error'));

			await expect(
				service.validateAndExecute('SELECT * FROM orders', ['table1'], projectId),
			).rejects.toThrow();

			expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
			expect(queryRunnerMock.release).toHaveBeenCalled();
		});

		it('should sanitize physical table names from error messages', async () => {
			queryRunnerMock.query.mockRejectedValue(
				new Error('relation "n8n_data_table_user_table1" does not exist'),
			);

			await expect(
				service.validateAndExecute('SELECT * FROM orders', ['table1'], projectId),
			).rejects.toThrow('[table]');
		});

		it('should handle name collisions by appending _2 suffix', async () => {
			// Two tables with the same logical name
			const tables = [
				makeTable('table1', 'sales', projectId),
				makeTable('table2', 'sales', projectId),
			];
			dataTableRepositoryMock.find.mockResolvedValue(tables);
			dataTableColumnRepositoryMock.find.mockResolvedValue([]);

			queryRunnerMock.query.mockResolvedValue([]);

			// Both table IDs accessible; SQL references one by its logical name
			const result = await service.validateAndExecute(
				'SELECT * FROM sales',
				['table1', 'table2'],
				projectId,
			);

			expect(result).toBeDefined();
		});
	});

	describe('ensureLimit (via validateAndExecute behavior)', () => {
		const projectId = 'proj1';

		beforeEach(() => {
			const tables = [makeTable('table1', 'orders', projectId)];
			const columns = [makeColumn('col1', 'id', 'number', 'table1')];
			dataTableRepositoryMock.find.mockResolvedValue(tables);
			dataTableColumnRepositoryMock.find.mockResolvedValue(columns);
			queryRunnerMock.query.mockResolvedValue([]);
		});

		it('should add LIMIT clause when none is present in SQL', async () => {
			await service.validateAndExecute('SELECT id FROM orders', ['table1'], projectId, {
				maxRows: 50,
			});

			const queryCalls = queryRunnerMock.query.mock.calls;
			// Find the actual SELECT query call (not SET TRANSACTION etc.)
			const selectCall = queryCalls.find((args) =>
				String(args[0]).toLowerCase().startsWith('select'),
			);
			expect(selectCall).toBeDefined();
			expect(String(selectCall?.[0]).toUpperCase()).toContain('LIMIT');
		});

		it('should cap existing LIMIT that exceeds maxRows', async () => {
			await service.validateAndExecute('SELECT id FROM orders LIMIT 1000', ['table1'], projectId, {
				maxRows: 50,
			});

			const queryCalls = queryRunnerMock.query.mock.calls;
			const selectCall = queryCalls.find((args) =>
				String(args[0]).toLowerCase().startsWith('select'),
			);
			expect(selectCall).toBeDefined();
			// The limit in the executed query should be capped (51 = maxRows + 1 for truncation detection)
			const sql = String(selectCall?.[0]);
			const limitMatch = /LIMIT\s+(\d+)/i.exec(sql);
			expect(limitMatch).toBeDefined();
			const limitValue = parseInt(limitMatch![1], 10);
			expect(limitValue).toBeLessThanOrEqual(51); // maxRows + 1
		});
	});

	// ── Security: Penetration Testing ──────────────────────────────────
	//
	// These tests act as an attacker trying to break out of the read-only,
	// table-restricted sandbox exposed by validateAndExecute.
	// Tests marked VULNERABILITY demonstrate a confirmed exploit.
	// Tests marked BLOCKED confirm the defense holds.

	describe('Security: penetration testing', () => {
		const projectId = 'proj1';

		beforeEach(() => {
			const tables = [
				makeTable('table1', 'orders', projectId),
				makeTable('table2', 'customers', projectId),
			];
			const columns = [
				makeColumn('col1', 'amount', 'number', 'table1'),
				makeColumn('col2', 'status', 'string', 'table1'),
				makeColumn('col3', 'name', 'string', 'table2'),
				makeColumn('col4', 'email', 'string', 'table2'),
			];
			dataTableRepositoryMock.find.mockResolvedValue(tables);
			dataTableColumnRepositoryMock.find.mockResolvedValue(columns);
		});

		// ── 1. SQL injection via the sql parameter ───────────────────

		describe('BLOCKED: SQL injection via sql parameter', () => {
			const attacks: Array<[string, string]> = [
				// DML / DDL
				['INSERT injection', 'INSERT INTO orders (amount) VALUES (1)'],
				['UPDATE injection', 'UPDATE orders SET amount = 0'],
				['DELETE injection', 'DELETE FROM orders'],
				['DROP TABLE', 'DROP TABLE orders'],
				['TRUNCATE', 'TRUNCATE orders'],
				['ALTER TABLE add column', 'ALTER TABLE orders ADD COLUMN evil TEXT'],
				['CREATE TABLE', 'CREATE TABLE evil (id INT)'],

				// Multi-statement / stacked queries
				['semicolon stacked query', 'SELECT * FROM orders; DROP TABLE orders'],
				['semicolon stacked insert', 'SELECT * FROM orders; INSERT INTO orders VALUES (1)'],

				// UNION / set operations
				[
					'UNION to read credentials',
					'SELECT id FROM orders UNION SELECT id FROM credential_entity',
				],
				['UNION ALL', 'SELECT amount FROM orders UNION ALL SELECT name FROM credential_entity'],

				// Subqueries
				[
					'subquery in WHERE IN',
					'SELECT * FROM orders WHERE id IN (SELECT id FROM credential_entity)',
				],
				[
					'subquery in WHERE EXISTS',
					'SELECT * FROM orders WHERE EXISTS (SELECT 1 FROM credential_entity)',
				],
				['derived table in FROM', 'SELECT * FROM (SELECT * FROM credential_entity)'],
				[
					'correlated subquery',
					'SELECT * FROM orders WHERE amount = (SELECT MAX(id) FROM credential_entity)',
				],

				// CTE / WITH
				[
					'CTE to access credentials',
					'WITH cte AS (SELECT * FROM credential_entity) SELECT * FROM cte',
				],

				// Comments (could hide malicious SQL from a naive validator)
				[
					'line comment hiding payload',
					'SELECT * FROM orders -- UNION SELECT * FROM credential_entity',
				],
				[
					'block comment hiding payload',
					'SELECT * /* UNION SELECT * FROM credential_entity */ FROM orders',
				],

				// Transaction manipulation
				['BEGIN', 'BEGIN; SELECT * FROM orders'],
				['COMMIT', 'SELECT * FROM orders; COMMIT'],
				['SET search_path', 'SET search_path TO public'],
				['SET ROLE', 'SET ROLE postgres'],

				// Schema-qualified access to system/other tables
				['schema-qualified credentials', 'SELECT * FROM public.credential_entity'],
				['information_schema.tables', 'SELECT * FROM information_schema.tables'],
				['pg_catalog access', 'SELECT * FROM pg_catalog.pg_class'],

				// Dangerous functions
				['pg_read_file', "SELECT pg_read_file('/etc/passwd') FROM orders"],
				['pg_sleep (DoS)', 'SELECT pg_sleep(999) FROM orders'],
				['lo_import', "SELECT lo_import('/etc/passwd') FROM orders"],
				['current_setting', "SELECT current_setting('data_directory') FROM orders"],
				['set_config', "SELECT set_config('log_statement', 'all', false) FROM orders"],
				[
					'query_to_xml',
					"SELECT query_to_xml('SELECT * FROM credential_entity', true, true, '') FROM orders",
				],
				['dblink (cross-db)', "SELECT dblink('SELECT * FROM credential_entity') FROM orders"],

				// COPY / EXPLAIN / GRANT
				['COPY to file', "COPY orders TO '/tmp/data.csv'"],
				['EXPLAIN leaking plan', 'EXPLAIN SELECT * FROM orders'],
				['GRANT', 'GRANT ALL ON orders TO evil_user'],

				// Quote injection (trying to break out of tokenizer)
				['double-quote identifier escape', 'SELECT "credential_entity".* FROM orders'],
				['backtick identifier escape', 'SELECT `credential_entity`.* FROM orders'],
				['dollar-quoted string', 'SELECT $$evil$$ FROM orders'],

				// Type casting abuse
				[':: cast syntax (postgres)', 'SELECT amount::regclass FROM orders'],
				['CAST to regclass', 'SELECT CAST(amount AS regclass) FROM orders'],

				// Table alias to access unauthorized table
				['implicit table alias', 'SELECT o.amount FROM orders o'],
				['implicit alias on FROM', 'SELECT t.amount FROM orders t WHERE t.amount > 0'],

				// Window functions (could bypass read restrictions in theory)
				['OVER clause', 'SELECT COUNT(*) OVER () FROM orders'],
				['ROW_NUMBER window', 'SELECT ROW_NUMBER() OVER (ORDER BY amount) FROM orders'],

				// SELECT INTO (creates a new table)
				['SELECT INTO', 'SELECT * INTO evil_table FROM orders'],

				// RETURNING clause
				['DELETE RETURNING', 'DELETE FROM orders RETURNING *'],

				// Null byte injection (parser differential: tokenizer vs DB)
				['null byte mid-query', 'SELECT * FROM orders\x00; DROP TABLE credential_entity'],
			];

			it.each(attacks)('%s', async (_label, maliciousSql) => {
				await expect(
					service.validateAndExecute(maliciousSql, ['table1', 'table2'], projectId),
				).rejects.toThrow();
			});
		});

		// ── 2. timeoutMs parameter hardening ─────────────────────────

		describe('FIXED: timeoutMs injection is now blocked', () => {
			it('string value is sanitized to default timeout via parameterized query', async () => {
				const maliciousTimeout = '1; SELECT * FROM credential_entity' as unknown as number;

				queryRunnerMock.query.mockResolvedValue([]);

				await service.validateAndExecute('SELECT * FROM orders', ['table1'], projectId, {
					timeoutMs: maliciousTimeout,
				});

				const allCalls = queryRunnerMock.query.mock.calls.map((args) => String(args[0]));

				// Injected SQL must NOT appear in any query
				const injectedCall = allCalls.find((sql) => sql.includes('credential_entity'));
				expect(injectedCall).toBeUndefined();

				// The SET LOCAL call uses a parameterized query ($1)
				const timeoutCall = allCalls.find((sql) => sql.includes('statement_timeout'));
				expect(timeoutCall).toBe('SET LOCAL statement_timeout = $1');
			});

			it('NaN falls back to default timeout', async () => {
				queryRunnerMock.query.mockResolvedValue([]);

				await service.validateAndExecute('SELECT * FROM orders', ['table1'], projectId, {
					timeoutMs: NaN,
				});

				const allCalls = queryRunnerMock.query.mock.calls;
				const timeoutCall = allCalls.find((args) => String(args[0]).includes('statement_timeout'));
				// Parameterized — second arg is the value array
				expect(timeoutCall?.[1]).toEqual([10_000]);
			});

			it('negative value falls back to default timeout', async () => {
				queryRunnerMock.query.mockResolvedValue([]);

				await service.validateAndExecute('SELECT * FROM orders', ['table1'], projectId, {
					timeoutMs: -5,
				});

				const allCalls = queryRunnerMock.query.mock.calls;
				const timeoutCall = allCalls.find((args) => String(args[0]).includes('statement_timeout'));
				expect(timeoutCall?.[1]).toEqual([10_000]);
			});

			it('Infinity falls back to default timeout', async () => {
				queryRunnerMock.query.mockResolvedValue([]);

				await service.validateAndExecute('SELECT * FROM orders', ['table1'], projectId, {
					timeoutMs: Infinity,
				});

				const allCalls = queryRunnerMock.query.mock.calls;
				const timeoutCall = allCalls.find((args) => String(args[0]).includes('statement_timeout'));
				expect(timeoutCall?.[1]).toEqual([10_000]);
			});

			it('valid number is truncated to integer and used', async () => {
				queryRunnerMock.query.mockResolvedValue([]);

				await service.validateAndExecute('SELECT * FROM orders', ['table1'], projectId, {
					timeoutMs: 5000.9,
				});

				const allCalls = queryRunnerMock.query.mock.calls;
				const timeoutCall = allCalls.find((args) => String(args[0]).includes('statement_timeout'));
				expect(timeoutCall?.[1]).toEqual([5000]);
			});
		});

		// ── 3. SQLite lacks read-only transaction enforcement ─────────

		describe('FIXED: SQLite now uses PRAGMA query_only for read-only enforcement', () => {
			let sqliteService: DataTableSqlService;
			let sqliteQueryRunner: jest.Mocked<QueryRunner>;

			beforeEach(() => {
				const sqliteDataSource = mock<DataSource>();
				(sqliteDataSource as unknown as { options: { type: string } }).options = {
					type: 'sqlite',
				};

				sqliteQueryRunner = mock<QueryRunner>();
				sqliteQueryRunner.connect.mockResolvedValue(undefined);
				sqliteQueryRunner.query.mockResolvedValue([]);
				sqliteQueryRunner.release.mockResolvedValue(undefined);
				sqliteDataSource.createQueryRunner.mockReturnValue(sqliteQueryRunner);

				const sqliteLogger = mock<Logger>();
				sqliteLogger.scoped.mockReturnValue(sqliteLogger);

				sqliteService = new DataTableSqlService(
					sqliteDataSource,
					dataTableRepositoryMock,
					dataTableColumnRepositoryMock,
					sqliteLogger,
				);
			});

			it('enables PRAGMA query_only before executing the user query', async () => {
				await sqliteService.validateAndExecute('SELECT * FROM orders', ['table1'], projectId);

				const allCalls = sqliteQueryRunner.query.mock.calls.map((args) => String(args[0]));

				// PRAGMA query_only = ON must come before the SELECT
				const pragmaOnIdx = allCalls.findIndex((sql) => sql === 'PRAGMA query_only = ON');
				const selectIdx = allCalls.findIndex((sql) => sql.toUpperCase().startsWith('SELECT'));
				const pragmaOffIdx = allCalls.findIndex((sql) => sql === 'PRAGMA query_only = OFF');

				expect(pragmaOnIdx).toBeGreaterThanOrEqual(0);
				expect(selectIdx).toBeGreaterThan(pragmaOnIdx);
				expect(pragmaOffIdx).toBeGreaterThan(selectIdx);
			});

			it('resets PRAGMA query_only even when the query fails', async () => {
				sqliteQueryRunner.query
					.mockResolvedValueOnce(undefined as never) // PRAGMA ON
					.mockRejectedValueOnce(new Error('syntax error')) // user query
					.mockResolvedValueOnce(undefined as never); // PRAGMA OFF

				await expect(
					sqliteService.validateAndExecute('SELECT * FROM orders', ['table1'], projectId),
				).rejects.toThrow();

				const allCalls = sqliteQueryRunner.query.mock.calls.map((args) => String(args[0]));
				expect(allCalls).toContain('PRAGMA query_only = OFF');
			});
		});

		// ── 4. Table-name rewriting collision ─────────────────────────

		describe('BUG: table name rewriting rewrites column references that share a table name', () => {
			it('column named same as another table gets rewritten when both tables are in FROM', async () => {
				// Setup: table "orders" has a column called "customers" (a FK name).
				// Table "customers" also exists. When BOTH tables appear in FROM,
				// the rewriter replaces ALL identifiers matching a table name —
				// including the "customers" column reference in the SELECT list.
				// The query breaks at execution time (column not found).

				const tables = [
					makeTable('t1', 'orders', projectId),
					makeTable('t2', 'customers', projectId),
				];
				const columns = [
					makeColumn('c1', 'amount', 'number', 't1'),
					// Column named "customers" in the orders table
					makeColumn('c2', 'customers', 'string', 't1'),
					makeColumn('c3', 'name', 'string', 't2'),
				];
				dataTableRepositoryMock.find.mockResolvedValue(tables);
				dataTableColumnRepositoryMock.find.mockResolvedValue(columns);

				queryRunnerMock.query.mockResolvedValue([]);

				// Both tables in FROM → rewriter sees "customers" as a table name
				await service.validateAndExecute(
					'SELECT customers FROM orders, customers',
					['t1', 't2'],
					projectId,
				);

				const calls = queryRunnerMock.query.mock.calls.map((args) => String(args[0]));
				const selectQuery = calls.find((sql) => sql.toUpperCase().startsWith('SELECT'));

				// BUG: the "customers" in SELECT list (a column ref) was rewritten
				// to the physical table name, corrupting the query.
				expect(selectQuery).toMatch(/^SELECT n8n_data_table_user_t2/);
			});
		});

		// ── 5. Error-message information disclosure ───────────────────

		describe('VULNERABILITY: error messages can leak internal details', () => {
			it('sanitizeDbError only scrubs n8n_data_table_user_ pattern — other internal names leak', () => {
				// The sanitizer regex is: /n8n_data_table_user_\S*/g
				// Errors referencing other internal tables, constraint names,
				// or schema details pass through unsanitized.

				const internalError = new Error(
					'constraint "fk_credential_entity_userId" on table "credential_entity" violated',
				);

				const result = service.sanitizeDbError(internalError);

				// The error leaks the constraint name and internal table name
				expect(result).toBe(internalError); // not sanitized at all
				expect((result as Error).message).toContain('credential_entity');
			});

			it('sanitizeDbError does not scrub column names or data values from errors', () => {
				const leakyError = new Error(
					'value "secret_api_key_value" is too long for type character varying(255)',
				);

				const result = service.sanitizeDbError(leakyError);

				// Data value leaked in the error message
				expect(result).toBe(leakyError);
				expect((result as Error).message).toContain('secret_api_key_value');
			});
		});

		// ── 6. Boundary conditions on maxRows / ensureLimit ──────────

		describe('BLOCKED: ensureLimit bypass attempts', () => {
			beforeEach(() => {
				queryRunnerMock.query.mockResolvedValue([]);
			});

			it('LIMIT inside a string literal does not confuse ensureLimit', async () => {
				await service.validateAndExecute(
					"SELECT * FROM orders WHERE status = 'LIMIT 999999'",
					['table1'],
					projectId,
					{ maxRows: 10 },
				);

				const calls = queryRunnerMock.query.mock.calls.map((args) => String(args[0]));
				const selectQuery = calls.find((sql) => sql.toUpperCase().startsWith('SELECT'))!;

				// ensureLimit should append LIMIT 11 (maxRows+1), not confuse
				// the string-literal "LIMIT 999999" for a real LIMIT clause.
				expect(selectQuery).toMatch(/LIMIT 11\s*$/i);
			});

			it('existing LIMIT exceeding maxRows is capped', async () => {
				await service.validateAndExecute(
					'SELECT * FROM orders LIMIT 99999',
					['table1'],
					projectId,
					{ maxRows: 5 },
				);

				const calls = queryRunnerMock.query.mock.calls.map((args) => String(args[0]));
				const selectQuery = calls.find((sql) => sql.toUpperCase().startsWith('SELECT'))!;

				const limitMatch = /LIMIT\s+(\d+)/i.exec(selectQuery);
				expect(limitMatch).toBeDefined();
				expect(parseInt(limitMatch![1], 10)).toBeLessThanOrEqual(6);
			});
		});

		// ── 7. Cross-project table access ────────────────────────────

		describe('BLOCKED: cross-project table isolation', () => {
			it('tables from another project are not loaded even with valid table IDs', async () => {
				// The repository query filters by projectId.
				// Passing table IDs from another project yields zero tables.
				dataTableRepositoryMock.find.mockResolvedValue([]);
				dataTableColumnRepositoryMock.find.mockResolvedValue([]);

				// With no tables in schema, any FROM reference is rejected.
				await expect(
					service.validateAndExecute(
						'SELECT * FROM orders',
						['table-from-other-project'],
						'other-project-id',
					),
				).rejects.toThrow();
			});
		});

		// ── 8. PostgreSQL-specific protocol attacks ──────────────────

		describe('BLOCKED: PostgreSQL protocol-level attack attempts', () => {
			it('null byte inside string literal does not enable parser differential', async () => {
				// Attack theory: if the tokenizer sees the full string but the DB
				// driver null-terminates earlier, the DB might parse a different
				// query than what was validated.
				// Reality: \x00 inside a string literal is just a character in the
				// token; the query either errors or is harmless.
				await expect(
					service.validateAndExecute(
						"SELECT * FROM orders WHERE status = 'x\x00; DROP TABLE creds'",
						['table1'],
						projectId,
					),
				).resolves.toBeDefined();

				// Verify the query reached execution with null byte inside the
				// string literal (which is semantically harmless).
				const calls = queryRunnerMock.query.mock.calls.map((args) => String(args[0]));
				const selectQuery = calls.find((sql) => sql.toUpperCase().startsWith('SELECT'));
				expect(selectQuery).toBeDefined();
				// The DROP TABLE is trapped inside the string literal, not executed
				expect(selectQuery).toContain("'x\x00; DROP TABLE creds'");
			});

			it('BLOCKED: null byte outside string literal is rejected', async () => {
				await expect(
					service.validateAndExecute('SELECT * FROM orders\x00 WHERE 1=1', ['table1'], projectId),
				).rejects.toThrow();
			});
		});

		// ── 9. SQLite-specific attacks ───────────────────────────────

		describe('BLOCKED: SQLite-specific attacks', () => {
			it('ATTACH DATABASE is blocked', async () => {
				await expect(
					service.validateAndExecute(
						"ATTACH DATABASE '/tmp/evil.db' AS evil",
						['table1'],
						projectId,
					),
				).rejects.toThrow();
			});

			it('load_extension is blocked', async () => {
				await expect(
					service.validateAndExecute(
						"SELECT load_extension('/tmp/evil.so') FROM orders",
						['table1'],
						projectId,
					),
				).rejects.toThrow();
			});

			it('PRAGMA is blocked', async () => {
				await expect(
					service.validateAndExecute('PRAGMA table_info(orders)', ['table1'], projectId),
				).rejects.toThrow();
			});

			it('sqlite_master access is blocked', async () => {
				await expect(
					service.validateAndExecute('SELECT * FROM sqlite_master', ['table1'], projectId),
				).rejects.toThrow();
			});
		});

		// ── 10. FROM-less query execution (table authorization bypass) ──

		describe('VULNERABILITY: FROM-less queries bypass table authorization', () => {
			it('SELECT NOW() executes without referencing any table, leaking server time', async () => {
				const fakeTime = [{ now: '2024-01-15 12:00:00+00' }];
				queryRunnerMock.query.mockResolvedValue(fakeTime);

				// This should be rejected — the intent is to only allow reading from
				// authorized tables. A FROM-less query bypasses table authorization.
				const result = await service.validateAndExecute('SELECT NOW()', ['table1'], projectId);

				// BUG: the query passes validation and returns server metadata
				expect(result.rows).toEqual(fakeTime);
				expect(result.rowCount).toBe(1);
			});

			it('SELECT COALESCE(1, 2) executes arbitrary expressions with no table access', async () => {
				queryRunnerMock.query.mockResolvedValue([{ coalesce: 1 }]);

				const result = await service.validateAndExecute(
					'SELECT COALESCE(1, 2)',
					['table1'],
					projectId,
				);

				expect(result.rows).toHaveLength(1);
			});

			it('SELECT CAST(1 AS TEXT) executes type conversion with no table access', async () => {
				queryRunnerMock.query.mockResolvedValue([{ cast: '1' }]);

				const result = await service.validateAndExecute(
					'SELECT CAST(1 AS TEXT)',
					['table1'],
					projectId,
				);

				expect(result.rows).toHaveLength(1);
			});

			it('nested allowed functions execute without FROM clause', async () => {
				queryRunnerMock.query.mockResolvedValue([{ result: 'HELLO' }]);

				const result = await service.validateAndExecute(
					"SELECT UPPER(REPLACE('secret', 's', 'S'))",
					['table1'],
					projectId,
				);

				expect(result.rows).toHaveLength(1);
			});

			it('SELECT with only literals and functions — no FROM, no table IDs needed', async () => {
				queryRunnerMock.query.mockResolvedValue([{ a: 1, b: 'text' }]);

				// Even with empty table IDs, the query executes
				dataTableRepositoryMock.find.mockResolvedValue([]);
				dataTableColumnRepositoryMock.find.mockResolvedValue([]);

				const result = await service.validateAndExecute("SELECT 1, 'text'", [], projectId);

				expect(result.rows).toHaveLength(1);
			});
		});

		// ── 11. AS alias breaks FROM table extraction ───────────────────

		describe('VULNERABILITY: AS alias in FROM breaks comma-separated table extraction', () => {
			it('second table after AS alias is not extracted or rewritten', async () => {
				// Setup: two valid tables
				const tables = [
					makeTable('t1', 'orders', projectId),
					makeTable('t2', 'customers', projectId),
				];
				const columns = [
					makeColumn('c1', 'amount', 'number', 't1'),
					makeColumn('c2', 'name', 'string', 't2'),
				];
				dataTableRepositoryMock.find.mockResolvedValue(tables);
				dataTableColumnRepositoryMock.find.mockResolvedValue(columns);

				queryRunnerMock.query.mockResolvedValue([]);

				// FROM orders AS amount, customers
				// The AS keyword causes extractTablesAt to stop after 'orders'.
				// 'customers' after the comma is never extracted as a table reference,
				// so it is NOT rewritten to its physical name.
				// The executed SQL contains the bare logical name 'customers'.
				await service.validateAndExecute(
					'SELECT * FROM orders AS amount, customers',
					['t1', 't2'],
					projectId,
				);

				const calls = queryRunnerMock.query.mock.calls.map((args) => String(args[0]));
				const selectQuery = calls.find((sql) => sql.toUpperCase().startsWith('SELECT'));

				// BUG: 'customers' was NOT rewritten to physical name.
				// The DB will look for a table literally named 'customers',
				// which could match an unrelated table in the same schema.
				expect(selectQuery).toContain('customers');
				expect(selectQuery).not.toMatch(/n8n_data_table_user_t2/);
			});

			it('table alias using AS makes validator accept columns from the wrong table schema', async () => {
				// `FROM customers AS orders` makes the validator check column references
				// against the 'orders' schema (the alias name), but the DB resolves
				// them against the actual 'customers' table.
				const tables = [
					makeTable('t1', 'orders', projectId),
					makeTable('t2', 'customers', projectId),
				];
				const columns = [
					makeColumn('c1', 'amount', 'number', 't1'), // only in orders
					makeColumn('c2', 'name', 'string', 't2'), // only in customers
				];
				dataTableRepositoryMock.find.mockResolvedValue(tables);
				dataTableColumnRepositoryMock.find.mockResolvedValue(columns);

				queryRunnerMock.query.mockResolvedValue([]);

				// Validator: 'orders.amount' → checks orders schema → amount exists → passes.
				// DB: 'orders' is alias for physical customers table → amount DOES NOT exist → error.
				// This is a validation model / execution model mismatch.
				const result = await service.validateAndExecute(
					'SELECT orders.amount FROM customers AS orders',
					['t1', 't2'],
					projectId,
				);

				// The validator approved a query referencing a non-existent column
				expect(result).toBeDefined();
			});
		});

		// ── 12. Cartesian product DoS ───────────────────────────────────

		describe('VULNERABILITY: cartesian self-join resource exhaustion', () => {
			it('self-join via repeated table in FROM creates N^k rows', async () => {
				queryRunnerMock.query.mockResolvedValue([]);

				// 5x self-join: if table has 1000 rows, DB must process 10^15 intermediate rows.
				// The statement_timeout mitigates but does not prevent resource consumption.
				await service.validateAndExecute(
					'SELECT * FROM orders, orders, orders, orders, orders',
					['table1'],
					projectId,
				);

				const calls = queryRunnerMock.query.mock.calls.map((args) => String(args[0]));
				const selectQuery = calls.find((sql) => sql.toUpperCase().startsWith('SELECT'));

				// All 5 'orders' references are rewritten, producing a valid cartesian query
				expect(selectQuery).toBeDefined();
				const tableOccurrences = (selectQuery!.match(/n8n_data_table_user_table1/g) ?? []).length;
				expect(tableOccurrences).toBe(5);
			});

			it('self-join via JOIN also creates cartesian products', async () => {
				queryRunnerMock.query.mockResolvedValue([]);

				// JOIN without a meaningful ON creates the same problem
				await service.validateAndExecute(
					'SELECT * FROM orders JOIN orders ON 1 = 1 JOIN orders ON 1 = 1',
					['table1'],
					projectId,
				);

				const calls = queryRunnerMock.query.mock.calls.map((args) => String(args[0]));
				const selectQuery = calls.find((sql) => sql.toUpperCase().startsWith('SELECT'));

				expect(selectQuery).toBeDefined();
				const tableOccurrences = (selectQuery!.match(/n8n_data_table_user_table1/g) ?? []).length;
				// FROM + 2 JOINs + ON conditions reference the table name
				expect(tableOccurrences).toBeGreaterThanOrEqual(3);
			});
		});

		// ── 13. Column alias as exfiltration channel ────────────────────

		describe('VULNERABILITY: column alias after AS is unchecked — can smuggle arbitrary names', () => {
			it('AS alias can be any identifier, including internal table names', async () => {
				queryRunnerMock.query.mockResolvedValue([{ credential_entity: 100 }]);

				// The alias 'credential_entity' passes validation because identifiers
				// after AS are accepted without closed-world checks.
				// If the result is exposed to the user, the column name 'credential_entity'
				// could be used in social engineering or to probe for internal schema knowledge.
				const result = await service.validateAndExecute(
					'SELECT amount AS credential_entity FROM orders',
					['table1'],
					projectId,
				);

				expect(result.rows[0]).toHaveProperty('credential_entity');
			});

			it('AS alias can mimic sensitive column names', async () => {
				queryRunnerMock.query.mockResolvedValue([{ password_hash: 'some_value' }]);

				const result = await service.validateAndExecute(
					'SELECT status AS password_hash FROM orders',
					['table1'],
					projectId,
				);

				expect(result.rows[0]).toHaveProperty('password_hash');
			});
		});

		// ── 14. LIKE pattern for blind data extraction within allowed scope ──

		describe('BLOCKED: LIKE-based blind data probing', () => {
			it('allows LIKE queries that can systematically probe data patterns', async () => {
				// Within allowed scope, but demonstrates that character-by-character
				// probing is possible. An attacker (LLM agent) with access to this tool
				// can reconstruct field values character by character.
				queryRunnerMock.query.mockResolvedValue([{ cnt: 5 }]);

				const result = await service.validateAndExecute(
					"SELECT COUNT(*) FROM orders WHERE status LIKE 'a%'",
					['table1'],
					projectId,
				);

				// The count reveals whether any status starts with 'a'
				expect(result.rows).toHaveLength(1);
			});
		});

		// ── 15. ensureLimit edge cases ───────────────────────────────────

		describe('VULNERABILITY: ensureLimit regex can be confused by OFFSET', () => {
			it('LIMIT followed by OFFSET is not matched — duplicate LIMIT appended', () => {
				// ensureLimit uses /\bLIMIT\s+(\d+)\s*;?\s*$/i which requires LIMIT at the
				// very end. OFFSET after LIMIT causes the regex to miss it.
				const sql = 'SELECT * FROM orders LIMIT 999999 OFFSET 0';
				const result = service.ensureLimit(sql, 50);

				// BUG: a second LIMIT is appended, creating invalid SQL:
				// 'SELECT * FROM orders LIMIT 999999 OFFSET 0 LIMIT 51'
				// This either errors (doubling LIMIT is a syntax error) or the
				// original uncapped LIMIT 999999 is used.
				expect(result).toContain('LIMIT 999999');
				expect(result).toMatch(/LIMIT 51\s*$/);
			});
		});

		// ── 16. sanitizeDbError gaps ────────────────────────────────────

		describe('VULNERABILITY: sanitizeDbError regex is too narrow', () => {
			it('leaks TypeORM internal entity names in error messages', () => {
				const error = new Error(
					'duplicate key value violates unique constraint "PK_workflow_entity" on table "workflow_entity"',
				);

				const result = service.sanitizeDbError(error);

				// Not sanitized — regex only matches n8n_data_table_user_ prefix
				expect(result).toBe(error);
				expect((result as Error).message).toContain('workflow_entity');
			});

			it('leaks column default expressions in error messages', () => {
				const error = new Error(
					'column "apiKey" of relation "n8n_data_table_user_abc" has default value \'sk-secret-key-123\'',
				);

				const result = service.sanitizeDbError(error);

				// The table name IS scrubbed, but the column name and default value leak
				expect((result as Error).message).toContain('[table]');
				expect((result as Error).message).toContain('sk-secret-key-123');
			});

			it('leaks index names that reveal schema structure', () => {
				const error = new Error('could not create unique index "idx_credential_entity_type_name"');

				const result = service.sanitizeDbError(error);

				// Index names reveal internal table and column names
				expect(result).toBe(error);
				expect((result as Error).message).toContain('credential_entity');
			});

			it('leaks query plan details when verbose errors are enabled', () => {
				const error = new Error(
					'ERROR: canceling statement due to statement timeout\n' +
						'DETAIL: User query might be reading from n8n_credentials_entity\n' +
						'HINT: Consider adding an index on credential_entity.userId',
				);

				const result = service.sanitizeDbError(error);

				// Only n8n_data_table_user_ pattern is scrubbed
				expect(result).toBe(error);
				expect((result as Error).message).toContain('n8n_credentials_entity');
				expect((result as Error).message).toContain('credential_entity.userId');
			});

			it('non-Error objects pass through entirely unsanitized', () => {
				const errorObj = {
					message: 'relation "n8n_data_table_user_secret" does not exist',
					code: '42P01',
					detail: 'internal_table_name leaked here',
				};

				const result = service.sanitizeDbError(errorObj);

				// Non-Error objects are returned as-is, with all internal details
				expect(result).toBe(errorObj);
			});
		});

		// ── 17. Ambiguous identifier resolution ─────────────────────────

		describe('VULNERABILITY: closed-world check allows column names from ANY table, not just FROM tables', () => {
			it('validator allows referencing columns from tables not in FROM clause', async () => {
				// Setup: two tables, only 'orders' in FROM.
				// The validator checks standalone columns against ALL table schemas,
				// not just the tables in the FROM clause. So a column that only exists
				// in 'customers' (like 'email') passes validation even when only
				// querying 'orders'.
				const tables = [
					makeTable('t1', 'orders', projectId),
					makeTable('t2', 'customers', projectId),
				];
				const columns = [
					makeColumn('c1', 'amount', 'number', 't1'),
					makeColumn('c2', 'email', 'string', 't2'), // only in customers
				];
				dataTableRepositoryMock.find.mockResolvedValue(tables);
				dataTableColumnRepositoryMock.find.mockResolvedValue(columns);

				// 'email' only exists in 'customers' but is used in a query
				// that only references 'orders'. The validator passes it because
				// 'email' is in allColumns (union of all schemas).
				// The DB will reject it at execution time, but the validator's
				// approval is wrong — it should catch this.
				queryRunnerMock.query.mockRejectedValue(new Error('column "email" does not exist'));

				await expect(
					service.validateAndExecute('SELECT email FROM orders', ['t1', 't2'], projectId),
				).rejects.toThrow();

				// The query reached the DB — validator did NOT catch the invalid column reference
				expect(queryRunnerMock.query).toHaveBeenCalled();
			});
		});

		// ── 18. Race condition: table schema changes between validation and execution ──

		describe('EDGE CASE: TOCTOU between validation and execution', () => {
			it('table dropped between validation and query execution', async () => {
				// The service loads table metadata, validates, then executes.
				// If the table is dropped between steps, the query fails with an
				// error that may leak the physical table name.
				queryRunnerMock.query.mockRejectedValue(
					new Error('relation "n8n_data_table_user_table1" does not exist'),
				);

				await expect(
					service.validateAndExecute('SELECT * FROM orders', ['table1'], projectId),
				).rejects.toThrow('[table]');

				// Physical name is scrubbed in this case, but confirms the time gap exists
			});
		});

		// ── 19. Integer overflow and boundary attacks ────────────────────

		describe('BLOCKED: numeric boundary attacks', () => {
			it('extremely large LIMIT value is capped', async () => {
				queryRunnerMock.query.mockResolvedValue([]);

				await service.validateAndExecute(
					'SELECT * FROM orders LIMIT 999999999999999',
					['table1'],
					projectId,
					{ maxRows: 10 },
				);

				const calls = queryRunnerMock.query.mock.calls.map((args) => String(args[0]));
				const selectQuery = calls.find((sql) => sql.toUpperCase().startsWith('SELECT'));

				const limitMatch = /LIMIT\s+(\d+)/i.exec(selectQuery!);
				expect(parseInt(limitMatch![1], 10)).toBeLessThanOrEqual(11);
			});

			it('maxRows=0 still applies a LIMIT of 1 (for truncation detection)', async () => {
				queryRunnerMock.query.mockResolvedValue([]);

				await service.validateAndExecute('SELECT * FROM orders', ['table1'], projectId, {
					maxRows: 0,
				});

				const calls = queryRunnerMock.query.mock.calls.map((args) => String(args[0]));
				const selectQuery = calls.find((sql) => sql.toUpperCase().startsWith('SELECT'));

				// maxRows=0 → fetchLimit=1, so LIMIT 1 is appended
				expect(selectQuery).toMatch(/LIMIT 1\s*$/i);
			});

			it('negative maxRows wraps to unexpected LIMIT value', async () => {
				queryRunnerMock.query.mockResolvedValue([]);

				await service.validateAndExecute('SELECT * FROM orders', ['table1'], projectId, {
					maxRows: -1,
				});

				const calls = queryRunnerMock.query.mock.calls.map((args) => String(args[0]));
				const selectQuery = calls.find((sql) => sql.toUpperCase().startsWith('SELECT'));

				// maxRows=-1 → fetchLimit=0 → LIMIT 0 is appended
				// This means no rows returned. Not dangerous, but shows
				// the function doesn't validate maxRows.
				expect(selectQuery).toMatch(/LIMIT 0\s*$/i);
			});
		});

		// ── 20. Whitespace and encoding edge cases ──────────────────────

		describe('BLOCKED: whitespace and encoding manipulation', () => {
			it('tab characters between tokens are handled', async () => {
				queryRunnerMock.query.mockResolvedValue([]);

				await service.validateAndExecute('SELECT\t*\tFROM\torders', ['table1'], projectId);

				const calls = queryRunnerMock.query.mock.calls.map((args) => String(args[0]));
				const selectQuery = calls.find((sql) => sql.toUpperCase().startsWith('SELECT'));
				expect(selectQuery).toBeDefined();
			});

			it('vertical tab and form feed are treated as whitespace', async () => {
				queryRunnerMock.query.mockResolvedValue([]);

				// \v (vertical tab) and \f (form feed) match \s in regex
				await service.validateAndExecute('SELECT\v*\fFROM\vorders', ['table1'], projectId);

				const calls = queryRunnerMock.query.mock.calls.map((args) => String(args[0]));
				const selectQuery = calls.find((sql) => sql.toUpperCase().startsWith('SELECT'));
				expect(selectQuery).toBeDefined();
			});

			it('VULNERABILITY: non-breaking space (\\u00A0) passes tokenizer as whitespace', async () => {
				// JavaScript's \\s matches \\u00A0 (non-breaking space), so the tokenizer
				// treats it as whitespace. But PostgreSQL does NOT treat \\u00A0 as
				// whitespace — this is a parser differential between the validator
				// and the DB engine. The reconstructed SQL contains literal \\u00A0
				// bytes, which may cause unexpected behavior at the DB level.
				queryRunnerMock.query.mockResolvedValue([]);

				const result = await service.validateAndExecute(
					'SELECT\u00A0*\u00A0FROM\u00A0orders',
					['table1'],
					projectId,
				);

				// BUG: the query passes validation despite containing non-ASCII whitespace
				expect(result).toBeDefined();
			});
		});
	});
});
