/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { DataStore, DataStoreCreateColumnSchema } from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRepository, QueryFailedError } from '@n8n/db';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';
import type { DataStoreRow } from 'n8n-workflow';

import { createDataStore } from '@test-integration/db/data-stores';
import { createOwner, createMember, createAdmin } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import { DataStoreColumnRepository } from '../data-store-column.repository';
import { DataStoreRowsRepository } from '../data-store-rows.repository';
import { DataStoreRepository } from '../data-store.repository';
import { mockDataStoreSizeValidator } from './test-helpers';

let owner: User;
let member: User;
let admin: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let authAdminAgent: SuperAgentTest;
let ownerProject: Project;
let memberProject: Project;

const testServer = utils.setupTestServer({
	endpointGroups: ['data-table'],
	modules: ['data-table'],
});
let projectRepository: ProjectRepository;
let dataStoreRepository: DataStoreRepository;
let dataStoreColumnRepository: DataStoreColumnRepository;
let dataStoreRowsRepository: DataStoreRowsRepository;

beforeAll(async () => {
	await testDb.init();
	mockDataStoreSizeValidator();
});

beforeEach(async () => {
	await testDb.truncate(['DataTable', 'DataTableColumn', 'Project', 'ProjectRelation']);

	projectRepository = Container.get(ProjectRepository);
	dataStoreRepository = Container.get(DataStoreRepository);
	dataStoreColumnRepository = Container.get(DataStoreColumnRepository);
	dataStoreRowsRepository = Container.get(DataStoreRowsRepository);

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

describe('POST /projects/:projectId/data-tables', () => {
	test('should not create data store when project does not exist', async () => {
		const payload = {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authMemberAgent.post('/projects/non-existing-id/data-tables').send(payload).expect(403);
		await authAdminAgent.post('/projects/non-existing-id/data-tables').send(payload).expect(403);
		await authOwnerAgent.post('/projects/non-existing-id/data-tables').send(payload).expect(403);
	});

	test('should not create data store when name is empty', async () => {
		const project = await createTeamProject(undefined, owner);
		const payload = {
			name: '',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authOwnerAgent.post(`/projects/${project.id}/data-tables`).send(payload).expect(400);
	});

	test('should not create data store if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:viewer');

		const payload = {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authMemberAgent.post(`/projects/${project.id}/data-tables`).send(payload).expect(403);

		const dataStoresInDb = await dataStoreRepository.find();
		expect(dataStoresInDb).toHaveLength(0);
	});

	test("should not create data store in another user's personal project", async () => {
		const payload = {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authMemberAgent
			.post(`/projects/${ownerProject.id}/data-tables`)
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
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authMemberAgent.post(`/projects/${project.id}/data-tables`).send(payload).expect(200);

		const dataStoresInDb = await dataStoreRepository.find();
		expect(dataStoresInDb).toHaveLength(1);
	});

	test('should create data store if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(admin, project, 'project:admin');

		const payload = {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authAdminAgent.post(`/projects/${project.id}/data-tables`).send(payload).expect(200);

		const dataStoresInDb = await dataStoreRepository.find();
		expect(dataStoresInDb).toHaveLength(1);
	});

	test('should create data store if user is owner in team project', async () => {
		const project = await createTeamProject(undefined, owner);

		const payload = {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authOwnerAgent.post(`/projects/${project.id}/data-tables`).send(payload).expect(200);

		const dataStoresInDb = await dataStoreRepository.find();
		expect(dataStoresInDb).toHaveLength(1);
	});

	test('should create data store in personal project', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const payload = {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		const response = await authOwnerAgent
			.post(`/projects/${personalProject.id}/data-tables`)
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

describe('GET /projects/:projectId/data-tables', () => {
	test('should not list data stores when project does not exist', async () => {
		await authMemberAgent.get('/projects/non-existing-id/data-tables').expect(403);
		await authAdminAgent.get('/projects/non-existing-id/data-tables').expect(403);
		await authOwnerAgent.get('/projects/non-existing-id/data-tables').expect(403);
	});

	test('should not list data stores if user has no access to project', async () => {
		const project = await createTeamProject('test project', owner);

		await authMemberAgent.get(`/projects/${project.id}/data-tables`).expect(403);
	});

	test('should not list data stores if admin has no access to project', async () => {
		const project = await createTeamProject('test project', owner);

		await authAdminAgent.get(`/projects/${project.id}/data-tables`).expect(403);
	});

	test("should not list data stores from another user's personal project", async () => {
		await authMemberAgent.get(`/projects/${ownerProject.id}/data-tables`).expect(403);
	});

	test('should list data stores if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		await createDataStore(project, { name: 'Test Data Store' });

		const response = await authMemberAgent.get(`/projects/${project.id}/data-tables`).expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Test Data Store');
	});

	test('should list data stores from personal project', async () => {
		await createDataStore(ownerProject, { name: 'Personal Data Store 1' });
		await createDataStore(ownerProject, { name: 'Personal Data Store 2' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect((response.body.data.data as DataStore[]).map((f) => f.name).sort()).toEqual(
			['Personal Data Store 1', 'Personal Data Store 2'].sort(),
		);
	});

	test('should filter data stores by projectId', async () => {
		await createDataStore(ownerProject, { name: 'Test Data Store 1' });
		await createDataStore(ownerProject, { name: 'Test Data Store 2' });
		await createDataStore(memberProject, { name: 'Another Data Store' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ filter: JSON.stringify({ name: 'test' }) })
			.expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect((response.body.data.data as DataStore[]).map((f) => f.name).sort()).toEqual(
			['Test Data Store 1', 'Test Data Store 2'].sort(),
		);
	});

	test('should filter data stores by name', async () => {
		await createDataStore(ownerProject, { name: 'Test Data Store' });
		await createDataStore(ownerProject, { name: 'Another Data Store' });
		await createDataStore(ownerProject, { name: 'Test Something Else' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ filter: JSON.stringify({ name: 'test' }) })
			.expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect((response.body.data.data as DataStore[]).map((f) => f.name).sort()).toEqual(
			['Test Data Store', 'Test Something Else'].sort(),
		);
	});

	test('should filter data stores by id', async () => {
		const dataStore1 = await createDataStore(ownerProject, { name: 'Data Store 1' });
		await createDataStore(ownerProject, { name: 'Data Store 2' });
		await createDataStore(ownerProject, { name: 'Data Store 3' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
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
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ filter: JSON.stringify({ name: ['Store', 'Test'] }) })
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
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ take: 3 })
			.expect(200);

		expect(response.body.data.count).toBe(5); // Total count should be 5
		expect(response.body.data.data).toHaveLength(3); // But only 3 returned
		expect((response.body.data.data as DataStore[]).map((store) => store.name)).toEqual([
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
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ skip: 2 })
			.expect(200);

		expect(response.body.data.count).toBe(5);
		expect(response.body.data.data).toHaveLength(3);
		expect((response.body.data.data as DataStore[]).map((store) => store.name)).toEqual([
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
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ skip: 1, take: 2 })
			.expect(200);

		expect(response.body.data.count).toBe(5);
		expect(response.body.data.data).toHaveLength(2);
		expect((response.body.data.data as DataStore[]).map((store) => store.name)).toEqual([
			'Data Store 4',
			'Data Store 3',
		]);
	});

	test('should sort data stores by name ascending', async () => {
		await createDataStore(ownerProject, { name: 'Z Data Store' });
		await createDataStore(ownerProject, { name: 'A Data Store' });
		await createDataStore(ownerProject, { name: 'M Data Store' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ sortBy: 'name:asc' })
			.expect(200);

		expect((response.body.data.data as DataStore[]).map((store) => store.name)).toEqual([
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
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ sortBy: 'name:desc' })
			.expect(200);

		expect((response.body.data.data as DataStore[]).map((f) => f.name)).toEqual([
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
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ sortBy: 'updatedAt:desc' })
			.expect(200);

		expect((response.body.data.data as DataStore[]).map((f) => f.name)).toEqual([
			'Newest Data Store',
			'Middle Data Store',
			'Older Data Store',
		]);
	});

	test('should combine multiple query parameters correctly', async () => {
		const dataStore1 = await createDataStore(ownerProject, { name: 'Test Data Store' });
		await createDataStore(ownerProject, { name: 'Another Data Store' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
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
					name: 'test_column_1',
					type: 'string',
				},
				{
					name: 'test_column_2',
					type: 'boolean',
				},
			],
		});

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ filter: JSON.stringify({ name: 'test' }) })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].columns).toHaveLength(2);
	});
});

describe('PATCH /projects/:projectId/data-tables/:dataStoreId', () => {
	test('should not update data store when project does not exist', async () => {
		const payload = {
			name: 'Updated Data Store Name',
		};

		await authOwnerAgent
			.patch('/projects/non-existing-id/data-tables/some-data-store-id')
			.send(payload)
			.expect(403);
	});

	test('should not update data store when data store does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		const payload = {
			name: 'Updated Data Store Name',
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/non-existing-data-store`)
			.send(payload)
			.expect(404);
	});

	test('should not update data store when name is empty', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project, { name: 'Original Name' });

		const payload = {
			name: '',
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/${dataStore.id}`)
			.send(payload)
			.expect(400);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb?.name).toBe('Original Name');
	});

	test('should not update data store if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project, { name: 'Original Name' });
		await linkUserToProject(member, project, 'project:viewer');

		const payload = {
			name: 'Updated Data Store Name',
		};

		await authMemberAgent
			.patch(`/projects/${project.id}/data-tables/${dataStore.id}`)
			.send(payload)
			.expect(403);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb?.name).toBe('Original Name');
	});

	test("should not update data store in another user's personal project", async () => {
		const dataStore = await createDataStore(ownerProject, { name: 'Original Name' });

		const payload = {
			name: 'Updated Data Store Name',
		};

		await authMemberAgent
			.patch(`/projects/${ownerProject.id}/data-tables/${dataStore.id}`)
			.send(payload)
			.expect(403);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb?.name).toBe('Original Name');
	});

	test('should update data store if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project, { name: 'Original Name' });
		await linkUserToProject(member, project, 'project:editor');

		const payload = {
			name: 'Updated Data Store Name',
		};

		await authMemberAgent
			.patch(`/projects/${project.id}/data-tables/${dataStore.id}`)
			.send(payload)
			.expect(200);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb?.name).toBe('Updated Data Store Name');
	});

	test('should update data store if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project, { name: 'Original Name' });
		await linkUserToProject(admin, project, 'project:admin');

		const payload = {
			name: 'Updated Data Store Name',
		};

		await authAdminAgent
			.patch(`/projects/${project.id}/data-tables/${dataStore.id}`)
			.send(payload)
			.expect(200);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb?.name).toBe('Updated Data Store Name');
	});

	test('should update data store if user is owner in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project, { name: 'Original Name' });

		const payload = {
			name: 'Updated Data Store Name',
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/${dataStore.id}`)
			.send(payload)
			.expect(200);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb?.name).toBe('Updated Data Store Name');
	});

	test('should update data store in personal project', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const dataStore = await createDataStore(personalProject, { name: 'Original Name' });

		const payload = {
			name: 'Updated Data Store Name',
		};

		await authOwnerAgent
			.patch(`/projects/${personalProject.id}/data-tables/${dataStore.id}`)
			.send(payload)
			.expect(200);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb?.name).toBe('Updated Data Store Name');
	});
});

describe('DELETE /projects/:projectId/data-tables/:dataStoreId', () => {
	test('should not delete data store when project does not exist', async () => {
		await authOwnerAgent
			.delete('/projects/non-existing-id/data-tables/some-data-store-id')
			.send({})
			.expect(403);
	});

	test('should not delete data store when data store does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/non-existing-data-store`)
			.send({})
			.expect(404);
	});

	test('should not delete data store if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project);
		await linkUserToProject(member, project, 'project:viewer');

		await authMemberAgent
			.delete(`/projects/${project.id}/data-tables/${dataStore.id}`)
			.send({})
			.expect(403);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb).toBeDefined();
	});

	test("should not delete data store in another user's personal project", async () => {
		const dataStore = await createDataStore(ownerProject);

		await authMemberAgent
			.delete(`/projects/${ownerProject.id}/data-tables/${dataStore.id}`)
			.send({})
			.expect(403);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb).toBeDefined();
	});

	test('should delete data store if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project);
		await linkUserToProject(member, project, 'project:editor');

		await authMemberAgent
			.delete(`/projects/${project.id}/data-tables/${dataStore.id}`)
			.send({})
			.expect(200);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb).toBeNull();
	});

	test('should delete data store if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project);
		await linkUserToProject(admin, project, 'project:admin');

		await authAdminAgent
			.delete(`/projects/${project.id}/data-tables/${dataStore.id}`)
			.send({})
			.expect(200);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb).toBeNull();
	});

	test('should delete data store if user is owner in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project);

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/${dataStore.id}`)
			.send({})
			.expect(200);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb).toBeNull();
	});

	test('should delete data store in personal project', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const dataStore = await createDataStore(personalProject);

		await authOwnerAgent
			.delete(`/projects/${personalProject.id}/data-tables/${dataStore.id}`)
			.send({})
			.expect(200);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb).toBeNull();
	});

	test("should delete data from 'data_table', 'data_table_column' tables and drop 'data_table_user_<id>' table", async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const dataStore = await createDataStore(personalProject, {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.delete(`/projects/${personalProject.id}/data-tables/${dataStore.id}`)
			.send({})
			.expect(200);

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: dataStore.id });
		expect(dataStoreInDb).toBeNull();

		const dataStoreColumnInDb = await dataStoreColumnRepository.findOneBy({
			dataTableId: dataStore.id,
		});
		expect(dataStoreColumnInDb).toBeNull();

		await expect(dataStoreRowsRepository.getManyAndCount(dataStore.id, {})).rejects.toThrow(
			QueryFailedError,
		);
	});
});

describe('GET /projects/:projectId/data-tables/:dataStoreId/columns', () => {
	test('should not list columns when project does not exist', async () => {
		await authOwnerAgent
			.get('/projects/non-existing-id/data-tables/non-existing-id/columns')
			.expect(403);
	});

	test('should not list columns if user has no access to project', async () => {
		const project = await createTeamProject('test project', owner);
		const dataStore = await createDataStore(project);

		await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataStore.id}/columns`)
			.expect(403);
	});

	test("should not list columns from data stores in another user's personal project", async () => {
		await authMemberAgent.get(`/projects/${ownerProject.id}/data-tables`).expect(403);
	});

	test('should not list columns when data store does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/non-existing-id/columns`)
			.expect(404);
	});

	test('should list columns if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'boolean',
				},
			],
		});

		const response = await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataStore.id}/columns`)
			.expect(200);

		expect(response.body.data).toHaveLength(2);
		expect(response.body.data[0].name).toBe('test_column');
		expect(response.body.data[1].name).toBe('another_column');
	});

	test('should list columns if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		const response = await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataStore.id}/columns`)
			.expect(200);

		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe('test_column');
	});

	test('should list columns from personal project data store', async () => {
		const dataStore = await createDataStore(memberProject, {
			name: 'Personal Data Store 1',
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		const response = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/columns`)
			.expect(200);

		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe('test_column');
	});
});

describe('POST /projects/:projectId/data-tables/:dataStoreId/columns', () => {
	test('should not create column when project does not exist', async () => {
		const payload = {
			name: 'Test Column',
			type: 'string',
		};

		await authOwnerAgent
			.post('/projects/non-existing-id/data-tables/some-data-store-id/columns')
			.send(payload)
			.expect(403);
	});

	test('should not create column when data store does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		const payload = {
			name: 'test_column',
			type: 'string',
			index: 0,
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/non-existing-data-store/columns`)
			.send(payload)
			.expect(404);
	});

	test('should not create column when name is empty', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project);

		const payload = {
			name: '',
			type: 'string',
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/${dataStore.id}/columns`)
			.send(payload)
			.expect(400);

		const columnsInDb = await dataStoreColumnRepository.findBy({ dataTableId: dataStore.id });
		expect(columnsInDb).toHaveLength(0);
	});

	test("should not create column when name isn't valid", async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project);

		const payload = {
			name: 'invalid name',
			type: 'string',
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/${dataStore.id}/columns`)
			.send(payload)
			.expect(400);

		const columnsInDb = await dataStoreColumnRepository.findBy({ dataTableId: dataStore.id });
		expect(columnsInDb).toHaveLength(0);
	});

	test("should not create column in another user's personal project data store", async () => {
		const dataStore = await createDataStore(ownerProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.post(`/projects/${ownerProject.id}/data-tables/${dataStore.id}/columns`)
			.send({
				name: 'new_column',
				type: 'string',
			})
			.expect(403);

		const columnsInDb = await dataStoreColumnRepository.findBy({ dataTableId: dataStore.id });
		expect(columnsInDb).toHaveLength(1);
		expect(columnsInDb[0].name).toBe('test_column');
	});

	test('should not create column if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataStore = await createDataStore(project);

		const payload = {
			name: 'test_column',
			type: 'string',
		};

		await authMemberAgent
			.post(`/projects/${project.id}/data-tables/${dataStore.id}/columns`)
			.send(payload)
			.expect(403);

		const columnsInDb = await dataStoreColumnRepository.findBy({ dataTableId: dataStore.id });
		expect(columnsInDb).toHaveLength(0);
	});

	test('should create column if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:editor');
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		const payload = {
			name: 'new_column',
			type: 'string',
			index: 0,
		};

		await authMemberAgent
			.post(`/projects/${project.id}/data-tables/${dataStore.id}/columns`)
			.send(payload)
			.expect(200);

		const columnsInDb = await dataStoreColumnRepository.findBy({ dataTableId: dataStore.id });
		expect(columnsInDb).toHaveLength(2);
		expect(columnsInDb[0].name).toBe('new_column');
		expect(columnsInDb[0].type).toBe('string');
	});

	test('should create column if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(admin, project, 'project:admin');
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		const payload = {
			name: 'new_column',
			type: 'boolean',
			index: 0,
		};

		await authAdminAgent
			.post(`/projects/${project.id}/data-tables/${dataStore.id}/columns`)
			.send(payload)
			.expect(200);

		const columnsInDb = await dataStoreColumnRepository.findBy({ dataTableId: dataStore.id });
		expect(columnsInDb).toHaveLength(2);
		expect(columnsInDb[0].name).toBe('new_column');
		expect(columnsInDb[0].type).toBe('boolean');
		expect(columnsInDb[1].name).toBe('test_column');
		expect(columnsInDb[1].type).toBe('string');
	});

	test('should create column if user has is owner in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		const payload = {
			name: 'new_column',
			type: 'boolean',
			index: 0,
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/${dataStore.id}/columns`)
			.send(payload)
			.expect(200);

		const columnsInDb = await dataStoreColumnRepository.findBy({ dataTableId: dataStore.id });
		expect(columnsInDb).toHaveLength(2);
		expect(columnsInDb[0].name).toBe('new_column');
		expect(columnsInDb[0].type).toBe('boolean');
		expect(columnsInDb[1].name).toBe('test_column');
		expect(columnsInDb[1].type).toBe('string');
	});

	test('should place the column in correct index', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column_1',
					type: 'string',
				},
				{
					name: 'test_column_2',
					type: 'string',
				},
			],
		});

		const payload: DataStoreCreateColumnSchema = {
			name: 'new_column',
			type: 'boolean',
			index: 1,
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/${dataStore.id}/columns`)
			.send(payload)
			.expect(200);

		const columns = await dataStoreColumnRepository.getColumns(dataStore.id);

		expect(columns).toHaveLength(3);
		expect(columns[0].name).toBe('test_column_1');
		expect(columns[1].name).toBe('new_column');
		expect(columns[2].name).toBe('test_column_2');
	});
});

