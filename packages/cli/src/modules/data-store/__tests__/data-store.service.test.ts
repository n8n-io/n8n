import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Project } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataStoreRowsRepository } from '../data-store-rows.repository';
import type { DataStoreEntity } from '../data-store.entity';
import { DataStoreRepository } from '../data-store.repository';
import { DataStoreService } from '../data-store.service';
import { toTableName } from '../utils/sql-utils';

beforeAll(async () => {
	await testModules.loadModules(['data-store']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['DataStoreEntity', 'DataStoreColumnEntity']);
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
	let dataStore1: DataStoreEntity;

	beforeEach(async () => {
		project1 = await createTeamProject();
		project2 = await createTeamProject();

		dataStore1 = await dataStoreService.createDataStore(project1.id, {
			name: 'myDataStore1',
			columns: [],
		});
		await dataStoreService.createDataStore(project2.id, {
			name: 'myDataStore2',
			columns: [],
		});
	});

	afterEach(async () => {
		// Clean up any created user data stores
		await dataStoreService.deleteDataStoreAll();
	});

	describe('createDataStoreRaw', () => {
		it('should succeed with existing name in different project', async () => {
			// ACT
			const result = await dataStoreService.createDataStoreRaw(project1.id, {
				name: 'myDataStore2',
				columns: [],
			});

			// ASSERT
			expect(result).toEqual({
				columns: [],
				createdAt: expect.any(Date),
				id: expect.any(String),
				name: 'myDataStore2',
				projectId: project1.id,
				sizeBytes: 0,
				updatedAt: expect.any(Date),
			});
		});

		it('should return an error if name/project combination already exists', async () => {
			// ACT
			const result = dataStoreService.createDataStoreRaw(project2.id, {
				name: 'myDataStore2',
				columns: [],
			});

			// ASSERT
			await expect(result).rejects.toThrow(
				"Data store with name 'myDataStore2' already exists in this project",
			);
		});
	});

	describe('createDataStore', () => {
		it('should succeed with existing name in different project', async () => {
			// ACT
			const result = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore2',
				columns: [],
			});

			// ASSERT
			expect(result).toEqual({
				columns: [],
				createdAt: expect.any(Date),
				id: expect.any(String),
				name: 'myDataStore2',
				projectId: project1.id,
				sizeBytes: 0,
				updatedAt: expect.any(Date),
			});
		});

		it('should return an error if name/project combination already exists', async () => {
			// ACT
			const result = dataStoreService.createDataStore(project2.id, {
				name: 'myDataStore2',
				columns: [],
			});

			// ASSERT
			await expect(result).rejects.toThrow(
				"Data store with name 'myDataStore2' already exists in this project",
			);
		});
	});

	describe('updateDataStore', () => {
		it('should succeed when renaming to an available name', async () => {
			// ACT
			const result = await dataStoreService.updateDataStore(dataStore1.id, { name: 'aNewName' });

			// ASSERT
			expect(result).toEqual(true);

			const updated = await dataStoreRepository.findOneBy({ id: dataStore1.id });
			expect(updated?.name).toBe('aNewName');
		});

		it('should fail when renaming to a non-existent id', async () => {
			// ACT
			const result = dataStoreService.updateDataStore('this is not an id', {
				name: 'aNewName',
			});

			// ASSERT
			await expect(result).rejects.toThrow(
				"Tried to rename non-existent data store 'this is not an id'",
			);
		});

		it('should fail when renaming to an empty name', async () => {
			// ACT
			const result = dataStoreService.updateDataStore(dataStore1.id, { name: '' });

			// ASSERT
			await expect(result).rejects.toThrow('Data store name must not be empty');
		});

		it('should trim the name', async () => {
			// ACT
			const result = dataStoreService.updateDataStore(dataStore1.id, { name: '   aNewName  ' });

			// ASSERT
			await expect(result).resolves.toEqual(true);

			const updated = await dataStoreRepository.findOneBy({ id: dataStore1.id });
			expect(updated?.name).toBe('aNewName');
		});

		it('should fail when renaming to a taken name', async () => {
			// ARRANGE
			const name = 'myDataStore3';
			await dataStoreService.createDataStore(dataStore1.projectId, {
				name,
				columns: [],
			});

			// ACT
			const result = dataStoreService.updateDataStore(dataStore1.id, { name });

			// ASSERT
			await expect(result).rejects.toThrow(
				"The name 'myDataStore3' is already taken within this project",
			);
		});
	});

	describe('deleteDataStore', () => {
		it('should succeed with deleting a store', async () => {
			// ACT
			const result = await dataStoreService.deleteDataStore(dataStore1.id);

			// ASSERT
			expect(result).toEqual(true);
		});

		it('should fail with deleting non-existent id', async () => {
			// ACT
			const result = dataStoreService.deleteDataStore('this is not an id');

			// ASSERT
			await expect(result).rejects.toThrow(
				"Tried to delete non-existent data store 'this is not an id'",
			);
		});
	});

	describe('addColumn', () => {
		it('should succeed with adding column', async () => {
			const columns = [
				{ name: 'myColumn1', type: 'string' },
				{ name: 'myColumn2', type: 'number' },
				{ name: 'myColumn3', type: 'number' },
				{ name: 'myColumn4', type: 'date' },
			] as const;
			for (const column of columns) {
				// ACT
				const result = await dataStoreService.addColumn(dataStore1.id, column);

				// ASSERT
				expect(result).toMatchObject(column);
			}
			const columnResult = await dataStoreService.getColumns(dataStore1.id);
			expect(columnResult).toEqual([
				{
					columnIndex: 0,
					dataStoreId: dataStore1.id,
					id: expect.any(String),
					name: 'myColumn1',
					type: 'string',
				},
				{
					columnIndex: 1,
					dataStoreId: dataStore1.id,
					id: expect.any(String),
					name: 'myColumn2',
					type: 'number',
				},
				{
					columnIndex: 2,
					dataStoreId: dataStore1.id,
					id: expect.any(String),
					name: 'myColumn3',
					type: 'number',
				},
				{
					columnIndex: 3,
					dataStoreId: dataStore1.id,
					id: expect.any(String),
					name: 'myColumn4',
					type: 'date',
				},
			]);
		});

		it('should fail with adding two columns of the same name', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, {
				name: 'myColumn1',
				type: 'string',
			});

			// ACT
			const result = dataStoreService.addColumn(dataStore1.id, {
				name: 'myColumn1',
				type: 'number',
			});

			// ASSERT
			await expect(result).rejects.toThrow(
				`column name 'myColumn1' already taken in data store '${dataStore1.id}'`,
			);
		});

		it('should fail with adding column of non-existent table', async () => {
			// ACT
			const result = dataStoreService.addColumn('this is not an id', {
				name: 'myColumn1',
				type: 'number',
			});

			// ASSERT
			await expect(result).rejects.toThrow(
				"Tried to add column to non-existent data store 'this is not an id'",
			);
		});
	});

	describe('deleteColumn', () => {
		it('should succeed with deleting a column', async () => {
			// ARRANGE
			const c1 = await dataStoreService.addColumn(dataStore1.id, {
				name: 'myColumn1',
				type: 'string',
			});
			const c2 = await dataStoreService.addColumn(dataStore1.id, {
				name: 'myColumn2',
				type: 'number',
			});
			// ACT
			const result = await dataStoreService.deleteColumn(dataStore1.id, {
				columnId: c1.id,
			});

			// ASSERT
			expect(result).toEqual(true);

			const columns = await dataStoreService.getColumns(dataStore1.id);
			expect(columns).toEqual([
				{
					columnIndex: 0,
					dataStoreId: dataStore1.id,
					id: c2.id,
					name: 'myColumn2',
					type: 'number',
				},
			]);
		});

		it('should fail when deleting unknown column', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, {
				name: 'myColumn1',
				type: 'string',
			});

			// ACT
			const result = dataStoreService.deleteColumn(dataStore1.id, {
				columnId: 'thisIsNotAnId',
			});

			// ASSERT
			await expect(result).rejects.toThrow(
				`Tried to delete column with name not present in data store '${dataStore1.id}'`,
			);
		});

		it('should fail when deleting column from unknown table', async () => {
			// ARRANGE
			const c1 = await dataStoreService.addColumn(dataStore1.id, {
				name: 'myColumn1',
				type: 'string',
			});

			// ACT
			const result = dataStoreService.deleteColumn('this is not an id', {
				columnId: c1.id,
			});

			// ASSERT
			await expect(result).rejects.toThrow(
				"Tried to delete column from non-existent data store 'this is not an id'",
			);
		});
	});

	describe('moveColumn', () => {
		it('should succeed with moving a column', async () => {
			// ARRANGE
			const c1 = await dataStoreService.addColumn(dataStore1.id, {
				name: 'myColumn1',
				type: 'string',
			});
			const c2 = await dataStoreService.addColumn(dataStore1.id, {
				name: 'myColumn2',
				type: 'number',
			});
			// ACT
			const result = await dataStoreService.moveColumn(dataStore1.id, c2.id, {
				targetIndex: 0,
			});

			// ASSERT
			expect(result).toEqual(true);

			const columns = await dataStoreService.getColumns(dataStore1.id);
			expect(columns).toMatchObject([
				{
					columnIndex: 1,
					dataStoreId: dataStore1.id,
					id: c1.id,
					name: 'myColumn1',
					type: 'string',
				},
				{
					columnIndex: 0,
					dataStoreId: dataStore1.id,
					id: c2.id,
					name: 'myColumn2',
					type: 'number',
				},
			]);
		});
	});

	describe('getManyAndCount', () => {
		it('should retrieve by name', async () => {
			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id, name: dataStore1.name },
			});

			// ASSERT
			expect(result.data).toHaveLength(1);
			expect(result.data[0]).toEqual({ ...dataStore1, project: expect.any(Project) });
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
			const dataStore3 = await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore3',
				columns: [],
			});

			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id, id: [dataStore1.id, dataStore3.id] },
			});

			// ASSERT
			expect(result.data).toHaveLength(2);
			expect(result.data).toContainEqual({ ...dataStore3, project: expect.any(Project) });
			expect(result.data).toContainEqual({ ...dataStore1, project: expect.any(Project) });
			expect(result.count).toEqual(2);
		});

		it('should retrieve by projectId', async () => {
			// ARRANGE
			const names = [dataStore1.name];
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
			const names = [dataStore1.name];
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
			const columns = [
				{ name: 'myColumn1', type: 'string' },
				{ name: 'myColumn2', type: 'number' },
				{ name: 'myColumn3', type: 'number' },
				{ name: 'myColumn4', type: 'date' },
			] as const;
			for (const column of columns) {
				await dataStoreService.addColumn(dataStore1.id, column);
			}

			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id, id: dataStore1.id },
			});

			// ASSERT
			expect(result.count).toEqual(1);
			expect(result.data[0].columns).toEqual([
				{
					id: expect.any(String),
					name: 'myColumn1',
					type: 'string',
				},
				{
					id: expect.any(String),
					name: 'myColumn2',
					type: 'number',
				},
				{
					id: expect.any(String),
					name: 'myColumn3',
					type: 'number',
				},
				{
					id: expect.any(String),
					name: 'myColumn4',
					type: 'date',
				},
			]);
		});

		it('sorts as expected', async () => {
			// ARRANGE
			await dataStoreService.deleteDataStoreAll();
			await dataStoreService.createDataStore(project1.id, {
				name: 'ds0',
				columns: [],
			});

			// wait to ensure the right order of createdAt
			await new Promise((resolve) => setTimeout(resolve, 2));
			const ds1 = await dataStoreService.createDataStore(project1.id, {
				name: 'ds3', // renamed to ds1 below
				columns: [],
			});

			// wait to ensure the right order of createdAt
			await new Promise((resolve) => setTimeout(resolve, 2));
			await dataStoreService.createDataStore(project1.id, {
				name: 'ds2',
				columns: [],
			});

			await dataStoreService.updateDataStore(ds1.id, { name: 'ds1' });

			// ACT
			const createdAsc = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id },
				sortBy: 'createdAt:asc',
			});
			const createdDesc = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id },
				sortBy: 'createdAt:desc',
			});
			const nameAsc = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id },
				sortBy: 'name:asc',
			});
			const nameDesc = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id },
				sortBy: 'name:desc',
			});
			const sizeBytesAsc = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id },
				sortBy: 'sizeBytes:asc',
			});
			const sizeBytesDesc = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id },
				sortBy: 'sizeBytes:desc',
			});
			const updatedAsc = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id },
				sortBy: 'updatedAt:asc',
			});
			const updatedDesc = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id },
				sortBy: 'updatedAt:desc',
			});

			// ASSERT
			expect(createdAsc.data.map((x) => x.name)).toEqual(['ds0', 'ds1', 'ds2']);
			expect(createdDesc.data.map((x) => x.name)).toEqual(['ds2', 'ds1', 'ds0']);
			expect(updatedAsc.data.map((x) => x.name)).toEqual(['ds1', 'ds0', 'ds2']);
			expect(updatedDesc.data.map((x) => x.name)).toEqual(['ds2', 'ds0', 'ds1']);
			expect(nameAsc.data.map((x) => x.name)).toEqual(['ds0', 'ds1', 'ds2']);
			expect(nameDesc.data.map((x) => x.name)).toEqual(['ds2', 'ds1', 'ds0']);
			expect(sizeBytesAsc.data.map((x) => x.name)).toEqual(['ds0', 'ds1', 'ds2']);
			expect(sizeBytesDesc.data.map((x) => x.name)).toEqual(['ds0', 'ds1', 'ds2']);
		});
	});

	describe('insertRows', () => {
		it('inserts rows into an existing table', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { name: 'c1', type: 'number' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c2', type: 'boolean' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c3', type: 'date' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c4', type: 'string' });

			// ACT
			const rows = [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ c1: 4, c2: false, c3: new Date(), c4: 'hello!' },
				{ c1: 5, c2: true, c3: new Date(), c4: 'hello.' },
			];
			const result = await dataStoreService.insertRows(dataStore1.id, rows);

			// ASSERT
			expect(result).toBe(true);

			const { count, data } = await dataStoreRowsRepository.getManyAndCount(
				toTableName(dataStore1.id),
				{},
			);
			expect(count).toEqual(3);
			expect(data).toEqual(
				rows.map((row, i) => ({
					...row,
					id: i + 1,
					c2: row.c2 ? 1 : 0, // booleans are stored as numbers in the db
				})),
			);
		});

		it('inserts a row even if it matches with the existing one', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { name: 'c1', type: 'number' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c2', type: 'string' });

			// Insert initial row
			await dataStoreService.insertRows(dataStore1.id, [{ c1: 1, c2: 'foo' }]);

			// Attempt to insert a row with the same primary key
			const result = await dataStoreService.insertRows(dataStore1.id, [{ c1: 1, c2: 'foo' }]);

			// ASSERT
			expect(result).toBe(true);

			const { count, data } = await dataStoreRowsRepository.getManyAndCount(
				toTableName(dataStore1.id),
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
			await dataStoreService.addColumn(dataStore1.id, { name: 'c1', type: 'number' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c2', type: 'boolean' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c3', type: 'date' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c4', type: 'string' });

			// ACT
			const result = dataStoreService.insertRows(dataStore1.id, [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ cWrong: 3, c1: 4, c2: true, c3: new Date(), c4: 'hello?' },
			]);

			// ASSERT
			await expect(result).rejects.toThrow('mismatched key count');
		});

		it('rejects a mismatched row with missing column', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { name: 'c1', type: 'number' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c2', type: 'boolean' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c3', type: 'date' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c4', type: 'string' });

			// ACT
			const result = dataStoreService.insertRows(dataStore1.id, [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ c2: true, c3: new Date(), c4: 'hello?' },
			]);

			// ASSERT
			await expect(result).rejects.toThrow('mismatched key count');
		});

		it('rejects a mismatched row with replaced column', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { name: 'c1', type: 'number' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c2', type: 'boolean' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c3', type: 'date' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c4', type: 'string' });

			// ACT
			const result = dataStoreService.insertRows(dataStore1.id, [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ cWrong: 3, c2: true, c3: new Date(), c4: 'hello?' },
			]);

			// ASSERT
			await expect(result).rejects.toThrow('unknown column name');
		});

		it('rejects unknown data store id', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { name: 'c1', type: 'number' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c2', type: 'boolean' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c3', type: 'date' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c4', type: 'string' });

			// ACT
			const result = dataStoreService.insertRows('this is not an id', [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ cWrong: 3, c2: true, c3: new Date(), c4: 'hello?' },
			]);

			// ASSERT
			await expect(result).rejects.toThrow(
				'No columns found for this data store or data store not found',
			);
		});

		it('rejects on empty column list', async () => {
			// ARRANGE

			// ACT
			const result = dataStoreService.insertRows('this is not an id', [{}, {}]);

			// ASSERT
			await expect(result).rejects.toThrow(
				'No columns found for this data store or data store not found',
			);
		});

		it('fails on type mismatch', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { name: 'c1', type: 'number' });

			// ACT
			const result = dataStoreService.insertRows(dataStore1.id, [{ c1: 3 }, { c1: true }]);

			// ASSERT
			await expect(result).rejects.toThrow("value 'true' does not match column type 'number'");
		});
	});

	describe('upsertRows', () => {
		it('updates a row if filter matches', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { name: 'pid', type: 'string' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'fullName', type: 'string' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'age', type: 'number' });

			// Insert initial row
			await dataStoreService.insertRows(dataStore1.id, [
				{ pid: '1995-111a', fullName: 'Alice', age: 30 },
			]);

			// ACT
			const result = await dataStoreService.upsertRows(dataStore1.id, {
				rows: [{ pid: '1995-111a', fullName: 'Alicia', age: 31 }],
				matchFields: ['pid'],
			});

			// ASSERT
			expect(result).toBe(true);

			const { count, data } = await dataStoreRowsRepository.getManyAndCount(
				toTableName(dataStore1.id),
				{},
			);

			expect(count).toEqual(1);
			expect(data).toEqual([{ fullName: 'Alicia', age: 31, id: 1, pid: '1995-111a' }]);
		});

		it('inserts a row if filter does not match', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { name: 'pid', type: 'string' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'fullName', type: 'string' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'age', type: 'number' });

			// Insert initial row
			await dataStoreService.insertRows(dataStore1.id, [
				{ pid: '1995-111a', fullName: 'Alice', age: 30 },
			]);

			// ACT
			const result = await dataStoreService.upsertRows(dataStore1.id, {
				rows: [{ pid: '1992-222b', fullName: 'Alice', age: 30 }],
				matchFields: ['pid'],
			});

			// ASSERT
			expect(result).toBe(true);

			const { count, data } = await dataStoreRowsRepository.getManyAndCount(
				toTableName(dataStore1.id),
				{},
			);

			expect(count).toEqual(2);
			expect(data).toEqual([
				{ fullName: 'Alice', age: 30, id: 1, pid: '1995-111a' },
				{ fullName: 'Alice', age: 30, id: 2, pid: '1992-222b' },
			]);
		});
	});

	describe('getManyRowsAndCount', () => {
		it('retrieves rows correctly', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { name: 'c1', type: 'number' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c2', type: 'boolean' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c3', type: 'date' });
			await dataStoreService.addColumn(dataStore1.id, { name: 'c4', type: 'string' });

			await dataStoreService.insertRows(dataStore1.id, [
				{ c1: 3, c2: true, c3: new Date(0), c4: 'hello?' },
				{ c1: 4, c2: false, c3: new Date(1), c4: 'hello!' },
				{ c1: 5, c2: true, c3: new Date(2), c4: 'hello.' },
			]);

			// ACT
			const result = await dataStoreService.getManyRowsAndCount(dataStore1.id, {});

			// ASSERT
			expect(result.count).toEqual(3);
			expect(result.data).toEqual([
				{ c1: 3, c2: 1, c3: '1970-01-01T00:00:00.000Z', c4: 'hello?', id: 1 },
				{ c1: 4, c2: 0, c3: '1970-01-01T00:00:00.001Z', c4: 'hello!', id: 2 },
				{ c1: 5, c2: 1, c3: '1970-01-01T00:00:00.002Z', c4: 'hello.', id: 3 },
			]);
		});
	});
});
