import { faker } from '@faker-js/faker';
import {
	createWorkflow,
	getWorkflowSharing,
	randomCredentialPayload,
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { FolderRepository, ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ProjectRole } from '@n8n/permissions';
import { PROJECT_EDITOR_ROLE_SLUG, PROJECT_VIEWER_ROLE_SLUG } from '@n8n/permissions';
import {
	createCredentials,
	getCredentialSharings,
	saveCredential,
	shareCredentialWithProjects,
	shareCredentialWithUsers,
} from '@test-integration/db/credentials';
import { createFolder } from '@test-integration/db/folders';
import { createTag } from '@test-integration/db/tags';
import { DateTime } from 'luxon';
import { ApplicationError, PROJECT_ROOT } from 'n8n-workflow';

import { createOwner, createMember, createUser, createAdmin } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

import { ActiveWorkflowManager } from '@/active-workflow-manager';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let ownerProject: Project;
let memberProject: Project;
let admin: User;

const testServer = utils.setupTestServer({
	endpointGroups: ['folder'],
});

let projectRepository: ProjectRepository;
let folderRepository: FolderRepository;
let workflowRepository: WorkflowRepository;

const activeWorkflowManager = mockInstance(ActiveWorkflowManager);

beforeEach(async () => {
	testServer.license.enable('feat:folders');

	await testDb.truncate(['Folder', 'SharedWorkflow', 'TagEntity', 'Project', 'ProjectRelation']);

	projectRepository = Container.get(ProjectRepository);
	folderRepository = Container.get(FolderRepository);
	workflowRepository = Container.get(WorkflowRepository);

	owner = await createOwner();
	member = await createMember();
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);

	ownerProject = await getPersonalProject(owner);
	memberProject = await getPersonalProject(member);
	admin = await createAdmin();
});

describe('POST /projects/:projectId/folders', () => {
	test('should now create folder if license does not allow it', async () => {
		testServer.license.disable('feat:folders');
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:viewer');

		const payload = {
			name: 'Test Folder',
		};

		await authMemberAgent.post(`/projects/${project.id}/folders`).send(payload).expect(403);
	});

	test('should not create folder when project does not exist', async () => {
		const payload = {
			name: 'Test Folder',
		};

		await authOwnerAgent.post('/projects/non-existing-id/folders').send(payload).expect(404);
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

describe('GET /projects/:projectId/folders/:folderId/tree', () => {
	test('should not retrieve folder tree if license does not allow it', async () => {
		testServer.license.disable('feat:folders');

		const project = await createTeamProject('test', owner);
		const rootFolder = await createFolder(project, { name: 'Root' });

		const childFolder1 = await createFolder(project, {
			name: 'Child 1',
			parentFolder: rootFolder,
		});

		await createFolder(project, {
			name: 'Child 2',
			parentFolder: rootFolder,
		});

		const grandchildFolder = await createFolder(project, {
			name: 'Grandchild',
			parentFolder: childFolder1,
		});

		await authOwnerAgent
			.get(`/projects/${project.id}/folders/${grandchildFolder.id}/tree`)
			.expect(403);
	});

	test('should not get folder tree when project does not exist', async () => {
		await authOwnerAgent.get('/projects/non-existing-id/folders/some-folder-id/tree').expect(404);
	});

	test('should not get folder tree when folder does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		await authOwnerAgent
			.get(`/projects/${project.id}/folders/non-existing-folder/tree`)
			.expect(404);
	});

	test('should not get folder tree if user has no access to project', async () => {
		const project = await createTeamProject('test project', owner);
		const folder = await createFolder(project);

		await authMemberAgent.get(`/projects/${project.id}/folders/${folder.id}/tree`).expect(403);
	});

	test("should not allow getting folder tree from another user's personal project", async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder = await createFolder(ownerPersonalProject);

		await authMemberAgent
			.get(`/projects/${ownerPersonalProject.id}/folders/${folder.id}/tree`)
			.expect(403);
	});

	test('should get nested folder structure', async () => {
		const project = await createTeamProject('test', owner);
		const rootFolder = await createFolder(project, { name: 'Root' });

		const childFolder1 = await createFolder(project, {
			name: 'Child 1',
			parentFolder: rootFolder,
		});

		await createFolder(project, {
			name: 'Child 2',
			parentFolder: rootFolder,
		});

		const grandchildFolder = await createFolder(project, {
			name: 'Grandchild',
			parentFolder: childFolder1,
		});

		const response = await authOwnerAgent
			.get(`/projects/${project.id}/folders/${grandchildFolder.id}/tree`)
			.expect(200);

		expect(response.body.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: rootFolder.id,
					name: 'Root',
					children: expect.arrayContaining([
						expect.objectContaining({
							id: childFolder1.id,
							name: 'Child 1',
							children: expect.arrayContaining([
								expect.objectContaining({
									id: grandchildFolder.id,
									name: 'Grandchild',
									children: [],
								}),
							]),
						}),
					]),
				}),
			]),
		);
	});
});

describe('GET /projects/:projectId/folders/:folderId/credentials', () => {
	test('should not retrieve folder tree if license does not allow it', async () => {
		testServer.license.disable('feat:folders');

		const project = await createTeamProject('test', owner);
		const rootFolder = await createFolder(project, { name: 'Root' });

		const childFolder1 = await createFolder(project, {
			name: 'Child 1',
			parentFolder: rootFolder,
		});

		await createFolder(project, {
			name: 'Child 2',
			parentFolder: rootFolder,
		});

		const grandchildFolder = await createFolder(project, {
			name: 'Grandchild',
			parentFolder: childFolder1,
		});

		for (const folder of [rootFolder, childFolder1, grandchildFolder]) {
			const credential = await createCredentials(
				{
					name: `Test credential ${folder.name}`,
					data: '',
					type: 'test',
				},
				project,
			);

			await createWorkflow(
				{
					name: 'Test Workflow',
					parentFolder: folder,
					active: false,
					nodes: [
						{
							parameters: {},
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							typeVersion: 1.2,
							position: [0, 0],
							id: faker.string.uuid(),
							name: 'OpenAI Chat Model',
							credentials: {
								openAiApi: {
									id: credential.id,
									name: credential.name,
								},
							},
						},
					],
				},
				owner,
			);
		}

		await authOwnerAgent
			.get(`/projects/${project.id}/folders/${childFolder1.id}/credentials`)
			.expect(403);
	});

	test('should not get folder credentials when project does not exist', async () => {
		await authOwnerAgent
			.get('/projects/non-existing-id/folders/some-folder-id/credentials')
			.expect(404);
	});

	test('should not get folder credentials when folder does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		await authOwnerAgent
			.get(`/projects/${project.id}/folders/non-existing-folder/credentials`)
			.expect(404);
	});

	test('should not get folder credentials if user has no access to project', async () => {
		const project = await createTeamProject('test project', owner);
		const folder = await createFolder(project);

		await authMemberAgent
			.get(`/projects/${project.id}/folders/${folder.id}/credentials`)
			.expect(403);
	});

	test("should not allow getting folder credentials from another user's personal project", async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder = await createFolder(ownerPersonalProject);

		await authMemberAgent
			.get(`/projects/${ownerPersonalProject.id}/folders/${folder.id}/credentials`)
			.expect(403);
	});

	test('should get all used credentials from workflows within the folder and subfolders', async () => {
		const project = await createTeamProject('test', owner);
		const rootFolder = await createFolder(project, { name: 'Root' });

		const childFolder1 = await createFolder(project, {
			name: 'Child 1',
			parentFolder: rootFolder,
		});

		await createFolder(project, {
			name: 'Child 2',
			parentFolder: rootFolder,
		});

		const grandchildFolder = await createFolder(project, {
			name: 'Grandchild',
			parentFolder: childFolder1,
		});

		for (const folder of [rootFolder, childFolder1, grandchildFolder]) {
			const credential = await createCredentials(
				{
					name: `Test credential ${folder.name}`,
					data: '',
					type: 'test',
				},
				project,
			);

			await createWorkflow(
				{
					name: 'Test Workflow',
					parentFolder: folder,
					active: false,
					nodes: [
						{
							parameters: {},
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							typeVersion: 1.2,
							position: [0, 0],
							id: faker.string.uuid(),
							name: 'OpenAI Chat Model',
							credentials: {
								openAiApi: {
									id: credential.id,
									name: credential.name,
								},
							},
						},
					],
				},
				owner,
			);
		}

		const response = await authOwnerAgent
			.get(`/projects/${project.id}/folders/${childFolder1.id}/credentials`)
			.expect(200);

		expect(response.body.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: expect.stringContaining('Test credential Child 1'),
				}),
				expect.objectContaining({
					name: expect.stringContaining('Test credential Grandchild'),
				}),
			]),
		);
	});
});

