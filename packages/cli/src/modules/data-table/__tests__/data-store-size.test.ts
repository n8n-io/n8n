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
				.mockResolvedValue({ totalBytes: maxSize + 1, tables: {} });

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
				.mockResolvedValue({ totalBytes: maxSize + 1, tables: {} });

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
				.mockResolvedValue({ totalBytes: maxSize + 1, tables: {} });

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
});
