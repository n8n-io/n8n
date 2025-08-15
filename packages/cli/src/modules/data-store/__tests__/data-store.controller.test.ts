import type { DataStore } from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDataStore } from '@test-integration/db/data-stores';
import { createOwner, createMember, createAdmin } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';
import { DateTime } from 'luxon';

import { DataStoreRepository } from '../data-store.repository';

let owner: User;
let member: User;
let admin: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let authAdminAgent: SuperAgentTest;
let ownerProject: Project;
let memberProject: Project;

const testServer = utils.setupTestServer({
	endpointGroups: ['data-store'],
	modules: ['data-store'],
});
let projectRepository: ProjectRepository;
let dataStoreRepository: DataStoreRepository;

beforeAll(async () => {
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['DataStore', 'DataStoreColumn', 'Project', 'ProjectRelation']);

	projectRepository = Container.get(ProjectRepository);
	dataStoreRepository = Container.get(DataStoreRepository);

	owner = await createOwner();
	member = await createMember();
	admin = await createAdmin();

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	authAdminAgent = testServer.authAgentFor(admin);

	ownerProject = await getPersonalProject(owner);
	memberProject = await getPersonalProject(member);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('POST /projects/:projectId/data-stores', () => {
	test('should not create data store when project does not exist', async () => {
		const payload = {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test-ccolumn',
					type: 'string',
				},
			],
		};

		await authMemberAgent.post('/projects/non-existing-id/data-stores').send(payload).expect(403);
		await authAdminAgent.post('/projects/non-existing-id/data-stores').send(payload).expect(403);
		await authOwnerAgent.post('/projects/non-existing-id/data-stores').send(payload).expect(403);
	});

	test('should not create data store when name is empty', async () => {
		const project = await createTeamProject(undefined, owner);
		const payload = {
			name: '',
			columns: [
				{
					name: 'test-ccolumn',
					type: 'string',
				},
			],
		};

		await authOwnerAgent.post(`/projects/${project.id}/data-stores`).send(payload).expect(400);
	});

	test('should not create data store if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:viewer');

		const payload = {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test-ccolumn',
					type: 'string',
				},
			],
		};

		await authMemberAgent.post(`/projects/${project.id}/data-stores`).send(payload).expect(403);

		const dataStoresInDb = await dataStoreRepository.find();
		expect(dataStoresInDb).toHaveLength(0);
	});

	test("should not allow creating data store in another user's personal project", async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const payload = {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test-ccolumn',
					type: 'string',
				},
			],
		};

		await authMemberAgent
			.post(`/projects/${ownerPersonalProject.id}/data-stores`)
			.send(payload)
			.expect(403);
	});

	test('should create data store if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:editor');

		const payload = {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test-ccolumn',
					type: 'string',
				},
			],
		};

		await authMemberAgent.post(`/projects/${project.id}/data-stores`).send(payload).expect(200);

		const dataStoresInDb = await dataStoreRepository.find();
		expect(dataStoresInDb).toHaveLength(1);
	});

	test('should create data store if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);

		const payload = {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test-ccolumn',
					type: 'string',
				},
			],
		};

		await authOwnerAgent.post(`/projects/${project.id}/data-stores`).send(payload).expect(200);

		const dataStoresInDb = await dataStoreRepository.find();
		expect(dataStoresInDb).toHaveLength(1);
	});

	test('should create data store in personal project', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const payload = {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test-ccolumn',
					type: 'string',
				},
			],
		};

		const response = await authOwnerAgent
			.post(`/projects/${personalProject.id}/data-stores`)
			.send(payload)
			.expect(200);

		expect(response.body.data).toEqual(
			expect.objectContaining({
				id: expect.any(String),
				name: payload.name,
				projectId: personalProject.id,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			}),
		);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: response.body.data.id });
		expect(dataStoreInDb).toBeDefined();
		expect(dataStoreInDb?.name).toBe(payload.name);
	});
});