describe('PATCH /projects/:projectId/folders/:folderId', () => {
	test('should not update folder if license does not allow it', async () => {
		testServer.license.disable('feat:folders');

		const project = await createTeamProject(undefined, owner);
		const folder = await createFolder(project, { name: 'Original Name' });
		await linkUserToProject(member, project, 'project:editor');

		const payload = {
			name: 'Updated Folder Name',
		};

		await authMemberAgent
			.patch(`/projects/${project.id}/folders/${folder.id}`)
			.send(payload)
			.expect(403);
	});

	test('should not update folder when project does not exist', async () => {
		const payload = {
			name: 'Updated Folder Name',
		};

		await authOwnerAgent
			.patch('/projects/non-existing-id/folders/some-folder-id')
			.send(payload)
			.expect(404);
	});

	test('should not update folder when folder does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		const payload = {
			name: 'Updated Folder Name',
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/folders/non-existing-folder`)
			.send(payload)
			.expect(404);
	});

	test('should not update folder when name is empty', async () => {
		const project = await createTeamProject(undefined, owner);
		const folder = await createFolder(project, { name: 'Original Name' });

		const payload = {
			name: '',
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/folders/${folder.id}`)
			.send(payload)
			.expect(400);

		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb?.name).toBe('Original Name');
	});

	test('should not update folder if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const folder = await createFolder(project, { name: 'Original Name' });
		await linkUserToProject(member, project, 'project:viewer');

		const payload = {
			name: 'Updated Folder Name',
		};

		await authMemberAgent
			.patch(`/projects/${project.id}/folders/${folder.id}`)
			.send(payload)
			.expect(403);

		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb?.name).toBe('Original Name');
	});

	test("should not allow updating folder in another user's personal project", async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder = await createFolder(ownerPersonalProject, { name: 'Original Name' });

		const payload = {
			name: 'Updated Folder Name',
		};

		await authMemberAgent
			.patch(`/projects/${ownerPersonalProject.id}/folders/${folder.id}`)
			.send(payload)
			.expect(403);

		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb?.name).toBe('Original Name');
	});

	test('should update folder if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const folder = await createFolder(project, { name: 'Original Name' });
		await linkUserToProject(member, project, 'project:editor');

		const payload = {
			name: 'Updated Folder Name',
		};

		await authMemberAgent
			.patch(`/projects/${project.id}/folders/${folder.id}`)
			.send(payload)
			.expect(200);

		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb?.name).toBe('Updated Folder Name');
	});

	test('should update folder if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const folder = await createFolder(project, { name: 'Original Name' });

		const payload = {
			name: 'Updated Folder Name',
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/folders/${folder.id}`)
			.send(payload)
			.expect(200);

		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb?.name).toBe('Updated Folder Name');
	});

	test('should update folder in personal project', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder = await createFolder(personalProject, { name: 'Original Name' });

		const payload = {
			name: 'Updated Folder Name',
		};

		await authOwnerAgent
			.patch(`/projects/${personalProject.id}/folders/${folder.id}`)
			.send(payload)
			.expect(200);

		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb?.name).toBe('Updated Folder Name');
	});

	test('should update folder tags', async () => {
		const project = await createTeamProject('test project', owner);
		const folder = await createFolder(project, { name: 'Test Folder' });
		const tag1 = await createTag({ name: 'Tag 1' });
		const tag2 = await createTag({ name: 'Tag 2' });

		const payload = {
			tagIds: [tag1.id, tag2.id],
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/folders/${folder.id}`)
			.send(payload)
			.expect(200);

		const folderWithTags = await folderRepository.findOne({
			where: { id: folder.id },
			relations: ['tags'],
		});

		expect(folderWithTags?.tags).toHaveLength(2);
		expect(folderWithTags?.tags.map((t) => t.id).sort()).toEqual([tag1.id, tag2.id].sort());
	});

	test('should replace existing folder tags with new ones', async () => {
		const project = await createTeamProject(undefined, owner);
		const tag1 = await createTag({ name: 'Tag 1' });
		const tag2 = await createTag({ name: 'Tag 2' });
		const tag3 = await createTag({ name: 'Tag 3' });

		const folder = await createFolder(project, {
			name: 'Test Folder',
			tags: [tag1, tag2],
		});

		const payload = {
			tagIds: [tag3.id],
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/folders/${folder.id}`)
			.send(payload)
			.expect(200);

		const folderWithTags = await folderRepository.findOne({
			where: { id: folder.id },
			relations: ['tags'],
		});

		expect(folderWithTags?.tags).toHaveLength(1);
		expect(folderWithTags?.tags[0].id).toBe(tag3.id);
	});

	test('should update folder parent folder ID', async () => {
		const project = await createTeamProject('test project', owner);
		await createFolder(project, { name: 'Original Folder' });
		const targetFolder = await createFolder(project, { name: 'Target Folder' });

		const folderToMove = await createFolder(project, {
			name: 'Folder To Move',
		});

		const payload = {
			parentFolderId: targetFolder.id,
		};

		await authOwnerAgent.patch(`/projects/${project.id}/folders/${folderToMove.id}`).send(payload);

		const updatedFolder = await folderRepository.findOne({
			where: { id: folderToMove.id },
			relations: ['parentFolder'],
		});

		expect(updatedFolder).toBeDefined();
		expect(updatedFolder?.parentFolder?.id).toBe(targetFolder.id);
	});

	test('should not update folder parent when target folder does not exist', async () => {
		const project = await createTeamProject(undefined, owner);
		const folderToMove = await createFolder(project, { name: 'Folder To Move' });

		const payload = {
			parentFolderId: 'non-existing-folder-id',
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/folders/${folderToMove.id}`)
			.send(payload)
			.expect(404);

		const updatedFolder = await folderRepository.findOne({
			where: { id: folderToMove.id },
			relations: ['parentFolder'],
		});

		expect(updatedFolder).toBeDefined();
		expect(updatedFolder?.parentFolder).toBeNull();
	});

	test('should not update folder parent when target folder is in another project', async () => {
		const project1 = await createTeamProject('Project 1', owner);
		const project2 = await createTeamProject('Project 2', owner);

		const folderToMove = await createFolder(project1, { name: 'Folder To Move' });
		const targetFolder = await createFolder(project2, { name: 'Target Folder' });

		const payload = {
			parentFolderId: targetFolder.id,
		};

		await authOwnerAgent
			.patch(`/projects/${project1.id}/folders/${folderToMove.id}`)
			.send(payload)
			.expect(404);

		const updatedFolder = await folderRepository.findOne({
			where: { id: folderToMove.id },
			relations: ['parentFolder'],
		});

		expect(updatedFolder).toBeDefined();
		expect(updatedFolder?.parentFolder).toBeNull();
	});

	test('should allow moving a folder to root level by setting parentFolderId to "0"', async () => {
		const project = await createTeamProject(undefined, owner);
		const parentFolder = await createFolder(project, { name: 'Parent Folder' });

		const folderToMove = await createFolder(project, {
			name: 'Folder To Move',
			parentFolder,
		});

		// Verify initial state
		const folder = await folderRepository.findOne({
			where: { id: folderToMove.id },
			relations: ['parentFolder'],
		});
		expect(folder?.parentFolder?.id).toBe(parentFolder.id);

		const payload = {
			parentFolderId: PROJECT_ROOT,
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/folders/${folderToMove.id}`)
			.send(payload)
			.expect(200);

		const updatedFolder = await folderRepository.findOne({
			where: { id: folderToMove.id },
			relations: ['parentFolder'],
		});

		expect(updatedFolder).toBeDefined();
		expect(updatedFolder?.parentFolder).toBeNull();
	});

	test('should not update folder parent if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await createFolder(project, { name: 'Parent Folder' });
		const targetFolder = await createFolder(project, { name: 'Target Folder' });

		const folderToMove = await createFolder(project, {
			name: 'Folder To Move',
		});

		await linkUserToProject(member, project, 'project:viewer');

		const payload = {
			parentFolderId: targetFolder.id,
		};

		await authMemberAgent
			.patch(`/projects/${project.id}/folders/${folderToMove.id}`)
			.send(payload)
			.expect(403);

		const updatedFolder = await folderRepository.findOne({
			where: { id: folderToMove.id },
			relations: ['parentFolder'],
		});

		expect(updatedFolder).toBeDefined();
		expect(updatedFolder?.parentFolder).toBeNull();
	});

	test('should update folder parent folder if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const targetFolder = await createFolder(project, { name: 'Target Folder' });

		const folderToMove = await createFolder(project, {
			name: 'Folder To Move',
		});

		await linkUserToProject(member, project, 'project:editor');

		const payload = {
			parentFolderId: targetFolder.id,
		};

		await authMemberAgent
			.patch(`/projects/${project.id}/folders/${folderToMove.id}`)
			.send(payload)
			.expect(200);

		const updatedFolder = await folderRepository.findOne({
			where: { id: folderToMove.id },
			relations: ['parentFolder'],
		});

		expect(updatedFolder).toBeDefined();
		expect(updatedFolder?.parentFolder?.id).toBe(targetFolder.id);
	});

	test('should not allow setting a folder as its own parent', async () => {
		const project = await createTeamProject(undefined, owner);
		const folder = await createFolder(project, { name: 'Test Folder' });

		const payload = {
			parentFolderId: folder.id,
		};

		const response = await authOwnerAgent
			.patch(`/projects/${project.id}/folders/${folder.id}`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toBe('Cannot set a folder as its own parent');

		const folderInDb = await folderRepository.findOne({
			where: { id: folder.id },
			relations: ['parentFolder'],
		});

		expect(folderInDb).toBeDefined();
		expect(folderInDb?.parentFolder).toBeNull();
	});

	test("should not allow setting folder's parent to a folder that is a direct child", async () => {
		const project = await createTeamProject(undefined, owner);

		// A
		// └── B
		//     └── C
		const folderA = await createFolder(project, { name: 'A' });
		const folderB = await createFolder(project, {
			name: 'B',
			parentFolder: folderA,
		});
		const folderC = await createFolder(project, {
			name: 'C',
			parentFolder: folderB,
		});

		// Attempt to make the parent of B its child C
		const payload = {
			parentFolderId: folderC.id,
		};

		const response = await authOwnerAgent
			.patch(`/projects/${project.id}/folders/${folderB.id}`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toBe(
			"Cannot set a folder's parent to a folder that is a descendant of the current folder",
		);

		const folderBInDb = await folderRepository.findOne({
			where: { id: folderB.id },
			relations: ['parentFolder'],
		});

		expect(folderBInDb).toBeDefined();
		expect(folderBInDb?.parentFolder?.id).toBe(folderA.id);
	});

	test("should not allow setting folder's parent to a folder that is a descendant", async () => {
		const project = await createTeamProject(undefined, owner);

		// A
		// └── B
		//     └── C
		//         └── D
		const folderA = await createFolder(project, { name: 'A' });
		const folderB = await createFolder(project, {
			name: 'B',
			parentFolder: folderA,
		});
		const folderC = await createFolder(project, {
			name: 'C',
			parentFolder: folderB,
		});
		const folderD = await createFolder(project, {
			name: 'D',
			parentFolder: folderC,
		});

		// Attempt to make the parent of A the descendant D
		const payload = {
			parentFolderId: folderD.id,
		};

		const response = await authOwnerAgent
			.patch(`/projects/${project.id}/folders/${folderA.id}`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toBe(
			"Cannot set a folder's parent to a folder that is a descendant of the current folder",
		);

		const folderAInDb = await folderRepository.findOne({
			where: { id: folderA.id },
			relations: ['parentFolder'],
		});

		expect(folderAInDb).toBeDefined();
		expect(folderAInDb?.parentFolder?.id).not.toBeDefined();
	});
});

describe('DELETE /projects/:projectId/folders/:folderId', () => {
	test('should not delete folder if license does not allow it', async () => {
		testServer.license.disable('feat:folders');

		const project = await createTeamProject(undefined, owner);
		const folder = await createFolder(project);

		await authOwnerAgent
			.delete(`/projects/${project.id}/folders/${folder.id}`)
			.send({})
			.expect(403);
	});

	test('should not delete folder when project does not exist', async () => {
		await authOwnerAgent
			.delete('/projects/non-existing-id/folders/some-folder-id')
			.send({})
			.expect(404);
	});

	test('should not delete folder when folder does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		await authOwnerAgent
			.delete(`/projects/${project.id}/folders/non-existing-folder`)
			.send({})
			.expect(404);
	});

	test('should not delete folder if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const folder = await createFolder(project);
		await linkUserToProject(member, project, 'project:viewer');

		await authMemberAgent
			.delete(`/projects/${project.id}/folders/${folder.id}`)
			.send({})
			.expect(403);

		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb).toBeDefined();
	});

	test("should not allow deleting folder in another user's personal project", async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder = await createFolder(ownerPersonalProject);

		await authMemberAgent
			.delete(`/projects/${ownerPersonalProject.id}/folders/${folder.id}`)
			.send({})
			.expect(403);

		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb).toBeDefined();
	});

	test('should delete folder if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const folder = await createFolder(project);
		await linkUserToProject(member, project, 'project:editor');

		await authMemberAgent
			.delete(`/projects/${project.id}/folders/${folder.id}`)
			.send({})
			.expect(200);

		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb).toBeNull();
	});

	test('should delete folder if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const folder = await createFolder(project);

		await authOwnerAgent
			.delete(`/projects/${project.id}/folders/${folder.id}`)
			.send({})
			.expect(200);

		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb).toBeNull();
	});

	test('should delete folder in personal project', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder = await createFolder(personalProject);

		await authOwnerAgent
			.delete(`/projects/${personalProject.id}/folders/${folder.id}`)
			.send({})
			.expect(200);

		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb).toBeNull();
	});

	test('should delete folder, all child folders, and archive and move contained workflows to project root when no transfer folder is specified', async () => {
		const project = await createTeamProject('test', owner);
		const rootFolder = await createFolder(project, { name: 'Root' });
		const childFolder = await createFolder(project, {
			name: 'Child',
			parentFolder: rootFolder,
		});

		// Create workflows in the folders
		const workflow1 = await createWorkflow({ parentFolder: rootFolder, active: false }, owner);
		const workflow2 = await createWorkflow({ parentFolder: childFolder, active: true }, owner);

		await authOwnerAgent.delete(`/projects/${project.id}/folders/${rootFolder.id}`);

		// Check folders
		const rootFolderInDb = await folderRepository.findOneBy({ id: rootFolder.id });
		const childFolderInDb = await folderRepository.findOneBy({ id: childFolder.id });

		expect(rootFolderInDb).toBeNull();
		expect(childFolderInDb).toBeNull();

		// Check workflows

		const workflow1InDb = await workflowRepository.findOne({
			where: { id: workflow1.id },
			relations: ['parentFolder'],
		});
		expect(workflow1InDb).not.toBeNull();
		expect(workflow1InDb?.isArchived).toBe(true);
		expect(workflow1InDb?.parentFolder).toBe(null);
		expect(workflow1InDb?.active).toBe(false);

		const workflow2InDb = await workflowRepository.findOne({
			where: { id: workflow2.id },
			relations: ['parentFolder'],
		});
		expect(workflow2InDb).not.toBeNull();
		expect(workflow2InDb?.isArchived).toBe(true);
		expect(workflow2InDb?.parentFolder).toBe(null);
		expect(workflow2InDb?.active).toBe(false);
	});

	test('should transfer folder contents when transferToFolderId is specified', async () => {
		const project = await createTeamProject('test', owner);
		const sourceFolder = await createFolder(project, { name: 'Source' });
		const targetFolder = await createFolder(project, { name: 'Target' });
		const childFolder = await createFolder(project, {
			name: 'Child',
			parentFolder: sourceFolder,
		});

		const workflow1 = await createWorkflow({ parentFolder: sourceFolder }, owner);

		const workflow2 = await createWorkflow({ parentFolder: childFolder }, owner);

		const payload = {
			transferToFolderId: targetFolder.id,
		};

		await authOwnerAgent
			.delete(`/projects/${project.id}/folders/${sourceFolder.id}`)
			.query(payload)
			.expect(200);

		const sourceFolderInDb = await folderRepository.findOne({
			where: { id: sourceFolder.id },
			relations: ['parentFolder'],
		});
		const childFolderInDb = await folderRepository.findOne({
			where: { id: childFolder.id },
			relations: ['parentFolder'],
		});

		// Check folders
		expect(sourceFolderInDb).toBeNull();
		expect(childFolderInDb).toBeDefined();
		expect(childFolderInDb?.parentFolder?.id).toBe(targetFolder.id);

		// Check workflows
		const workflow1InDb = await workflowRepository.findOne({
			where: { id: workflow1.id },
			relations: ['parentFolder'],
		});
		expect(workflow1InDb).toBeDefined();
		expect(workflow1InDb?.parentFolder?.id).toBe(targetFolder.id);

		const workflow2InDb = await workflowRepository.findOne({
			where: { id: workflow2.id },
			relations: ['parentFolder'],
		});
		expect(workflow2InDb).toBeDefined();
		expect(workflow2InDb?.parentFolder?.id).toBe(childFolder.id);
	});

	test('should not transfer folder contents when transfer folder does not exist', async () => {
		const project = await createTeamProject('test', owner);
		const folder = await createFolder(project);

		const payload = {
			transferToFolderId: 'non-existing-folder',
		};

		await authOwnerAgent
			.delete(`/projects/${project.id}/folders/${folder.id}`)
			.query(payload)
			.expect(404);

		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb).toBeDefined();
	});

	test('should not transfer folder contents when transfer folder is in another project', async () => {
		const project1 = await createTeamProject('Project 1', owner);
		const project2 = await createTeamProject('Project 2', owner);
		const sourceFolder = await createFolder(project1);
		const targetFolder = await createFolder(project2);

		const payload = {
			transferToFolderId: targetFolder.id,
		};

		await authOwnerAgent
			.delete(`/projects/${project1.id}/folders/${sourceFolder.id}`)
			.query(payload)
			.expect(404);

		const folderInDb = await folderRepository.findOneBy({ id: sourceFolder.id });
		expect(folderInDb).toBeDefined();
	});

	test('should not allow transferring contents to the same folder being deleted', async () => {
		const project = await createTeamProject('test', owner);
		const folder = await createFolder(project, { name: 'Folder To Delete' });

		await createWorkflow({ parentFolder: folder }, owner);

		const payload = {
			transferToFolderId: folder.id, // Try to transfer contents to the same folder
		};

		const response = await authOwnerAgent
			.delete(`/projects/${project.id}/folders/${folder.id}`)
			.query(payload)
			.expect(400);

		expect(response.body.message).toContain(
			'Cannot transfer folder contents to the folder being deleted',
		);

		// Verify the folder still exists
		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb).toBeDefined();
	});

	test('should transfer folder contents to project root when transferToFolderId is "0"', async () => {
		const project = await createTeamProject('test', owner);
		const sourceFolder = await createFolder(project, { name: 'Source' });
		await createFolder(project, { name: 'Target' });
		const childFolder = await createFolder(project, {
			name: 'Child',
			parentFolder: sourceFolder,
		});

		const workflow1 = await createWorkflow({ parentFolder: sourceFolder }, owner);

		const workflow2 = await createWorkflow({ parentFolder: childFolder }, owner);

		const payload = {
			transferToFolderId: PROJECT_ROOT,
		};

		await authOwnerAgent
			.delete(`/projects/${project.id}/folders/${sourceFolder.id}`)
			.query(payload)
			.expect(200);

		const sourceFolderInDb = await folderRepository.findOne({
			where: { id: sourceFolder.id },
			relations: ['parentFolder'],
		});
		const childFolderInDb = await folderRepository.findOne({
			where: { id: childFolder.id },
			relations: ['parentFolder'],
		});

		// Check folders
		expect(sourceFolderInDb).toBeNull();
		expect(childFolderInDb).toBeDefined();
		expect(childFolderInDb?.parentFolder).toBe(null);

		// Check workflows
		const workflow1InDb = await workflowRepository.findOne({
			where: { id: workflow1.id },
			relations: ['parentFolder'],
		});
		expect(workflow1InDb).toBeDefined();
		expect(workflow1InDb?.parentFolder).toBe(null);

		const workflow2InDb = await workflowRepository.findOne({
			where: { id: workflow2.id },
			relations: ['parentFolder'],
		});
		expect(workflow2InDb).toBeDefined();
		expect(workflow2InDb?.parentFolder?.id).toBe(childFolder.id);
	});
});

describe('GET /projects/:projectId/folders', () => {
	test('should not retrieve folder if license does not allow it', async () => {
		testServer.license.disable('feat:folders');

		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		await createFolder(project, { name: 'Test Folder' });

		await authMemberAgent.get(`/projects/${project.id}/folders`).expect(403);
	});

	test('should not list folders when project does not exist', async () => {
		await authOwnerAgent.get('/projects/non-existing-id/folders').expect(404);
	});

	test('should not list folders if user has no access to project', async () => {
		const project = await createTeamProject('test project', owner);

		await authMemberAgent.get(`/projects/${project.id}/folders`).expect(403);
	});

	test("should not allow listing folders from another user's personal project", async () => {
		await authMemberAgent.get(`/projects/${ownerProject.id}/folders`).expect(403);
	});

	test('should list folders if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		await createFolder(project, { name: 'Test Folder' });

		const response = await authMemberAgent.get(`/projects/${project.id}/folders`).expect(200);

		expect(response.body.count).toBe(1);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe('Test Folder');
	});

	test('should list folders from personal project', async () => {
		await createFolder(ownerProject, { name: 'Personal Folder 1' });
		await createFolder(ownerProject, { name: 'Personal Folder 2' });

		const response = await authOwnerAgent.get(`/projects/${ownerProject.id}/folders`).expect(200);

		expect(response.body.count).toBe(2);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.data.map((f: any) => f.name).sort()).toEqual(
			['Personal Folder 1', 'Personal Folder 2'].sort(),
		);
	});

	test('should filter folders by name', async () => {
		await createFolder(ownerProject, { name: 'Test Folder' });
		await createFolder(ownerProject, { name: 'Another Folder' });
		await createFolder(ownerProject, { name: 'Test Something Else' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ filter: '{ "name": "test" }' })
			.expect(200);

		expect(response.body.count).toBe(2);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.data.map((f: any) => f.name).sort()).toEqual(
			['Test Folder', 'Test Something Else'].sort(),
		);
	});

	test('should filter folders by parent folder ID', async () => {
		const parentFolder = await createFolder(ownerProject, { name: 'Parent' });
		await createFolder(ownerProject, { name: 'Child 1', parentFolder });
		await createFolder(ownerProject, { name: 'Child 2', parentFolder });
		await createFolder(ownerProject, { name: 'Standalone' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ filter: `{ "parentFolderId": "${parentFolder.id}" }` })
			.expect(200);

		expect(response.body.count).toBe(2);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.data.map((f: any) => f.name).sort()).toEqual(
			['Child 1', 'Child 2'].sort(),
		);
	});

	test('should filter root-level folders when parentFolderId=0', async () => {
		const parentFolder = await createFolder(ownerProject, { name: 'Parent' });
		await createFolder(ownerProject, { name: 'Child 1', parentFolder });
		await createFolder(ownerProject, { name: 'Standalone 1' });
		await createFolder(ownerProject, { name: 'Standalone 2' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ filter: `{ "parentFolderId": "${PROJECT_ROOT}" }` })
			.expect(200);

		expect(response.body.count).toBe(3);
		expect(response.body.data).toHaveLength(3);
		expect(response.body.data.map((f: any) => f.name).sort()).toEqual(
			['Parent', 'Standalone 1', 'Standalone 2'].sort(),
		);
	});

	test('should filter folders by tag', async () => {
		const tag1 = await createTag({ name: 'important' });
		const tag2 = await createTag({ name: 'archived' });

		await createFolder(ownerProject, { name: 'Folder 1', tags: [tag1] });
		await createFolder(ownerProject, { name: 'Folder 2', tags: [tag2] });
		await createFolder(ownerProject, { name: 'Folder 3', tags: [tag1, tag2] });

		const response = await authOwnerAgent.get(
			`/projects/${ownerProject.id}/folders?filter={ "tags": ["important"]}`,
		);

		expect(response.body.count).toBe(2);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.data.map((f: any) => f.name).sort()).toEqual(
			['Folder 1', 'Folder 3'].sort(),
		);
	});

	test('should filter folders by multiple tags (AND operator)', async () => {
		const tag1 = await createTag({ name: 'important' });
		const tag2 = await createTag({ name: 'active' });

		await createFolder(ownerProject, { name: 'Folder 1', tags: [tag1] });
		await createFolder(ownerProject, { name: 'Folder 2', tags: [tag2] });
		await createFolder(ownerProject, { name: 'Folder 3', tags: [tag1, tag2] });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders?filter={ "tags": ["important", "active"]}`)
			.expect(200);

		expect(response.body.count).toBe(1);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe('Folder 3');
	});

	test('should filter folders by excludeFolderIdAndDescendants', async () => {
		const folder1 = await createFolder(ownerProject, { name: 'folder level 1' });
		await createFolder(ownerProject, {
			name: 'folder level 1.1',
			parentFolder: folder1,
		});
		const folder12 = await createFolder(ownerProject, {
			name: 'folder level 1.2',
			parentFolder: folder1,
		});
		await createFolder(ownerProject, {
			name: 'folder level 1.2.1',
			parentFolder: folder12,
		});
		const folder122 = await createFolder(ownerProject, {
			name: 'folder level 1.2.2',
			parentFolder: folder12,
		});
		await createFolder(ownerProject, {
			name: 'folder level 1.2.2.1',
			parentFolder: folder122,
		});

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ filter: `{ "excludeFolderIdAndDescendants": "${folder122.id}" }` });

		expect(response.body.data.length).toBe(4);
		expect(response.body.data.map((f: any) => f.name).sort()).toEqual(
			['folder level 1', 'folder level 1.1', 'folder level 1.2.1', 'folder level 1.2'].sort(),
		);
	});

	test('should apply pagination with take parameter', async () => {
		// Create folders with consistent timestamps
		for (let i = 1; i <= 5; i++) {
			await createFolder(ownerProject, {
				name: `Folder ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ take: 3 })
			.expect(200);

		expect(response.body.count).toBe(5); // Total count should be 5
		expect(response.body.data).toHaveLength(3); // But only 3 returned
		expect(response.body.data.map((f: any) => f.name)).toEqual([
			'Folder 5',
			'Folder 4',
			'Folder 3',
		]);
	});

	test('should apply pagination with skip parameter', async () => {
		// Create folders with consistent timestamps
		for (let i = 1; i <= 5; i++) {
			await createFolder(ownerProject, {
				name: `Folder ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ skip: 2 })
			.expect(200);

		expect(response.body.count).toBe(5);
		expect(response.body.data).toHaveLength(3);
		expect(response.body.data.map((f: any) => f.name)).toEqual([
			'Folder 3',
			'Folder 2',
			'Folder 1',
		]);
	});

	test('should apply combined skip and take parameters', async () => {
		// Create folders with consistent timestamps
		for (let i = 1; i <= 5; i++) {
			await createFolder(ownerProject, {
				name: `Folder ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ skip: 1, take: 2 })
			.expect(200);

		expect(response.body.count).toBe(5);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.data.map((f: any) => f.name)).toEqual(['Folder 4', 'Folder 3']);
	});

	test('should sort folders by name ascending', async () => {
		await createFolder(ownerProject, { name: 'Z Folder' });
		await createFolder(ownerProject, { name: 'A Folder' });
		await createFolder(ownerProject, { name: 'M Folder' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ sortBy: 'name:asc' })
			.expect(200);

		expect(response.body.data.map((f: any) => f.name)).toEqual([
			'A Folder',
			'M Folder',
			'Z Folder',
		]);
	});

	test('should sort folders by name descending', async () => {
		await createFolder(ownerProject, { name: 'Z Folder' });
		await createFolder(ownerProject, { name: 'A Folder' });
		await createFolder(ownerProject, { name: 'M Folder' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ sortBy: 'name:desc' })
			.expect(200);

		expect(response.body.data.map((f: any) => f.name)).toEqual([
			'Z Folder',
			'M Folder',
			'A Folder',
		]);
	});

	test('should sort folders by updatedAt', async () => {
		await createFolder(ownerProject, {
			name: 'Older Folder',
			updatedAt: DateTime.now().minus({ days: 2 }).toJSDate(),
		});
		await createFolder(ownerProject, {
			name: 'Newest Folder',
			updatedAt: DateTime.now().toJSDate(),
		});
		await createFolder(ownerProject, {
			name: 'Middle Folder',
			updatedAt: DateTime.now().minus({ days: 1 }).toJSDate(),
		});

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ sortBy: 'updatedAt:desc' })
			.expect(200);

		expect(response.body.data.map((f: any) => f.name)).toEqual([
			'Newest Folder',
			'Middle Folder',
			'Older Folder',
		]);
	});

	test('should select specific fields when requested', async () => {
		await createFolder(ownerProject, { name: 'Test Folder' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders?select=["id","name"]`)
			.expect(200);

		expect(response.body.data[0]).toEqual({
			id: expect.any(String),
			name: 'Test Folder',
		});

		// Other fields should not be present
		expect(response.body.data[0].createdAt).toBeUndefined();
		expect(response.body.data[0].updatedAt).toBeUndefined();
		expect(response.body.data[0].parentFolder).toBeUndefined();
	});

	test('should select path field when requested', async () => {
		const folder1 = await createFolder(ownerProject, {
			name: 'Test Folder',
			updatedAt: DateTime.now().minus({ seconds: 2 }).toJSDate(),
		});
		const folder2 = await createFolder(ownerProject, {
			name: 'Test Folder 2',
			parentFolder: folder1,
			updatedAt: DateTime.now().minus({ seconds: 1 }).toJSDate(),
		});
		const folder3 = await createFolder(ownerProject, {
			name: 'Test Folder 3',
			parentFolder: folder2,
			updatedAt: DateTime.now().toJSDate(),
		});

		const response = await authOwnerAgent
			.get(
				`/projects/${ownerProject.id}/folders?select=["id","path", "name"]&sortBy=updatedAt:desc`,
			)
			.expect(200);

		expect(response.body.data[0]).toEqual({
			id: expect.any(String),
			name: 'Test Folder 3',
			path: [folder1.name, folder2.name, folder3.name],
		});

		expect(response.body.data[1]).toEqual({
			id: expect.any(String),
			name: 'Test Folder 2',
			path: [folder1.name, folder2.name],
		});

		expect(response.body.data[2]).toEqual({
			id: expect.any(String),
			name: 'Test Folder',
			path: [folder1.name],
		});
	});

	test('should combine multiple query parameters correctly', async () => {
		const tag = await createTag({ name: 'important' });
		const parentFolder = await createFolder(ownerProject, { name: 'Parent' });

		await createFolder(ownerProject, {
			name: 'Test Child 1',
			parentFolder,
			tags: [tag],
		});

		await createFolder(ownerProject, {
			name: 'Another Child',
			parentFolder,
		});

		await createFolder(ownerProject, {
			name: 'Test Standalone',
			tags: [tag],
		});

		const response = await authOwnerAgent
			.get(
				`/projects/${ownerProject.id}/folders?filter={"name": "test", "parentFolderId": "${parentFolder.id}", "tags": ["important"]}&sortBy=name:asc`,
			)
			.expect(200);

		expect(response.body.count).toBe(1);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe('Test Child 1');
	});

	test('should filter by projectId automatically based on URL', async () => {
		// Create folders in both owner and member projects
		await createFolder(ownerProject, { name: 'Owner Folder 1' });
		await createFolder(ownerProject, { name: 'Owner Folder 2' });
		await createFolder(memberProject, { name: 'Member Folder' });

		const response = await authOwnerAgent.get(`/projects/${ownerProject.id}/folders`).expect(200);

		expect(response.body.count).toBe(2);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.data.map((f: any) => f.name).sort()).toEqual(
			['Owner Folder 1', 'Owner Folder 2'].sort(),
		);
	});

	test('should include workflow count', async () => {
		const folder = await createFolder(ownerProject, { name: 'Test Folder' });
		await createWorkflow({ parentFolder: folder, isArchived: false }, ownerProject);
		await createWorkflow({ parentFolder: folder, isArchived: false }, ownerProject);
		// Not included in the count
		await createWorkflow({ parentFolder: folder, isArchived: true }, ownerProject);

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ filter: '{ "name": "test" }' })
			.expect(200);

		expect(response.body.count).toBe(1);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].workflowCount).toEqual(2);
	});
});