describe('DELETE /projects/:projectId/data-tables/:dataStoreId/columns/:columnId', () => {
	test('should not delete column when project does not exist', async () => {
		await authOwnerAgent
			.delete('/projects/non-existing-id/data-tables/some-data-store-id/columns/some-column-id')
			.send({})
			.expect(403);
	});

	test('should not delete column when data store does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/non-existing-id/columns/some-column-id`)
			.send()
			.expect(404);
	});

	test('should not delete column when column does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/${dataStore.id}/columns/non-existing-id`)
			.send()
			.expect(404);
	});

	test("should not delete column in another user's personal project data store", async () => {
		const dataStore = await createDataStore(ownerProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.delete(`/projects/${ownerProject.id}/data-tables/${dataStore.id}/columns/test_column`)
			.send()
			.expect(403);

		const columnInDb = await dataStoreColumnRepository.findOneBy({
			dataTableId: dataStore.id,
			name: 'test-column',
		});
		expect(columnInDb).toBeDefined();
	});

	test('should not delete column if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});
		await linkUserToProject(member, project, 'project:viewer');

		await authMemberAgent
			.delete(`/projects/${project.id}/data-tables/${dataStore.id}/columns/test_column`)
			.send()
			.expect(403);

		const columnInDb = await dataStoreColumnRepository.findOneBy({
			dataTableId: dataStore.id,
			name: 'test-column',
		});
		expect(columnInDb).toBeDefined();
	});

	test('should delete column if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:editor');

		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.delete(
				`/projects/${project.id}/data-tables/${dataStore.id}/columns/${dataStore.columns[0].id}`,
			)
			.send()
			.expect(200);

		const columnInDb = await dataStoreColumnRepository.findOneBy({
			dataTableId: dataStore.id,
			name: 'test-column',
		});
		expect(columnInDb).toBeNull();
	});

	test('should delete column if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(admin, project, 'project:admin');
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authAdminAgent
			.delete(
				`/projects/${project.id}/data-tables/${dataStore.id}/columns/${dataStore.columns[0].id}`,
			)
			.send()
			.expect(200);

		const columnInDb = await dataStoreColumnRepository.findOneBy({
			dataTableId: dataStore.id,
			name: 'test-column',
		});
		expect(columnInDb).toBeNull();
	});

	test('should delete column if user is owner in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.delete(
				`/projects/${project.id}/data-tables/${dataStore.id}/columns/${dataStore.columns[0].id}`,
			)
			.send()
			.expect(200);

		const columnInDb = await dataStoreColumnRepository.findOneBy({
			dataTableId: dataStore.id,
			name: 'test-column',
		});
		expect(columnInDb).toBeNull();
	});

	test('should delete column in personal project', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.delete(
				`/projects/${memberProject.id}/data-tables/${dataStore.id}/columns/${dataStore.columns[0].id}`,
			)
			.send()
			.expect(200);

		const columnInDb = await dataStoreColumnRepository.findOneBy({
			dataTableId: dataStore.id,
			name: 'test-column',
		});
		expect(columnInDb).toBeNull();
	});
});

