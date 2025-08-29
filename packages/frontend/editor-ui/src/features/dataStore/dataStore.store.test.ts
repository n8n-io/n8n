import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { faker } from '@faker-js/faker';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createPinia, setActivePinia } from 'pinia';
import * as dataStoreApi from '@/features/dataStore/dataStore.api';

describe('dataStore.store', () => {
	let dataStoreStore: ReturnType<typeof useDataStoreStore>;
	let rootStore: ReturnType<typeof useRootStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		rootStore = useRootStore();
		dataStoreStore = useDataStoreStore();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('can move a column', async () => {
		const datastoreId = faker.string.alphanumeric(10);
		const columnId = 'phone';
		const targetIndex = 3;
		const projectId = 'p1';
		dataStoreStore.$patch({
			dataStores: [
				{
					id: datastoreId,
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
		vi.spyOn(dataStoreApi, 'moveDataStoreColumnApi').mockResolvedValue(true);

		const moved = await dataStoreStore.moveDataStoreColumn(
			datastoreId,
			projectId,
			columnId,
			targetIndex,
		);

		expect(moved).toBe(true);
		expect(dataStoreApi.moveDataStoreColumnApi).toHaveBeenCalledWith(
			rootStore.restApiContext,
			datastoreId,
			projectId,
			columnId,
			targetIndex,
		);
		expect(dataStoreStore.dataStores[0].columns.find((c) => c.id === columnId)?.index).toBe(
			targetIndex,
		);
	});

	it('can delete a column', async () => {
		const datastoreId = faker.string.alphanumeric(10);
		const columnId = 'phone';
		const projectId = 'p1';
		dataStoreStore.$patch({
			dataStores: [
				{ id: datastoreId, columns: [{ id: columnId, index: 0, name: 'phone', type: 'string' }] },
			],
			totalCount: 1,
		});
		vi.spyOn(dataStoreApi, 'deleteDataStoreColumnApi').mockResolvedValue(true);

		const deleted = await dataStoreStore.deleteDataStoreColumn(datastoreId, projectId, columnId);

		expect(deleted).toBe(true);
		expect(dataStoreApi.deleteDataStoreColumnApi).toHaveBeenCalledWith(
			rootStore.restApiContext,
			datastoreId,
			projectId,
			columnId,
		);
		expect(dataStoreStore.dataStores[0].columns.find((c) => c.id === columnId)).toBeUndefined();
	});

	it('can delete rows', async () => {
		const datastoreId = faker.string.alphanumeric(10);
		const projectId = 'p1';
		const rowIds = [1, 2, 3];

		vi.spyOn(dataStoreApi, 'deleteDataStoreRowsApi').mockResolvedValue(true);

		const result = await dataStoreStore.deleteRows(datastoreId, projectId, rowIds);

		expect(result).toBe(true);
		expect(dataStoreApi.deleteDataStoreRowsApi).toHaveBeenCalledWith(
			rootStore.restApiContext,
			datastoreId,
			rowIds,
			projectId,
		);
	});
});
