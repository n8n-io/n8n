import { createTeamProject, linkUserToProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createUser } from '@test-integration/db/users';

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

	describe('getDataTablesSize', () => {
		let owner: User;
		let regularUser: User;
		let project2: Project;

		beforeEach(async () => {
			project2 = await createTeamProject();

			owner = await createUser({ role: GLOBAL_OWNER_ROLE });
			await linkUserToProject(owner, project1, 'project:admin');
			await linkUserToProject(owner, project2, 'project:admin');

			regularUser = await createUser({
				role: GLOBAL_MEMBER_ROLE,
			});
		});

		it('should return all data tables for admin user', async () => {
			// ARRANGE
			const dataStore1 = await dataStoreService.createDataStore(project1.id, {
				name: 'project1-dataStore',
				columns: [{ name: 'data', type: 'string' }],
			});

			const dataStore2 = await dataStoreService.createDataStore(project2.id, {
				name: 'project2-dataStore',
				columns: [{ name: 'data', type: 'string' }],
			});

			const data = new Array(1000).fill(0).map((_, i) => ({ data: `test_data_${i}` }));

			await dataStoreService.insertRows(dataStore1.id, project1.id, data);

			await dataStoreService.insertRows(dataStore2.id, project2.id, [{ data: 'test' }]);

			// ACT
			const result = await dataStoreService.getDataTablesSize(owner);

			// ASSERT
			expect(result).toBeDefined();
			expect(result.totalBytes).toBeGreaterThan(0);
			expect(result.quotaStatus).toBe('ok');
			expect(result.dataTables).toBeDefined();

			expect(Object.keys(result.dataTables)).toHaveLength(2);
			expect(result.dataTables[dataStore1.id]).toBeDefined();
			expect(result.dataTables[dataStore2.id]).toBeDefined();

			// Check info
			expect(result.dataTables[dataStore1.id].name).toBe('project1-dataStore');
			expect(result.dataTables[dataStore1.id].projectId).toBe(project1.id);
			expect(result.dataTables[dataStore2.id].name).toBe('project2-dataStore');
			expect(result.dataTables[dataStore2.id].projectId).toBe(project2.id);

			expect(result.dataTables[dataStore1.id].sizeBytes).toBeGreaterThan(0);
			expect(result.dataTables[dataStore2.id].sizeBytes).toBeGreaterThan(0);
			expect(result.dataTables[dataStore1.id].sizeBytes).toBeGreaterThan(
				result.dataTables[dataStore2.id].sizeBytes,
			);

			// Total should be sum of individual tables
			const expectedTotal =
				result.dataTables[dataStore1.id].sizeBytes + result.dataTables[dataStore2.id].sizeBytes;
			expect(result.totalBytes).toBe(expectedTotal);
		});

		it('should return only accessible project data tables for regular user', async () => {
			// ARRANGE
			await linkUserToProject(regularUser, project1, 'project:viewer');

			const dataStore1 = await dataStoreService.createDataStore(project1.id, {
				name: 'accessible-dataStore',
				columns: [{ name: 'data', type: 'string' }],
			});

			const dataStore2 = await dataStoreService.createDataStore(project2.id, {
				name: 'inaccessible-dataStore',
				columns: [{ name: 'data', type: 'string' }],
			});

			await dataStoreService.insertRows(dataStore1.id, project1.id, [{ data: 'accessible' }]);
			await dataStoreService.insertRows(dataStore2.id, project2.id, [{ data: 'inaccessible' }]);

			// ACT
			const result = await dataStoreService.getDataTablesSize(regularUser);

			// ASSERT
			expect(result).toBeDefined();
			expect(result.totalBytes).toBeGreaterThan(0);
			expect(result.quotaStatus).toBe('ok');
			expect(result.dataTables).toBeDefined();

			expect(Object.keys(result.dataTables)).toHaveLength(1);
			expect(result.dataTables[dataStore1.id]).toBeDefined();
			expect(result.dataTables[dataStore2.id]).toBeUndefined(); // No access

			expect(result.dataTables[dataStore1.id].name).toBe('accessible-dataStore');
			expect(result.dataTables[dataStore1.id].projectId).toBe(project1.id);
		});

		it('should return empty dataTables but full totalBytes when user has no project access', async () => {
			// ARRANGE
			const dataStore1 = await dataStoreService.createDataStore(project1.id, {
				name: 'inaccessible-dataStore1',
				columns: [{ name: 'data', type: 'string' }],
			});

			const dataStore2 = await dataStoreService.createDataStore(project2.id, {
				name: 'inaccessible-dataStore2',
				columns: [{ name: 'data', type: 'string' }],
			});

			// Add data to both
			await dataStoreService.insertRows(dataStore1.id, project1.id, [{ data: 'test1' }]);
			await dataStoreService.insertRows(dataStore2.id, project2.id, [{ data: 'test2' }]);

			// ACT
			const result = await dataStoreService.getDataTablesSize(regularUser);

			// ASSERT
			expect(result).toBeDefined();
			expect(result.totalBytes).toBeGreaterThan(0); // Instance-wide size
			expect(result.quotaStatus).toBe('ok');
			expect(result.dataTables).toBeDefined();
			expect(Object.keys(result.dataTables)).toHaveLength(0); // No accessible tables
		});

		it('should return empty result when no data tables exist', async () => {
			// ACT
			const result = await dataStoreService.getDataTablesSize(owner);

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
			const result = await dataStoreService.getDataTablesSize(owner);

			// ASSERT
			expect(result).toBeDefined();
			expect(result.totalBytes).toBeGreaterThanOrEqual(0);
			expect(result.dataTables).toBeDefined();
			expect(result.dataTables[dataStore.id]).toBeDefined();
			expect(result.dataTables[dataStore.id].sizeBytes).toBeGreaterThanOrEqual(0);
			expect(result.dataTables[dataStore.id].name).toBe('emptyDataStore');
		});
	});

	describe('caching behavior', () => {
		let owner: User;
		let regularUser: User;

		beforeEach(async () => {
			owner = await createUser({ role: GLOBAL_OWNER_ROLE });
			await linkUserToProject(owner, project1, 'project:admin');

			// user with no access to project1
			regularUser = await createUser({ role: GLOBAL_MEMBER_ROLE });
		});

		it('should cache data globally and filter based on user permissions', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'test-dataStore',
				columns: [{ name: 'data', type: 'string' }],
			});

			await dataStoreService.insertRows(dataStore.id, project1.id, [{ data: 'test' }]);

			const mockFindDataTablesSize = jest.spyOn(dataStoreRepository, 'findDataTablesSize');

			// ACT & ASSERT
			// First call - regular user sees no data tables (filtered from global cache)
			const userResult = await dataStoreService.getDataTablesSize(regularUser);
			expect(Object.keys(userResult.dataTables)).toHaveLength(0);
			expect(userResult.totalBytes).toBeGreaterThan(0);

			// Second call - owner sees the data table (same global cache, different filtering)
			const ownerResult = await dataStoreService.getDataTablesSize(owner);
			expect(Object.keys(ownerResult.dataTables)).toHaveLength(1);
			expect(ownerResult.dataTables[dataStore.id]).toBeDefined();

			// Should have called the repository only once (global cache shared)
			expect(mockFindDataTablesSize).toHaveBeenCalledTimes(1);

			// Cleanup
			mockFindDataTablesSize.mockRestore();
		});

		it('should use global cache for both data fetching and size validation', async () => {
			// ARRANGE
			const dataStoreSizeValidator = Container.get(DataStoreSizeValidator);
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'test-dataStore',
				columns: [{ name: 'data', type: 'string' }],
			});

			await dataStoreService.insertRows(dataStore.id, project1.id, [{ data: 'test' }]);

			const mockGetCachedSizeData = jest.spyOn(dataStoreSizeValidator, 'getCachedSizeData');
			const mockFindDataTablesSize = jest.spyOn(dataStoreRepository, 'findDataTablesSize');

			// ACT
			// Fetch data (uses global cache)
			await dataStoreService.getDataTablesSize(owner);

			// Insert more data (triggers size validation which should use same cache)
			await dataStoreService.insertRows(dataStore.id, project1.id, [{ data: 'test2' }]);

			// ASSERT
			// Should have called getCachedSizeData twice:
			// 1. Once for getDataTablesSize
			// 2. Once for size validation during insertRows
			expect(mockGetCachedSizeData).toHaveBeenCalledTimes(2);

			// Repository should be called only once - both operations use the same global cache
			expect(mockFindDataTablesSize).toHaveBeenCalledTimes(1);

			// Cleanup
			mockGetCachedSizeData.mockRestore();
			mockFindDataTablesSize.mockRestore();
		});

		it('should invalidate cache on data modifications', async () => {
			// ARRANGE
			const dataStoreSizeValidator = Container.get(DataStoreSizeValidator);
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'test-dataStore',
				columns: [{ name: 'data', type: 'string' }],
			});

			const mockReset = jest.spyOn(dataStoreSizeValidator, 'reset');
			const mockFindDataTablesSize = jest.spyOn(dataStoreRepository, 'findDataTablesSize');

			// ACT & ASSERT
			const result1 = await dataStoreService.getDataTablesSize(owner);
			expect(result1.totalBytes).toBeGreaterThanOrEqual(0);
			expect(mockFindDataTablesSize).toHaveBeenCalledTimes(1);

			// Inserting new data should reset cache
			await dataStoreService.insertRows(dataStore.id, project1.id, [{ data: 'test' }]);
			expect(mockReset).toHaveBeenCalledTimes(1);

			// Fetch data again (should call repository again due to cache reset)
			await dataStoreService.getDataTablesSize(owner);
			expect(mockFindDataTablesSize).toHaveBeenCalledTimes(2);

			// Update data (should reset cache again)
			await dataStoreService.updateRow(dataStore.id, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'data', condition: 'eq', value: 'test' }],
				},
				data: { data: 'updated' },
			});
			expect(mockReset).toHaveBeenCalledTimes(2);

			// Upsert data (should reset cache again)
			await dataStoreService.upsertRow(dataStore.id, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'data', condition: 'eq', value: 'nonexistent' }],
				},
				data: { data: 'inserted' },
			});
			expect(mockReset).toHaveBeenCalledTimes(3);

			// Delete data (should reset cache again)
			await dataStoreService.deleteRows(dataStore.id, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'data', condition: 'eq', value: 'updated' }],
				},
			});
			expect(mockReset).toHaveBeenCalledTimes(4);

			// Cleanup
			mockReset.mockRestore();
			mockFindDataTablesSize.mockRestore();
		});
	});
});
