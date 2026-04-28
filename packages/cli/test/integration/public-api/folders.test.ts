import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRelationRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';

import { FolderService } from '@/services/folder.service';

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

const testWithAPIKey =
	(method: 'get' | 'post' | 'patch' | 'delete', url: string, apiKey: string | null) => async () => {
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

	test('should return 403 when feature is not licensed', async () => {
		const response = await authOwnerAgent
			.post(`/projects/${ownerPersonalProject.id}/folders`)
			.send({ name: 'Folder' });

		expect(response.statusCode).toBe(403);
	});

	test('should return 403 when API key is missing folder:create scope', async () => {
		testServer.license.enable('feat:folders');
		const ownerWithWrongScope = await createOwnerWithApiKey({ scopes: ['folder:list'] });
		const projectRepository = Container.get(ProjectRepository);
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(
			ownerWithWrongScope.id,
		);

		const response = await testServer
			.publicApiAgentFor(ownerWithWrongScope)
			.post(`/projects/${personalProject.id}/folders`)
			.send({ name: 'No Create Scope' });

		expect(response.statusCode).toBe(403);
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

	test('should return 400 when folder name is missing', async () => {
		testServer.license.enable('feat:folders');

		const response = await authOwnerAgent
			.post(`/projects/${ownerPersonalProject.id}/folders`)
			.send({});

		expect(response.statusCode).toBe(400);
	});

	test('should return 404 when parentFolderId is invalid', async () => {
		testServer.license.enable('feat:folders');

		const response = await authOwnerAgent
			.post(`/projects/${ownerPersonalProject.id}/folders`)
			.send({ name: 'Child', parentFolderId: 'non-existent-parent' });

		expect(response.statusCode).toBe(404);
	});

	test('should return 404 when project does not exist', async () => {
		testServer.license.enable('feat:folders');

		const response = await authOwnerAgent
			.post('/projects/non-existent-project-id/folders')
			.send({ name: 'Folder' });

		expect(response.statusCode).toBe(404);
	});

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

	test('should return 500 when createFolder throws an unexpected error', async () => {
		testServer.license.enable('feat:folders');
		jest
			.spyOn(Container.get(FolderService), 'createFolder')
			.mockRejectedValueOnce(new Error('Unexpected create error'));

		const response = await authOwnerAgent
			.post(`/projects/${ownerPersonalProject.id}/folders`)
			.send({ name: 'Folder' });

		expect(response.statusCode).toBe(500);
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

	test('should return 403 when feature is not licensed', async () => {
		const response = await authOwnerAgent.get(`/projects/${ownerPersonalProject.id}/folders`);

		expect(response.statusCode).toBe(403);
	});

	test('should return 403 when API key is missing folder:list scope', async () => {
		testServer.license.enable('feat:folders');
		const ownerWithWrongScope = await createOwnerWithApiKey({ scopes: ['folder:create'] });
		const projectRepository = Container.get(ProjectRepository);
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(
			ownerWithWrongScope.id,
		);

		await createFolder(personalProject, { name: 'Folder' });

		const response = await testServer
			.publicApiAgentFor(ownerWithWrongScope)
			.get(`/projects/${personalProject.id}/folders`);

		expect(response.statusCode).toBe(403);
	});

	test('should return 403 when user is not a member of the project', async () => {
		testServer.license.enable('feat:folders');
		testServer.license.setQuota('quota:maxTeamProjects', -1);
		testServer.license.enable('feat:projectRole:admin');

		const teamProject = await createTeamProject('No Access');

		const response = await authMemberAgent.get(`/projects/${teamProject.id}/folders`);

		expect(response.statusCode).toBe(403);
	});

	test('should return 404 when project does not exist', async () => {
		testServer.license.enable('feat:folders');

		const response = await authOwnerAgent.get('/projects/non-existent-project-id/folders');

		expect(response.statusCode).toBe(404);
	});

	test('should return empty list when no folders exist', async () => {
		testServer.license.enable('feat:folders');

		const response = await authOwnerAgent.get(`/projects/${ownerPersonalProject.id}/folders`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ count: 0, data: [] });
	});

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

	test('should apply filter, sortBy, skip, and take query options', async () => {
		testServer.license.enable('feat:folders');

		const parentFolder = await createFolder(ownerPersonalProject, { name: 'Parent' });
		await createFolder(ownerPersonalProject, { name: 'Child B', parentFolder });
		await createFolder(ownerPersonalProject, { name: 'Child A', parentFolder });
		await createFolder(ownerPersonalProject, { name: 'Root Folder' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerPersonalProject.id}/folders`)
			.query({
				filter: JSON.stringify({ parentFolderId: parentFolder.id }),
				sortBy: 'name:asc',
				skip: '1',
				take: '1',
			});

		expect(response.statusCode).toBe(200);
		expect(response.body.count).toBe(2);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe('Child B');
	});

	test('should return 500 when getManyAndCount throws an unexpected error', async () => {
		testServer.license.enable('feat:folders');
		jest
			.spyOn(Container.get(FolderService), 'getManyAndCount')
			.mockRejectedValueOnce(new Error('Unexpected list error'));

		const response = await authOwnerAgent.get(`/projects/${ownerPersonalProject.id}/folders`);

		expect(response.statusCode).toBe(500);
	});
});

describe('DELETE /projects/:projectId/folders/:folderId', () => {
	const createDeleteScopedAgent = async (scopes: ApiKeyScope[] = ['folder:delete']) => {
		const ownerWithDeleteScope = await createOwnerWithApiKey({ scopes });
		const projectRepository = Container.get(ProjectRepository);
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(
			ownerWithDeleteScope.id,
		);
		const agent = testServer.publicApiAgentFor(ownerWithDeleteScope);

		return { agent, personalProject };
	};

	test(
		'should fail due to missing API Key',
		testWithAPIKey('delete', `/projects/${String('any-id')}/folders/${String('folder-id')}`, null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey(
			'delete',
			`/projects/${String('any-id')}/folders/${String('folder-id')}`,
			'abcXYZ',
		),
	);

	test('should return 403 when feature is not licensed', async () => {
		const folder = await createFolder(ownerPersonalProject, { name: 'Folder' });

		const response = await authOwnerAgent.delete(
			`/projects/${ownerPersonalProject.id}/folders/${folder.id}`,
		);

		expect(response.statusCode).toBe(403);
	});

	test('should return 403 when API key is missing folder:delete scope', async () => {
		testServer.license.enable('feat:folders');
		const ownerWithWrongScope = await createOwnerWithApiKey({ scopes: ['folder:list'] });
		const projectRepository = Container.get(ProjectRepository);
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(
			ownerWithWrongScope.id,
		);
		const folder = await createFolder(personalProject, { name: 'Folder' });

		const response = await testServer
			.publicApiAgentFor(ownerWithWrongScope)
			.delete(`/projects/${personalProject.id}/folders/${folder.id}`);

		expect(response.statusCode).toBe(403);
	});

	test('should return 403 when user is not a member of the project', async () => {
		testServer.license.enable('feat:folders');
		testServer.license.setQuota('quota:maxTeamProjects', -1);
		testServer.license.enable('feat:projectRole:admin');

		const teamProject = await createTeamProject('No Access');
		const folder = await createFolder(teamProject, { name: 'Team Folder' });

		const response = await authMemberAgent.delete(
			`/projects/${teamProject.id}/folders/${folder.id}`,
		);

		expect(response.statusCode).toBe(403);
	});

	test('should return 404 when project does not exist', async () => {
		testServer.license.enable('feat:folders');
		const { agent } = await createDeleteScopedAgent();

		const response = await agent.delete(
			'/projects/non-existent-project-id/folders/non-existent-folder-id',
		);

		expect(response.statusCode).toBe(404);
	});

	test('should return 404 when folder does not exist', async () => {
		testServer.license.enable('feat:folders');
		const { agent, personalProject } = await createDeleteScopedAgent();

		const response = await agent.delete(
			`/projects/${personalProject.id}/folders/non-existent-folder-id`,
		);

		expect(response.statusCode).toBe(404);
	});

	test('should return 400 for invalid transferToFolderId query format', async () => {
		testServer.license.enable('feat:folders');
		const { agent, personalProject } = await createDeleteScopedAgent();

		const folder = await createFolder(personalProject, { name: 'Folder' });

		const response = await agent
			.delete(`/projects/${personalProject.id}/folders/${folder.id}`)
			.query({ transferToFolderId: ['folder-a', 'folder-b'] });

		expect(response.statusCode).toBe(400);
	});

	test('should return 400 when transferToFolderId points to the folder being deleted', async () => {
		testServer.license.enable('feat:folders');
		const { agent, personalProject } = await createDeleteScopedAgent();

		const folder = await createFolder(personalProject, { name: 'Folder' });

		const response = await agent
			.delete(`/projects/${personalProject.id}/folders/${folder.id}`)
			.query({ transferToFolderId: folder.id });

		expect(response.statusCode).toBe(400);
	});

	test('should delete a folder in personal project', async () => {
		testServer.license.enable('feat:folders');
		const { agent, personalProject } = await createDeleteScopedAgent();

		const folder = await createFolder(personalProject, { name: 'Delete Me' });

		const response = await agent.delete(`/projects/${personalProject.id}/folders/${folder.id}`);

		expect(response.statusCode).toBe(204);
	});

	test('should delete folder and transfer child folders to transferToFolderId', async () => {
		testServer.license.enable('feat:folders');
		const { agent, personalProject } = await createDeleteScopedAgent([
			'folder:delete',
			'folder:list',
		]);

		const sourceFolder = await createFolder(personalProject, { name: 'Source Folder' });
		const targetFolder = await createFolder(personalProject, { name: 'Target Folder' });
		const childFolder = await createFolder(personalProject, {
			name: 'Child Folder',
			parentFolder: sourceFolder,
		});

		const response = await agent
			.delete(`/projects/${personalProject.id}/folders/${sourceFolder.id}`)
			.query({ transferToFolderId: targetFolder.id });

		expect(response.statusCode).toBe(204);

		const transferredFoldersResponse = await agent
			.get(`/projects/${personalProject.id}/folders`)
			.query({
				filter: JSON.stringify({ parentFolderId: targetFolder.id }),
			});
		const transferredFolders = transferredFoldersResponse.body as { data: Array<{ id: string }> };

		expect(transferredFoldersResponse.statusCode).toBe(200);
		expect(transferredFolders.data).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: childFolder.id })]),
		);

		const sourceFolderResponse = await agent.get(`/projects/${personalProject.id}/folders`).query({
			filter: JSON.stringify({ name: 'Source Folder' }),
		});
		const sourceFolderResults = sourceFolderResponse.body as { count: number };

		expect(sourceFolderResponse.statusCode).toBe(200);
		expect(sourceFolderResults.count).toBe(0);
	});

	test('should delete folder in a team project when user has folder:delete scope', async () => {
		testServer.license.enable('feat:folders');
		testServer.license.setQuota('quota:maxTeamProjects', -1);
		testServer.license.enable('feat:projectRole:admin');

		const memberWithFolderDeleteScope = await createMemberWithApiKey({
			scopes: ['folder:delete'],
		});

		const teamProject = await createTeamProject('Team Folders');
		await linkUserToProject(memberWithFolderDeleteScope, teamProject, 'project:editor');

		const folder = await createFolder(teamProject, { name: 'Delete Team Folder' });

		const response = await testServer
			.publicApiAgentFor(memberWithFolderDeleteScope)
			.delete(`/projects/${teamProject.id}/folders/${folder.id}`);

		expect(response.statusCode).toBe(204);
	});

	test('should return 500 when deleteFolder throws an unexpected error', async () => {
		testServer.license.enable('feat:folders');
		const { agent, personalProject } = await createDeleteScopedAgent();

		const folder = await createFolder(personalProject, { name: 'Folder' });
		jest
			.spyOn(Container.get(FolderService), 'deleteFolder')
			.mockRejectedValueOnce(new Error('Unexpected delete error'));

		const response = await agent.delete(`/projects/${personalProject.id}/folders/${folder.id}`);

		expect(response.statusCode).toBe(500);
	});
});

describe('GET /projects/:projectId/folders/:folderId', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('get', `/projects/${String('any-id')}/folders/${String('folder-id')}`, null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('get', `/projects/${String('any-id')}/folders/${String('folder-id')}`, 'abcXYZ'),
	);

	test('should return 403 when feature is not licensed', async () => {
		const folder = await createFolder(ownerPersonalProject, { name: 'Folder' });

		const response = await authOwnerAgent.get(
			`/projects/${ownerPersonalProject.id}/folders/${folder.id}`,
		);

		expect(response.statusCode).toBe(403);
	});

	test('should return 403 when API key is missing folder:read scope', async () => {
		testServer.license.enable('feat:folders');
		const ownerWithWrongScope = await createOwnerWithApiKey({ scopes: ['folder:list'] });
		const projectRepository = Container.get(ProjectRepository);
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(
			ownerWithWrongScope.id,
		);
		const folder = await createFolder(personalProject, { name: 'Folder' });

		const response = await testServer
			.publicApiAgentFor(ownerWithWrongScope)
			.get(`/projects/${personalProject.id}/folders/${folder.id}`);

		expect(response.statusCode).toBe(403);
	});

	test('should return 403 when user is not a member of the project', async () => {
		testServer.license.enable('feat:folders');
		testServer.license.setQuota('quota:maxTeamProjects', -1);
		testServer.license.enable('feat:projectRole:admin');

		const teamProject = await createTeamProject('No Access');
		const folder = await createFolder(teamProject, { name: 'Team Folder' });

		const response = await authMemberAgent.get(`/projects/${teamProject.id}/folders/${folder.id}`);

		expect(response.statusCode).toBe(403);
	});

	test('should return folder details with counts', async () => {
		testServer.license.enable('feat:folders');

		const folder = await createFolder(ownerPersonalProject, { name: 'Parent' });
		await createFolder(ownerPersonalProject, { name: 'Child', parentFolder: folder });

		const response = await authOwnerAgent.get(
			`/projects/${ownerPersonalProject.id}/folders/${folder.id}`,
		);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(
			expect.objectContaining({
				id: folder.id,
				name: 'Parent',
				totalSubFolders: 1,
				totalWorkflows: 0,
			}),
		);
	});

	test('should return 404 when folder does not exist', async () => {
		testServer.license.enable('feat:folders');

		const response = await authOwnerAgent.get(
			`/projects/${ownerPersonalProject.id}/folders/non-existent-folder-id`,
		);

		expect(response.statusCode).toBe(404);
	});

	test('should return 404 when project does not exist', async () => {
		testServer.license.enable('feat:folders');

		const response = await authOwnerAgent.get(
			'/projects/non-existent-project-id/folders/any-folder-id',
		);

		expect(response.statusCode).toBe(404);
	});
});

describe('PATCH /projects/:projectId/folders/:folderId', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('patch', `/projects/${String('any-id')}/folders/${String('folder-id')}`, null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey(
			'patch',
			`/projects/${String('any-id')}/folders/${String('folder-id')}`,
			'abcXYZ',
		),
	);

	test('should return 403 when feature is not licensed', async () => {
		const folder = await createFolder(ownerPersonalProject, { name: 'Folder' });

		const response = await authOwnerAgent
			.patch(`/projects/${ownerPersonalProject.id}/folders/${folder.id}`)
			.send({ name: 'Renamed' });

		expect(response.statusCode).toBe(403);
	});

	test('should return 403 when API key is missing folder:update scope', async () => {
		testServer.license.enable('feat:folders');
		const ownerWithWrongScope = await createOwnerWithApiKey({ scopes: ['folder:list'] });
		const projectRepository = Container.get(ProjectRepository);
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(
			ownerWithWrongScope.id,
		);
		const folder = await createFolder(personalProject, { name: 'Folder' });

		const response = await testServer
			.publicApiAgentFor(ownerWithWrongScope)
			.patch(`/projects/${personalProject.id}/folders/${folder.id}`)
			.send({ name: 'Renamed' });

		expect(response.statusCode).toBe(403);
	});

	test('should return 400 when setting folder as its own parent', async () => {
		testServer.license.enable('feat:folders');

		const folder = await createFolder(ownerPersonalProject, { name: 'Folder' });

		const response = await authOwnerAgent
			.patch(`/projects/${ownerPersonalProject.id}/folders/${folder.id}`)
			.send({ parentFolderId: folder.id });

		expect(response.statusCode).toBe(400);
	});

	test('should update folder name', async () => {
		testServer.license.enable('feat:folders');

		const folder = await createFolder(ownerPersonalProject, { name: 'Original' });

		const response = await authOwnerAgent
			.patch(`/projects/${ownerPersonalProject.id}/folders/${folder.id}`)
			.send({ name: 'Renamed' });

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty('name', 'Renamed');
	});

	test('should update parent folder', async () => {
		testServer.license.enable('feat:folders');

		const parentFolder = await createFolder(ownerPersonalProject, { name: 'Parent' });
		const childFolder = await createFolder(ownerPersonalProject, { name: 'Child' });

		const response = await authOwnerAgent
			.patch(`/projects/${ownerPersonalProject.id}/folders/${childFolder.id}`)
			.send({ parentFolderId: parentFolder.id });

		expect(response.statusCode).toBe(200);
	});

	test('should return 404 when folder does not exist', async () => {
		testServer.license.enable('feat:folders');

		const response = await authOwnerAgent
			.patch(`/projects/${ownerPersonalProject.id}/folders/non-existent-folder-id`)
			.send({ name: 'Renamed' });

		expect(response.statusCode).toBe(404);
	});

	test('should return 404 when project does not exist', async () => {
		testServer.license.enable('feat:folders');

		const response = await authOwnerAgent
			.patch('/projects/non-existent-project-id/folders/any-folder-id')
			.send({ name: 'Renamed' });

		expect(response.statusCode).toBe(404);
	});

	test('should return 403 when user is not a member of the project', async () => {
		testServer.license.enable('feat:folders');
		testServer.license.setQuota('quota:maxTeamProjects', -1);
		testServer.license.enable('feat:projectRole:admin');

		const teamProject = await createTeamProject('No Access');
		const folder = await createFolder(teamProject, { name: 'Team Folder' });

		const response = await authMemberAgent
			.patch(`/projects/${teamProject.id}/folders/${folder.id}`)
			.send({ name: 'Renamed' });

		expect(response.statusCode).toBe(403);
	});
});
