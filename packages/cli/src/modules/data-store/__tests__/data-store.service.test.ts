import type { AddDataStoreColumnDto } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Project } from '@n8n/db';
import { Container } from '@n8n/di';

import type { DataStoreEntity } from '../data-store.entity';
import { DataStoreService } from '../data-store.service';

beforeAll(async () => {
	await testModules.loadModules(['data-store']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['DataStoreEntity']);
	await testDb.truncate(['DataStoreColumnEntity']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('dataStore', () => {
	let dataStoreService: DataStoreService;

	beforeAll(() => {
		dataStoreService = Container.get(DataStoreService);
	});

	let project1: Project;
	let project2: Project;
	let dataStore1: DataStoreEntity;
	let dataStore2: DataStoreEntity;

	beforeEach(async () => {
		project1 = await createTeamProject();
		project2 = await createTeamProject();

		dataStore1 = (await dataStoreService.createDataStore(project1.id, {
			name: 'myDataStore1',
			columns: [],
		})) as DataStoreEntity;
		dataStore2 = (await dataStoreService.createDataStore(project2.id, {
			name: 'myDataStore2',
			columns: [],
		})) as DataStoreEntity;
	});

	afterEach(async () => {
		// this kinda sucks
		await dataStoreService.deleteDataStoreAll();
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
			const result = await dataStoreService.createDataStore(project2.id, {
				name: 'myDataStore2',
				columns: [],
			});

			// ASSERT
			expect(result).toEqual('duplicate data store name in project');
		});
	});

	describe('renameDataStore', () => {
		it('should succeed with renaming to an available name', async () => {
			// ACT
			const result = await dataStoreService.renameDataStore(dataStore1.id, { name: 'aNewName' });

			// ASSERT
			expect(result).toEqual(true);
		});
		it('should fail with renaming non-existent id', async () => {
			// ACT
			const result = await dataStoreService.renameDataStore('this is not an id', {
				name: 'aNewName',
			});

			// ASSERT
			expect(result).toEqual('tried to rename non-existent table');
		});
		it('should fail with renaming to taken name', async () => {
			// ARRANGE
			const name = 'myDataStore3';
			await dataStoreService.createDataStore(dataStore1.projectId, {
				name,
				columns: [],
			});

			// ACT
			const result = await dataStoreService.renameDataStore(dataStore1.id, { name });

			// ASSERT
			expect(result).toEqual('tried to rename to name that is already taken in this project');
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
			const result = await dataStoreService.deleteDataStore('this is not an id');

			// ASSERT
			expect(result).toEqual('tried to delete non-existent table');
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
				// ARRANGE
				const dto: AddDataStoreColumnDto = {
					column,
				};

				// ACT
				const result = await dataStoreService.addColumn(dataStore1.id, dto);

				// ASSERT
				expect(result).toEqual(true);
			}
		});
		it('should fail with adding two columns of the same name', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, {
				column: { name: 'myColumn1', type: 'string' },
			});

			// ACT
			const result = await dataStoreService.addColumn(dataStore1.id, {
				column: {
					name: 'myColumn1',
					type: 'number',
				},
			});

			// ASSERT
			expect(result).toEqual('tried to add column with name already present in this data store');
		});

		it('should fail with adding column of non-existent table', async () => {
			// ACT
			const result = await dataStoreService.addColumn('this is not an id', {
				column: {
					name: 'myColumn1',
					type: 'number',
				},
			});

			// ASSERT
			expect(result).toEqual('tried to add column to non-existent table');
		});
	});
	describe('deleteColumn', () => {
		it('should succeed with deleting a column', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, {
				column: { name: 'myColumn1', type: 'string' },
			});

			// ACT
			const result = await dataStoreService.deleteColumn(dataStore1.id, {
				columnName: 'myColumn1',
			});

			// ASSERT
			expect(result).toEqual(true);
		});
		it('should fail when deleting unknown column', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, {
				column: { name: 'myColumn1', type: 'string' },
			});

			// ACT
			const result = await dataStoreService.deleteColumn(dataStore1.id, {
				columnName: 'myColumn2',
			});

			// ASSERT
			expect(result).toEqual('tried to delete column with name not present in this data store');
		});
		it('should fail when deleting column from unknown table', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, {
				column: { name: 'myColumn1', type: 'string' },
			});

			// ACT
			const result = await dataStoreService.deleteColumn('this is not an id', {
				columnName: 'myColumn1',
			});

			// ASSERT
			expect(result).toEqual('tried to delete columns from non-existent table');
		});
	});
	describe('getManyAndCount', () => {
		it('should retrieve by name', async () => {
			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id, name: dataStore1.name },
			});

			// ASSERT
			expect(result[0]).toHaveLength(1);
			expect(result[0][0]).toEqual({ ...dataStore1, project: expect.any(Project) });
			expect(result[0][0].project).toEqual({
				icon: null,
				id: project1.id,
				name: project1.name,
				type: project1.type,
			});
			expect(result[1]).toEqual(1);
		});
		it('should retrieve by ids', async () => {
			// ARRANGE
			const dataStore3 = (await dataStoreService.createDataStore(project1.id, {
				name: 'myDataStore3',
				columns: [],
			})) as DataStoreEntity;

			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id, id: [dataStore1.id, dataStore3.id] },
			});

			// ASSERT
			expect(result[0]).toHaveLength(2);
			expect(result[0]).toContainEqual({ ...dataStore3, project: expect.any(Project) });
			expect(result[0]).toContainEqual({ ...dataStore1, project: expect.any(Project) });
			expect(result[1]).toEqual(2);
		});
		it('should retrieve by projectId', async () => {
			// ARRANGE
			const names = [dataStore1.name];
			for (let i = 0; i < 10; ++i) {
				const ds = (await dataStoreService.createDataStore(project1.id, {
					name: `anotherDataStore${i}`,
					columns: [],
				})) as DataStoreEntity;
				names.push(ds.name);
			}

			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id },
			});

			// ASSERT
			expect(result[0].map((x) => x.name).sort()).toEqual(names.sort());
			expect(result[1]).toEqual(11);
		});
		it('should retrieve by id with pagination', async () => {
			// ARRANGE
			const names = [dataStore1.name];
			for (let i = 0; i < 10; ++i) {
				const ds = (await dataStoreService.createDataStore(project1.id, {
					name: `anotherDataStore${i}`,
					columns: [],
				})) as DataStoreEntity;
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
			});

			// ASSERT
			expect(p0[1]).toBe(11);
			expect(p0[0]).toHaveLength(3);

			expect(p1[1]).toBe(11);
			expect(p1[0]).toHaveLength(3);

			expect(rest[1]).toBe(11);
			expect(rest[0]).toHaveLength(5);

			expect(
				p0[0]
					.concat(p1[0])
					.concat(rest[0])
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
				await dataStoreService.addColumn(dataStore1.id, { column });
			}

			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { projectId: project1.id, id: dataStore1.id },
			});

			// ASSERT
			expect(result[1]).toEqual(1);
			expect(result[0][0].columns).toEqual([
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
			const ds0 = (await dataStoreService.createDataStore(project1.id, {
				name: 'ds0',
				columns: [],
			})) as DataStoreEntity;

			const ds1 = (await dataStoreService.createDataStore(project1.id, {
				name: 'ds3',
				columns: [],
			})) as DataStoreEntity;
			const ds2 = (await dataStoreService.createDataStore(project1.id, {
				name: 'ds2',
				columns: [],
			})) as DataStoreEntity;

			await dataStoreService.renameDataStore(ds1.id, { name: 'ds1' });

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
			expect(createdAsc[0].map((x) => x.name)).toEqual(['ds0', 'ds1', 'ds2']);
			expect(createdDesc[0].map((x) => x.name)).toEqual(['ds2', 'ds1', 'ds0']);
			expect(updatedAsc[0].map((x) => x.name)).toEqual(['ds1', 'ds0', 'ds2']);
			expect(updatedDesc[0].map((x) => x.name)).toEqual(['ds2', 'ds0', 'ds1']);
			expect(nameAsc[0].map((x) => x.name)).toEqual(['ds0', 'ds1', 'ds2']);
			expect(nameDesc[0].map((x) => x.name)).toEqual(['ds2', 'ds1', 'ds0']);
			expect(sizeBytesAsc[0].map((x) => x.name)).toEqual(['ds0', 'ds1', 'ds2']);
			expect(sizeBytesDesc[0].map((x) => x.name)).toEqual(['ds0', 'ds1', 'ds2']);
		});
	});
	describe('appendRows', () => {
		it('appends a row to an existing table', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c1', type: 'number' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c2', type: 'boolean' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c3', type: 'date' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c4', type: 'string' } });

			// ACT
			const result = await dataStoreService.appendRows(dataStore1.id, [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ c1: 4, c2: false, c3: new Date(), c4: 'hello!' },
				{ c1: 5, c2: true, c3: new Date(), c4: 'hello.' },
			]);

			// ASSERT
			expect(result).toBe(true);
		});

		it('rejects a mismatched row with extra column', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c1', type: 'number' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c2', type: 'boolean' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c3', type: 'date' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c4', type: 'string' } });

			// ACT
			const result = await dataStoreService.appendRows(dataStore1.id, [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ cWrong: 3, c1: 4, c2: true, c3: new Date(), c4: 'hello?' },
			]);

			// ASSERT
			expect(result).toBe('mismatched key count');
		});
		it('rejects a mismatched row with missing column', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c1', type: 'number' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c2', type: 'boolean' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c3', type: 'date' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c4', type: 'string' } });

			// ACT
			const result = await dataStoreService.appendRows(dataStore1.id, [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ c2: true, c3: new Date(), c4: 'hello?' },
			]);

			// ASSERT
			expect(result).toBe('mismatched key count');
		});
		it('rejects a mismatched row with replaced column', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c1', type: 'number' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c2', type: 'boolean' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c3', type: 'date' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c4', type: 'string' } });

			// ACT
			const result = await dataStoreService.appendRows(dataStore1.id, [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ cWrong: 3, c2: true, c3: new Date(), c4: 'hello?' },
			]);

			// ASSERT
			expect(result).toBe('unknown column name');
		});
		it('rejects unknown data store id', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c1', type: 'number' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c2', type: 'boolean' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c3', type: 'date' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c4', type: 'string' } });

			// ACT
			const result = await dataStoreService.appendRows('this is not an id', [
				{ c1: 3, c2: true, c3: new Date(), c4: 'hello?' },
				{ cWrong: 3, c2: true, c3: new Date(), c4: 'hello?' },
			]);

			// ASSERT
			expect(result).toBe('no columns found for id');
		});
		it('fails on type mismatch', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c1', type: 'number' } });

			// ACT
			const result = await dataStoreService.appendRows(dataStore1.id, [{ c1: 3 }, { c1: true }]);

			// ASSERT
			expect(result).toBe('type mismatch');
		});
	});
	describe('getManyRowsAndCount', () => {
		it('retrieves rows correctly', async () => {
			// ARRANGE
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c1', type: 'number' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c2', type: 'boolean' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c3', type: 'date' } });
			await dataStoreService.addColumn(dataStore1.id, { column: { name: 'c4', type: 'string' } });

			await dataStoreService.appendRows(dataStore1.id, [
				{ c1: 3, c2: true, c3: new Date(0), c4: 'hello?' },
				{ c1: 4, c2: false, c3: new Date(1), c4: 'hello!' },
				{ c1: 5, c2: true, c3: new Date(2), c4: 'hello.' },
			]);

			// ACT
			const result = await dataStoreService.getManyRowsAndCount(dataStore1.id, {});

			// ASSERT
			expect(result).toEqual([
				3,
				[
					{ c1: 3, c2: 1, c3: '1970-01-01T00:00:00.000Z', c4: 'hello?', id: 1 },
					{ c1: 4, c2: 0, c3: '1970-01-01T00:00:00.001Z', c4: 'hello!', id: 2 },
					{ c1: 5, c2: 1, c3: '1970-01-01T00:00:00.002Z', c4: 'hello.', id: 3 },
				],
			]);
		});
	});
});