describe('PATCH /projects/:projectId/data-tables/:dataStoreId/columns/:columnId/move', () => {
	test('should not move column when project does not exist', async () => {
		const payload = {
			index: 1,
		};

		await authOwnerAgent
			.patch('/projects/non-existing-id/data-tables/some-data-store-id/columns/some-column-id/move')
			.send(payload)
			.expect(403);
	});

	test('should not move column when data store does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		const payload = {
			targetIndex: 1,
		};

		await authOwnerAgent
			.patch(
				`/projects/${project.id}/data-tables/non-existing-data-store/columns/some-column-id/move`,
			)
			.send(payload)
			.expect(404);
	});

	test('should not move column when column does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});
		const payload = {
			targetIndex: 1,
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/${dataStore.id}/columns/some-column-id/move`)
			.send(payload)
			.expect(404);
	});

	test("should not move column in another user's personal project data store", async () => {
		const dataStore = await createDataStore(ownerProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.patch(
				`/projects/${ownerProject.id}/data-tables/${dataStore.id}/columns/${dataStore.columns[0].id}/move`,
			)
			.send({ targetIndex: 1 })
			.expect(403);

		const columnInDb = await dataStoreColumnRepository.findOneBy({
			dataTableId: dataStore.id,
			name: 'test-column',
			index: 0,
		});
		expect(columnInDb).toBeDefined();
	});

	test('should not move column if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.patch(
				`/projects/${project.id}/data-tables/${dataStore.id}/columns/${dataStore.columns[0].id}/move`,
			)
			.send({ targetIndex: 1 })
			.expect(403);

		const columnInDb = await dataStoreColumnRepository.findOneBy({
			dataTableId: dataStore.id,
			name: 'test-column',
			index: 0,
		});
		expect(columnInDb).toBeDefined();
	});

	test('should move column if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.patch(
				`/projects/${project.id}/data-tables/${dataStore.id}/columns/${dataStore.columns[0].id}/move`,
			)
			.send({ targetIndex: 1 })
			.expect(200);

		const columnInDb = await dataStoreColumnRepository.findOneBy({
			dataTableId: dataStore.id,
			name: 'test-column',
			index: 1,
		});
		expect(columnInDb).toBeDefined();
	});

	test('should move column if user has project:admin role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(admin, project, 'project:admin');
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authAdminAgent
			.patch(
				`/projects/${project.id}/data-tables/${dataStore.id}/columns/${dataStore.columns[0].id}/move`,
			)
			.send({ targetIndex: 1 })
			.expect(200);

		const columnInDb = await dataStoreColumnRepository.findOneBy({
			dataTableId: dataStore.id,
			name: 'test-column',
			index: 1,
		});
		expect(columnInDb).toBeDefined();
	});

	test('should move column if user is owner in team project', async () => {
		const project = await createTeamProject('test project', owner);

		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.patch(
				`/projects/${project.id}/data-tables/${dataStore.id}/columns/${dataStore.columns[0].id}/move`,
			)
			.send({ targetIndex: 1 })
			.expect(200);

		const columnInDb = await dataStoreColumnRepository.findOneBy({
			dataTableId: dataStore.id,
			name: 'test-column',
			index: 1,
		});
		expect(columnInDb).toBeDefined();
	});

	test('should move column in personal project', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.patch(
				`/projects/${memberProject.id}/data-tables/${dataStore.id}/columns/${dataStore.columns[0].id}/move`,
			)
			.send({ targetIndex: 1 })
			.expect(200);

		const columnInDb = await dataStoreColumnRepository.findOneBy({
			dataTableId: dataStore.id,
			name: 'test-column',
			index: 1,
		});
		expect(columnInDb).toBeDefined();
	});
});

describe('GET /projects/:projectId/data-tables/:dataStoreId/rows', () => {
	test('should not list rows when project does not exist', async () => {
		await authOwnerAgent
			.get('/projects/non-existing-id/data-tables/some-data-store-id/rows')
			.expect(403);
	});

	test('should not list rows when data store does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/non-existing-id/rows`)
			.expect(404);
	});

	test("should not list rows in another user's personal project data store", async () => {
		const dataStore = await createDataStore(ownerProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.get(`/projects/${ownerProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(403);
	});

	test('should list rows if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');

		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
		});

		const response = await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(response.body.data).toMatchObject({
			count: 1,
			data: [
				{
					id: 1,
					first: 'test value',
					second: 'another value',
				},
			],
		});
	});

	test('should list rows if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');

		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
		});

		const response = await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(response.body.data).toMatchObject({
			count: 1,
			data: [
				{
					id: 1,
					first: 'test value',
					second: 'another value',
				},
			],
		});
	});

	test('should list rows if user has project:admin role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(admin, project, 'project:admin');

		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
		});

		const response = await authAdminAgent
			.get(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(response.body.data).toMatchObject({
			count: 1,
			data: [
				{
					id: 1,
					first: 'test value',
					second: 'another value',
				},
			],
		});
	});

	test('should list rows in personal project', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
		});

		const response = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(response.body.data).toMatchObject({
			count: 1,
			data: [
				{
					id: 1,
					first: 'test value',
					second: 'another value',
				},
			],
		});
	});

	test("should parse 'eq' filters correctly", async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
			],
			data: [
				{
					name: 'John',
				},
				{
					name: 'Jane',
				},
				{
					name: 'Tom',
				},
			],
		});

		const filterParam = encodeURIComponent(
			JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'name', value: 'John', condition: 'eq' }],
			}),
		);

		const response = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows?filter=${filterParam}`)
			.expect(200);

		expect(response.body.data).toEqual({
			count: 1,
			data: [
				expect.objectContaining({
					name: 'John',
				}),
			],
		});
	});

	test("should parse 'like' filters correctly", async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
			],
			data: [
				{
					name: 'John',
				},
				{
					name: 'Jane',
				},
				{
					name: 'Tom',
				},
			],
		});

		const filterParam = encodeURIComponent(
			JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'name', value: '%j%', condition: 'ilike' }],
			}),
		);

		const response = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows?filter=${filterParam}`)
			.expect(200);

		expect(response.body.data).toEqual({
			count: 2,
			data: [
				expect.objectContaining({
					name: 'John',
				}),
				expect.objectContaining({
					name: 'Jane',
				}),
			],
		});
	});

	test.each([
		['gt', '>', 25, ['Bob'], ['Alice', 'Carol']],
		['gte', '>=', 25, ['Bob', 'Carol'], ['Alice']],
		['lt', '<', 25, ['Alice'], ['Bob', 'Carol']],
		['lte', '<=', 25, ['Alice', 'Carol'], ['Bob']],
	])(
		'should filter rows using %s (%s) condition correctly',
		async (condition, _operator, value, expectedNames, excludedNames) => {
			const dataStore = await createDataStore(memberProject, {
				columns: [
					{
						name: 'name',
						type: 'string',
					},
					{
						name: 'age',
						type: 'number',
					},
				],
				data: [
					{
						name: 'Alice',
						age: 20,
					},
					{
						name: 'Bob',
						age: 30,
					},
					{
						name: 'Carol',
						age: 25,
					},
				],
			});

			const filterParam = encodeURIComponent(
				JSON.stringify({
					type: 'and',
					filters: [{ columnName: 'age', value, condition }],
				}),
			);
			const response = await authMemberAgent
				.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows?filter=${filterParam}`)
				.expect(200);

			expect(response.body.data.count).toBe(expectedNames.length);
			const returnedNames = (response.body.data.data as DataStoreRow[]).map((row) => row.name);

			for (const expectedName of expectedNames) {
				expect(returnedNames).toContain(expectedName);
			}

			for (const excludedName of excludedNames) {
				expect(returnedNames).not.toContain(excludedName);
			}
		},
	);

	test.each(['like', 'ilike'])(
		'should auto-wrap %s filters if no wildcard is present',
		async (condition) => {
			const dataStore = await createDataStore(memberProject, {
				columns: [
					{
						name: 'name',
						type: 'string',
					},
				],
				data: [
					{
						name: 'Alice Smith',
					},
					{
						name: 'Bob Jones',
					},
					{
						name: 'Carol Brown',
					},
				],
			});

			const filterParam = encodeURIComponent(
				JSON.stringify({
					type: 'and',
					filters: [{ columnName: 'name', value: 'Alice', condition }],
				}),
			);
			const response = await authMemberAgent
				.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows?filter=${filterParam}`)
				.expect(200);

			expect(response.body.data.count).toBe(1);
			expect(response.body.data.data[0].name).toBe('Alice Smith');
		},
	);
});

describe('POST /projects/:projectId/data-tables/:dataStoreId/insert', () => {
	test('should not insert rows when project does not exist', async () => {
		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		await authOwnerAgent
			.post('/projects/non-existing-id/data-tables/some-data-store-id/insert')
			.send(payload)
			.expect(403);
	});

	test('should not insert rows when data store does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/non-existing-id/insert`)
			.send(payload)
			.expect(404);
	});

	test("should not insert rows in another user's personal project data store", async () => {
		const dataStore = await createDataStore(ownerProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		await authMemberAgent
			.post(`/projects/${ownerProject.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(403);
	});

	test('should not insert rows if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		await authMemberAgent
			.post(`/projects/${project.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(403);
	});

	test('should insert rows if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');

		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${project.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject(payload.data[0]);
	});

	test('should insert rows if user has project:admin role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(admin, project, 'project:admin');

		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		const response = await authAdminAgent
			.post(`/projects/${project.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject(payload.data[0]);
	});

	test('should insert rows in personal project', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject(payload.data[0]);
	});

	test('should return inserted data if returnData is set', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			returnType: 'all',
			data: [
				{
					first: 'first row',
					second: 'some value',
				},
				{
					first: 'another row',
					second: 'another value',
				},
			],
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [
				{
					id: 1,
					first: 'first row',
					second: 'some value',
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
				{
					id: 2,
					first: 'another row',
					second: 'another value',
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
			],
		});

		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(2);
		expect(rowsInDb.data[0]).toMatchObject(payload.data[0]);
	});

	test('should not insert rows when column does not exist', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					first: 'test value',
					nonexisting: 'this does not exist',
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('unknown column');
		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(0);
	});

	test('should insert columns with dates', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'a',
					type: 'date',
				},
				{
					name: 'b',
					type: 'date',
				},
			],
		});

		const payload = {
			data: [
				{
					a: '2025-08-15T09:48:14.259Z',
					b: '2025-08-15T12:34:56+02:00',
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			a: '2025-08-15T09:48:14.259Z',
			b: '2025-08-15T10:34:56.000Z',
		});
	});

	test('should insert columns with strings', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'a',
					type: 'string',
				},
				{
					name: 'b',
					type: 'string',
				},
				{
					name: 'c',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					a: 'some string',
					b: '',
					c: '2025-08-15T09:48:14.259Z',
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject(payload.data[0]);
	});

	test('should insert columns with booleans', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'a',
					type: 'boolean',
				},
				{
					name: 'b',
					type: 'boolean',
				},
			],
		});

		const payload = {
			data: [
				{
					a: true,
					b: false,
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject(payload.data[0]);
	});

	test('should insert columns with numbers', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'a',
					type: 'number',
				},
				{
					name: 'b',
					type: 'number',
				},
				{
					name: 'c',
					type: 'number',
				},
				{
					name: 'd',
					type: 'number',
				},
				{
					name: 'e',
					type: 'number',
				},
			],
		});

		const payload = {
			data: [
				{
					a: 1,
					b: 0,
					c: -1,
					d: 0.2340439341231259,
					e: 2340439341231259,
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject(payload.data[0]);
	});

	test('should insert columns with null values', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'a',
					type: 'string',
				},
				{
					name: 'b',
					type: 'number',
				},
				{
					name: 'c',
					type: 'boolean',
				},
				{
					name: 'd',
					type: 'date',
				},
			],
		});

		const payload = {
			data: [
				{
					a: null,
					b: null,
					c: null,
					d: null,
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject(payload.data[0]);
	});

	test('should insert multiple rows', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'a',
					type: 'string',
				},
				{
					name: 'b',
					type: 'number',
				},
			],
		});

		const payload = {
			data: [
				{
					a: 'first',
					b: 1,
				},
				{
					a: 'second',
					b: 2,
				},
				{
					a: 'third',
					b: 3,
				},
			],
			returnType: 'id',
		};

		const first = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(200);

		expect(first.body).toEqual({
			data: [{ id: 1 }, { id: 2 }, { id: 3 }],
		});

		const second = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataStore.id}/insert`)
			.send(payload)
			.expect(200);

		expect(second.body).toEqual({
			data: [{ id: 4 }, { id: 5 }, { id: 6 }],
		});

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(6);
		expect(readResponse.body.data.data).toMatchObject([...payload.data, ...payload.data]);
	});
});

