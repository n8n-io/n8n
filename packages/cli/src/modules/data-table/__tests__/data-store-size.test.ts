import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataStoreSizeValidator } from '../data-store-size-validator.service';
import { DataStoreRepository } from '../data-store.repository';
import { DataStoreService } from '../data-store.service';
import { DataStoreValidationError } from '../errors/data-store-validation.error';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
	await testDb.init();
});

beforeEach(async () => {
	const dataStoreService = Container.get(DataStoreService);
	await dataStoreService.deleteDataStoreAll();
	await testDb.truncate(['DataTable', 'DataTableColumn']);

	const dataStoreSizeValidator = Container.get(DataStoreSizeValidator);
	dataStoreSizeValidator.reset();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Data Store Size Tests', () => {
	let dataStoreService: DataStoreService;
	let dataStoreRepository: DataStoreRepository;

	beforeAll(() => {
		dataStoreService = Container.get(DataStoreService);
		dataStoreRepository = Container.get(DataStoreRepository);
	});

	let project1: Project;

	beforeEach(async () => {
		project1 = await createTeamProject();
	});

	describe('size validation', () => {
		it('should prevent insertRows when size limit exceeded', async () => {
			// ARRANGE
			const dataStoreSizeValidator = Container.get(DataStoreSizeValidator);
			dataStoreSizeValidator.reset();

			const maxSize = Container.get(GlobalConfig).dataTable.maxSize;

			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'data', type: 'string' }],
			});

			const mockFindDataTablesSize = jest
				.spyOn(dataStoreRepository, 'findDataTablesSize')
				.mockResolvedValue({ totalBytes: maxSize + 1, dataTables: {} });

			// ACT & ASSERT
			await expect(
				dataStoreService.insertRows(dataStoreId, project1.id, [{ data: 'test' }]),
			).rejects.toThrow(DataStoreValidationError);

			expect(mockFindDataTablesSize).toHaveBeenCalled();
			mockFindDataTablesSize.mockRestore();
		});

		it('should prevent updateRow when size limit exceeded', async () => {
			// ARRANGE
			const dataStoreSizeValidator = Container.get(DataStoreSizeValidator);
			dataStoreSizeValidator.reset();

			const maxSize = Container.get(GlobalConfig).dataTable.maxSize;

			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'data', type: 'string' }],
			});

			// Now mock the size check to be over limit
			const mockFindDataTablesSize = jest
				.spyOn(dataStoreRepository, 'findDataTablesSize')
				.mockResolvedValue({ totalBytes: maxSize + 1, dataTables: {} });

			// ACT & ASSERT
			await expect(
				dataStoreService.updateRow(dataStoreId, project1.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'id', condition: 'eq', value: 1 }],
					},
					data: { data: 'updated' },
				}),
			).rejects.toThrow(DataStoreValidationError);

			expect(mockFindDataTablesSize).toHaveBeenCalled();
			mockFindDataTablesSize.mockRestore();
		});

		it('should prevent upsertRow when size limit exceeded (insert case)', async () => {
			// ARRANGE

			const maxSize = Container.get(GlobalConfig).dataTable.maxSize;

			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'data', type: 'string' }],
			});

			const mockFindDataTablesSize = jest
				.spyOn(dataStoreRepository, 'findDataTablesSize')
				.mockResolvedValue({ totalBytes: maxSize + 1, dataTables: {} });

			// ACT & ASSERT
			await expect(
				dataStoreService.upsertRow(dataStoreId, project1.id, {
					filter: {
						type: 'and',
						filters: [{ columnName: 'data', condition: 'eq', value: 'nonexistent' }],
					},
					data: { data: 'new' },
				}),
			).rejects.toThrow(DataStoreValidationError);

			expect(mockFindDataTablesSize).toHaveBeenCalled();
			mockFindDataTablesSize.mockRestore();
		});
	});

	describe('findDataTablesSize', () => {
		it('should return size information for data tables', async () => {
			// ARRANGE
			const dataStore1 = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore1',
				columns: [{ name: 'data', type: 'string' }],
			});

			const dataStore2 = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore2',
				columns: [{ name: 'data', type: 'string' }],
			});

			const data = new Array(1000).fill(0).map((_, i) => ({ data: `test_data_${i}` }));

			await dataStoreService.insertRows(dataStore1.id, project1.id, data);

			await dataStoreService.insertRows(dataStore2.id, project1.id, [{ data: 'test' }]);

			// ACT
			const result = await dataStoreRepository.findDataTablesSize();

			// ASSERT
			expect(result).toBeDefined();
			expect(result.totalBytes).toBeGreaterThan(0);
			expect(result.dataTables).toBeDefined();
			expect(Object.keys(result.dataTables)).toHaveLength(2);

			expect(result.dataTables[dataStore1.id]).toBeGreaterThan(0);
			expect(result.dataTables[dataStore2.id]).toBeGreaterThan(0);

			expect(result.dataTables[dataStore1.id]).toBeGreaterThan(result.dataTables[dataStore2.id]);

			// Total should be sum of individual tables
			const expectedTotal = result.dataTables[dataStore1.id] + result.dataTables[dataStore2.id];
			expect(result.totalBytes).toBe(expectedTotal);
		});

		it('should return empty result when no data tables exist', async () => {
			// ACT
			const result = await dataStoreRepository.findDataTablesSize();

			// ASSERT
			expect(result).toBeDefined();
			expect(result.totalBytes).toBe(0);
			expect(result.dataTables).toBeDefined();
			expect(Object.keys(result.dataTables)).toHaveLength(0);
		});

		it('should handle data tables with no rows', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'emptyDataStore',
				columns: [{ name: 'data', type: 'string' }],
			});

			// ACT
			const result = await dataStoreRepository.findDataTablesSize();

			// ASSERT
			expect(result).toBeDefined();
			expect(result.totalBytes).toBeGreaterThanOrEqual(0);
			expect(result.dataTables).toBeDefined();
			expect(result.dataTables[dataStore.id]).toBeGreaterThanOrEqual(0);
		});
	});
});