describe('GET /projects/:projectId/folders/content', () => {
	test('should not retrieve folder content if license does not allow it', async () => {
		testServer.license.disable('feat:folders');

		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const folder = await createFolder(project, { name: 'Test Folder' });

		await authMemberAgent.get(`/projects/${project.id}/folders/${folder.id}/content`).expect(403);
	});

	test('should not list folders when project does not exist', async () => {
		await authOwnerAgent
			.get('/projects/non-existing-id/folders/no-existing-id/content')
			.expect(404);
	});

	test('should not return folder content if user has no access to project', async () => {
		const project = await createTeamProject('test project', owner);

		await authMemberAgent
			.get(`/projects/${project.id}/folders/non-existing-id/content`)
			.expect(403);
	});

	test('should not return folder content if folder does not belong to project', async () => {
		const project = await createTeamProject('test project', owner);

		await authOwnerAgent.get(`/projects/${project.id}/folders/non-existing-id/content`).expect(404);
	});

	test('should return folder content if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const folder = await createFolder(project, { name: 'Test Folder' });

		const response = await authMemberAgent
			.get(`/projects/${project.id}/folders/${folder.id}/content`)
			.expect(200);

		expect(response.body.data.totalWorkflows).toBeDefined();
		expect(response.body.data.totalSubFolders).toBeDefined();
	});

	test('should return folder content', async () => {
		const personalFolder1 = await createFolder(ownerProject, { name: 'Personal Folder 1' });
		await createFolder(ownerProject, { name: 'Personal Folder 2' });
		const personalProjectSubfolder1 = await createFolder(ownerProject, {
			name: 'Personal Folder 1 Subfolder 1',
			parentFolder: personalFolder1,
		});
		const personalProjectSubfolder2 = await createFolder(ownerProject, {
			name: 'Personal Folder 1 Subfolder 2',
			parentFolder: personalFolder1,
		});

		await createWorkflow({ parentFolder: personalFolder1 }, ownerProject);
		await createWorkflow({ parentFolder: personalProjectSubfolder1 }, ownerProject);
		await createWorkflow({ parentFolder: personalProjectSubfolder2 }, ownerProject);
		// Not included in the count
		await createWorkflow(
			{ parentFolder: personalProjectSubfolder2, isArchived: true },
			ownerProject,
		);

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders/${personalFolder1.id}/content`)
			.expect(200);

		expect(response.body.data.totalWorkflows).toBe(3);
		expect(response.body.data.totalSubFolders).toBe(2);
	});
});

describe('PUT /projects/:projectId/folders/:folderId/transfer', () => {
	test('should not transfer folder if license does not allow it', async () => {
		testServer.license.disable('feat:folders');

		const admin = await createUser({ role: { slug: 'global:admin' } });
		const sourceProject = await createTeamProject('source project', admin);
		const destinationProject = await createTeamProject('destination project', member);
		const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });

		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
			role: 'credential:owner',
		});

		// ACT
		await testServer
			.authAgentFor(owner)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id],
			})
			.expect(403);
	});

	test('cannot transfer into the same project', async () => {
		const sourceProject = await createTeamProject('source project', member);
		const destinationProject = await createTeamProject('Team Project', member);

		const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });

		await createWorkflow({ active: true, parentFolder: sourceFolder1 }, destinationProject);

		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id, destinationParentFolderId: '0' })
			.expect(400);
	});

	test('cannot transfer somebody elses folder', async () => {
		const sourceProject = await createTeamProject('source project', member);
		const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });
		await createWorkflow({ parentFolder: sourceFolder1 }, owner);

		const destinationProject = await createTeamProject('Team Project', admin);
		const destinationFolder1 = await createFolder(destinationProject, { name: 'Source Folder 1' });

		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: destinationFolder1,
			})
			.expect(400);
	});

	test("cannot transfer if you're not a member of the destination project", async () => {
		const sourceProject = await getPersonalProject(member);
		const destinationProject = await createTeamProject('Team Project', owner);

		const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });

		await createWorkflow({ active: true }, destinationProject);

		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id, destinationParentFolderId: '0' })
			.expect(404);
	});

	test.each<ProjectRole>([PROJECT_EDITOR_ROLE_SLUG, PROJECT_VIEWER_ROLE_SLUG])(
		'%ss cannot transfer workflows',
		async (projectRole) => {
			//
			// ARRANGE
			//
			const sourceProject = await createTeamProject();
			await linkUserToProject(member, sourceProject, projectRole);

			const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });

			await createWorkflow({}, sourceProject);

			const destinationProject = await createTeamProject();
			await linkUserToProject(member, destinationProject, 'project:admin');

			//
			// ACT & ASSERT
			//
			await testServer
				.authAgentFor(member)
				.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id, destinationParentFolderId: '0' })
				.expect(403);
		},
	);

	test.each<
		[
			// user role
			'owners' | 'admins',
			// source project type
			'team' | 'personal',
			// destination project type
			'team' | 'personal',
			// actor
			() => User,
			// source project
			() => Promise<Project> | Project,
			// destination project
			() => Promise<Project> | Project,
		]
	>([
		// owner
		[
			'owners',
			'team',
			'team',
			() => owner,
			async () => await createTeamProject('Source Project'),
			async () => await createTeamProject('Destination Project'),
		],
		[
			'owners',
			'team',
			'personal',
			() => owner,
			async () => await createTeamProject('Source Project'),
			() => memberProject,
		],
		[
			'owners',
			'personal',
			'team',
			() => owner,
			() => memberProject,
			async () => await createTeamProject('Destination Project'),
		],

		// admin
		[
			'admins',
			'team',
			'team',
			() => admin,
			async () => await createTeamProject('Source Project'),
			async () => await createTeamProject('Destination Project'),
		],
		[
			'admins',
			'team',
			'personal',
			() => admin,
			async () => await createTeamProject('Source Project'),
			() => memberProject,
		],
		[
			'admins',
			'personal',
			'team',
			() => admin,
			() => memberProject,
			async () => await createTeamProject('Destination Project'),
		],
	])(
		'global %s can transfer workflows from a %s project to a %s project',
		async (
			_roleName,
			_sourceProjectName,
			_destinationProjectName,
			getActor,
			getSourceProject,
			getDestinationProject,
		) => {
			// ARRANGE
			const actor = getActor();
			const sourceProject = await getSourceProject();
			const destinationProject = await getDestinationProject();
			const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });
			const workflow = await createWorkflow({ parentFolder: sourceFolder1 }, sourceProject);

			// ACT
			const response = await testServer
				.authAgentFor(actor)
				.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id, destinationParentFolderId: '0' })
				.expect(200);

			// ASSERT
			expect(response.body).toEqual({});

			const allSharings = await getWorkflowSharing(workflow);
			expect(allSharings).toHaveLength(1);
			expect(allSharings[0]).toMatchObject({
				projectId: destinationProject.id,
				workflowId: workflow.id,
				role: 'workflow:owner',
			});
		},
	);

	test('owner transfers folder from project they are not part of, e.g. test global cred sharing scope', async () => {
		// ARRANGE
		const admin = await createUser({ role: { slug: 'global:admin' } });
		const sourceProject = await createTeamProject('source project', admin);
		const destinationProject = await createTeamProject('destination project', member);
		const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });
		const sourceFolder2 = await createFolder(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});

		const workflow1 = await createWorkflow({ parentFolder: sourceFolder1 }, sourceProject);
		const workflow2 = await createWorkflow({ parentFolder: sourceFolder2 }, sourceProject);

		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
			role: 'credential:owner',
		});

		// ACT
		await testServer
			.authAgentFor(owner)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id],
			})
			.expect(200);

		// ASSERT
		const workflow1Sharing = await getWorkflowSharing(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});

		const workflow2Sharing = await getWorkflowSharing(workflow2);
		expect(workflow2Sharing).toHaveLength(1);
		expect(workflow2Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow2.id,
			role: 'workflow:owner',
		});

		const sourceFolderInDb = await folderRepository.findOne({
			where: { id: sourceFolder1.id },
			relations: ['parentFolder', 'homeProject'],
		});
		expect(sourceFolderInDb).toBeDefined();
		expect(sourceFolderInDb?.parentFolder).toBeNull();
		expect(sourceFolderInDb?.homeProject.id).toBe(destinationProject.id);

		const sourceFolder2InDb = await folderRepository.findOne({
			where: { id: sourceFolder2.id },
			relations: ['parentFolder', 'homeProject'],
		});

		expect(sourceFolder2InDb).toBeDefined();
		expect(sourceFolder2InDb?.parentFolder?.id).toBe(sourceFolder1.id);
		expect(sourceFolder2InDb?.homeProject.id).toBe(destinationProject.id);

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: destinationProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);
	});

	test('admin transfers folder from project they are not part of, e.g. test global cred sharing scope', async () => {
		// ARRANGE
		const admin = await createUser({ role: { slug: 'global:admin' } });
		const sourceProject = await createTeamProject('source project', owner);
		const destinationProject = await createTeamProject('destination project', owner);
		const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });
		const sourceFolder2 = await createFolder(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});

		const workflow1 = await createWorkflow({ parentFolder: sourceFolder1 }, sourceProject);
		const workflow2 = await createWorkflow({ parentFolder: sourceFolder2 }, sourceProject);

		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
			role: 'credential:owner',
		});

		// ACT
		await testServer
			.authAgentFor(admin)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id],
			})
			.expect(200);

		// ASSERT
		const workflow1Sharing = await getWorkflowSharing(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});

		const workflow2Sharing = await getWorkflowSharing(workflow2);
		expect(workflow2Sharing).toHaveLength(1);
		expect(workflow2Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow2.id,
			role: 'workflow:owner',
		});

		const sourceFolderInDb = await folderRepository.findOne({
			where: { id: sourceFolder1.id },
			relations: ['parentFolder', 'homeProject'],
		});
		expect(sourceFolderInDb).toBeDefined();
		expect(sourceFolderInDb?.parentFolder).toBeNull();
		expect(sourceFolderInDb?.homeProject.id).toBe(destinationProject.id);

		const sourceFolder2InDb = await folderRepository.findOne({
			where: { id: sourceFolder2.id },
			relations: ['parentFolder', 'homeProject'],
		});

		expect(sourceFolder2InDb).toBeDefined();
		expect(sourceFolder2InDb?.parentFolder?.id).toBe(sourceFolder1.id);
		expect(sourceFolder2InDb?.homeProject.id).toBe(destinationProject.id);

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: destinationProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);
	});

	test('member transfers folder from personal project to team project and one workflow contains a credential that they can use but not share', async () => {
		// ARRANGE
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const sourceProject = await projectRepository.getPersonalProjectForUserOrFail(member.id);
		const destinationProject = await createTeamProject('destination project', member);
		const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });
		const sourceFolder2 = await createFolder(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});

		const workflow1 = await createWorkflow({ parentFolder: sourceFolder1 }, sourceProject);
		const workflow2 = await createWorkflow({ parentFolder: sourceFolder2 }, sourceProject);

		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		await shareCredentialWithUsers(credential, [member]);

		// ACT
		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id],
			})
			.expect(200);

		// ASSERT
		const workflow1Sharing = await getWorkflowSharing(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});

		const workflow2Sharing = await getWorkflowSharing(workflow2);
		expect(workflow2Sharing).toHaveLength(1);
		expect(workflow2Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow2.id,
			role: 'workflow:owner',
		});

		const sourceFolderInDb = await folderRepository.findOne({
			where: { id: sourceFolder1.id },
			relations: ['parentFolder', 'homeProject'],
		});
		expect(sourceFolderInDb).toBeDefined();
		expect(sourceFolderInDb?.parentFolder).toBeNull();
		expect(sourceFolderInDb?.homeProject.id).toBe(destinationProject.id);

		const sourceFolder2InDb = await folderRepository.findOne({
			where: { id: sourceFolder2.id },
			relations: ['parentFolder', 'homeProject'],
		});

		expect(sourceFolder2InDb).toBeDefined();
		expect(sourceFolder2InDb?.parentFolder?.id).toBe(sourceFolder1.id);
		expect(sourceFolder2InDb?.homeProject.id).toBe(destinationProject.id);

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: ownerPersonalProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);
	});

	test('member transfers folder from their personal project to another team project in which they have editor role', async () => {
		// ARRANGE
		const sourceProject = await projectRepository.getPersonalProjectForUserOrFail(member.id);
		const destinationProject = await createTeamProject('destination project');
		const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });
		const sourceFolder2 = await createFolder(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});

		const workflow1 = await createWorkflow({ parentFolder: sourceFolder1 }, sourceProject);
		const workflow2 = await createWorkflow({ parentFolder: sourceFolder2 }, sourceProject);

		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
			role: 'credential:owner',
		});

		await linkUserToProject(member, destinationProject, 'project:editor');

		// ACT
		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id],
			})
			.expect(200);

		// ASSERT
		const workflow1Sharing = await getWorkflowSharing(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});

		const workflow2Sharing = await getWorkflowSharing(workflow2);
		expect(workflow2Sharing).toHaveLength(1);
		expect(workflow2Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow2.id,
			role: 'workflow:owner',
		});

		const sourceFolderInDb = await folderRepository.findOne({
			where: { id: sourceFolder1.id },
			relations: ['parentFolder', 'homeProject'],
		});
		expect(sourceFolderInDb).toBeDefined();
		expect(sourceFolderInDb?.parentFolder).toBeNull();
		expect(sourceFolderInDb?.homeProject.id).toBe(destinationProject.id);

		const sourceFolder2InDb = await folderRepository.findOne({
			where: { id: sourceFolder2.id },
			relations: ['parentFolder', 'homeProject'],
		});

		expect(sourceFolder2InDb).toBeDefined();
		expect(sourceFolder2InDb?.parentFolder?.id).toBe(sourceFolder1.id);
		expect(sourceFolder2InDb?.homeProject.id).toBe(destinationProject.id);

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: destinationProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);
	});

	test('member transfers folder from a team project as project admin to another team project in which they have editor role', async () => {
		// ARRANGE
		const sourceProject = await createTeamProject('source project', member);
		const destinationProject = await createTeamProject('destination project');
		const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });
		const sourceFolder2 = await createFolder(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});

		const workflow1 = await createWorkflow({ parentFolder: sourceFolder1 }, sourceProject);
		const workflow2 = await createWorkflow({ parentFolder: sourceFolder2 }, sourceProject);

		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
			role: 'credential:owner',
		});

		await linkUserToProject(member, destinationProject, 'project:editor');

		// ACT
		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id],
			})
			.expect(200);

		// ASSERT
		const workflow1Sharing = await getWorkflowSharing(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});

		const workflow2Sharing = await getWorkflowSharing(workflow2);
		expect(workflow2Sharing).toHaveLength(1);
		expect(workflow2Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow2.id,
			role: 'workflow:owner',
		});

		const sourceFolderInDb = await folderRepository.findOne({
			where: { id: sourceFolder1.id },
			relations: ['parentFolder', 'homeProject'],
		});
		expect(sourceFolderInDb).toBeDefined();
		expect(sourceFolderInDb?.parentFolder).toBeNull();
		expect(sourceFolderInDb?.homeProject.id).toBe(destinationProject.id);

		const sourceFolder2InDb = await folderRepository.findOne({
			where: { id: sourceFolder2.id },
			relations: ['parentFolder', 'homeProject'],
		});

		expect(sourceFolder2InDb).toBeDefined();
		expect(sourceFolder2InDb?.parentFolder?.id).toBe(sourceFolder1.id);
		expect(sourceFolder2InDb?.homeProject.id).toBe(destinationProject.id);

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: destinationProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);
	});

	test('member transfers workflow from a team project as project admin to another team project in which they have editor role but cannot share the credential that is only shared into the source project', async () => {
		// ARRANGE
		const sourceProject = await createTeamProject('source project', member);
		const destinationProject = await createTeamProject('destination project');
		const ownerProject = await getPersonalProject(owner);

		const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });
		const sourceFolder2 = await createFolder(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});

		const workflow1 = await createWorkflow({ parentFolder: sourceFolder1 }, sourceProject);
		const workflow2 = await createWorkflow({ parentFolder: sourceFolder2 }, sourceProject);

		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		await linkUserToProject(member, destinationProject, 'project:editor');
		await shareCredentialWithProjects(credential, [sourceProject]);

		// ACT
		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id],
			})
			.expect(200);

		// ASSERT
		const workflow1Sharing = await getWorkflowSharing(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});

		const workflow2Sharing = await getWorkflowSharing(workflow2);
		expect(workflow2Sharing).toHaveLength(1);
		expect(workflow2Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow2.id,
			role: 'workflow:owner',
		});

		const sourceFolderInDb = await folderRepository.findOne({
			where: { id: sourceFolder1.id },
			relations: ['parentFolder', 'homeProject'],
		});
		expect(sourceFolderInDb).toBeDefined();
		expect(sourceFolderInDb?.parentFolder).toBeNull();
		expect(sourceFolderInDb?.homeProject.id).toBe(destinationProject.id);

		const sourceFolder2InDb = await folderRepository.findOne({
			where: { id: sourceFolder2.id },
			relations: ['parentFolder', 'homeProject'],
		});

		expect(sourceFolder2InDb).toBeDefined();
		expect(sourceFolder2InDb?.parentFolder?.id).toBe(sourceFolder1.id);
		expect(sourceFolder2InDb?.homeProject.id).toBe(destinationProject.id);

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: ownerProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);
	});

	test('member transfers workflow from a team project as project admin to another team project in which they have editor role but cannot share all the credentials', async () => {
		// ARRANGE
		const sourceProject = await createTeamProject('source project', member);
		const destinationProject = await createTeamProject('destination project');

		const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });
		const sourceFolder2 = await createFolder(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});

		const workflow1 = await createWorkflow({ parentFolder: sourceFolder1 }, sourceProject);
		const workflow2 = await createWorkflow({ parentFolder: sourceFolder2 }, sourceProject);

		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
			role: 'credential:owner',
		});

		const ownersCredential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		await linkUserToProject(member, destinationProject, 'project:editor');

		// ACT
		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id, ownersCredential.id],
			})
			.expect(200);

		// ASSERT
		const workflow1Sharing = await getWorkflowSharing(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});

		const workflow2Sharing = await getWorkflowSharing(workflow2);
		expect(workflow2Sharing).toHaveLength(1);
		expect(workflow2Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow2.id,
			role: 'workflow:owner',
		});

		const sourceFolderInDb = await folderRepository.findOne({
			where: { id: sourceFolder1.id },
			relations: ['parentFolder', 'homeProject'],
		});
		expect(sourceFolderInDb).toBeDefined();
		expect(sourceFolderInDb?.parentFolder).toBeNull();
		expect(sourceFolderInDb?.homeProject.id).toBe(destinationProject.id);

		const sourceFolder2InDb = await folderRepository.findOne({
			where: { id: sourceFolder2.id },
			relations: ['parentFolder', 'homeProject'],
		});

		expect(sourceFolder2InDb).toBeDefined();
		expect(sourceFolder2InDb?.parentFolder?.id).toBe(sourceFolder1.id);
		expect(sourceFolder2InDb?.homeProject.id).toBe(destinationProject.id);

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: destinationProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);
	});

	test('returns a 500 if the workflow cannot be activated due to an unknown error', async () => {
		//
		// ARRANGE
		//

		const sourceProject = await createTeamProject('source project', member);
		const destinationProject = await createTeamProject('Team Project', member);

		const sourceFolder1 = await createFolder(sourceProject, { name: 'Source Folder 1' });
		const sourceFolder2 = await createFolder(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});

		await createWorkflow({ active: true, parentFolder: sourceFolder1 }, sourceProject);
		await createWorkflow({ parentFolder: sourceFolder2 }, sourceProject);

		activeWorkflowManager.add.mockRejectedValue(new ApplicationError('Oh no!'));

		//
		// ACT & ASSERT
		//
		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
			})
			.expect(500);
	});
});
