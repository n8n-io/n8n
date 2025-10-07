import {
	deleteDataTableRowsApi,
	fetchDataTablesApi,
	createDataTableApi,
	deleteDataTableApi,
	updateDataTableApi,
	addDataTableColumnApi,
	deleteDataTableColumnApi,
	moveDataTableColumnApi,
	getDataTableRowsApi,
	insertDataTableRowApi,
	updateDataTableRowsApi,
	fetchDataTableGlobalLimitInBytes,
} from '@/features/dataTable/dataTable.api';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { expect } from 'vitest';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

describe('dataTable.api', () => {
	const context = { baseUrl: '/rest', pushRef: 'test-push-ref' };
	const projectId = 'test-project-id';
	const dataTableId = 'test-dataTable-id';

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchDataTablesApi', () => {
		it('should fetch data tables for a project', async () => {
			const mockResponse = { count: 2, data: [] };
			vi.mocked(makeRestApiRequest).mockResolvedValue(mockResponse);

			const result = await fetchDataTablesApi(context, projectId, { skip: 0, take: 10 });

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'GET',
				`/projects/${projectId}/data-tables`,
				{ skip: 0, take: 10, filter: undefined },
			);
			expect(result).toBe(mockResponse);
		});

		it('should fetch global data tables when projectId is empty', async () => {
			const mockResponse = { count: 1, data: [] };
			vi.mocked(makeRestApiRequest).mockResolvedValue(mockResponse);

			await fetchDataTablesApi(context, '');

			expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/data-tables-global', {
				filter: undefined,
			});
		});

		it('should pass filter parameters', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue({ count: 0, data: [] });

			await fetchDataTablesApi(
				context,
				projectId,
				{},
				{ id: 'test-id', name: 'test-name', projectId: 'test-project' },
			);

			expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', expect.anything(), {
				filter: { id: 'test-id', name: 'test-name', projectId: 'test-project' },
			});
		});
	});

	describe('createDataTableApi', () => {
		it('should create data table with columns', async () => {
			const mockDataTable = { id: 'dt-1', name: 'Test Table' };
			const columns = [{ name: 'col1', type: 'string' as const }];
			vi.mocked(makeRestApiRequest).mockResolvedValue(mockDataTable);

			const result = await createDataTableApi(context, 'Test Table', projectId, columns);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'POST',
				`/projects/${projectId}/data-tables`,
				{ name: 'Test Table', columns },
			);
			expect(result).toBe(mockDataTable);
		});

		it('should create data table without columns', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue({ id: 'dt-1' });

			await createDataTableApi(context, 'Test', projectId);

			expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'POST', expect.anything(), {
				name: 'Test',
				columns: [],
			});
		});
	});

	describe('deleteDataTableApi', () => {
		it('should delete data table', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue(true);

			const result = await deleteDataTableApi(context, dataTableId, projectId);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'DELETE',
				`/projects/${projectId}/data-tables/${dataTableId}`,
				{ dataTableId, projectId },
			);
			expect(result).toBe(true);
		});
	});

	describe('updateDataTableApi', () => {
		it('should update data table name', async () => {
			const mockDataTable = { id: dataTableId, name: 'Updated Name' };
			vi.mocked(makeRestApiRequest).mockResolvedValue(mockDataTable);

			const result = await updateDataTableApi(context, dataTableId, 'Updated Name', projectId);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'PATCH',
				`/projects/${projectId}/data-tables/${dataTableId}`,
				{ name: 'Updated Name' },
			);
			expect(result).toBe(mockDataTable);
		});
	});

	describe('addDataTableColumnApi', () => {
		it('should add column to data table', async () => {
			const column = { name: 'newCol', type: 'number' as const };
			const mockColumn = { id: 'col-1', ...column };
			vi.mocked(makeRestApiRequest).mockResolvedValue(mockColumn);

			const result = await addDataTableColumnApi(context, dataTableId, projectId, column);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'POST',
				`/projects/${projectId}/data-tables/${dataTableId}/columns`,
				column,
			);
			expect(result).toBe(mockColumn);
		});
	});

	describe('deleteDataTableColumnApi', () => {
		it('should delete column from data table', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue(true);

			const result = await deleteDataTableColumnApi(context, dataTableId, projectId, 'col-1');

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'DELETE',
				`/projects/${projectId}/data-tables/${dataTableId}/columns/col-1`,
			);
			expect(result).toBe(true);
		});
	});

	describe('moveDataTableColumnApi', () => {
		it('should move column to target index', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue(true);

			const result = await moveDataTableColumnApi(context, dataTableId, projectId, 'col-1', 3);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'PATCH',
				`/projects/${projectId}/data-tables/${dataTableId}/columns/col-1/move`,
				{ targetIndex: 3 },
			);
			expect(result).toBe(true);
		});
	});

	describe('getDataTableRowsApi', () => {
		it('should fetch rows with pagination and sorting', async () => {
			const mockResponse = { count: 100, data: [] };
			vi.mocked(makeRestApiRequest).mockResolvedValue(mockResponse);

			const result = await getDataTableRowsApi(context, dataTableId, projectId, {
				skip: 10,
				take: 20,
				sortBy: 'name',
				filter: '{"type":"and","filters":[]}',
			});

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'GET',
				`/projects/${projectId}/data-tables/${dataTableId}/rows`,
				{ skip: 10, take: 20, sortBy: 'name', filter: '{"type":"and","filters":[]}' },
			);
			expect(result).toBe(mockResponse);
		});

		it('should fetch rows without options', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue({ count: 0, data: [] });

			await getDataTableRowsApi(context, dataTableId, projectId);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'GET',
				`/projects/${projectId}/data-tables/${dataTableId}/rows`,
				{},
			);
		});
	});

	describe('insertDataTableRowApi', () => {
		it('should insert row into data table', async () => {
			const row = { id: 1, name: 'Test' };
			const mockResponse = [row];
			vi.mocked(makeRestApiRequest).mockResolvedValue(mockResponse);

			const result = await insertDataTableRowApi(context, dataTableId, row, projectId);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'POST',
				`/projects/${projectId}/data-tables/${dataTableId}/insert`,
				{ returnType: 'all', data: [row] },
			);
			expect(result).toBe(mockResponse);
		});
	});

	describe('updateDataTableRowsApi', () => {
		it('should update row in data table', async () => {
			const rowData = { name: 'Updated' };
			vi.mocked(makeRestApiRequest).mockResolvedValue(true);

			const result = await updateDataTableRowsApi(context, dataTableId, 42, rowData, projectId);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'PATCH',
				`/projects/${projectId}/data-tables/${dataTableId}/rows`,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'id', condition: 'eq', value: 42 }],
					},
					data: rowData,
				},
			);
			expect(result).toBe(true);
		});
	});

	describe('deleteDataTableRowsApi', () => {
		it('should delete multiple rows with OR filter', async () => {
			const rowIds = [1, 2, 3];
			vi.mocked(makeRestApiRequest).mockResolvedValue(true);

			const result = await deleteDataTableRowsApi(context, dataTableId, rowIds, projectId);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'DELETE',
				`/projects/${projectId}/data-tables/${dataTableId}/rows`,
				{
					filter: {
						type: 'or',
						filters: [
							{ columnName: 'id', condition: 'eq', value: 1 },
							{ columnName: 'id', condition: 'eq', value: 2 },
							{ columnName: 'id', condition: 'eq', value: 3 },
						],
					},
				},
			);
			expect(result).toBe(true);
		});
	});

	describe('fetchDataTableGlobalLimitInBytes', () => {
		it('should fetch global data table limits', async () => {
			const mockLimits = { sizeInBytes: 1000000, maxSizeInBytes: 10000000 };
			vi.mocked(makeRestApiRequest).mockResolvedValue(mockLimits);

			const result = await fetchDataTableGlobalLimitInBytes(context);

			expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/data-tables-global/limits');
			expect(result).toBe(mockLimits);
		});
	});
});
