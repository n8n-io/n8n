import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRelationRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { createUser } from '@test-integration/db/users';

import { DataStoreAggregateService } from '../data-store-aggregate.service';
import { DataStoreService } from '../data-store.service';

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

describe('dataStoreAggregate', () => {
	let dataStoreService: DataStoreService;
	let dataStoreAggregateService: DataStoreAggregateService;
	const manager = mock<EntityManager>();
	const projectRelationRepository = mock<ProjectRelationRepository>({ manager });

	beforeAll(() => {
		Container.set(ProjectRelationRepository, projectRelationRepository);
		dataStoreAggregateService = Container.get(DataStoreAggregateService);
		dataStoreService = Container.get(DataStoreService);
	});

	let user: User;
	let project1: Project;
	let project2: Project;

	beforeEach(async () => {
		project1 = await createTeamProject();
		project2 = await createTeamProject();
		user = await createUser({ role: 'global:owner' });
	});

	afterEach(async () => {
		// Clean up any created user data stores
		await dataStoreService.deleteDataStoreAll();
	});

	describe('getManyAndCount', () => {
		it('should return the correct data stores for the user', async () => {
			// ARRANGE
			const ds1 = await dataStoreService.createDataStore(project1.id, {
				name: 'store1',
				columns: [],
			});
			const ds2 = await dataStoreService.createDataStore(project1.id, {
				name: 'store2',
				columns: [],
			});

			projectRelationRepository.find.mockResolvedValueOnce([
				{
					userId: user.id,
					projectId: project1.id,
					role: 'project:admin',
					user,
					project: project1,
					createdAt: new Date(),
					updatedAt: new Date(),
					setUpdateDate: jest.fn(),
				},
				{
					userId: user.id,
					projectId: project2.id,
					role: 'project:viewer',
					user,
					project: project2,
					createdAt: new Date(),
					updatedAt: new Date(),
					setUpdateDate: jest.fn(),
				},
			]);

			await dataStoreService.createDataStore(project2.id, {
				name: 'store3',
				columns: [],
			});

			// ACT
			const result = await dataStoreAggregateService.getManyAndCount(user, {
				filter: { projectId: project1.id },
				skip: 0,
				take: 10,
			});

			// ASSERT
			expect(result.data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: ds1.id, name: ds1.name }),
					expect.objectContaining({ id: ds2.id, name: ds2.name }),
				]),
			);
			expect(result.count).toBe(2);
		});

		it('should return an empty array if user has no access to any project', async () => {
			// ARRANGE
			const currentUser = await createUser({ role: 'global:member' });

			await dataStoreService.createDataStore(project1.id, {
				name: 'store1',
				columns: [],
			});
			projectRelationRepository.find.mockResolvedValueOnce([]);

			// ACT
			const result = await dataStoreAggregateService.getManyAndCount(currentUser, {
				skip: 0,
				take: 10,
			});

			// ASSERT
			expect(result.data).toEqual([]);
			expect(result.count).toBe(0);
		});

		it('should return only the data store matching the given data store id filter', async () => {
			// ARRANGE
			await dataStoreService.createDataStore(project1.id, {
				name: 'store1',
				columns: [],
			});
			const ds2 = await dataStoreService.createDataStore(project1.id, {
				name: 'store2',
				columns: [],
			});
			projectRelationRepository.find.mockResolvedValueOnce([
				{
					userId: user.id,
					projectId: project1.id,
					role: 'project:admin',
					user,
					project: project1,
					createdAt: new Date(),
					updatedAt: new Date(),
					setUpdateDate: jest.fn(),
				},
				{
					userId: user.id,
					projectId: project2.id,
					role: 'project:viewer',
					user,
					project: project2,
					createdAt: new Date(),
					updatedAt: new Date(),
					setUpdateDate: jest.fn(),
				},
			]);

			// ACT
			const result = await dataStoreAggregateService.getManyAndCount(user, {
				filter: { id: ds2.id },
				skip: 0,
				take: 10,
			});

			// ASSERT
			expect(result.data).toEqual([expect.objectContaining({ id: ds2.id, name: ds2.name })]);
			expect(result.count).toBe(1);
		});

		it('should respect pagination (skip/take)', async () => {
			// ARRANGE
			const ds1 = await dataStoreService.createDataStore(project1.id, {
				name: 'store1',
				columns: [],
			});
			const ds2 = await dataStoreService.createDataStore(project1.id, {
				name: 'store2',
				columns: [],
			});
			const ds3 = await dataStoreService.createDataStore(project1.id, {
				name: 'store3',
				columns: [],
			});
			projectRelationRepository.find.mockResolvedValueOnce([
				{
					userId: user.id,
					projectId: project1.id,
					role: 'project:admin',
					user,
					project: project1,
					createdAt: new Date(),
					updatedAt: new Date(),
					setUpdateDate: jest.fn(),
				},
			]);

			// ACT
			const result = await dataStoreAggregateService.getManyAndCount(user, {
				filter: { projectId: project1.id },
				skip: 1,
				take: 1,
			});

			// ASSERT
			expect(result.data.length).toBe(1);
			expect([ds1.id, ds2.id, ds3.id]).toContain(result.data[0].id);
			expect(result.count).toBe(3);
		});
	});
});