describe('DELETE /projects/:projectId/data-tables/:dataStoreId/rows', () => {
	test('should not delete rows when project does not exist', async () => {
		await authOwnerAgent
			.delete('/projects/non-existing-id/data-tables/some-data-store-id/rows')
			.expect(403);
	});

	test('should not delete rows when data store does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/non-existing-id/rows`)
			.expect(404);
	});

	test("should not delete rows in another user's personal project data store", async () => {
		const dataStore = await createDataStore(ownerProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
		});

		await authMemberAgent
			.delete(`/projects/${ownerProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(403);

		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(1);
	});

	test('should not delete rows if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
		});

		await authMemberAgent
			.delete(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.expect(403);

		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(1);
	});

	test('should delete rows if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');

		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value 1',
					second: 'another value 1',
				},
				{
					first: 'test value 2',
					second: 'another value 2',
				},
				{
					first: 'test value 3',
					second: 'another value 3',
				},
			],
		});

		await authMemberAgent
			.delete(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.send({
				filter: {
					type: 'or',
					filters: [
						{ columnName: 'first', condition: 'eq', value: 'test value 1' },
						{ columnName: 'first', condition: 'eq', value: 'test value 3' },
					],
				},
			})
			.expect(200);

		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject({
			first: 'test value 2',
			second: 'another value 2',
		});
	});

	test('should delete rows if user has project:admin role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(admin, project, 'project:admin');

		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value 1',
					second: 'another value 1',
				},
				{
					first: 'test value 2',
					second: 'another value 2',
				},
			],
		});

		await authAdminAgent
			.delete(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.send({
				filter: {
					type: 'and',
					filters: [{ columnName: 'first', condition: 'eq', value: 'test value 2' }],
				},
			})
			.expect(200);

		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject({
			first: 'test value 1',
			second: 'another value 1',
		});
	});

	test('should delete rows if user is owner in team project', async () => {
		const project = await createTeamProject('test project', owner);

		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value 1',
					second: 'another value 1',
				},
				{
					first: 'test value 2',
					second: 'another value 2',
				},
			],
		});

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.send({
				filter: {
					type: 'and',
					filters: [{ columnName: 'first', condition: 'eq', value: 'test value 2' }],
				},
			})
			.expect(200);

		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data.map((r) => r.first)).toEqual(['test value 1']);
	});

	test('should delete rows in personal project', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value 1',
					second: 'another value 1',
				},
				{
					first: 'test value 2',
					second: 'another value 2',
				},
				{
					first: 'test value 3',
					second: 'another value 3',
				},
			],
		});

		await authMemberAgent
			.delete(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send({
				filter: {
					type: 'and',
					filters: [{ columnName: 'first', condition: 'eq', value: 'test value 2' }],
				},
			})
			.expect(200);

		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(2);
		expect(rowsInDb.data.map((r) => r.first).sort()).toEqual(['test value 1', 'test value 3']);
	});

	test('should return full deleted data if returnData is set', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value 1',
					second: 'another value 1',
				},
				{
					first: 'test value 2',
					second: 'another value 2',
				},
				{
					first: 'test value 3',
					second: 'another value 3',
				},
			],
		});

		const result = await authMemberAgent
			.delete(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send({
				filter: {
					type: 'and',
					filters: [{ columnName: 'first', condition: 'eq', value: 'test value 3' }],
				},
				returnData: true,
			});

		expect(result.body.data).toEqual([
			{
				id: expect.any(Number),
				first: 'test value 3',
				second: 'another value 3',
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			},
		]);
	});
});

describe('POST /projects/:projectId/data-tables/:dataStoreId/upsert', () => {
	test('should not upsert rows when project does not exist', async () => {
		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30 },
		};

		await authOwnerAgent
			.post('/projects/non-existing-id/data-tables/some-data-store-id/upsert')
			.send(payload)
			.expect(403);
	});

	test('should not upsert rows when data store does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30 },
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/non-existing-id/upsert`)
			.send(payload)
			.expect(404);
	});

	test("should not upsert rows in another user's personal project data store", async () => {
		const dataStore = await createDataStore(ownerProject, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30 },
		};

		await authMemberAgent
			.post(`/projects/${ownerProject.id}/data-tables/${dataStore.id}/upsert`)
			.send(payload)
			.expect(403);
	});

	test('should not upsert rows if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30 },
		};

		await authMemberAgent
			.post(`/projects/${project.id}/data-tables/${dataStore.id}/upsert`)
			.send(payload)
			.expect(403);
	});

	test('should upsert rows if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');

		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { name: 'Alice', age: 30 },
		};

		await authMemberAgent
			.post(`/projects/${project.id}/data-tables/${dataStore.id}/upsert`)
			.send(payload)
			.expect(200);

		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject(payload.data);
	});

	test('should upsert rows if user has project:admin role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(admin, project, 'project:admin');

		const dataStore = await createDataStore(project, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30 },
		};

		await authAdminAgent
			.post(`/projects/${project.id}/data-tables/${dataStore.id}/upsert`)
			.send(payload)
			.expect(200);

		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject(payload.data);
	});

	test('should upsert rows in personal project', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30 },
		};

		await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataStore.id}/upsert`)
			.send(payload)
			.expect(200);

		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject(payload.data);
	});

	test('should not upsert rows when column does not exist', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30, nonexisting: 'this does not exist' },
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataStore.id}/upsert`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('unknown column');
		const rowsInDb = await dataStoreRowsRepository.getManyAndCount(dataStore.id, {});
		expect(rowsInDb.count).toBe(0);
	});

	test('should return updated row if returnData is set', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
			data: [
				{
					name: 'Alice',
					age: 30,
				},
				{
					name: 'John',
					age: 25,
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 35 },
			returnData: true,
		};

		const result = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataStore.id}/upsert`)
			.send(payload)
			.expect(200);

		expect(result.body.data).toEqual([
			{
				id: expect.any(Number),
				name: 'Alice',
				age: 35,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			},
		]);
	});
});

describe('PATCH /projects/:projectId/data-tables/:dataStoreId/rows', () => {
	test('should not update row when project does not exist', async () => {
		const payload = {
			filter: { name: 'Alice' },
			data: { age: 31 },
		};

		await authOwnerAgent
			.patch('/projects/non-existing-id/data-tables/some-data-store-id/rows')
			.send(payload)
			.expect(403);
	});

	test('should not update row when data store does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 31 },
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/non-existing-id/rows`)
			.send(payload)
			.expect(404);
	});

	test("should not update row in another user's personal project data store", async () => {
		const dataStore = await createDataStore(ownerProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 31 },
		};

		await authMemberAgent
			.patch(`/projects/${ownerProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(403);
	});

	test('should not update row if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataStore = await createDataStore(project, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { name: 'Alice' },
			data: { age: 31 },
		};

		await authMemberAgent
			.patch(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(403);
	});

	test('should update row if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');
		const dataStore = await createDataStore(project, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'active', type: 'boolean' },
				{ name: 'birthday', type: 'date' },
			],
			data: [{ name: 'Alice', age: 30, active: true, birthday: new Date('1990-01-01') }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { name: 'Alicia', age: 31, active: false, birthday: new Date('1990-01-02') },
		};

		const result = await authMemberAgent
			.patch(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(200);

		expect(result.body.data).toBe(true);

		const readResponse = await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			id: 1,
			name: 'Alicia',
			age: 31,
			active: false,
			birthday: new Date('1990-01-02').toISOString(),
		});
	});

	test('should update row if user has project:admin role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(admin, project, 'project:admin');
		const dataStore = await createDataStore(project, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 31 },
		};

		await authAdminAgent
			.patch(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authAdminAgent
			.get(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({ id: 1, name: 'Alice', age: 31 });
	});

	test('should update row if user is owner in team project', async () => {
		const project = await createTeamProject('test project', owner);
		const dataStore = await createDataStore(project, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 31 },
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			id: 1,
			name: 'Alice',
			age: 31,
		});
	});

	test('should update row in personal project', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 31 },
		};

		await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			id: 1,
			name: 'Alice',
			age: 31,
		});
	});

	test('should update row by id filter', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 1 }] },
			data: { age: 31 },
		};

		await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(2);
		expect(readResponse.body.data.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 1,
					name: 'Alice',
					age: 31,
				}),
				expect.objectContaining({
					id: 2,
					name: 'Bob',
					age: 25,
				}),
			]),
		);
	});

	test('should update row with multiple filter conditions', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'department', type: 'string' },
			],
			data: [
				{ name: 'Alice', age: 30, department: 'Engineering' },
				{ name: 'Alice', age: 25, department: 'Marketing' },
				{ name: 'Bob', age: 30, department: 'Engineering' },
			],
		});

		const payload = {
			filter: {
				type: 'and',
				filters: [
					{ columnName: 'name', condition: 'eq', value: 'Alice' },
					{ columnName: 'age', condition: 'eq', value: 30 },
				],
			},
			data: { department: 'Management' },
		};

		await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(3);
		expect(readResponse.body.data.data).toEqual(
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

	test('should return true when no rows match the filter', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Charlie' }] },
			data: { age: 25 },
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(200);

		expect(response.body.data).toEqual(true);

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			name: 'Alice',
			age: 30,
		});
	});

	test('should fail when filter is empty', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [{ name: 'name', type: 'string' }],
		});

		const payload = {
			filter: {},
			data: { name: 'Updated' },
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('filter must not be empty');
	});

	test('should fail when data is empty', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [{ name: 'name', type: 'string' }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: {},
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('data must not be empty');
	});

	test('should fail when data contains invalid column names', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [{ name: 'name', type: 'string' }],
			data: [{ name: 'Alice' }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { invalidColumn: 'value' },
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('unknown column');
	});

	test('should fail when filter contains invalid column names', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [{ name: 'name', type: 'string' }],
			data: [{ name: 'Alice' }],
		});

		const payload = {
			filter: {
				type: 'and',
				filters: [{ columnName: 'invalidColumn', condition: 'eq', value: 'Alice' }],
			},
			data: { name: 'Updated' },
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('unknown column');
	});

	test('should validate data types in filter', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: {
				type: 'and',
				filters: [{ columnName: 'age', condition: 'eq', value: 'invalid_number' }],
			},
			data: { name: 'Updated' },
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('does not match column type');
	});

	test('should validate data types in data', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 'invalid_number' },
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('does not match column type');
	});

	test('should allow partial updates', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'active', type: 'boolean' },
			],
			data: [{ name: 'Alice', age: 30, active: true }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 31 }, // Only updating age, not name or active
		};

		await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			name: 'Alice',
			age: 31,
			active: true,
		});
	});

	test('should handle date values in updates', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'birthdate', type: 'date' },
			],
			data: [{ name: 'Alice', birthdate: '2000-01-01T00:00:00.000Z' }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { birthdate: '1995-05-15T12:30:00.000Z' },
		};

		await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			name: 'Alice',
			birthdate: '1995-05-15T12:30:00.000Z',
		});
	});

	test('should return updated data if returnData is set', async () => {
		const dataStore = await createDataStore(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'active', type: 'boolean' },
				{ name: 'birthday', type: 'date' },
			],
			data: [
				{ name: 'Alice', age: 30, active: true, birthday: new Date('1990-01-01T00:00:00.000Z') },
				{ name: 'Bob', age: 25, active: true, birthday: new Date('1995-05-15T00:00:00.000Z') },
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'active', condition: 'eq', value: true }] },
			data: { active: false },
			returnData: true,
		};

		const result = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
			.send(payload)
			.expect(200);

		expect(result.body.data).toMatchObject([
			{
				id: 1,
				name: 'Alice',
				age: 30,
				active: false,
				birthday: '1990-01-01T00:00:00.000Z',
			},
			{
				id: 2,
				name: 'Bob',
				age: 25,
				active: false,
				birthday: '1995-05-15T00:00:00.000Z',
			},
		]);
	});

	test.each(['like', 'ilike'])(
		'should auto-wrap %s filters if no wildcard is present',
		async (condition) => {
			const dataStore = await createDataStore(memberProject, {
				columns: [
					{
						name: 'name',
						type: 'string',
					},
				],
				data: [{ name: 'Alice Smith' }, { name: 'Bob Jones' }],
			});

			const payload = {
				filter: { type: 'and', filters: [{ columnName: 'name', value: 'Alice', condition }] },
				data: { name: 'Alice Johnson' },
				returnData: true,
			};

			const result = await authMemberAgent
				.patch(`/projects/${memberProject.id}/data-tables/${dataStore.id}/rows`)
				.send(payload)
				.expect(200);

			expect(result.body.data).toEqual([expect.objectContaining({ name: 'Alice Johnson' })]);
		},
	);
});
