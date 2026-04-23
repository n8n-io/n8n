import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRelationRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createFolder } from '../shared/db/folders';
import { createOwnerWithApiKey, createMemberWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let member: User;
let ownerPersonalProject: Project;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
});

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	member = await createMemberWithApiKey();

	const projectRepository = Container.get(ProjectRepository);
	ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
});

beforeEach(async () => {
	await testDb.truncate(['Folder', 'ProjectRelation', 'Project']);

	const projectRepository = Container.get(ProjectRepository);
	const projectRelationRepository = Container.get(ProjectRelationRepository);

	const createPersonalProject = async (user: User) => {
		const project = await projectRepository.save(
			projectRepository.create({
				type: 'personal',
				name: user.createPersonalProjectName(),
				creatorId: user.id,
			}),
		);

		await projectRelationRepository.save(
			projectRelationRepository.create({
				projectId: project.id,
				userId: user.id,
				role: { slug: 'project:personalOwner' },
			}),
		);

		return project;
	};

	ownerPersonalProject = await createPersonalProject(owner);
	await createPersonalProject(member);

	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
});

const testWithAPIKey = (method: 'get' | 'post', url: string, apiKey: string | null) => async () => {
	void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
	const response = await authOwnerAgent[method](url);
	expect(response.statusCode).toBe(401);
};

describe('POST /projects/:projectId/folders', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('post', `/projects/${String('any-id')}/folders`, null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('post', `/projects/${String('any-id')}/folders`, 'abcXYZ'),
	);

	test('should create a folder in personal project', async () => {
		testServer.license.enable('feat:folders');

		const response = await authOwnerAgent
			.post(`/projects/${ownerPersonalProject.id}/folders`)
			.send({ name: 'My Folder' });

		expect(response.statusCode).toBe(201);
		expect(response.body).toHaveProperty('id');
		expect(response.body).toHaveProperty('name', 'My Folder');
	});

	test('should create a folder with parentFolderId', async () => {
		testServer.license.enable('feat:folders');

		const parentFolder = await createFolder(ownerPersonalProject, { name: 'Parent' });

		const response = await authOwnerAgent
			.post(`/projects/${ownerPersonalProject.id}/folders`)
			.send({ name: 'Child', parentFolderId: parentFolder.id });

		expect(response.statusCode).toBe(201);
		expect(response.body).toHaveProperty('name', 'Child');
	});

	test('should return 404 when project does not exist', async () => {
		testServer.license.enable('feat:folders');

		const response = await authOwnerAgent
			.post('/projects/non-existent-project-id/folders')
			.send({ name: 'Folder' });

		expect(response.statusCode).toBe(404);
	});

	test('should return 403 when user is not a member of the project', async () => {
		testServer.license.enable('feat:folders');
		testServer.license.setQuota('quota:maxTeamProjects', -1);
		testServer.license.enable('feat:projectRole:admin');

		const teamProject = await createTeamProject('No Access');

		const response = await authMemberAgent
			.post(`/projects/${teamProject.id}/folders`)
			.send({ name: 'Unauthorized Folder' });

		expect(response.statusCode).toBe(403);
	});

	test('should return 403 when feature is not licensed', async () => {
		const response = await authOwnerAgent
			.post(`/projects/${ownerPersonalProject.id}/folders`)
			.send({ name: 'Folder' });

		expect(response.statusCode).toBe(403);
	});
});

describe('GET /projects/:projectId/folders', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('get', `/projects/${String('any-id')}/folders`, null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('get', `/projects/${String('any-id')}/folders`, 'abcXYZ'),
	);

	test('should list folders in a project', async () => {
		testServer.license.enable('feat:folders');

		await createFolder(ownerPersonalProject, { name: 'Folder A' });
		await createFolder(ownerPersonalProject, { name: 'Folder B' });

		const response = await authOwnerAgent.get(`/projects/${ownerPersonalProject.id}/folders`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty('data');
		expect(response.body).toHaveProperty('count', 2);
		expect(response.body.data).toHaveLength(2);
	});

	test('should return empty list when no folders exist', async () => {
		testServer.license.enable('feat:folders');

		const response = await authOwnerAgent.get(`/projects/${ownerPersonalProject.id}/folders`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ count: 0, data: [] });
	});

	test('should return 404 when project does not exist', async () => {
		testServer.license.enable('feat:folders');

		const response = await authOwnerAgent.get('/projects/non-existent-project-id/folders');

		expect(response.statusCode).toBe(404);
	});

	test('should return 403 when user is not a member of the project', async () => {
		testServer.license.enable('feat:folders');
		testServer.license.setQuota('quota:maxTeamProjects', -1);
		testServer.license.enable('feat:projectRole:admin');

		const teamProject = await createTeamProject('No Access');

		const response = await authMemberAgent.get(`/projects/${teamProject.id}/folders`);

		expect(response.statusCode).toBe(403);
	});

	test('should return 403 when feature is not licensed', async () => {
		const response = await authOwnerAgent.get(`/projects/${ownerPersonalProject.id}/folders`);

		expect(response.statusCode).toBe(403);
	});

	test('should list folders in a team project when user is a member', async () => {
		testServer.license.enable('feat:folders');
		testServer.license.setQuota('quota:maxTeamProjects', -1);
		testServer.license.enable('feat:projectRole:admin');

		const memberWithFolderScope = await createMemberWithApiKey({
			scopes: ['folder:list'],
		});

		const teamProject = await createTeamProject('Team Folders');
		await linkUserToProject(memberWithFolderScope, teamProject, 'project:editor');

		await createFolder(teamProject, { name: 'Team Folder 1' });
		await createFolder(teamProject, { name: 'Team Folder 2' });

		const response = await testServer
			.publicApiAgentFor(memberWithFolderScope)
			.get(`/projects/${teamProject.id}/folders`);

		expect(response.statusCode).toBe(200);
		expect(response.body.count).toBe(2);
		expect(response.body.data).toHaveLength(2);
	});
});
