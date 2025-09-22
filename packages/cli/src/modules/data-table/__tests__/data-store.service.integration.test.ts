/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { AddDataStoreColumnDto, CreateDataStoreColumnDto } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DataStoreRow } from 'n8n-workflow';

import { DataStoreRowsRepository } from '../data-store-rows.repository';
import { DataStoreRepository } from '../data-store.repository';
import { DataStoreService } from '../data-store.service';
import { mockDataStoreSizeValidator } from './test-helpers';
import { DataStoreColumnNameConflictError } from '../errors/data-store-column-name-conflict.error';
import { DataStoreColumnNotFoundError } from '../errors/data-store-column-not-found.error';
import { DataStoreNameConflictError } from '../errors/data-store-name-conflict.error';
import { DataStoreNotFoundError } from '../errors/data-store-not-found.error';
import { DataStoreValidationError } from '../errors/data-store-validation.error';
import { toTableName } from '../utils/sql-utils';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
	await testDb.init();
	mockDataStoreSizeValidator();
});

beforeEach(async () => {
	await testDb.truncate(['DataTable', 'DataTableColumn']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('dataStore', () => {
	let dataStoreService: DataStoreService;
	let dataStoreRepository: DataStoreRepository;
	let dataStoreRowsRepository: DataStoreRowsRepository;

	beforeAll(() => {
		dataStoreService = Container.get(DataStoreService);
		dataStoreRepository = Container.get(DataStoreRepository);
		dataStoreRowsRepository = Container.get(DataStoreRowsRepository);
	});

	let project1: Project;
	let project2: Project;

	beforeEach(async () => {
		project1 = await createTeamProject();
		project2 = await createTeamProject();
	});

	afterEach(async () => {
		await dataStoreService.deleteDataStoreAll();
	});

	describe('createDataStore', () => {
		it('should create a columns table and a user table if columns are provided', async () => {
			const { id: dataTableId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStoreWithColumns',
				columns: [{ name: 'foo', type: 'string' }],
			});

			await expect(dataStoreService.getColumns(dataTableId, project1.id)).resolves.toEqual([
				{
					name: 'foo',
					type: 'string',
					index: 0,
					dataTableId,
					id: expect.any(String),
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);

			// Select the column from user table to check for its existence
			const userTableName = toTableName(dataTableId);
			const rows = await dataStoreRepository.manager
				.createQueryBuilder()
				.select('foo')
				.from(userTableName, userTableName)
				.limit(1)
				.getRawMany();

			expect(rows).toEqual([]);
		});

		it('should create a user table and a columns table even if columns are not provided', async () => {
			const name = 'dataStore';

			// ACT
			const result = await dataStoreService.createDataStore(project1.id, {
				name,
				columns: [],
			});
			const { id: dataStoreId } = result;

			await expect(dataStoreService.getColumns(dataStoreId, project1.id)).resolves.toEqual([]);

			const userTableName = toTableName(dataStoreId);
			const queryRunner = dataStoreRepository.manager.connection.createQueryRunner();
			try {
				const table = await queryRunner.getTable(userTableName);
				const columnNames = table?.columns.map((col) => col.name);

				expect(columnNames).toEqual(expect.arrayContaining(['id', 'createdAt', 'updatedAt']));
			} finally {
				await queryRunner.release();
			}
		});

		it('should succeed even if the name exists in a different project', async () => {
			const name = 'dataStore';

			await dataStoreService.createDataStore(project2.id, {
				name,
				columns: [],
			});

			// ACT
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name,
				columns: [],
			});

			const created = await dataStoreRepository.findOneBy({ name, projectId: project1.id });
			expect(created?.id).toBe(dataStoreId);
		});

		it('should populate the project relation when creating a data store', async () => {
			const name = 'dataStore';

			// ACT
			const { project } = await dataStoreService.createDataStore(project1.id, {
				name,
				columns: [],
			});

			// ASSERT
			expect(project.id).toBe(project1.id);
			expect(project.name).toBe(project1.name);
		});

		it('should return an error if name/project combination already exists', async () => {
			const name = 'dataStore';

			// ARRANGE
			await dataStoreService.createDataStore(project1.id, {
				name,
				columns: [],
			});

			// ACT
			const result = dataStoreService.createDataStore(project1.id, {
				name,
				columns: [],
			});

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreNameConflictError);
		});
	});

	describe('updateDataStore', () => {
		it('should succeed when renaming to an available name', async () => {
			// ARRANGE
			const { id: dataStoreId, updatedAt } = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore1',
				columns: [],
			});

			// ACT
			// Wait to get second difference
			await new Promise((resolve) => setTimeout(resolve, 1001));

			const result = await dataStoreService.updateDataStore(dataStoreId, project1.id, {
				name: 'aNewName',
			});

			// ASSERT
			expect(result).toEqual(true);

			const updated = await dataStoreRepository.findOneBy({ id: dataStoreId });
			expect(updated?.name).toBe('aNewName');
			expect(updated?.updatedAt.getTime()).toBeGreaterThan(updatedAt.getTime());
		});

		it('should fail when renaming a non-existent data store', async () => {
			// ACT
			const result = dataStoreService.updateDataStore('this is not an id', project1.id, {
				name: 'aNewName',
			});

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreNotFoundError);
		});

		it('should fail when renaming to a taken name', async () => {
			// ARRANGE
			const name = 'myDataStoreOld';
			await dataStoreService.createDataStore(project1.id, {
				name,
				columns: [],
			});

			const { id: dataStoreNewId } = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStoreNew',
				columns: [],
			});

			// ACT
			const result = dataStoreService.updateDataStore(dataStoreNewId, project1.id, { name });

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreNameConflictError);
		});
	});

	describe('deleteDataStore', () => {
		it('should succeed with deleting a store', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore1',
				columns: [],
			});

			// ACT
			const result = await dataStoreService.deleteDataStore(dataStoreId, project1.id);
			const userTableName = toTableName(dataStoreId);

			// ASSERT
			expect(result).toEqual(true);

			const deletedDatastore = await dataStoreRepository.findOneBy({ id: dataStoreId });
			expect(deletedDatastore).toBeNull();

			const queryUserTable = dataStoreRepository.manager
				.createQueryBuilder()
				.select()
				.from(userTableName, userTableName)
				.getMany();
			await expect(queryUserTable).rejects.toBeDefined();
		});

		it('should fail when deleting a non-existent id', async () => {
			// ACT
			const result = dataStoreService.deleteDataStore('this is not an id', project1.id);

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreNotFoundError);
		});
	});

	describe('addColumn', () => {
		it('should succeed with adding columns to a non-empty table as well as to a user table', async () => {
			const existingColumns: CreateDataStoreColumnDto[] = [{ name: 'myColumn0', type: 'string' }];

			const { id: dataTableId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStoreWithColumns',
				columns: existingColumns,
			});

			const columns: AddDataStoreColumnDto[] = [
				{ name: 'myColumn1', type: 'string' },
				{ name: 'myColumn2', type: 'number' },
				{ name: 'myColumn3', type: 'number' },
				{ name: 'myColumn4', type: 'date' },
			];
			for (const column of columns) {
				// ACT
				const result = await dataStoreService.addColumn(dataTableId, project1.id, column);
				// ASSERT
				expect(result).toMatchObject(column);
			}
			const columnResult = await dataStoreService.getColumns(dataTableId, project1.id);
			expect(columnResult).toEqual([
				expect.objectContaining({
					index: 0,
					dataTableId,
					name: 'myColumn0',
					type: 'string',
				}),
				expect.objectContaining({
					index: 1,
					dataTableId,
					name: 'myColumn1',
					type: 'string',
				}),
				expect.objectContaining({
					index: 2,
					dataTableId,
					name: 'myColumn2',
					type: 'number',
				}),
				expect.objectContaining({
					index: 3,
					dataTableId,
					name: 'myColumn3',
					type: 'number',
				}),
				expect.objectContaining({
					index: 4,
					dataTableId,
					name: 'myColumn4',
					type: 'date',
				}),
			]);

			const userTableName = toTableName(dataTableId);
			const queryRunner = dataStoreRepository.manager.connection.createQueryRunner();
			try {
				const table = await queryRunner.getTable(userTableName);
				const columnNames = table?.columns.map((col) => col.name);

				expect(columnNames).toEqual(
					expect.arrayContaining([
						'id',
						'createdAt',
						'updatedAt',
						'myColumn0',
						'myColumn1',
						'myColumn2',
						'myColumn3',
						'myColumn4',
					]),
				);
			} finally {
				await queryRunner.release();
			}
		});

		it('should succeed with adding columns to an empty table', async () => {
			const { id: dataTableId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [],
			});

			const columns: AddDataStoreColumnDto[] = [
				{ name: 'myColumn0', type: 'string' },
				{ name: 'myColumn1', type: 'number' },
			];
			for (const column of columns) {
				// ACT
				const result = await dataStoreService.addColumn(dataTableId, project1.id, column);
				// ASSERT
				expect(result).toMatchObject(column);
			}
			const columnResult = await dataStoreService.getColumns(dataTableId, project1.id);
			expect(columnResult.length).toBe(2);

			expect(columnResult).toEqual([
				expect.objectContaining({
					index: 0,
					dataTableId,
					name: 'myColumn0',
					type: 'string',
				}),
				expect.objectContaining({
					index: 1,
					dataTableId,
					name: 'myColumn1',
					type: 'number',
				}),
			]);

			const userTableName = toTableName(dataTableId);
			const queryRunner = dataStoreRepository.manager.connection.createQueryRunner();
			try {
				const table = await queryRunner.getTable(userTableName);
				const columnNames = table?.columns.map((col) => col.name);

				expect(columnNames).toEqual(
					expect.arrayContaining(['id', 'createdAt', 'updatedAt', 'myColumn0', 'myColumn1']),
				);
			} finally {
				await queryRunner.release();
			}
		});

		it('should fail with adding two columns of the same name', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore',
				columns: [
					{
						name: 'myColumn1',
						type: 'string',
					},
				],
			});

			// ACT
			const result = dataStoreService.addColumn(dataStoreId, project1.id, {
				name: 'myColumn1',
				type: 'number',
			});

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreColumnNameConflictError);
		});

		it('should fail with adding column of non-existent table', async () => {
			// ACT
			const result = dataStoreService.addColumn('this is not an id', project1.id, {
				name: 'myColumn1',
				type: 'number',
			});

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreNotFoundError);
		});

		it('should succeed with adding column to table that already has rows and set null values for existing rows', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			const results = await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[
					{ name: 'Alice', age: 30 },
					{ name: 'Bob', age: 25 },
					{ name: 'Charlie', age: 35 },
				],
				'id',
			);

			expect(results).toEqual([
				{
					id: 1,
				},
				{
					id: 2,
				},
				{
					id: 3,
				},
			]);

			// ACT
			const newColumn = await dataStoreService.addColumn(dataStoreId, project1.id, {
				name: 'email',
				type: 'string',
			});

			// ASSERT
			expect(newColumn).toMatchObject({ name: 'email', type: 'string' });

			// Verify the column was added to the metadata
			const columns = await dataStoreService.getColumns(dataStoreId, project1.id);
			expect(columns).toHaveLength(3);
			expect(columns.map((c) => c.name)).toEqual(['name', 'age', 'email']);

			// Verify existing rows now have null values for the new column
			const updatedData = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(updatedData.count).toBe(3);
			expect(updatedData.data).toEqual([
				expect.objectContaining({
					id: 1,
					name: 'Alice',
					age: 30,
					email: null,
				}),
				expect.objectContaining({
					id: 2,
					name: 'Bob',
					age: 25,
					email: null,
				}),
				expect.objectContaining({
					id: 3,
					name: 'Charlie',
					age: 35,
					email: null,
				}),
			]);

			// Verify we can insert new rows with the new column
			const newRow = await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[{ name: 'David', age: 28, email: 'david@example.com' }],
				'id',
			);
			expect(newRow).toEqual([
				{
					id: 4,
				},
			]);

			const finalData = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(finalData.count).toBe(4);
			expect(finalData.data).toEqual([
				expect.objectContaining({
					id: 1,
					name: 'Alice',
					age: 30,
					email: null,
				}),
				expect.objectContaining({
					id: 2,
					name: 'Bob',
					age: 25,
					email: null,
				}),
				expect.objectContaining({
					id: 3,
					name: 'Charlie',
					age: 35,
					email: null,
				}),
				expect.objectContaining({
					id: 4,
					name: 'David',
					age: 28,
					email: 'david@example.com',
				}),
			]);
		});
	});

	describe('deleteColumn', () => {
		it('should succeed with deleting a column', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [],
			});

			const c1 = await dataStoreService.addColumn(dataTableId, project1.id, {
				name: 'myColumn1',
				type: 'string',
			});
			const c2 = await dataStoreService.addColumn(dataTableId, project1.id, {
				name: 'myColumn2',
				type: 'number',
			});

			// ACT
			const result = await dataStoreService.deleteColumn(dataTableId, project1.id, c1.id);

			// ASSERT
			expect(result).toEqual(true);

			const columns = await dataStoreService.getColumns(dataTableId, project1.id);
			expect(columns).toEqual([
				{
					index: 0,
					dataTableId,
					id: c2.id,
					name: 'myColumn2',
					type: 'number',
					createdAt: c2.createdAt,
					updatedAt: expect.any(Date),
				},
			]);
		});

		it('should fail when deleting unknown column', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{
						name: 'myColumn1',
						type: 'string',
					},
				],
			});

			// ACT
			const result = dataStoreService.deleteColumn(dataStoreId, project1.id, 'thisIsNotAnId');

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreColumnNotFoundError);
		});

		it('should fail when deleting column from unknown table', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [],
			});
			const c1 = await dataStoreService.addColumn(dataStoreId, project1.id, {
				name: 'myColumn1',
				type: 'string',
			});

			// ACT
			const result = dataStoreService.deleteColumn('this is not an id', project1.id, c1.id);

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreNotFoundError);
		});
	});

	describe('moveColumn', () => {
		it('should succeed with moving a column', async () => {
			// ARRANGE
			const { id: dataTableId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [],
			});

			const c1 = await dataStoreService.addColumn(dataTableId, project1.id, {
				name: 'myColumn1',
				type: 'string',
			});
			const c2 = await dataStoreService.addColumn(dataTableId, project1.id, {
				name: 'myColumn2',
				type: 'number',
			});

			// ACT
			const result = await dataStoreService.moveColumn(dataTableId, project1.id, c2.id, {
				targetIndex: 0,
			});

			// ASSERT
			expect(result).toEqual(true);

			const columns = await dataStoreService.getColumns(dataTableId, project1.id);
			expect(columns).toMatchObject([
				{
					index: 0,
					dataTableId,
					id: c2.id,
					name: 'myColumn2',
					type: 'number',
				},
				{
					index: 1,
					dataTableId,
					id: c1.id,
					name: 'myColumn1',
					type: 'string',
				},
			]);
		});
	});

	describe('getManyAndCount', () => {
		it('correctly joins columns', async () => {
			// ARRANGE
			const columns: CreateDataStoreColumnDto[] = [
				{ name: 'myColumn1', type: 'string' },
				{ name: 'myColumn2', type: 'number' },
				{ name: 'myColumn3', type: 'number' },
				{ name: 'myColumn4', type: 'date' },
			];
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore',
				columns,
			});

			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id, id: dataStoreId },
			});

			// ASSERT
			expect(result.count).toEqual(1);

			const resultColumns = result.data[0].columns;

			expect(resultColumns).toEqual(
				expect.arrayContaining([
					{
						id: expect.any(String),
						name: 'myColumn1',
						type: 'string',
						createdAt: expect.any(Date),
						updatedAt: expect.any(Date),
						index: 0,
					},
					{
						id: expect.any(String),
						name: 'myColumn2',
						type: 'number',
						createdAt: expect.any(Date),
						updatedAt: expect.any(Date),
						index: 1,
					},
					{
						id: expect.any(String),
						name: 'myColumn3',
						type: 'number',
						createdAt: expect.any(Date),
						updatedAt: expect.any(Date),
						index: 2,
					},
					{
						id: expect.any(String),
						name: 'myColumn4',
						type: 'date',
						createdAt: expect.any(Date),
						updatedAt: expect.any(Date),
						index: 3,
					},
				]),
			);

			for (let i = 1; i < resultColumns.length; i++) {
				expect(new Date(resultColumns[i].updatedAt).getTime()).toBeGreaterThanOrEqual(
					new Date(resultColumns[i - 1].updatedAt).getTime(),
				);
			}
		});

		describe('sorts as expected', () => {
			it('sorts by name', async () => {
				// ARRANGE
				await dataStoreService.createDataStore(project1.id, {
					name: 'ds2',
					columns: [],
				});

				await dataStoreService.createDataStore(project1.id, {
					name: 'ds1',
					columns: [],
				});

				await dataStoreService.createDataStore(project1.id, {
					name: 'ds3',
					columns: [],
				});

				// ACT
				const nameAsc = await dataStoreService.getManyAndCount({
					filter: { projectId: project1.id },
					sortBy: 'name:asc',
				});
				const nameDesc = await dataStoreService.getManyAndCount({
					filter: { projectId: project1.id },
					sortBy: 'name:desc',
				});

				// ASSERT
				expect(nameAsc.data.map((x) => x.name)).toEqual(['ds1', 'ds2', 'ds3']);
				expect(nameDesc.data.map((x) => x.name)).toEqual(['ds3', 'ds2', 'ds1']);
			});

			it('sorts by createdAt', async () => {
				// ARRANGE
				await dataStoreService.createDataStore(project1.id, {
					name: 'ds0',
					columns: [],
				});

				// Wait to get seconds difference
				await new Promise((resolve) => setTimeout(resolve, 1001));
				await dataStoreService.createDataStore(project1.id, {
					name: 'ds1',
					columns: [],
				});

				// Wait to get seconds difference
				await new Promise((resolve) => setTimeout(resolve, 1001));
				await dataStoreService.createDataStore(project1.id, {
					name: 'ds2',
					columns: [],
				});

				// ACT
				const createdAsc = await dataStoreService.getManyAndCount({
					filter: { projectId: project1.id },
					sortBy: 'createdAt:asc',
				});
				const createdDesc = await dataStoreService.getManyAndCount({
					filter: { projectId: project1.id },
					sortBy: 'createdAt:desc',
				});

				// ASSERT
				expect(createdAsc.data.map((x) => x.name)).toEqual(['ds0', 'ds1', 'ds2']);
				expect(createdDesc.data.map((x) => x.name)).toEqual(['ds2', 'ds1', 'ds0']);
			});

			it('sorts by updatedAt', async () => {
				// ARRANGE
				const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
					name: 'ds1',
					columns: [],
				});

				// Wait to get seconds difference
				await new Promise((resolve) => setTimeout(resolve, 1001));
				await dataStoreService.createDataStore(project1.id, {
					name: 'ds2',
					columns: [],
				});

				// Wait to get seconds difference
				await new Promise((resolve) => setTimeout(resolve, 1001));
				await dataStoreService.updateDataStore(dataStoreId, project1.id, { name: 'ds1Updated' });

				// ACT
				const updatedAsc = await dataStoreService.getManyAndCount({
					filter: { projectId: project1.id },
					sortBy: 'updatedAt:asc',
				});

				const updatedDesc = await dataStoreService.getManyAndCount({
					filter: { projectId: project1.id },
					sortBy: 'updatedAt:desc',
				});

				// ASSERT
				expect(updatedAsc.data.map((x) => x.name)).toEqual(['ds2', 'ds1Updated']);
				expect(updatedDesc.data.map((x) => x.name)).toEqual(['ds1Updated', 'ds2']);
			});
		});
	});

	describe('insertRows', () => {
		it('inserts rows into an existing table', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'boolean' },
					{ name: 'c3', type: 'date' },
					{ name: 'c4', type: 'string' },
				],
			});

			// ACT
			const rows = [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ c1: 4, c2: false, c3: new Date(), c4: 'hello!' },
				{ c1: 5, c2: true, c3: new Date(), c4: 'hello.' },
				{
					c1: 1,
					c2: true,
					c3: '2025-08-15T09:48:14.259Z',
					c4: 'iso 8601 date strings are okay too',
				},
			];
			const result = await dataStoreService.insertRows(dataStoreId, project1.id, rows, 'id');

			// ASSERT
			expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);

			const { count, data } = await dataStoreService.getManyRowsAndCount(
				dataStoreId,
				project1.id,
				{},
			);
			expect(count).toEqual(4);

			const expected = rows.map(
				(row, i) =>
					expect.objectContaining<DataStoreRow>({
						...row,
						id: i + 1,
						c3: typeof row.c3 === 'string' ? new Date(row.c3) : row.c3,
					}) as jest.AsymmetricMatcher,
			);

			expect(data).toEqual(expected);
		});

		it('inserts a row even if it matches with the existing one', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'string' },
				],
			});

			// Insert initial row
			const initial = await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[{ c1: 1, c2: 'foo' }],
				'id',
			);
			expect(initial).toEqual([{ id: 1 }]);

			// Attempt to insert a row with the same primary key
			const result = await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[{ c1: 1, c2: 'foo' }],
				'id',
			);

			// ASSERT
			expect(result).toEqual([{ id: 2 }]);

			const { count, data } = await dataStoreRowsRepository.getManyAndCount(dataStoreId, {});

			expect(count).toEqual(2);
			expect(data).toEqual([
				expect.objectContaining({
					c1: 1,
					c2: 'foo',
					id: 1,
				}),
				expect.objectContaining({
					c1: 1,
					c2: 'foo',
					id: 2,
				}),
			]);
		});

		it('return correct IDs even after deletions', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'string' },
				],
			});

			// Insert initial row
			const ids = await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[
					{ c1: 1, c2: 'foo' },
					{ c1: 2, c2: 'bar' },
				],
				'id',
			);
			expect(ids).toEqual([{ id: 1 }, { id: 2 }]);

			await dataStoreService.deleteRows(dataStoreId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'id', condition: 'eq', value: ids[0].id }],
				},
			});

			// Insert a new row
			const result = await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[
					{ c1: 1, c2: 'baz' },
					{ c1: 2, c2: 'faz' },
				],
				'id',
			);

			// ASSERT
			expect(result).toEqual([{ id: 3 }, { id: 4 }]);

			const { count, data } = await dataStoreRowsRepository.getManyAndCount(dataStoreId, {});

			expect(count).toEqual(3);
			expect(data).toEqual([
				expect.objectContaining({
					c1: 2,
					c2: 'bar',
					id: 2,
				}),
				expect.objectContaining({
					c1: 1,
					c2: 'baz',
					id: 3,
				}),
				expect.objectContaining({
					c1: 2,
					c2: 'faz',
					id: 4,
				}),
			]);
		});

		it('return full inserted data if returnData is set', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'string' },
					{ name: 'c3', type: 'boolean' },
					{ name: 'c4', type: 'date' },
				],
			});

			const now = new Date();

			// Insert initial row
			const ids = await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[
					{ c1: 1, c2: 'foo', c3: true, c4: now },
					{ c1: 2, c2: 'bar', c3: false, c4: now },
					{ c1: null, c2: null, c3: null, c4: null },
				],
				'all',
			);
			expect(ids).toEqual([
				{
					id: 1,
					c1: 1,
					c2: 'foo',
					c3: true,
					c4: now,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					id: 2,
					c1: 2,
					c2: 'bar',
					c3: false,
					c4: now,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					id: 3,
					c1: null,
					c2: null,
					c3: null,
					c4: null,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});

		it('inserts in correct order even with different column order', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore',
				columns: [
					{ name: 'c4', type: 'date' },
					{ name: 'c3', type: 'boolean' },
					{ name: 'c2', type: 'string' },
					{ name: 'c1', type: 'number' },
				],
			});

			const now = new Date();

			// Insert initial row
			const ids = await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[
					{ c1: 1, c2: 'foo', c3: true, c4: now },
					{ c2: 'bar', c1: 2, c3: false, c4: now },
					{ c1: null, c2: null, c3: null, c4: null },
				],
				'all',
			);
			expect(ids).toEqual([
				{
					id: 1,
					c1: 1,
					c2: 'foo',
					c3: true,
					c4: now,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					id: 2,
					c1: 2,
					c2: 'bar',
					c3: false,
					c4: now,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					id: 3,
					c1: null,
					c2: null,
					c3: null,
					c4: null,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});

		it('rejects a mismatched row with unknown column', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'boolean' },
					{ name: 'c3', type: 'date' },
					{ name: 'c4', type: 'string' },
				],
			});

			// ACT
			const result = dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[
					{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
					{ cWrong: 3, c1: 4, c2: true, c3: new Date(), c4: 'hello?' },
				],
				'id',
			);

			// ASSERT
			await expect(result).rejects.toThrow(
				new DataStoreValidationError("unknown column name 'cWrong'"),
			);
		});

		it('inserts rows with partial data (some columns missing)', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'email', type: 'string' },
					{ name: 'active', type: 'boolean' },
				],
			});

			// ACT
			await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[
					{ name: 'Mary', age: 20, email: 'mary@example.com', active: true }, // full row
					{ name: 'Alice', age: 30 }, // missing email and active
					{ name: 'Bob' }, // missing age, email and active
					{}, // missing all columns
				],
				'id',
			);

			const { count, data } = await dataStoreService.getManyRowsAndCount(
				dataStoreId,
				project1.id,
				{},
			);
			expect(count).toEqual(4);
			expect(data).toEqual([
				expect.objectContaining({
					name: 'Mary',
					age: 20,
					email: 'mary@example.com',
					active: true,
				}),
				expect.objectContaining({
					name: 'Alice',
					age: 30,
					email: null,
					active: null,
				}),
				expect.objectContaining({
					name: 'Bob',
					age: null,
					email: null,
					active: null,
				}),
				expect.objectContaining({
					name: null,
					age: null,
					email: null,
					active: null,
				}),
			]);
		});

		it('rejects a mismatched row with replaced column', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'boolean' },
					{ name: 'c3', type: 'date' },
					{ name: 'c4', type: 'string' },
				],
			});

			// ACT
			const result = dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[
					{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
					{ cWrong: 3, c2: true, c3: new Date(), c4: 'hello?' },
				],
				'id',
			);

			// ASSERT
			await expect(result).rejects.toThrow(
				new DataStoreValidationError("unknown column name 'cWrong'"),
			);
		});

		it('rejects an invalid date string to date column', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'c1', type: 'date' }],
			});

			// ACT
			const result = dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[{ c1: '2025-99-15T09:48:14.259Z' }],
				'id',
			);

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreValidationError);
			await expect(result).rejects.toThrow(
				"value '2025-99-15T09:48:14.259Z' does not match column type 'date'",
			);
		});

		it('rejects unknown data store id', async () => {
			// ARRANGE
			await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'boolean' },
					{ name: 'c3', type: 'date' },
					{ name: 'c4', type: 'string' },
				],
			});

			// ACT
			const result = dataStoreService.insertRows(
				'this is not an id',
				project1.id,
				[
					{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
					{ cWrong: 3, c2: true, c3: new Date(), c4: 'hello?' },
				],
				'id',
			);

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreNotFoundError);
		});

		it('fails on type mismatch', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'c1', type: 'number' }],
			});

			// ACT
			const wrongValue = new Date().toISOString();
			const result = dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[{ c1: 3 }, { c1: wrongValue }],
				'id',
			);

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreValidationError);
			await expect(result).rejects.toThrow(
				`value '${wrongValue}' does not match column type 'number'`,
			);
		});

		it('inserts rows into an existing table with no columns', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [],
			});

			// ACT
			const rows = [{}, {}, {}];
			const result = await dataStoreService.insertRows(dataStoreId, project1.id, rows, 'id');

			// ASSERT
			expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);

			const { count, data } = await dataStoreService.getManyRowsAndCount(
				dataStoreId,
				project1.id,
				{},
			);
			expect(count).toEqual(3);
			expect(data).toEqual([
				{
					id: 1,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					id: 2,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					id: 3,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});
		describe('bulk', () => {
			it('handles single empty row correctly in bulk mode', async () => {
				// ARRANGE
				const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
					name: 'dataStore',
					columns: [],
				});

				// ACT
				const rows = [{}];
				const result = await dataStoreService.insertRows(dataStoreId, project1.id, rows);

				// ASSERT
				expect(result).toEqual({ success: true, insertedRows: 1 });

				const { count, data } = await dataStoreService.getManyRowsAndCount(
					dataStoreId,
					project1.id,
					{},
				);
				expect(count).toEqual(1);

				expect(data).toEqual([{ id: 1, createdAt: expect.any(Date), updatedAt: expect.any(Date) }]);
			});

			it('bulk insert should work with multiple empty rows', async () => {
				// ARRANGE
				const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
					name: 'dataStore',
					columns: [],
				});

				// ACT
				const result = await dataStoreService.insertRows(dataStoreId, project1.id, [{}, {}]);

				// ASSERT
				expect(result).toEqual({ success: true, insertedRows: 2 });

				const { count, data } = await dataStoreService.getManyRowsAndCount(
					dataStoreId,
					project1.id,
					{},
				);

				expect(count).toEqual(2);
				expect(data).toEqual([
					{ id: expect.any(Number), createdAt: expect.any(Date), updatedAt: expect.any(Date) },
					{ id: expect.any(Number), createdAt: expect.any(Date), updatedAt: expect.any(Date) },
				]);
			});

			it('handles multi-batch bulk correctly in bulk mode', async () => {
				// ARRANGE
				const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
					name: 'dataStore',
					columns: [
						{ name: 'c1', type: 'number' },
						{ name: 'c2', type: 'boolean' },
						{ name: 'c3', type: 'string' },
					],
				});

				// ACT
				const rows = Array.from({ length: 3000 }, (_, index) => ({
					c1: index,
					c2: index % 2 === 0,
					c3: `index ${index}`,
				}));
				const result = await dataStoreService.insertRows(dataStoreId, project1.id, rows);

				// ASSERT
				expect(result).toEqual({ success: true, insertedRows: rows.length });

				const { count, data } = await dataStoreService.getManyRowsAndCount(
					dataStoreId,
					project1.id,
					{},
				);
				expect(count).toEqual(rows.length);

				const expected = rows.map(
					(row, i) =>
						expect.objectContaining<DataStoreRow>({
							...row,
							id: i + 1,
						}) as jest.AsymmetricMatcher,
				);
				expect(data).toEqual(expected);
			});
		});
	});

	describe('upsertRow', () => {
		it('should update a row if filter matches', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'pid', type: 'string' },
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			const ids = await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[
					{ pid: '1995-111a', name: 'Alice', age: 30 },
					{ pid: '1994-222a', name: 'John', age: 31 },
					{ pid: '1993-333a', name: 'Paul', age: 32 },
				],
				'id',
			);

			expect(ids).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);

			// ACT
			const result = await dataStoreService.upsertRow(dataStoreId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'pid', value: '1995-111a', condition: 'eq' }],
				},
				data: { name: 'Alicia', age: 31 },
			});

			// ASSERT
			expect(result).toBe(true);

			const { count, data } = await dataStoreService.getManyRowsAndCount(
				dataStoreId,
				project1.id,
				{},
			);

			expect(count).toEqual(3);
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						pid: '1995-111a',
						name: 'Alicia',
						age: 31, // updated
					}),
					expect.objectContaining({
						pid: '1994-222a',
						name: 'John',
						age: 31,
					}),
					expect.objectContaining({
						pid: '1993-333a',
						name: 'Paul',
						age: 32,
					}),
				]),
			);
		});

		it('should insert a row if filter does not match', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'pid', type: 'string' },
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			// Insert initial row
			const ids = await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[{ pid: '1995-111a', name: 'Alice', age: 30 }],
				'id',
			);
			expect(ids).toEqual([{ id: 1 }]);

			// ACT
			const result = await dataStoreService.upsertRow(dataStoreId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'pid', value: '1995-222b', condition: 'eq' }],
				},
				data: { pid: '1995-222b', name: 'Alice', age: 30 },
			});

			// ASSERT
			expect(result).toBe(true);

			const { count, data } = await dataStoreService.getManyRowsAndCount(
				dataStoreId,
				project1.id,
				{},
			);

			expect(count).toEqual(2);
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: 'Alice',
						age: 30,
						pid: '1995-111a',
					}),
					expect.objectContaining({
						name: 'Alice',
						age: 30,
						pid: '1995-222b',
					}),
				]),
			);
		});

		it('should return full inserted row if returnData is set', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'fullName', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'birthday', type: 'date' },
				],
			});

			// Insert initial row
			const ids = await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[{ fullName: 'Alice Cooper', age: 30, birthday: new Date('1995-01-01') }],
				'id',
			);
			expect(ids).toEqual([{ id: 1 }]);

			// ACT
			const result = await dataStoreService.upsertRow(
				dataStoreId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'fullName', value: 'Bob Vance', condition: 'eq' }],
					},
					data: { fullName: 'Bob Vance', age: 30, birthday: new Date('1992-01-02') },
				},
				true,
			);

			// ASSERT
			expect(result).toEqual([
				{
					id: expect.any(Number),
					fullName: 'Bob Vance',
					age: 30,
					birthday: new Date('1992-01-02'),
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});

		it('should return full updated row if returnData is set', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'fullName', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'birthday', type: 'date' },
				],
			});

			// Insert initial row
			const ids = await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[{ fullName: 'Alice Cooper', age: 30, birthday: new Date('1995-01-01') }],
				'id',
			);
			expect(ids).toEqual([{ id: 1 }]);

			// ACT
			const result = await dataStoreService.upsertRow(
				dataStoreId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'age', value: 30, condition: 'eq' }],
					},
					data: { age: 35, birthday: new Date('1990-01-01') },
				},
				true,
			);

			// ASSERT
			expect(result).toEqual([
				{
					id: expect.any(Number),
					fullName: 'Alice Cooper',
					age: 35,
					birthday: new Date('1990-01-01'),
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});
	});

	describe('deleteRows', () => {
		it('should delete rows by filter condition', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
				],
			});
			const { id: dataStoreId } = dataStore;

			// Insert test rows
			await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[
					{ name: 'Alice', age: 30, active: true },
					{ name: 'Bob', age: 25, active: false },
					{ name: 'Charlie', age: 35, active: true },
				],
				'id',
			);

			// ACT
			const result = await dataStoreService.deleteRows(dataStoreId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'active', condition: 'eq', value: true }],
				},
			});

			// ASSERT
			expect(result).toBe(true);

			const rows = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(rows.count).toBe(1);
			expect(rows.data).toEqual([
				expect.objectContaining({
					name: 'Bob',
					age: 25,
					active: false,
				}),
			]);
		});

		it('should delete rows by ids', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});
			const { id: dataStoreId } = dataStore;

			// Insert test rows
			const insertedIds = await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[
					{ name: 'Alice', age: 30 },
					{ name: 'Bob', age: 25 },
					{ name: 'Charlie', age: 35 },
				],
				'id',
			);

			const filters = insertedIds
				.slice(1)
				.map(({ id }) => ({ columnName: 'id', condition: 'eq' as const, value: id }));

			// ACT
			const result = await dataStoreService.deleteRows(dataStoreId, project1.id, {
				filter: {
					type: 'or',
					filters,
				},
			});

			// ASSERT
			expect(result).toBe(true);

			const rows = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(rows.count).toBe(1);
			expect(rows.data).toEqual([
				expect.objectContaining({
					id: insertedIds[0].id,
				}),
			]);
		});

		it('should delete only one row with OR filter', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});
			const { id: dataStoreId } = dataStore;

			await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[
					{ name: 'Alice', age: 30 },
					{ name: 'Bob', age: 25 },
				],
				'id',
			);

			// ACT
			const result = await dataStoreService.deleteRows(dataStoreId, project1.id, {
				filter: {
					type: 'or',
					filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }],
				},
			});

			// ASSERT
			expect(result).toBe(true);

			const rows = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(rows.count).toBe(1);
			expect(rows.data).toEqual([
				expect.objectContaining({
					name: 'Bob',
					age: 25,
				}),
			]);
		});

		it('return full deleted data if returnData is set', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});
			const { id: dataStoreId } = dataStore;

			await dataStoreService.insertRows(
				dataStoreId,
				project1.id,
				[{ name: 'Alice', age: 30 }],
				'id',
			);

			// ACT
			const result = await dataStoreService.deleteRows(
				dataStoreId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }],
					},
				},
				true,
			);

			// ASSERT
			expect(result).toEqual([
				{
					id: expect.any(Number),
					name: 'Alice',
					age: 30,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});

		it('fails when trying to delete from non-existent data store', async () => {
			// ACT & ASSERT
			const result = dataStoreService.deleteRows('non-existent-id', project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'id', condition: 'eq', value: 1 }],
				},
			});

			await expect(result).rejects.toThrow(DataStoreNotFoundError);
		});

		it('should return true and do nothing when no rows match the filter', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'name', type: 'string' }],
			});
			const { id: dataStoreId } = dataStore;

			await dataStoreService.insertRows(dataStoreId, project1.id, [{ name: 'Alice' }]);

			// ACT
			const result = await dataStoreService.deleteRows(dataStoreId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'name', condition: 'eq', value: 'Charlie' }],
				},
			});

			// ASSERT
			expect(result).toBe(true);

			const { count } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(count).toBe(1);
		});

		it('should not delete all rows when no filter is provided', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'name', type: 'string' }],
			});
			const { id: dataStoreId } = dataStore;

			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice' },
				{ name: 'Bob' },
				{ name: 'Charlie' },
			]);

			// ACT
			const result = dataStoreService.deleteRows(dataStoreId, project1.id, {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				filter: undefined as any,
			});

			await expect(result).rejects.toThrow(
				new DataStoreValidationError(
					'Filter is required for delete operations to prevent accidental deletion of all data',
				),
			);
		});

		it('should not delete all rows when no filter is empty', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'name', type: 'string' }],
			});
			const { id: dataStoreId } = dataStore;

			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice' },
				{ name: 'Bob' },
				{ name: 'Charlie' },
			]);

			// ACT
			const result = dataStoreService.deleteRows(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [] },
			});

			await expect(result).rejects.toThrow(
				new DataStoreValidationError(
					'Filter is required for delete operations to prevent accidental deletion of all data',
				),
			);
		});

		it('should delete empty rows containing only system columns', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [],
			});

			// Insert empty rows
			await dataStoreService.insertRows(dataStoreId, project1.id, [{}, {}]);

			// Verify rows exist with only system columns
			const { count: initialCount, data: initialData } = await dataStoreService.getManyRowsAndCount(
				dataStoreId,
				project1.id,
				{},
			);
			expect(initialCount).toEqual(2);
			expect(initialData).toEqual([
				{ id: 1, createdAt: expect.any(Date), updatedAt: expect.any(Date) },
				{ id: 2, createdAt: expect.any(Date), updatedAt: expect.any(Date) },
			]);

			// ACT
			const result = await dataStoreService.deleteRows(dataStoreId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'id', condition: 'eq', value: 1 }],
				},
			});

			// ASSERT
			expect(result).toEqual(true);

			// Verify only one row remains
			const { count: finalCount, data: finalData } = await dataStoreService.getManyRowsAndCount(
				dataStoreId,
				project1.id,
				{},
			);
			expect(finalCount).toEqual(1);
			expect(finalData).toEqual([
				{ id: 2, createdAt: expect.any(Date), updatedAt: expect.any(Date) },
			]);
		});
	});

	describe('updateRow', () => {
		it('should update an existing row with matching filter', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'birthday', type: 'date' },
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice', age: 30, active: true, birthday: new Date('1990-01-01') },
				{ name: 'Bob', age: 25, active: false, birthday: new Date('1995-01-01') },
			]);

			// ACT
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { name: 'Alicia', age: 31, active: false, birthday: new Date('1990-01-02') },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alicia',
						age: 31,
						active: false,
						birthday: new Date('1990-01-02'),
					}),
					expect.objectContaining({
						id: 2,
						name: 'Bob',
						age: 25,
						active: false,
						birthday: new Date('1995-01-01'),
					}),
				]),
			);
		});

		it('should be able to update by id', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{
					name: 'Alice',
					age: 30,
					active: true,
				},
				{
					name: 'Bob',
					age: 25,
					active: false,
				},
			]);

			// ACT
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 1 }] },
				data: { name: 'Alicia', age: 31, active: false },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alicia',
						age: 31,
						active: false,
					}),
					expect.objectContaining({
						id: 2,
						name: 'Bob',
						age: 25,
						active: false,
					}),
				]),
			);
		});

		it('should update the updatedAt', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice', age: 30, active: true },
			]);

			const { data: initialRows } = await dataStoreService.getManyRowsAndCount(
				dataStoreId,
				project1.id,
				{},
			);

			// Wait to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 10));

			// ACT
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { age: 31, active: false },
			});

			// ASSERT
			expect(result).toBe(true);

			const { data: updatedRows } = await dataStoreService.getManyRowsAndCount(
				dataStoreId,
				project1.id,
				{},
			);

			expect(updatedRows[0].createdAt).not.toBeNull();
			expect(updatedRows[0].updatedAt).not.toBeNull();
			expect(initialRows[0].updatedAt).not.toBeNull();
			expect(new Date(updatedRows[0].updatedAt).getTime()).toBeGreaterThan(
				new Date(initialRows[0].updatedAt).getTime(),
			);
			expect(new Date(updatedRows[0].updatedAt).getTime()).toBeGreaterThan(
				new Date(updatedRows[0].createdAt).getTime(),
			);
		});

		it('should be able to update by string column', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'birthday', type: 'date' },
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice', age: 30, active: true, birthday: new Date('1990-01-01') },
				{ name: 'Bob', age: 25, active: false, birthday: new Date('1995-01-01') },
			]);

			// ACT
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { name: 'Alicia' },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alicia',
						age: 30,
						active: true,
						birthday: new Date('1990-01-01'),
					}),
					expect.objectContaining({
						id: 2,
						name: 'Bob',
						age: 25,
						active: false,
						birthday: new Date('1995-01-01'),
					}),
				]),
			);
		});

		it('should be able to update by number column', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'birthday', type: 'date' },
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice', age: 30, active: true, birthday: new Date('1990-01-01') },
				{ name: 'Bob', age: 25, active: false, birthday: new Date('1995-01-01') },
			]);

			// ACT
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'age', condition: 'eq', value: 30 }] },
				data: { age: 31 },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alice',
						age: 31,
						active: true,
						birthday: new Date('1990-01-01'),
					}),
					expect.objectContaining({
						id: 2,
						name: 'Bob',
						age: 25,
						active: false,
						birthday: new Date('1995-01-01'),
					}),
				]),
			);
		});

		it('should be able to update by numeric string', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'age', type: 'number' }],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [{ age: 30 }]);

			// ACT
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'age', condition: 'eq', value: '30' }] },
				data: { age: '31' },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual([expect.objectContaining({ age: 31 })]);
		});

		it('should throw on invalid numeric string', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'age', type: 'number' }],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [{ age: 30 }]);

			// ACT
			const result = dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'age', condition: 'eq', value: '30dfddf' }],
				},
				data: { age: '31' },
			});

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreValidationError);
			await expect(result).rejects.toThrow("value '30dfddf' does not match column type 'number'");
		});

		it('should be able to update by boolean column', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'birthday', type: 'date' },
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice', age: 30, active: true, birthday: new Date('1990-01-01') },
				{ name: 'Bob', age: 25, active: false, birthday: new Date('1995-01-01') },
			]);

			// ACT
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'active', condition: 'eq', value: true }] },
				data: { active: false },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alice',
						age: 30,
						active: false,
						birthday: new Date('1990-01-01'),
					}),
					expect.objectContaining({
						id: 2,
						name: 'Bob',
						age: 25,
						active: false,
						birthday: new Date('1995-01-01'),
					}),
				]),
			);
		});

		it('should be able to update by date column', async () => {
			// ARRANGE
			const aliceBirthday = new Date('1990-01-02');
			const bobBirthday = new Date('1995-01-01');

			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'birthday', type: 'date' },
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice', age: 30, active: true, birthday: aliceBirthday },
				{ name: 'Bob', age: 25, active: false, birthday: bobBirthday },
			]);

			// ACT
			const newBirthday = new Date('1990-01-03');
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'birthday', condition: 'eq', value: aliceBirthday }],
				},
				data: { birthday: newBirthday },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alice',
						age: 30,
						active: true,
						birthday: newBirthday,
					}),
					expect.objectContaining({
						id: 2,
						name: 'Bob',
						age: 25,
						active: false,
						birthday: bobBirthday,
					}),
				]),
			);
		});

		it('should update row with multiple filter conditions', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'department', type: 'string' },
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice', age: 30, department: 'Engineering' },
				{ name: 'Alice', age: 25, department: 'Marketing' },
				{ name: 'Bob', age: 30, department: 'Engineering' },
			]);

			// ACT
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: {
					type: 'and',
					filters: [
						{ columnName: 'name', condition: 'eq', value: 'Alice' },
						{ columnName: 'age', condition: 'eq', value: 30 },
					],
				},
				data: { department: 'Management' },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 1,
						name: 'Alice',
						age: 30,
						department: 'Management',
					}),
					expect.objectContaining({
						id: 2,
						name: 'Alice',
						age: 25,
						department: 'Marketing',
					}),
					expect.objectContaining({
						id: 3,
						name: 'Bob',
						age: 30,
						department: 'Engineering',
					}),
				]),
			);
		});

		it('should return true when no rows match the filter', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [{ name: 'Alice', age: 30 }]);

			// ACT
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'name', condition: 'eq', value: 'Charlie' }],
				},
				data: { age: 25 },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual([
				expect.objectContaining({
					name: 'Alice',
					age: 30,
				}),
			]);
		});

		it('should throw validation error when filters are empty', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [{ name: 'Alice', age: 30 }]);

			// ACT
			const result = dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [] },
				data: { name: 'Alice', age: 31 },
			});

			// ASSERT
			await expect(result).rejects.toThrow(
				new DataStoreValidationError('Filter must not be empty'),
			);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual([
				expect.objectContaining({
					name: 'Alice',
					age: 30,
				}),
			]);
		});

		it('should throw validation error when data is empty', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [{ name: 'Alice', age: 30 }]);

			// ACT
			const result = dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: {},
			});

			// ASSERT
			await expect(result).rejects.toThrow(
				new DataStoreValidationError('Data columns must not be empty'),
			);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual([
				expect.objectContaining({
					name: 'Alice',
					age: 30,
				}),
			]);
		});

		it('should fail when data store does not exist', async () => {
			// ACT & ASSERT
			const result = dataStoreService.updateRow('non-existent-id', project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { age: 25 },
			});

			await expect(result).rejects.toThrow(DataStoreNotFoundError);
		});

		it('should fail when data contains invalid column names', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'name', type: 'string' }],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [{ name: 'Alice' }]);

			// ACT & ASSERT
			const result = dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { invalidColumn: 'value' },
			});

			await expect(result).rejects.toThrow(DataStoreValidationError);
		});

		it('should fail when filter contains invalid column names', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'name', type: 'string' }],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [{ name: 'Alice' }]);

			// ACT & ASSERT
			const result = dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'invalidColumn', condition: 'eq', value: 'Alice' }],
				},
				data: { name: 'Bob' },
			});

			await expect(result).rejects.toThrow(DataStoreValidationError);
		});

		it('should fail when data contains invalid type values', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [{ name: 'Alice', age: 30 }]);

			// ACT & ASSERT
			const result = dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { age: 'not-a-number' },
			});

			await expect(result).rejects.toThrow(DataStoreValidationError);
		});

		it('should allow partial data updates', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice', age: 30, active: true },
			]);

			// ACT - only update age, leaving name and active unchanged
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { age: 31 },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual([
				expect.objectContaining({
					name: 'Alice',
					age: 31,
					active: true,
				}),
			]);
		});

		it('should handle date column updates correctly', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'birthDate', type: 'date' },
				],
			});

			const initialDate = new Date('1990-01-01');
			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice', birthDate: initialDate },
			]);

			// ACT
			const newDate = new Date('1991-02-02');
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
				data: { birthDate: newDate.toISOString() },
			});

			// ASSERT
			expect(result).toEqual(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});

			expect(data).toEqual([expect.objectContaining({ id: 1, name: 'Alice', birthDate: newDate })]);
		});

		it('should return full updated rows if returnData is set', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'name', type: 'string' },
					{ name: 'age', type: 'number' },
					{ name: 'active', type: 'boolean' },
					{ name: 'timestamp', type: 'date' },
				],
			});

			const now = new Date();
			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice', age: 30, active: true, timestamp: now },
				{ name: 'Bob', age: 25, active: false, timestamp: now },
			]);

			const soon = new Date();
			soon.setDate(now.getDate() + 1);

			// ACT
			const result = await dataStoreService.updateRow(
				dataStoreId,
				project1.id,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }],
					},
					data: { age: 31, active: false, timestamp: soon },
				},
				true,
			);

			// ASSERT
			expect(result).toEqual([
				expect.objectContaining({ id: 1, name: 'Alice', age: 31, active: false, timestamp: soon }),
			]);
		});
	});

	describe('getManyRowsAndCount', () => {
		it('retrieves rows correctly', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'c1', type: 'number' },
					{ name: 'c2', type: 'boolean' },
					{ name: 'c3', type: 'date' },
					{ name: 'c4', type: 'string' },
				],
			});

			const rows = [
				{
					c1: 3,
					c2: true,
					c3: new Date(0),
					c4: 'hello?',
				},
				{
					c1: 4,
					c2: false,
					c3: new Date(1),
					c4: 'hello!',
				},
				{
					c1: 5,
					c2: true,
					c3: new Date(2),
					c4: 'hello.',
				},
			];

			const ids = await dataStoreService.insertRows(dataStoreId, project1.id, rows, 'id');
			expect(ids).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);

			// ACT
			const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});

			// ASSERT
			expect(result.count).toEqual(3);
			// Assuming IDs are auto-incremented starting from 1
			expect(result.data).toEqual([
				{
					c1: rows[0].c1,
					c2: rows[0].c2,
					c3: new Date(0),
					c4: rows[0].c4,
					id: 1,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					c1: rows[1].c1,
					c2: rows[1].c2,
					c3: new Date(1),
					c4: rows[1].c4,
					id: 2,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
				{
					c1: rows[2].c1,
					c2: rows[2].c2,
					c3: new Date(2),
					c4: rows[2].c4,
					id: 3,
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				},
			]);
		});

		it('should fail when filter contains invalid column names', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'name', type: 'string' }],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [{ name: 'Alice' }]);

			// ACT
			const result = dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: {
					type: 'and',
					filters: [{ columnName: 'invalidColumn', condition: 'eq', value: 'Alice' }],
				},
				data: { name: 'Bob' },
			});

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreValidationError);
		});
	});

	describe('transferDataStoresByProjectId', () => {
		it('should transfer all data stores from one project to another', async () => {
			// ARRANGE
			const { id: dataStoreId1, name: dataStoreName1 } = await dataStoreService.createDataStore(
				project1.id,
				{
					name: 'dataStore1',
					columns: [{ name: 'col1', type: 'string' }],
				},
			);
			const { id: dataStoreId2, name: dataStoreName2 } = await dataStoreService.createDataStore(
				project1.id,
				{
					name: 'dataStore2',
					columns: [{ name: 'col1', type: 'string' }],
				},
			);

			// ACT
			await dataStoreService.transferDataStoresByProjectId(project1.id, project2.id);

			// ASSERT
			const dataStore1 = await dataStoreRepository.findOneByOrFail({
				id: dataStoreId1,
			});
			expect(dataStore1).toBeDefined();
			expect(dataStore1.projectId).toBe(project2.id);
			expect(dataStore1.name).toBe(dataStoreName1);

			const dataStore2 = await dataStoreRepository.findOneByOrFail({
				id: dataStoreId2,
			});
			expect(dataStore2).toBeDefined();
			expect(dataStore2.projectId).toBe(project2.id);
			expect(dataStore2.name).toBe(dataStoreName2);
		});

		it('should not affect data stores in other projects', async () => {
			// ARRANGE
			const { id: dataStoreId1 } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore1',
				columns: [{ name: 'col1', type: 'string' }],
			});
			const { id: dataStoreId2 } = await dataStoreService.createDataStore(project2.id, {
				name: 'dataStore2',
				columns: [{ name: 'col1', type: 'string' }],
			});

			// ACT
			await dataStoreService.transferDataStoresByProjectId(project1.id, project2.id);

			// ASSERT
			const dataStore1 = await dataStoreRepository.findOneByOrFail({
				id: dataStoreId1,
			});
			expect(dataStore1).toBeDefined();
			expect(dataStore1.projectId).toBe(project2.id);

			const dataStore2 = await dataStoreRepository.findOneByOrFail({
				id: dataStoreId2,
				project: {
					id: project2.id,
				},
			});
			expect(dataStore2).toBeDefined();
			expect(dataStore2.projectId).toBe(project2.id);
		});

		it('should rename data stores if name conflict occurs in target project', async () => {
			// ARRANGE
			const { id: dataStoreId1 } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'col1', type: 'string' }],
			});
			await dataStoreService.createDataStore(project2.id, {
				name: 'dataStore',
				columns: [{ name: 'col1', type: 'string' }],
			});

			// ACT
			await dataStoreService.transferDataStoresByProjectId(project1.id, project2.id);

			// ASSERT
			const dataStore1 = await dataStoreRepository.findOneByOrFail({
				id: dataStoreId1,
			});
			expect(dataStore1).toBeDefined();
			expect(dataStore1.projectId).toBe(project2.id);
			expect(dataStore1.name).toBe(`dataStore (${project1.name})`);
		});
	});

	describe('deleteDataStoreByProjectId', () => {
		it('should delete all data stores for a given project ID', async () => {
			// ARRANGE
			const { id: dataStoreId1 } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore1',
				columns: [{ name: 'col1', type: 'string' }],
			});
			const { id: dataStoreId2 } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore2',
				columns: [{ name: 'col1', type: 'string' }],
			});

			// ACT
			await dataStoreService.deleteDataStoreByProjectId(project1.id);

			// ASSERT
			await expect(
				dataStoreRepository.findOneByOrFail({
					id: dataStoreId1,
					project: {
						id: project1.id,
					},
				}),
			).rejects.toThrow();

			await expect(
				dataStoreRepository.findOneByOrFail({
					id: dataStoreId2,
					project: {
						id: project1.id,
					},
				}),
			).rejects.toThrow();
		});

		it('should not delete data stores for other projects', async () => {
			// ARRANGE
			const { id: dataStoreId1 } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStoreA',
				columns: [{ name: 'col1', type: 'string' }],
			});
			const { id: dataStoreId2 } = await dataStoreService.createDataStore(project2.id, {
				name: 'dataStoreB',
				columns: [{ name: 'col1', type: 'string' }],
			});

			// ACT
			await dataStoreService.deleteDataStoreByProjectId(project1.id);

			// ASSERT
			await expect(
				dataStoreRepository.findOneByOrFail({
					id: dataStoreId1,
					project: {
						id: project1.id,
					},
				}),
			).rejects.toThrow();

			const dataStore2 = await dataStoreRepository.findOneByOrFail({
				id: dataStoreId2,
				project: {
					id: project2.id,
				},
			});
			expect(dataStore2).toBeDefined();
			expect(dataStore2.id).toBe(dataStoreId2);
		});
	});
});
