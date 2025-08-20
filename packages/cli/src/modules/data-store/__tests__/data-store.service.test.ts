import type { AddDataStoreColumnDto, CreateDataStoreColumnDto } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Project } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataStoreRowsRepository } from '../data-store-rows.repository';
import { DataStoreRepository } from '../data-store.repository';
import { DataStoreService } from '../data-store.service';
import { DataStoreColumnNameConflictError } from '../errors/data-store-column-name-conflict.error';
import { DataStoreColumnNotFoundError } from '../errors/data-store-column-not-found.error';
import { DataStoreNameConflictError } from '../errors/data-store-name-conflict.error';
import { DataStoreNotFoundError } from '../errors/data-store-not-found.error';
import { DataStoreValidationError } from '../errors/data-store-validation.error';
import { toTableName } from '../utils/sql-utils';

beforeAll(async () => {
	await testModules.loadModules(['data-store']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['DataStore', 'DataStoreColumn']);
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
		// Clean up any created user data stores
		await dataStoreService.deleteDataStoreAll();
	});

	describe('createDataStore', () => {
		it('should create a columns table and a user table if columns are provided', async () => {
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStoreWithColumns',
				columns: [{ name: 'foo', type: 'string' }],
			});

			await expect(dataStoreService.getColumns(dataStoreId, project1.id)).resolves.toEqual([
				{
					name: 'foo',
					type: 'string',
					index: 0,
					dataStoreId,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					id: expect.any(String),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					createdAt: expect.any(Date),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					updatedAt: expect.any(Date),
				},
			]);

			// Select the column from user table to check for its existence
			const userTableName = toTableName(dataStoreId);
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

				expect(columnNames).toEqual(['id']);
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

			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
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
				const result = await dataStoreService.addColumn(dataStoreId, project1.id, column);
				// ASSERT
				expect(result).toMatchObject(column);
			}
			const columnResult = await dataStoreService.getColumns(dataStoreId, project1.id);
			expect(columnResult).toEqual([
				{
					index: 0,
					dataStoreId,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					id: expect.any(String),
					name: 'myColumn0',
					type: 'string',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					createdAt: expect.any(Date),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					updatedAt: expect.any(Date),
				},
				{
					index: 1,
					dataStoreId,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					id: expect.any(String),
					name: 'myColumn1',
					type: 'string',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					createdAt: expect.any(Date),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					updatedAt: expect.any(Date),
				},
				{
					index: 2,
					dataStoreId,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					id: expect.any(String),
					name: 'myColumn2',
					type: 'number',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					createdAt: expect.any(Date),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					updatedAt: expect.any(Date),
				},
				{
					index: 3,
					dataStoreId,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					id: expect.any(String),
					name: 'myColumn3',
					type: 'number',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					createdAt: expect.any(Date),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					updatedAt: expect.any(Date),
				},
				{
					index: 4,
					dataStoreId,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					id: expect.any(String),
					name: 'myColumn4',
					type: 'date',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					createdAt: expect.any(Date),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					updatedAt: expect.any(Date),
				},
			]);

			const userTableName = toTableName(dataStoreId);
			const queryRunner = dataStoreRepository.manager.connection.createQueryRunner();
			try {
				const table = await queryRunner.getTable(userTableName);
				const columnNames = table?.columns.map((col) => col.name);

				expect(columnNames).toEqual(
					expect.arrayContaining([
						'id',
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
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [],
			});

			const columns: AddDataStoreColumnDto[] = [
				{ name: 'myColumn0', type: 'string' },
				{ name: 'myColumn1', type: 'number' },
			];
			for (const column of columns) {
				// ACT
				const result = await dataStoreService.addColumn(dataStoreId, project1.id, column);
				// ASSERT
				expect(result).toMatchObject(column);
			}
			const columnResult = await dataStoreService.getColumns(dataStoreId, project1.id);
			expect(columnResult.length).toBe(2);

			expect(columnResult).toEqual([
				{
					index: 0,
					dataStoreId,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					id: expect.any(String),
					name: 'myColumn0',
					type: 'string',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					createdAt: expect.any(Date),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					updatedAt: expect.any(Date),
				},
				{
					index: 1,
					dataStoreId,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					id: expect.any(String),
					name: 'myColumn1',
					type: 'number',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					createdAt: expect.any(Date),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					updatedAt: expect.any(Date),
				},
			]);

			const userTableName = toTableName(dataStoreId);
			const queryRunner = dataStoreRepository.manager.connection.createQueryRunner();
			try {
				const table = await queryRunner.getTable(userTableName);
				const columnNames = table?.columns.map((col) => col.name);

				expect(columnNames).toEqual(expect.arrayContaining(['id', 'myColumn0', 'myColumn1']));
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

			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
				{ name: 'Charlie', age: 35 },
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
				{ id: 1, name: 'Alice', age: 30, email: null },
				{ id: 2, name: 'Bob', age: 25, email: null },
				{ id: 3, name: 'Charlie', age: 35, email: null },
			]);

			// Verify we can insert new rows with the new column
			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'David', age: 28, email: 'david@example.com' },
			]);

			const finalData = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(finalData.count).toBe(4);
			expect(finalData.data).toEqual([
				{ id: 1, name: 'Alice', age: 30, email: null },
				{ id: 2, name: 'Bob', age: 25, email: null },
				{ id: 3, name: 'Charlie', age: 35, email: null },
				{ id: 4, name: 'David', age: 28, email: 'david@example.com' },
			]);
		});
	});

	describe('deleteColumn', () => {
		it('should succeed with deleting a column', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [],
			});

			const c1 = await dataStoreService.addColumn(dataStoreId, project1.id, {
				name: 'myColumn1',
				type: 'string',
			});
			const c2 = await dataStoreService.addColumn(dataStoreId, project1.id, {
				name: 'myColumn2',
				type: 'number',
			});

			// ACT
			const result = await dataStoreService.deleteColumn(dataStoreId, project1.id, c1.id);

			// ASSERT
			expect(result).toEqual(true);

			const columns = await dataStoreService.getColumns(dataStoreId, project1.id);
			expect(columns).toEqual([
				{
					index: 0,
					dataStoreId,
					id: c2.id,
					name: 'myColumn2',
					type: 'number',
					createdAt: c2.createdAt,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [],
			});

			const c1 = await dataStoreService.addColumn(dataStoreId, project1.id, {
				name: 'myColumn1',
				type: 'string',
			});
			const c2 = await dataStoreService.addColumn(dataStoreId, project1.id, {
				name: 'myColumn2',
				type: 'number',
			});

			// ACT
			const result = await dataStoreService.moveColumn(dataStoreId, project1.id, c2.id, {
				targetIndex: 0,
			});

			// ASSERT
			expect(result).toEqual(true);

			const columns = await dataStoreService.getColumns(dataStoreId, project1.id);
			expect(columns).toMatchObject([
				{
					index: 0,
					dataStoreId,
					id: c2.id,
					name: 'myColumn2',
					type: 'number',
				},
				{
					index: 1,
					dataStoreId,
					id: c1.id,
					name: 'myColumn1',
					type: 'string',
				},
			]);
		});
	});

	describe('getManyAndCount', () => {
		it('should retrieve by name', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [],
			});

			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id, name: dataStore.name },
			});

			// ASSERT
			expect(result.data).toHaveLength(1);
			expect(result.data[0]).toEqual({
				...dataStore,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				project: expect.any(Project),
			});
			expect(result.data[0].project).toEqual({
				icon: null,
				id: project1.id,
				name: project1.name,
				type: project1.type,
			});
			expect(result.count).toEqual(1);
		});

		it('should retrieve by ids', async () => {
			// ARRANGE
			const dataStore1 = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore1',
				columns: [],
			});

			const dataStore2 = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore2',
				columns: [],
			});

			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id, id: [dataStore1.id, dataStore2.id] },
			});

			// ASSERT
			expect(result.data).toHaveLength(2);
			expect(result.data).toContainEqual({
				...dataStore2,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				project: expect.any(Project),
			});
			expect(result.data).toContainEqual({
				...dataStore1,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				project: expect.any(Project),
			});
			expect(result.count).toEqual(2);
		});

		it('should retrieve by projectId', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore',
				columns: [],
			});
			const names = [dataStore.name];
			for (let i = 0; i < 10; ++i) {
				const ds = await dataStoreService.createDataStore(project1.id, {
					name: `anotherDataStore${i}`,
					columns: [],
				});
				names.push(ds.name);
			}

			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id },
			});

			// ASSERT
			expect(result.data.map((x) => x.name).sort()).toEqual(names.sort());
			expect(result.count).toEqual(11);
		});

		it('should retrieve by id with pagination', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore',
				columns: [],
			});
			const names = [dataStore.name];

			for (let i = 0; i < 10; ++i) {
				const ds = await dataStoreService.createDataStore(project1.id, {
					name: `anotherDataStore${i}`,
					columns: [],
				});
				names.push(ds.name);
			}

			// ACT
			const p0 = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id },
				skip: 0,
				take: 3,
			});
			const p1 = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id },
				skip: 3,
				take: 3,
			});
			const rest = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id },
				skip: 6,
				take: 10,
			});

			// ASSERT
			expect(p0.count).toBe(11);
			expect(p0.data).toHaveLength(3);

			expect(p1.count).toBe(11);
			expect(p1.data).toHaveLength(3);

			expect(rest.count).toBe(11);
			expect(rest.data).toHaveLength(5);

			expect(
				p0.data
					.concat(p1.data)
					.concat(rest.data)
					.map((x) => x.name)
					.sort(),
			).toEqual(names.sort());
		});

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
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						id: expect.any(String),
						name: 'myColumn1',
						type: 'string',
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						createdAt: expect.any(Date),
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						updatedAt: expect.any(Date),
						index: 0,
					},
					{
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						id: expect.any(String),
						name: 'myColumn2',
						type: 'number',
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						createdAt: expect.any(Date),
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						updatedAt: expect.any(Date),
						index: 1,
					},
					{
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						id: expect.any(String),
						name: 'myColumn3',
						type: 'number',
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						createdAt: expect.any(Date),
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						updatedAt: expect.any(Date),
						index: 2,
					},
					{
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						id: expect.any(String),
						name: 'myColumn4',
						type: 'date',
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						createdAt: expect.any(Date),
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
			const result = await dataStoreService.insertRows(dataStoreId, project1.id, rows);

			// ASSERT
			expect(result).toBe(true);

			const { count, data } = await dataStoreService.getManyRowsAndCount(
				dataStoreId,
				project1.id,
				{},
			);
			expect(count).toEqual(4);
			expect(data).toEqual(
				rows.map((row, i) => ({
					...row,
					id: i + 1,
					c1: row.c1,
					c2: row.c2,
					c3: row.c3 instanceof Date ? row.c3.toISOString() : row.c3,
					c4: row.c4,
				})),
			);
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
			await dataStoreService.insertRows(dataStoreId, project1.id, [{ c1: 1, c2: 'foo' }]);

			// Attempt to insert a row with the same primary key
			const result = await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ c1: 1, c2: 'foo' },
			]);

			// ASSERT
			expect(result).toBe(true);

			const { count, data } = await dataStoreRowsRepository.getManyAndCount(
				toTableName(dataStoreId),
				{},
			);

			expect(count).toEqual(2);
			expect(data).toEqual([
				{ c1: 1, c2: 'foo', id: 1 },
				{ c1: 1, c2: 'foo', id: 2 },
			]);
		});

		it('rejects a mismatched row with extra column', async () => {
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
			const result = dataStoreService.insertRows(dataStoreId, project1.id, [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ cWrong: 3, c1: 4, c2: true, c3: new Date(), c4: 'hello?' },
			]);

			// ASSERT
			await expect(result).rejects.toThrow(new DataStoreValidationError('mismatched key count'));
		});

		it('rejects a mismatched row with missing column', async () => {
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
			const result = dataStoreService.insertRows(dataStoreId, project1.id, [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ c2: true, c3: new Date(), c4: 'hello?' },
			]);

			// ASSERT
			await expect(result).rejects.toThrow(new DataStoreValidationError('mismatched key count'));
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
			const result = dataStoreService.insertRows(dataStoreId, project1.id, [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ cWrong: 3, c2: true, c3: new Date(), c4: 'hello?' },
			]);

			// ASSERT
			await expect(result).rejects.toThrow(new DataStoreValidationError('unknown column name'));
		});

		it('rejects a invalid date string to date column', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'c1', type: 'date' }],
			});

			// ACT
			const result = dataStoreService.insertRows(dataStoreId, project1.id, [
				{ c1: '2025-99-15T09:48:14.259Z' },
			]);

			// ASSERT
			await expect(result).rejects.toThrow(
				new DataStoreValidationError(
					"value '2025-99-15T09:48:14.259Z' does not match column type 'date'",
				),
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
			const result = dataStoreService.insertRows('this is not an id', project1.id, [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ cWrong: 3, c2: true, c3: new Date(), c4: 'hello?' },
			]);

			// ASSERT
			await expect(result).rejects.toThrow(DataStoreNotFoundError);
		});

		it('rejects on empty column list', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [],
			});

			// ACT
			const result = dataStoreService.insertRows(dataStoreId, project1.id, [{}, {}]);

			// ASSERT
			await expect(result).rejects.toThrow(
				new DataStoreValidationError(
					'No columns found for this data store or data store not found',
				),
			);
		});

		it('fails on type mismatch', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'c1', type: 'number' }],
			});

			// ACT
			const result = dataStoreService.insertRows(dataStoreId, project1.id, [
				{ c1: 3 },
				{ c1: true },
			]);

			// ASSERT
			await expect(result).rejects.toThrow(
				new DataStoreValidationError("value 'true' does not match column type 'number'"),
			);
		});
	});

	describe('upsertRows', () => {
		it('updates a row if filter matches', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'pid', type: 'string' },
					{ name: 'fullName', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			// Insert initial row
			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ pid: '1995-111a', fullName: 'Alice', age: 30 },
			]);

			// ACT
			const result = await dataStoreService.upsertRows(dataStoreId, project1.id, {
				rows: [{ pid: '1995-111a', fullName: 'Alicia', age: 31 }],
				matchFields: ['pid'],
			});

			// ASSERT
			expect(result).toBe(true);

			const { count, data } = await dataStoreRowsRepository.getManyAndCount(
				toTableName(dataStoreId),
				{},
			);

			expect(count).toEqual(1);
			expect(data).toEqual([{ fullName: 'Alicia', age: 31, id: 1, pid: '1995-111a' }]);
		});

		it('inserts a row if filter does not match', async () => {
			// ARRANGE
			const { id: dataStoreId } = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [
					{ name: 'pid', type: 'string' },
					{ name: 'fullName', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});

			// Insert initial row
			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ pid: '1995-111a', fullName: 'Alice', age: 30 },
			]);

			// ACT
			const result = await dataStoreService.upsertRows(dataStoreId, project1.id, {
				rows: [{ pid: '1992-222b', fullName: 'Alice', age: 30 }],
				matchFields: ['pid'],
			});

			// ASSERT
			expect(result).toBe(true);

			const { count, data } = await dataStoreRowsRepository.getManyAndCount(
				toTableName(dataStoreId),
				{},
			);

			expect(count).toEqual(2);
			expect(data).toEqual([
				{ fullName: 'Alice', age: 30, id: 1, pid: '1995-111a' },
				{ fullName: 'Alice', age: 30, id: 2, pid: '1992-222b' },
			]);
		});
	});

	describe('deleteRows', () => {
		it('deletes rows by IDs', async () => {
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
			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
				{ name: 'Charlie', age: 35 },
			]);

			// Get initial data to find row IDs
			const initialData = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(initialData.count).toBe(3);

			// ACT - Delete first and third rows
			const result = await dataStoreService.deleteRows(dataStoreId, project1.id, [1, 3]);

			// ASSERT
			expect(result).toBe(true);

			const rows = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(rows.count).toBe(1);
			expect(rows.data).toEqual([{ name: 'Bob', age: 25, id: 2 }]);
		});

		it('returns true when deleting empty list of IDs', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'name', type: 'string' }],
			});
			const { id: dataStoreId } = dataStore;

			// ACT
			const result = await dataStoreService.deleteRows(dataStoreId, project1.id, []);

			// ASSERT
			expect(result).toBe(true);
		});

		it('fails when trying to delete from non-existent data store', async () => {
			// ACT & ASSERT
			const result = dataStoreService.deleteRows('non-existent-id', project1.id, [1, 2]);

			await expect(result).rejects.toThrow(DataStoreNotFoundError);
		});

		it('succeeds even if some IDs do not exist', async () => {
			// ARRANGE
			const dataStore = await dataStoreService.createDataStore(project1.id, {
				name: 'dataStore',
				columns: [{ name: 'name', type: 'string' }],
			});
			const { id: dataStoreId } = dataStore;

			// Insert one row
			await dataStoreService.insertRows(dataStoreId, project1.id, [{ name: 'Alice' }]);

			// ACT - Try to delete existing and non-existing IDs
			const result = await dataStoreService.deleteRows(dataStoreId, project1.id, [1, 999, 1000]);

			// ASSERT
			expect(result).toBe(true);

			const { count } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(count).toBe(0);
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
				],
			});

			await dataStoreService.insertRows(dataStoreId, project1.id, [
				{ name: 'Alice', age: 30, active: true },
				{ name: 'Bob', age: 25, active: false },
			]);

			// ACT
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { name: 'Alice' },
				data: { age: 31, active: false },
			});

			// ASSERT
			expect(result).toBe(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					{ id: 1, name: 'Alice', age: 31, active: false },
					{ id: 2, name: 'Bob', age: 25, active: false },
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
				{ name: 'Alice', age: 30, active: true },
				{ name: 'Bob', age: 25, active: false },
			]);

			// ACT
			const result = await dataStoreService.updateRow(dataStoreId, project1.id, {
				filter: { id: 1 },
				data: { name: 'Alicia', age: 31, active: false },
			});

			// ASSERT
			expect(result).toBe(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					{ id: 1, name: 'Alicia', age: 31, active: false },
					{ id: 2, name: 'Bob', age: 25, active: false },
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
				filter: { name: 'Alice', age: 30 },
				data: { department: 'Management' },
			});

			// ASSERT
			expect(result).toBe(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual(
				expect.arrayContaining([
					{ id: 1, name: 'Alice', age: 30, department: 'Management' },
					{ id: 2, name: 'Alice', age: 25, department: 'Marketing' },
					{ id: 3, name: 'Bob', age: 30, department: 'Engineering' },
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
				filter: { name: 'Charlie' },
				data: { age: 25 },
			});

			// ASSERT
			expect(result).toBe(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual([{ id: 1, name: 'Alice', age: 30 }]);
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
				filter: {},
				data: { name: 'Alice', age: 31 },
			});

			// ASSERT
			await expect(result).rejects.toThrow(
				new DataStoreValidationError('Filter columns must not be empty for updateRow'),
			);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual([{ id: 1, name: 'Alice', age: 30 }]);
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
				filter: { name: 'Alice' },
				data: {},
			});

			// ASSERT
			await expect(result).rejects.toThrow(
				new DataStoreValidationError('Data columns must not be empty for updateRow'),
			);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual([{ id: 1, name: 'Alice', age: 30 }]);
		});

		it('should fail when data store does not exist', async () => {
			// ACT & ASSERT
			const result = dataStoreService.updateRow('non-existent-id', project1.id, {
				filter: { name: 'Alice' },
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
				filter: { name: 'Alice' },
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
				filter: { invalidColumn: 'Alice' },
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
				filter: { name: 'Alice' },
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
				filter: { name: 'Alice' },
				data: { age: 31 },
			});

			// ASSERT
			expect(result).toBe(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual([{ id: 1, name: 'Alice', age: 31, active: true }]);
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
				filter: { name: 'Alice' },
				data: { birthDate: newDate.toISOString() },
			});

			// ASSERT
			expect(result).toBe(true);

			const { data } = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});
			expect(data).toEqual([{ id: 1, name: 'Alice', birthDate: newDate.toISOString() }]);
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
				{ c1: 3, c2: true, c3: new Date(0), c4: 'hello?' },
				{ c1: 4, c2: false, c3: new Date(1), c4: 'hello!' },
				{ c1: 5, c2: true, c3: new Date(2), c4: 'hello.' },
			];

			await dataStoreService.insertRows(dataStoreId, project1.id, rows);

			// ACT
			const result = await dataStoreService.getManyRowsAndCount(dataStoreId, project1.id, {});

			// ASSERT
			expect(result.count).toEqual(3);
			// Assuming IDs are auto-incremented starting from 1
			expect(result.data).toEqual([
				{ c1: rows[0].c1, c2: rows[0].c2, c3: '1970-01-01T00:00:00.000Z', c4: rows[0].c4, id: 1 },
				{ c1: rows[1].c1, c2: rows[1].c2, c3: '1970-01-01T00:00:00.001Z', c4: rows[1].c4, id: 2 },
				{ c1: rows[2].c1, c2: rows[2].c2, c3: '1970-01-01T00:00:00.002Z', c4: rows[2].c4, id: 3 },
			]);
		});
	});
});
