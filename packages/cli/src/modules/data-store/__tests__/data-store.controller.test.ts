import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { ActiveWorkflowManager } from '@/active-workflow-manager';

// import * as utils from '../shared/utils/';

import { createOwner, createMember, createAdmin } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';
import { DataStoreRepository } from '../data-store.repository';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let ownerProject: Project;
let memberProject: Project;
let admin: User;

const testServer = utils.setupTestServer({
	endpointGroups: ['data-store'],
	modules: ['data-store'],
});
let projectRepository: ProjectRepository;
let dataStoreRepository: DataStoreRepository;
let workflowRepository: WorkflowRepository;

const activeWorkflowManager = mockInstance(ActiveWorkflowManager);

beforeAll(async () => {
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['DataStore', 'DataStoreColumn', 'Project', 'ProjectRelation']);

	projectRepository = Container.get(ProjectRepository);
	dataStoreRepository = Container.get(DataStoreRepository);
	workflowRepository = Container.get(WorkflowRepository);

	owner = await createOwner();
	member = await createMember();
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);

	ownerProject = await getPersonalProject(owner);
	memberProject = await getPersonalProject(member);
	admin = await createAdmin();
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

		const dataStoreInDb = await dataStoreRepository.findOneBy({ id: response.body.id });
		expect(dataStoreInDb).toBeDefined();
		expect(dataStoreInDb?.name).toBe(payload.name);
	});
});
