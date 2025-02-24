import { Container } from '@n8n/di';

import type { User } from '@/databases/entities/user';
import { FolderRepository } from '@/databases/repositories/folder.repository';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { createFolder } from '@test-integration/db/folders';

import { createTeamProject, linkUserToProject } from '../shared/db/projects';
import { createOwner, createMember } from '../shared/db/users';
import * as testDb from '../shared/test-db';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['folder'],
});

let projectRepository: ProjectRepository;
let folderRepository: FolderRepository;

beforeEach(async () => {
	await testDb.truncate(['Folder', 'SharedWorkflow', 'Tag', 'Project', 'ProjectRelation']);

	projectRepository = Container.get(ProjectRepository);
	folderRepository = Container.get(FolderRepository);

	owner = await createOwner();
	member = await createMember();
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
});

describe('POST /projects/:projectId/folders', () => {
	test('should not create folder when project does not exist', async () => {
		const payload = {
			name: 'Test Folder',
		};

		await authOwnerAgent.post('/projects/non-existing-id/folders').send(payload).expect(403);
	});

	test('should not create folder when name is empty', async () => {
		const project = await createTeamProject(undefined, owner);
		const payload = {
			name: '',
		};

		await authOwnerAgent.post(`/projects/${project.id}/folders`).send(payload).expect(400);
	});

	test('should not create folder if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:viewer');

		const payload = {
			name: 'Test Folder',
		};

		await authMemberAgent.post(`/projects/${project.id}/folders`).send(payload).expect(403);

		const foldersInDb = await folderRepository.find();
		expect(foldersInDb).toHaveLength(0);
	});

	test("should not allow creating folder in another user's personal project", async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const payload = {
			name: 'Test Folder',
		};

		await authMemberAgent
			.post(`/projects/${ownerPersonalProject.id}/folders`)
			.send(payload)
			.expect(403);
	});

	test('should create folder if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:editor');

		const payload = {
			name: 'Test Folder',
		};

		await authMemberAgent.post(`/projects/${project.id}/folders`).send(payload).expect(200);

		const foldersInDb = await folderRepository.find();
		expect(foldersInDb).toHaveLength(1);
	});

	test('should create folder if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);

		const payload = {
			name: 'Test Folder',
		};

		await authOwnerAgent.post(`/projects/${project.id}/folders`).send(payload).expect(200);

		const foldersInDb = await folderRepository.find();
		expect(foldersInDb).toHaveLength(1);
	});

	test('should not allow creating folder with parent that exists in another project', async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const memberTeamProject = await createTeamProject('test project', member);
		const ownerRootFolderInPersonalProject = await createFolder(ownerPersonalProject);
		await createFolder(memberTeamProject);

		const payload = {
			name: 'Test Folder',
			parentFolderId: ownerRootFolderInPersonalProject.id,
		};

		await authMemberAgent
			.post(`/projects/${memberTeamProject.id}/folders`)
			.send(payload)
			.expect(404);
	});

	test('should create folder in root of specified project', async () => {
		const project = await createTeamProject('test', owner);
		const payload = {
			name: 'Test Folder',
		};

		const response = await authOwnerAgent.post(`/projects/${project.id}/folders`).send(payload);

		expect(response.body.data).toEqual(
			expect.objectContaining({
				id: expect.any(String),
				name: payload.name,
				parentFolder: null,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			}),
		);

		const folderInDb = await folderRepository.findOneBy({ id: response.body.id });
		expect(folderInDb).toBeDefined();
		expect(folderInDb?.name).toBe(payload.name);
	});

	test('should create folder in specified project within another folder', async () => {
		const project = await createTeamProject('test', owner);
		const folder = await createFolder(project);

		const payload = {
			name: 'Test Folder',
			parentFolderId: folder.id,
		};

		const response = await authOwnerAgent.post(`/projects/${project.id}/folders`).send(payload);

		expect(response.body.data).toEqual(
			expect.objectContaining({
				id: expect.any(String),
				name: payload.name,
				parentFolder: expect.objectContaining({
					id: folder.id,
					name: folder.name,
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				}),
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			}),
		);

		const folderInDb = await folderRepository.findOneBy({ id: response.body.data.id });

		expect(folderInDb).toBeDefined();
		expect(folderInDb?.name).toBe(payload.name);
	});

	test('should create folder in personal project', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const payload = {
			name: 'Personal Folder',
		};

		const response = await authOwnerAgent
			.post(`/projects/${personalProject.id}/folders`)
			.send(payload)
			.expect(200);

		expect(response.body.data).toEqual(
			expect.objectContaining({
				id: expect.any(String),
				name: payload.name,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			}),
		);

		const folderInDb = await folderRepository.findOneBy({ id: response.body.id });
		expect(folderInDb).toBeDefined();
		expect(folderInDb?.name).toBe(payload.name);
	});
});
