import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
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
			projectId: project1.id,
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
			expect(result).toEqual('duplicate data store name in project');
		});
		it('should return an error if name/project combination already exists', async () => {
			// ACT
			const result = await dataStoreService.createDataStore({
				name: 'myDataStore2',
				columns: [],
				projectId: project1.id,
			});

			// ASSERT
			expect(result).toEqual('duplicate data store name in project');
		});
	});
});
