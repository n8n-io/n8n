/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataStoreRowsRepository } from '../data-store-rows.repository';
import { DataStoreRepository } from '../data-store.repository';
import { DataStoreService } from '../data-store.service';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['DataTable', 'DataTableColumn']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('DataStoreRowsRepository', () => {
	let dataStoreService: DataStoreService;
	let dataStoreRepository: DataStoreRepository;
	let dataStoreRowsRepository: DataStoreRowsRepository;

	beforeAll(() => {
		dataStoreService = Container.get(DataStoreService);
		dataStoreRepository = Container.get(DataStoreRepository);
		dataStoreRowsRepository = Container.get(DataStoreRowsRepository);
	});

	let project: Project;

	beforeEach(async () => {
		project = await createTeamProject();
	});

	afterEach(async () => {
		// Clean up any created user data stores
		await dataStoreService.deleteDataStoreAll();
	});

	describe('insertRows with partial data', () => {
		it('should handle missing columns by setting them to null', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
				name: 'partialDataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
				],
			});

			const columns = await dataStoreService.getColumns(dataStoreId, project.id);

			// ACT - Insert rows with partial data directly via repository
			const rows = [
				{ name: 'Alice' }, // missing age and active
				{ age: 30 }, // missing name and active
				{ active: true }, // missing name and age
			];

			const result = await dataStoreRowsRepository.insertRows(dataStoreId, rows, columns, false);

			// ASSERT
			expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);

			// Verify the data was inserted with null values for missing columns
			const { data } = await dataStoreRowsRepository.getManyAndCount(dataStoreId, {});
			expect(data).toEqual([
				expect.objectContaining({
					id: 1,
					name: 'Alice',
					age: null,
					active: null,
				}),
				expect.objectContaining({
					id: 2,
					name: null,
					age: 30,
					active: null,
				}),
				expect.objectContaining({
					id: 3,
					name: null,
					age: null,
					active: true,
				}),
			]);
		});

		it('should return full data when returnData is true with partial rows', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
				name: 'partialDataStore',
				columns: [
					{ name: 'title', type: 'string' },
					{ name: 'priority', type: 'number' },
					{ name: 'completed', type: 'boolean' },
					{ name: 'dueDate', type: 'date' },
				],
			});

			const columns = await dataStoreService.getColumns(dataStoreId, project.id);
			const testDate = new Date('2023-12-31');

			// ACT
			const rows = [
				{ title: 'Task 1', priority: 1 }, // missing completed and dueDate
				{ completed: false, dueDate: testDate }, // missing title and priority
			];

			const result = await dataStoreRowsRepository.insertRows(dataStoreId, rows, columns, true);

			// ASSERT
			expect(result).toEqual([
				expect.objectContaining({
					id: 1,
					title: 'Task 1',
					priority: 1,
					completed: null,
					dueDate: null,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				}),
				expect.objectContaining({
					id: 2,
					title: null,
					priority: null,
					completed: false,
					dueDate: testDate,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				}),
			]);
		});

		it('should handle empty rows (all columns missing)', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
				name: 'emptyRowStore',
				columns: [
					{ name: 'field1', type: 'string' },
					{ name: 'field2', type: 'number' },
				],
			});

			const columns = await dataStoreService.getColumns(dataStoreId, project.id);

			// ACT
			const rows = [{}]; // completely empty row
			const result = await dataStoreRowsRepository.insertRows(dataStoreId, rows, columns, true);

			// ASSERT
			expect(result).toEqual([
				expect.objectContaining({
					id: 1,
					field1: null,
					field2: null,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				}),
			]);
		});

		it('should work with mixed complete and partial rows', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
				name: 'mixedDataStore',
				columns: [
					{ name: 'username', type: 'string' },
					{ name: 'email', type: 'string' },
					{ name: 'score', type: 'number' },
				],
			});

			const columns = await dataStoreService.getColumns(dataStoreId, project.id);

			// ACT
			const rows = [
				{ username: 'user1', email: 'user1@example.com', score: 100 }, // complete
				{ username: 'user2' }, // partial
				{ email: 'user3@example.com', score: 85 }, // partial
			];

			const result = await dataStoreRowsRepository.insertRows(dataStoreId, rows, columns, false);

			// ASSERT
			expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);

			const { data } = await dataStoreRowsRepository.getManyAndCount(dataStoreId, {});
			expect(data).toEqual([
				expect.objectContaining({
					id: 1,
					username: 'user1',
					email: 'user1@example.com',
					score: 100,
				}),
				expect.objectContaining({
					id: 2,
					username: 'user2',
					email: null,
					score: null,
				}),
				expect.objectContaining({
					id: 3,
					username: null,
					email: 'user3@example.com',
					score: 85,
				}),
			]);
		});

		it('should handle all data types correctly with partial data', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project.id, {
				name: 'typeTestStore',
				columns: [
					{ name: 'textField', type: 'string' },
					{ name: 'numberField', type: 'number' },
					{ name: 'boolField', type: 'boolean' },
					{ name: 'dateField', type: 'date' },
				],
			});

			const columns = await dataStoreService.getColumns(dataStoreId, project.id);
			const testDate = new Date('2023-01-01');

			// ACT - Each row has only one field set
			const rows = [
				{ textField: 'test' },
				{ numberField: 42 },
				{ boolField: true },
				{ dateField: testDate },
			];

			const result = await dataStoreRowsRepository.insertRows(dataStoreId, rows, columns, true);

			// ASSERT
			expect(result).toHaveLength(4);
			expect(result[0]).toEqual(
				expect.objectContaining({
					id: 1,
					textField: 'test',
					numberField: null,
					boolField: null,
					dateField: null,
				}),
			);
			expect(result[1]).toEqual(
				expect.objectContaining({
					id: 2,
					textField: null,
					numberField: 42,
					boolField: null,
					dateField: null,
				}),
			);
			expect(result[2]).toEqual(
				expect.objectContaining({
					id: 3,
					textField: null,
					numberField: null,
					boolField: true,
					dateField: null,
				}),
			);
			expect(result[3]).toEqual(
				expect.objectContaining({
					id: 4,
					textField: null,
					numberField: null,
					boolField: null,
					dateField: testDate,
				}),
			);
		});
	});
});
