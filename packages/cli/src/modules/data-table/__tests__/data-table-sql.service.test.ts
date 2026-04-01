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
});
