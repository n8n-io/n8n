import type { Project } from '@n8n/db';
import type { User } from '@n8n/db';
import { FolderRepository } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';
import { PROJECT_ROOT } from 'n8n-workflow';

import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { createFolder } from '@test-integration/db/folders';
import { createTag } from '@test-integration/db/tags';
import { createWorkflow } from '@test-integration/db/workflows';

import { createTeamProject, getPersonalProject, linkUserToProject } from '../shared/db/projects';
import { createOwner, createMember } from '../shared/db/users';
import * as testDb from '../shared/test-db';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let ownerProject: Project;
let memberProject: Project;

const testServer = utils.setupTestServer({
	endpointGroups: ['folder'],
});

let projectRepository: ProjectRepository;
let folderRepository: FolderRepository;
let workflowRepository: WorkflowRepository;

beforeEach(async () => {
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

describe('GET /projects/:projectId/folders/:folderId/tree', () => {
	test('should not get folder tree when project does not exist', async () => {
		await authOwnerAgent.get('/projects/non-existing-id/folders/some-folder-id/tree').expect(403);
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

describe('PATCH /projects/:projectId/folders/:folderId', () => {
	test('should not update folder when project does not exist', async () => {
		const payload = {
			name: 'Updated Folder Name',
		};

		await authOwnerAgent
			.patch('/projects/non-existing-id/folders/some-folder-id')
			.send(payload)
			.expect(403);
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
		let folder = await folderRepository.findOne({
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

		await authOwnerAgent
			.patch(`/projects/${project.id}/folders/${folder.id}`)
			.send(payload)
			.expect(400);

		const folderInDb = await folderRepository.findOne({
			where: { id: folder.id },
			relations: ['parentFolder'],
		});

		expect(folderInDb).toBeDefined();
		expect(folderInDb?.parentFolder).toBeNull();
	});
});

describe('DELETE /projects/:projectId/folders/:folderId', () => {
	test('should not delete folder when project does not exist', async () => {
		await authOwnerAgent
			.delete('/projects/non-existing-id/folders/some-folder-id')
			.send({})
			.expect(403);
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

	test('should delete folder, all child folders, and contained workflows when no transfer folder is specified', async () => {
		const project = await createTeamProject('test', owner);
		const rootFolder = await createFolder(project, { name: 'Root' });
		const childFolder = await createFolder(project, {
			name: 'Child',
			parentFolder: rootFolder,
		});

		// Create workflows in the folders
		const workflow1 = await createWorkflow({ parentFolder: rootFolder }, owner);

		const workflow2 = await createWorkflow({ parentFolder: childFolder }, owner);

		await authOwnerAgent.delete(`/projects/${project.id}/folders/${rootFolder.id}`);

		// Check folders
		const rootFolderInDb = await folderRepository.findOneBy({ id: rootFolder.id });
		const childFolderInDb = await folderRepository.findOneBy({ id: childFolder.id });

		expect(rootFolderInDb).toBeNull();
		expect(childFolderInDb).toBeNull();

		// Check workflows
		const workflow1InDb = await workflowRepository.findOneBy({ id: workflow1.id });
		const workflow2InDb = await workflowRepository.findOneBy({ id: workflow2.id });
		expect(workflow1InDb).toBeNull();
		expect(workflow2InDb).toBeNull();
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
	test('should not list folders when project does not exist', async () => {
		await authOwnerAgent.get('/projects/non-existing-id/folders').expect(403);
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
});

describe('GET /projects/:projectId/folders/content', () => {
	test('should not list folders when project does not exist', async () => {
		await authOwnerAgent
			.get('/projects/non-existing-id/folders/no-existing-id/content')
			.expect(403);
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

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders/${personalFolder1.id}/content`)
			.expect(200);

		expect(response.body.data.totalWorkflows).toBe(3);
		expect(response.body.data.totalSubFolders).toBe(2);
	});
});
