import { useDataTableStore } from '@/features/dataTable/dataTable.store';
import { faker } from '@faker-js/faker';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createPinia, setActivePinia } from 'pinia';
import * as dataTableApi from '@/features/dataTable/dataTable.api';

describe('dataTable.store', () => {
	let dataTableStore: ReturnType<typeof useDataTableStore>;
	let rootStore: ReturnType<typeof useRootStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		rootStore = useRootStore();
		dataTableStore = useDataTableStore();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('can move a column', async () => {
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

	it('can delete a column', async () => {
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

	it('can delete rows', async () => {
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