describe('GET /projects/:projectId/data-stores', () => {
	test('should not list data stores when project does not exist', async () => {
		await authMemberAgent.get('/projects/non-existing-id/data-stores').expect(403);
		await authAdminAgent.get('/projects/non-existing-id/data-stores').expect(403);
		await authOwnerAgent.get('/projects/non-existing-id/data-stores').expect(403);
	});

	test('should not list data stores if user has no access to project', async () => {
		const project = await createTeamProject('test project', owner);

		await authMemberAgent.get(`/projects/${project.id}/data-stores`).expect(403);
	});

	test('should not list data stores if admin has no access to project', async () => {
		const project = await createTeamProject('test project', owner);

		await authAdminAgent.get(`/projects/${project.id}/data-stores`).expect(403);
	});

	test("should not allow listing data stores from another user's personal project", async () => {
		await authMemberAgent.get(`/projects/${ownerProject.id}/data-stores`).expect(403);
	});

	test('should list data stores if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		await createDataStore(project, { name: 'Test Data Store' });

		const response = await authMemberAgent.get(`/projects/${project.id}/data-stores`).expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Test Data Store');
	});

	test('should list data stores from personal project', async () => {
		await createDataStore(ownerProject, { name: 'Personal Data Store 1' });
		await createDataStore(ownerProject, { name: 'Personal Data Store 2' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-stores`)
			.expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect(response.body.data.data.map((f: any) => f.name).sort()).toEqual(
			['Personal Data Store 1', 'Personal Data Store 2'].sort(),
		);
	});

	test('should filter data stores by projectId', async () => {
		await createDataStore(ownerProject, { name: 'Test Data Store 1' });
		await createDataStore(ownerProject, { name: 'Test Data Store 2' });
		await createDataStore(memberProject, { name: 'Another Data Store' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-stores`)
			.query({ filter: JSON.stringify({ name: 'test' }) })
			.expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect(response.body.data.data.map((f: any) => f.name).sort()).toEqual(
			['Test Data Store 1', 'Test Data Store 2'].sort(),
		);
	});

	test('should filter data stores by name', async () => {
		await createDataStore(ownerProject, { name: 'Test Data Store' });
		await createDataStore(ownerProject, { name: 'Another Data Store' });
		await createDataStore(ownerProject, { name: 'Test Something Else' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-stores`)
			.query({ filter: JSON.stringify({ name: 'test' }) })
			.expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect(response.body.data.data.map((f: any) => f.name).sort()).toEqual(
			['Test Data Store', 'Test Something Else'].sort(),
		);
	});

	test('should filter data stores by id', async () => {
		const dataStore1 = await createDataStore(ownerProject, { name: 'Data Store 1' });
		await createDataStore(ownerProject, { name: 'Data Store 2' });
		await createDataStore(ownerProject, { name: 'Data Store 3' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-stores`)
			.query({ filter: JSON.stringify({ id: dataStore1.id }) })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Data Store 1');
	});

	test('should filter data stores by multiple names (AND operator)', async () => {
		await createDataStore(ownerProject, { name: 'Data Store' });
		await createDataStore(ownerProject, { name: 'Test Store' });
		await createDataStore(ownerProject, { name: 'Another Store' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-stores?filter={ "name": ["Store", "Test"]}`)
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Test Store');
	});

	test('should apply pagination with take parameter', async () => {
		for (let i = 1; i <= 5; i++) {
			await createDataStore(ownerProject, {
				name: `Data Store ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-stores`)
			.query({ take: 3 })
			.expect(200);

		expect(response.body.data.count).toBe(5); // Total count should be 5
		expect(response.body.data.data).toHaveLength(3); // But only 3 returned
		expect(response.body.data.data.map((store: DataStore) => store.name)).toEqual([
			'Data Store 5',
			'Data Store 4',
			'Data Store 3',
		]);
	});

	test('should apply pagination with skip parameter', async () => {
		for (let i = 1; i <= 5; i++) {
			await createDataStore(ownerProject, {
				name: `Data Store ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-stores`)
			.query({ skip: 2 })
			.expect(200);

		expect(response.body.data.count).toBe(5);
		expect(response.body.data.data).toHaveLength(3);
		expect(response.body.data.data.map((store: DataStore) => store.name)).toEqual([
			'Data Store 3',
			'Data Store 2',
			'Data Store 1',
		]);
	});

	test('should apply combined skip and take parameters', async () => {
		for (let i = 1; i <= 5; i++) {
			await createDataStore(ownerProject, {
				name: `Data Store ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-stores`)
			.query({ skip: 1, take: 2 })
			.expect(200);

		expect(response.body.data.count).toBe(5);
		expect(response.body.data.data).toHaveLength(2);
		expect(response.body.data.data.map((store: DataStore) => store.name)).toEqual([
			'Data Store 4',
			'Data Store 3',
		]);
	});

	test('should sort data stores by name ascending', async () => {
		await createDataStore(ownerProject, { name: 'Z Data Store' });
		await createDataStore(ownerProject, { name: 'A Data Store' });
		await createDataStore(ownerProject, { name: 'M Data Store' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-stores`)
			.query({ sortBy: 'name:asc' })
			.expect(200);

		expect(response.body.data.data.map((store: DataStore) => store.name)).toEqual([
			'A Data Store',
			'M Data Store',
			'Z Data Store',
		]);
	});

	test('should sort data stores by name descending', async () => {
		await createDataStore(ownerProject, { name: 'Z Data Store' });
		await createDataStore(ownerProject, { name: 'A Data Store' });
		await createDataStore(ownerProject, { name: 'M Data Store' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-stores`)
			.query({ sortBy: 'name:desc' })
			.expect(200);

		expect(response.body.data.data.map((f: DataStore) => f.name)).toEqual([
			'Z Data Store',
			'M Data Store',
			'A Data Store',
		]);
	});

	test('should sort data stores by updatedAt', async () => {
		await createDataStore(ownerProject, {
			name: 'Older Data Store',
			updatedAt: DateTime.now().minus({ days: 2 }).toJSDate(),
		});
		await createDataStore(ownerProject, {
			name: 'Newest Data Store',
			updatedAt: DateTime.now().toJSDate(),
		});
		await createDataStore(ownerProject, {
			name: 'Middle Data Store',
			updatedAt: DateTime.now().minus({ days: 1 }).toJSDate(),
		});

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-stores`)
			.query({ sortBy: 'updatedAt:desc' })
			.expect(200);

		expect(response.body.data.data.map((f: DataStore) => f.name)).toEqual([
			'Newest Data Store',
			'Middle Data Store',
			'Older Data Store',
		]);
	});

	test('should combine multiple query parameters correctly', async () => {
		const dataStore1 = await createDataStore(ownerProject, { name: 'Test Data Store' });
		await createDataStore(ownerProject, { name: 'Another Data Store' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-stores`)
			.query({ filter: JSON.stringify({ name: 'data', id: dataStore1.id }), sortBy: 'name:asc' })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Test Data Store');
	});

	test('should include columns', async () => {
		await createDataStore(ownerProject, {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test-column-1',
					type: 'string',
				},
				{
					name: 'test-column-2',
					type: 'boolean',
				},
			],
		});

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-stores`)
			.query({ filter: JSON.stringify({ name: 'test' }) })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].columns).toHaveLength(2);
	});
});
