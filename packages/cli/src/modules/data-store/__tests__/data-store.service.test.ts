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

		dataStore1 = (await dataStoreService.createDataStore({
			name: 'myDataStore1',
			columns: [],
			projectId: project1.id,
		})) as DataStoreEntity;
		dataStore2 = (await dataStoreService.createDataStore({
			name: 'myDataStore2',
			columns: [],
			projectId: project2.id,
		})) as DataStoreEntity;
	});

	afterEach(async () => {
		// this kinda sucks
		await dataStoreService.deleteDataStoreAll();
	});

	describe('createDataStore', () => {
		it('should succeed with existing name in different project', async () => {
			// ACT
			const result = await dataStoreService.createDataStore({
				name: 'myDataStore2',
				columns: [],
				projectId: project1.id,
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
			const result = await dataStoreService.createDataStore({
				name: 'myDataStore2',
				columns: [],
				projectId: project2.id,
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
			await dataStoreService.createDataStore({
				name,
				columns: [],
				projectId: dataStore1.projectId,
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
				filter: { name: dataStore1.name },
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
			// ACT
			const result = await dataStoreService.getManyAndCount({
				filter: { id: [dataStore1.id, dataStore2.id] },
			});

			// ASSERT
			expect(result[0]).toHaveLength(2);
			expect(result[0]).toContainEqual({ ...dataStore2, project: expect.any(Project) });
			expect(result[0]).toContainEqual({ ...dataStore1, project: expect.any(Project) });
			expect(result[1]).toEqual(2);
		});
		it('should retrieve by projectId', async () => {
			// ARRANGE
			const names = [dataStore1.name];
			for (let i = 0; i < 10; ++i) {
				const ds = (await dataStoreService.createDataStore({
					name: `anotherDataStore${i}`,
					projectId: project1.id,
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
				const ds = (await dataStoreService.createDataStore({
					name: `anotherDataStore${i}`,
					projectId: project1.id,
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
				filter: { id: dataStore1.id },
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
	});
});
