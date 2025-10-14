import { useDataTableStore } from '@/features/dataTable/dataTable.store';
import { faker } from '@faker-js/faker';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createPinia, setActivePinia } from 'pinia';
import * as dataTableApi from '@/features/dataTable/dataTable.api';
import { useProjectsStore } from '@/features/projects/projects.store';
import { useSettingsStore } from '@/stores/settings.store';
import type { DataTable } from '@/features/dataTable/dataTable.types';

vi.mock('@/features/projects/projects.store');
vi.mock('@/stores/settings.store');

function createTable(data: Partial<DataTable>) {
	return {
		id: faker.string.alphanumeric(10),
		name: faker.lorem.word(),
		columns: [],
		sizeBytes: 0,
		createdAt: '2021-01-01',
		updatedAt: '2021-01-01',
		projectId: 'project-1',
		projectName: 'Project',
		...data,
	};
}

describe('dataTable.store', () => {
	let dataTableStore: ReturnType<typeof useDataTableStore>;
	let rootStore: ReturnType<typeof useRootStore>;

	beforeEach(() => {
		setActivePinia(createPinia());

		vi.mocked(useSettingsStore).mockReturnValue({
			settings: {
				dataTables: {
					maxSize: 10485760, // 10MB in bytes
				},
			},
		} as ReturnType<typeof useSettingsStore>);

		vi.mocked(useProjectsStore).mockReturnValue({
			fetchProject: vi.fn(),
		} as unknown as ReturnType<typeof useProjectsStore>);

		rootStore = useRootStore();
		dataTableStore = useDataTableStore();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('fetchDataTables', () => {
		it('should fetch data tables with pagination', async () => {
			const mockResponse = {
				count: 50,
				data: [
					createTable({ id: 'dt-1', name: 'Table 1' }),
					createTable({ id: 'dt-2', name: 'Table 2' }),
				],
			};
			vi.spyOn(dataTableApi, 'fetchDataTablesApi').mockResolvedValue(mockResponse);

			await dataTableStore.fetchDataTables('project-1', 2, 10);

			expect(dataTableApi.fetchDataTablesApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'project-1',
				{ skip: 10, take: 10 },
			);
			expect(dataTableStore.dataTables).toEqual(mockResponse.data);
			expect(dataTableStore.totalCount).toBe(50);
		});
	});

	describe('createDataTable', () => {
		it('should create data table and update state', async () => {
			const mockTable = createTable({ id: 'dt-1', name: 'New Table' });
			vi.spyOn(dataTableApi, 'createDataTableApi').mockResolvedValue(mockTable);

			const result = await dataTableStore.createDataTable('New Table', 'p1');

			expect(dataTableApi.createDataTableApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'New Table',
				'p1',
			);
			expect(dataTableStore.dataTables[0]).toEqual(mockTable);
			expect(dataTableStore.totalCount).toBe(1);
			expect(result).toBe(mockTable);
		});

		it('should fetch and attach project if missing', async () => {
			const mockTable = createTable({ id: 'dt-1', name: 'Table' });
			const mockProject = {
				id: 'p1',
				name: 'Project 1',
				icon: null,
				type: 'team' as const,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				relations: [],
				scopes: [],
			};
			vi.spyOn(dataTableApi, 'createDataTableApi').mockResolvedValue(mockTable);

			const projectStore = useProjectsStore();
			vi.mocked(projectStore.fetchProject).mockResolvedValue(mockProject);

			await dataTableStore.createDataTable('Table', 'p1');

			expect(projectStore.fetchProject).toHaveBeenCalledWith('p1');
			expect(dataTableStore.dataTables[0].project).toEqual(mockProject);
		});
	});

	describe('deleteDataTable', () => {
		it('should delete data table and update state', async () => {
			dataTableStore.$patch({
				dataTables: [{ id: 'dt-1', name: 'Table 1', columns: [] }],
				totalCount: 1,
			});
			vi.spyOn(dataTableApi, 'deleteDataTableApi').mockResolvedValue(true);

			const result = await dataTableStore.deleteDataTable('dt-1', 'p1');

			expect(dataTableApi.deleteDataTableApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'dt-1',
				'p1',
			);
			expect(result).toBe(true);
			expect(dataTableStore.dataTables).toHaveLength(0);
			expect(dataTableStore.totalCount).toBe(0);
		});
	});

	describe('updateDataTable', () => {
		it('should update data table name', async () => {
			dataTableStore.$patch({
				dataTables: [createTable({ id: 'dt-1', name: 'Old Name' })],
			});
			const mockUpdated = createTable({ id: 'dt-1', name: 'New Name' });
			vi.spyOn(dataTableApi, 'updateDataTableApi').mockResolvedValue(mockUpdated);

			const result = await dataTableStore.updateDataTable('dt-1', 'New Name', 'p1');

			expect(dataTableApi.updateDataTableApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'dt-1',
				'New Name',
				'p1',
			);
			expect(result).toBe(mockUpdated);
			expect(dataTableStore.dataTables[0].name).toBe('New Name');
		});
	});

	describe('fetchDataTableDetails', () => {
		it('should fetch single data table by id', async () => {
			const mockTable = createTable({ id: 'dt-1', name: 'Table' });
			vi.spyOn(dataTableApi, 'fetchDataTablesApi').mockResolvedValue({
				count: 1,
				data: [mockTable],
			});

			const result = await dataTableStore.fetchDataTableDetails('dt-1', 'p1');

			expect(dataTableApi.fetchDataTablesApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'p1',
				undefined,
				{ projectId: 'p1', id: 'dt-1' },
			);
			expect(result).toBe(mockTable);
			expect(dataTableStore.dataTables).toEqual([mockTable]);
		});

		it('should return null if not found', async () => {
			vi.spyOn(dataTableApi, 'fetchDataTablesApi').mockResolvedValue({ count: 0, data: [] });

			const result = await dataTableStore.fetchDataTableDetails('dt-1', 'p1');

			expect(result).toBeNull();
		});
	});

	describe('fetchOrFindDataTable', () => {
		it('should return existing table from state', async () => {
			const mockTable = createTable({ id: 'dt-1', name: 'Table' });
			dataTableStore.$patch({ dataTables: [mockTable] });

			const result = await dataTableStore.fetchOrFindDataTable('dt-1', 'p1');

			expect(result).toEqual(mockTable);
		});

		it('should fetch table if not in state', async () => {
			const mockTable = createTable({ id: 'dt-1', name: 'Table' });
			vi.spyOn(dataTableApi, 'fetchDataTablesApi').mockResolvedValue({
				count: 1,
				data: [mockTable],
			});

			const result = await dataTableStore.fetchOrFindDataTable('dt-1', 'p1');

			expect(result).toEqual(mockTable);
		});
	});

	describe('addDataTableColumn', () => {
		it('should add column to data table', async () => {
			const mockColumn = { id: 'col-1', name: 'newCol', type: 'string' as const, index: 0 };
			dataTableStore.$patch({
				dataTables: [{ id: 'dt-1', name: 'Table', columns: [] }],
			});
			vi.spyOn(dataTableApi, 'addDataTableColumnApi').mockResolvedValue(mockColumn);

			const result = await dataTableStore.addDataTableColumn('dt-1', 'p1', {
				name: 'newCol',
				type: 'string',
			});

			expect(dataTableApi.addDataTableColumnApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'dt-1',
				'p1',
				{ name: 'newCol', type: 'string' },
			);
			expect(result).toBe(mockColumn);
			expect(dataTableStore.dataTables[0].columns).toEqual([mockColumn]);
		});
	});

	describe('deleteDataTableColumn', () => {
		it('should delete column from data table', async () => {
			const dataTableId = faker.string.alphanumeric(10);
			const columnId = 'phone';
			const projectId = 'p1';
			dataTableStore.$patch({
				dataTables: [
					{ id: dataTableId, columns: [{ id: columnId, index: 0, name: 'phone', type: 'string' }] },
				],
				totalCount: 1,
			});
			vi.spyOn(dataTableApi, 'deleteDataTableColumnApi').mockResolvedValue(true);

			const deleted = await dataTableStore.deleteDataTableColumn(dataTableId, projectId, columnId);

			expect(deleted).toBe(true);
			expect(dataTableApi.deleteDataTableColumnApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				dataTableId,
				projectId,
				columnId,
			);
			expect(dataTableStore.dataTables[0].columns.find((c) => c.id === columnId)).toBeUndefined();
		});
	});

	describe('moveDataTableColumn', () => {
		it('should move column to target index', async () => {
			const dataTableId = faker.string.alphanumeric(10);
			const columnId = 'phone';
			const targetIndex = 3;
			const projectId = 'p1';
			dataTableStore.$patch({
				dataTables: [
					{
						id: dataTableId,
						name: 'Test',
						sizeBytes: 0,
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z',
						projectId,
						columns: [
							{ id: 'name', index: 0, name: 'name', type: 'string' },
							{ id: columnId, index: 1, name: 'phone', type: 'string' },
							{ id: 'email', index: 2, name: 'email', type: 'string' },
							{ id: 'col4', index: 3, name: 'col4', type: 'string' },
							{ id: 'col5', index: 4, name: 'col5', type: 'string' },
						],
					},
				],
				totalCount: 1,
			});
			vi.spyOn(dataTableApi, 'moveDataTableColumnApi').mockResolvedValue(true);

			const moved = await dataTableStore.moveDataTableColumn(
				dataTableId,
				projectId,
				columnId,
				targetIndex,
			);

			expect(moved).toBe(true);
			expect(dataTableApi.moveDataTableColumnApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				dataTableId,
				projectId,
				columnId,
				targetIndex,
			);
			expect(dataTableStore.dataTables[0].columns.find((c) => c.id === columnId)?.index).toBe(
				targetIndex,
			);
		});
	});

	describe('fetchDataTableContent', () => {
		it('should fetch rows with pagination and filters', async () => {
			const mockResponse = { count: 100, data: [{ id: 1, name: 'Row 1' }] };
			vi.spyOn(dataTableApi, 'getDataTableRowsApi').mockResolvedValue(mockResponse);

			const result = await dataTableStore.fetchDataTableContent(
				'dt-1',
				'p1',
				3,
				20,
				'name',
				'{"type":"and","filters":[]}',
			);

			expect(dataTableApi.getDataTableRowsApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'dt-1',
				'p1',
				{
					skip: 40,
					take: 20,
					sortBy: 'name',
					filter: '{"type":"and","filters":[]}',
				},
			);
			expect(result).toBe(mockResponse);
		});
	});

	describe('insertEmptyRow', () => {
		it('should insert empty row', async () => {
			const mockRow = { id: 1 };
			vi.spyOn(dataTableApi, 'insertDataTableRowApi').mockResolvedValue([mockRow]);

			const result = await dataTableStore.insertEmptyRow('dt-1', 'p1');

			expect(dataTableApi.insertDataTableRowApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'dt-1',
				{},
				'p1',
			);
			expect(result).toBe(mockRow);
		});
	});

	describe('updateRow', () => {
		it('should update row data', async () => {
			vi.spyOn(dataTableApi, 'updateDataTableRowsApi').mockResolvedValue(true);

			const result = await dataTableStore.updateRow('dt-1', 'p1', 42, { name: 'Updated' });

			expect(dataTableApi.updateDataTableRowsApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'dt-1',
				42,
				{ name: 'Updated' },
				'p1',
			);
			expect(result).toBe(true);
		});
	});

	describe('deleteRows', () => {
		it('should delete multiple rows', async () => {
			const dataTableId = faker.string.alphanumeric(10);
			const projectId = 'p1';
			const rowIds = [1, 2, 3];

			vi.spyOn(dataTableApi, 'deleteDataTableRowsApi').mockResolvedValue(true);

			const result = await dataTableStore.deleteRows(dataTableId, projectId, rowIds);

			expect(result).toBe(true);
			expect(dataTableApi.deleteDataTableRowsApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				dataTableId,
				rowIds,
				projectId,
			);
		});
	});

	describe('fetchDataTableSize', () => {
		it('should fetch and format size data', async () => {
			const mockResult = {
				totalBytes: 5242880, // 5MB in bytes
				quotaStatus: 'ok' as const,
				dataTables: {
					'dt-1': createTable({ id: 'dt-1', name: 'Table 1', sizeBytes: 1048576 }), // 1MB
					'dt-2': createTable({ id: 'dt-2', name: 'Table 2', sizeBytes: 2097152 }), // 2MB
				},
			};
			vi.spyOn(dataTableApi, 'fetchDataTableGlobalLimitInBytes').mockResolvedValue(mockResult);

			const result = await dataTableStore.fetchDataTableSize();

			expect(dataTableApi.fetchDataTableGlobalLimitInBytes).toHaveBeenCalledWith(
				rootStore.restApiContext,
			);
			expect(dataTableStore.dataTableSize).toBe(5); // 5MB
			expect(dataTableStore.dataTableSizeLimitState).toBe('ok');
			expect(dataTableStore.dataTableSizes).toEqual({
				'dt-1': 1,
				'dt-2': 2,
			});
			expect(result).toBe(mockResult);
		});
	});

	describe('computed properties', () => {
		it('should compute maxSizeMB from settings', () => {
			expect(dataTableStore.maxSizeMB).toBe(10);
		});
	});
});
