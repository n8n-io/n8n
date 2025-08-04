'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const faker_1 = require('@faker-js/faker');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const luxon_1 = require('luxon');
const n8n_workflow_1 = require('n8n-workflow');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const credentials_1 = require('@test-integration/db/credentials');
const folders_1 = require('@test-integration/db/folders');
const tags_1 = require('@test-integration/db/tags');
const users_1 = require('../shared/db/users');
const utils = __importStar(require('../shared/utils/'));
let owner;
let member;
let authOwnerAgent;
let authMemberAgent;
let ownerProject;
let memberProject;
let admin;
const testServer = utils.setupTestServer({
	endpointGroups: ['folder'],
});
let projectRepository;
let folderRepository;
let workflowRepository;
const activeWorkflowManager = (0, backend_test_utils_1.mockInstance)(
	active_workflow_manager_1.ActiveWorkflowManager,
);
beforeEach(async () => {
	testServer.license.enable('feat:folders');
	await backend_test_utils_1.testDb.truncate([
		'Folder',
		'SharedWorkflow',
		'TagEntity',
		'Project',
		'ProjectRelation',
	]);
	projectRepository = di_1.Container.get(db_1.ProjectRepository);
	folderRepository = di_1.Container.get(db_1.FolderRepository);
	workflowRepository = di_1.Container.get(db_1.WorkflowRepository);
	owner = await (0, users_1.createOwner)();
	member = await (0, users_1.createMember)();
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
	memberProject = await (0, backend_test_utils_1.getPersonalProject)(member);
	admin = await (0, users_1.createAdmin)();
});
describe('POST /projects/:projectId/folders', () => {
	test('should now create folder if license does not allow it', async () => {
		testServer.license.disable('feat:folders');
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:viewer');
		const payload = {
			name: 'Test Folder',
		};
		await authMemberAgent.post(`/projects/${project.id}/folders`).send(payload).expect(403);
	});
	test('should not create folder when project does not exist', async () => {
		const payload = {
			name: 'Test Folder',
		};
		await authOwnerAgent.post('/projects/non-existing-id/folders').send(payload).expect(403);
	});
	test('should not create folder when name is empty', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const payload = {
			name: '',
		};
		await authOwnerAgent.post(`/projects/${project.id}/folders`).send(payload).expect(400);
	});
	test('should not create folder if user has project:viewer role in team project', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:viewer');
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:editor');
		const payload = {
			name: 'Test Folder',
		};
		await authMemberAgent.post(`/projects/${project.id}/folders`).send(payload).expect(200);
		const foldersInDb = await folderRepository.find();
		expect(foldersInDb).toHaveLength(1);
	});
	test('should create folder if user has project:admin role in team project', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const payload = {
			name: 'Test Folder',
		};
		await authOwnerAgent.post(`/projects/${project.id}/folders`).send(payload).expect(200);
		const foldersInDb = await folderRepository.find();
		expect(foldersInDb).toHaveLength(1);
	});
	test('should not allow creating folder with parent that exists in another project', async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const memberTeamProject = await (0, backend_test_utils_1.createTeamProject)(
			'test project',
			member,
		);
		const ownerRootFolderInPersonalProject = await (0, folders_1.createFolder)(
			ownerPersonalProject,
		);
		await (0, folders_1.createFolder)(memberTeamProject);
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
		const project = await (0, backend_test_utils_1.createTeamProject)('test', owner);
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
		const project = await (0, backend_test_utils_1.createTeamProject)('test', owner);
		const folder = await (0, folders_1.createFolder)(project);
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
		const project = await (0, backend_test_utils_1.createTeamProject)('test', owner);
		const rootFolder = await (0, folders_1.createFolder)(project, { name: 'Root' });
		const childFolder1 = await (0, folders_1.createFolder)(project, {
			name: 'Child 1',
			parentFolder: rootFolder,
		});
		await (0, folders_1.createFolder)(project, {
			name: 'Child 2',
			parentFolder: rootFolder,
		});
		const grandchildFolder = await (0, folders_1.createFolder)(project, {
			name: 'Grandchild',
			parentFolder: childFolder1,
		});
		await authOwnerAgent
			.get(`/projects/${project.id}/folders/${grandchildFolder.id}/tree`)
			.expect(403);
	});
	test('should not get folder tree when project does not exist', async () => {
		await authOwnerAgent.get('/projects/non-existing-id/folders/some-folder-id/tree').expect(403);
	});
	test('should not get folder tree when folder does not exist', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		await authOwnerAgent
			.get(`/projects/${project.id}/folders/non-existing-folder/tree`)
			.expect(404);
	});
	test('should not get folder tree if user has no access to project', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		const folder = await (0, folders_1.createFolder)(project);
		await authMemberAgent.get(`/projects/${project.id}/folders/${folder.id}/tree`).expect(403);
	});
	test("should not allow getting folder tree from another user's personal project", async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder = await (0, folders_1.createFolder)(ownerPersonalProject);
		await authMemberAgent
			.get(`/projects/${ownerPersonalProject.id}/folders/${folder.id}/tree`)
			.expect(403);
	});
	test('should get nested folder structure', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test', owner);
		const rootFolder = await (0, folders_1.createFolder)(project, { name: 'Root' });
		const childFolder1 = await (0, folders_1.createFolder)(project, {
			name: 'Child 1',
			parentFolder: rootFolder,
		});
		await (0, folders_1.createFolder)(project, {
			name: 'Child 2',
			parentFolder: rootFolder,
		});
		const grandchildFolder = await (0, folders_1.createFolder)(project, {
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
		const project = await (0, backend_test_utils_1.createTeamProject)('test', owner);
		const rootFolder = await (0, folders_1.createFolder)(project, { name: 'Root' });
		const childFolder1 = await (0, folders_1.createFolder)(project, {
			name: 'Child 1',
			parentFolder: rootFolder,
		});
		await (0, folders_1.createFolder)(project, {
			name: 'Child 2',
			parentFolder: rootFolder,
		});
		const grandchildFolder = await (0, folders_1.createFolder)(project, {
			name: 'Grandchild',
			parentFolder: childFolder1,
		});
		for (const folder of [rootFolder, childFolder1, grandchildFolder]) {
			const credential = await (0, credentials_1.createCredentials)(
				{
					name: `Test credential ${folder.name}`,
					data: '',
					type: 'test',
				},
				project,
			);
			await (0, backend_test_utils_1.createWorkflow)(
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
							id: faker_1.faker.string.uuid(),
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
			.expect(403);
	});
	test('should not get folder credentials when folder does not exist', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		await authOwnerAgent
			.get(`/projects/${project.id}/folders/non-existing-folder/credentials`)
			.expect(404);
	});
	test('should not get folder credentials if user has no access to project', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		const folder = await (0, folders_1.createFolder)(project);
		await authMemberAgent
			.get(`/projects/${project.id}/folders/${folder.id}/credentials`)
			.expect(403);
	});
	test("should not allow getting folder credentials from another user's personal project", async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder = await (0, folders_1.createFolder)(ownerPersonalProject);
		await authMemberAgent
			.get(`/projects/${ownerPersonalProject.id}/folders/${folder.id}/credentials`)
			.expect(403);
	});
	test('should get all used credentials from workflows within the folder and subfolders', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test', owner);
		const rootFolder = await (0, folders_1.createFolder)(project, { name: 'Root' });
		const childFolder1 = await (0, folders_1.createFolder)(project, {
			name: 'Child 1',
			parentFolder: rootFolder,
		});
		await (0, folders_1.createFolder)(project, {
			name: 'Child 2',
			parentFolder: rootFolder,
		});
		const grandchildFolder = await (0, folders_1.createFolder)(project, {
			name: 'Grandchild',
			parentFolder: childFolder1,
		});
		for (const folder of [rootFolder, childFolder1, grandchildFolder]) {
			const credential = await (0, credentials_1.createCredentials)(
				{
					name: `Test credential ${folder.name}`,
					data: '',
					type: 'test',
				},
				project,
			);
			await (0, backend_test_utils_1.createWorkflow)(
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
							id: faker_1.faker.string.uuid(),
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const folder = await (0, folders_1.createFolder)(project, { name: 'Original Name' });
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:editor');
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
			.expect(403);
	});
	test('should not update folder when folder does not exist', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		const payload = {
			name: 'Updated Folder Name',
		};
		await authOwnerAgent
			.patch(`/projects/${project.id}/folders/non-existing-folder`)
			.send(payload)
			.expect(404);
	});
	test('should not update folder when name is empty', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const folder = await (0, folders_1.createFolder)(project, { name: 'Original Name' });
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const folder = await (0, folders_1.createFolder)(project, { name: 'Original Name' });
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:viewer');
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
		const folder = await (0, folders_1.createFolder)(ownerPersonalProject, {
			name: 'Original Name',
		});
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const folder = await (0, folders_1.createFolder)(project, { name: 'Original Name' });
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:editor');
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const folder = await (0, folders_1.createFolder)(project, { name: 'Original Name' });
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
		const folder = await (0, folders_1.createFolder)(personalProject, { name: 'Original Name' });
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
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		const folder = await (0, folders_1.createFolder)(project, { name: 'Test Folder' });
		const tag1 = await (0, tags_1.createTag)({ name: 'Tag 1' });
		const tag2 = await (0, tags_1.createTag)({ name: 'Tag 2' });
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const tag1 = await (0, tags_1.createTag)({ name: 'Tag 1' });
		const tag2 = await (0, tags_1.createTag)({ name: 'Tag 2' });
		const tag3 = await (0, tags_1.createTag)({ name: 'Tag 3' });
		const folder = await (0, folders_1.createFolder)(project, {
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
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		await (0, folders_1.createFolder)(project, { name: 'Original Folder' });
		const targetFolder = await (0, folders_1.createFolder)(project, { name: 'Target Folder' });
		const folderToMove = await (0, folders_1.createFolder)(project, {
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const folderToMove = await (0, folders_1.createFolder)(project, { name: 'Folder To Move' });
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
		const project1 = await (0, backend_test_utils_1.createTeamProject)('Project 1', owner);
		const project2 = await (0, backend_test_utils_1.createTeamProject)('Project 2', owner);
		const folderToMove = await (0, folders_1.createFolder)(project1, { name: 'Folder To Move' });
		const targetFolder = await (0, folders_1.createFolder)(project2, { name: 'Target Folder' });
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const parentFolder = await (0, folders_1.createFolder)(project, { name: 'Parent Folder' });
		const folderToMove = await (0, folders_1.createFolder)(project, {
			name: 'Folder To Move',
			parentFolder,
		});
		const folder = await folderRepository.findOne({
			where: { id: folderToMove.id },
			relations: ['parentFolder'],
		});
		expect(folder?.parentFolder?.id).toBe(parentFolder.id);
		const payload = {
			parentFolderId: n8n_workflow_1.PROJECT_ROOT,
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		await (0, folders_1.createFolder)(project, { name: 'Parent Folder' });
		const targetFolder = await (0, folders_1.createFolder)(project, { name: 'Target Folder' });
		const folderToMove = await (0, folders_1.createFolder)(project, {
			name: 'Folder To Move',
		});
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:viewer');
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const targetFolder = await (0, folders_1.createFolder)(project, { name: 'Target Folder' });
		const folderToMove = await (0, folders_1.createFolder)(project, {
			name: 'Folder To Move',
		});
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:editor');
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const folder = await (0, folders_1.createFolder)(project, { name: 'Test Folder' });
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const folderA = await (0, folders_1.createFolder)(project, { name: 'A' });
		const folderB = await (0, folders_1.createFolder)(project, {
			name: 'B',
			parentFolder: folderA,
		});
		const folderC = await (0, folders_1.createFolder)(project, {
			name: 'C',
			parentFolder: folderB,
		});
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const folderA = await (0, folders_1.createFolder)(project, { name: 'A' });
		const folderB = await (0, folders_1.createFolder)(project, {
			name: 'B',
			parentFolder: folderA,
		});
		const folderC = await (0, folders_1.createFolder)(project, {
			name: 'C',
			parentFolder: folderB,
		});
		const folderD = await (0, folders_1.createFolder)(project, {
			name: 'D',
			parentFolder: folderC,
		});
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
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const folder = await (0, folders_1.createFolder)(project);
		await authOwnerAgent
			.delete(`/projects/${project.id}/folders/${folder.id}`)
			.send({})
			.expect(403);
	});
	test('should not delete folder when project does not exist', async () => {
		await authOwnerAgent
			.delete('/projects/non-existing-id/folders/some-folder-id')
			.send({})
			.expect(403);
	});
	test('should not delete folder when folder does not exist', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		await authOwnerAgent
			.delete(`/projects/${project.id}/folders/non-existing-folder`)
			.send({})
			.expect(404);
	});
	test('should not delete folder if user has project:viewer role in team project', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const folder = await (0, folders_1.createFolder)(project);
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:viewer');
		await authMemberAgent
			.delete(`/projects/${project.id}/folders/${folder.id}`)
			.send({})
			.expect(403);
		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb).toBeDefined();
	});
	test("should not allow deleting folder in another user's personal project", async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder = await (0, folders_1.createFolder)(ownerPersonalProject);
		await authMemberAgent
			.delete(`/projects/${ownerPersonalProject.id}/folders/${folder.id}`)
			.send({})
			.expect(403);
		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb).toBeDefined();
	});
	test('should delete folder if user has project:editor role in team project', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const folder = await (0, folders_1.createFolder)(project);
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:editor');
		await authMemberAgent
			.delete(`/projects/${project.id}/folders/${folder.id}`)
			.send({})
			.expect(200);
		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb).toBeNull();
	});
	test('should delete folder if user has project:admin role in team project', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, owner);
		const folder = await (0, folders_1.createFolder)(project);
		await authOwnerAgent
			.delete(`/projects/${project.id}/folders/${folder.id}`)
			.send({})
			.expect(200);
		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb).toBeNull();
	});
	test('should delete folder in personal project', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder = await (0, folders_1.createFolder)(personalProject);
		await authOwnerAgent
			.delete(`/projects/${personalProject.id}/folders/${folder.id}`)
			.send({})
			.expect(200);
		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb).toBeNull();
	});
	test('should delete folder, all child folders, and archive and move contained workflows to project root when no transfer folder is specified', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test', owner);
		const rootFolder = await (0, folders_1.createFolder)(project, { name: 'Root' });
		const childFolder = await (0, folders_1.createFolder)(project, {
			name: 'Child',
			parentFolder: rootFolder,
		});
		const workflow1 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: rootFolder, active: false },
			owner,
		);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: childFolder, active: true },
			owner,
		);
		await authOwnerAgent.delete(`/projects/${project.id}/folders/${rootFolder.id}`);
		const rootFolderInDb = await folderRepository.findOneBy({ id: rootFolder.id });
		const childFolderInDb = await folderRepository.findOneBy({ id: childFolder.id });
		expect(rootFolderInDb).toBeNull();
		expect(childFolderInDb).toBeNull();
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
		const project = await (0, backend_test_utils_1.createTeamProject)('test', owner);
		const sourceFolder = await (0, folders_1.createFolder)(project, { name: 'Source' });
		const targetFolder = await (0, folders_1.createFolder)(project, { name: 'Target' });
		const childFolder = await (0, folders_1.createFolder)(project, {
			name: 'Child',
			parentFolder: sourceFolder,
		});
		const workflow1 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder },
			owner,
		);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: childFolder },
			owner,
		);
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
		expect(sourceFolderInDb).toBeNull();
		expect(childFolderInDb).toBeDefined();
		expect(childFolderInDb?.parentFolder?.id).toBe(targetFolder.id);
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
		const project = await (0, backend_test_utils_1.createTeamProject)('test', owner);
		const folder = await (0, folders_1.createFolder)(project);
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
		const project1 = await (0, backend_test_utils_1.createTeamProject)('Project 1', owner);
		const project2 = await (0, backend_test_utils_1.createTeamProject)('Project 2', owner);
		const sourceFolder = await (0, folders_1.createFolder)(project1);
		const targetFolder = await (0, folders_1.createFolder)(project2);
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
		const project = await (0, backend_test_utils_1.createTeamProject)('test', owner);
		const folder = await (0, folders_1.createFolder)(project, { name: 'Folder To Delete' });
		await (0, backend_test_utils_1.createWorkflow)({ parentFolder: folder }, owner);
		const payload = {
			transferToFolderId: folder.id,
		};
		const response = await authOwnerAgent
			.delete(`/projects/${project.id}/folders/${folder.id}`)
			.query(payload)
			.expect(400);
		expect(response.body.message).toContain(
			'Cannot transfer folder contents to the folder being deleted',
		);
		const folderInDb = await folderRepository.findOneBy({ id: folder.id });
		expect(folderInDb).toBeDefined();
	});
	test('should transfer folder contents to project root when transferToFolderId is "0"', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test', owner);
		const sourceFolder = await (0, folders_1.createFolder)(project, { name: 'Source' });
		await (0, folders_1.createFolder)(project, { name: 'Target' });
		const childFolder = await (0, folders_1.createFolder)(project, {
			name: 'Child',
			parentFolder: sourceFolder,
		});
		const workflow1 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder },
			owner,
		);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: childFolder },
			owner,
		);
		const payload = {
			transferToFolderId: n8n_workflow_1.PROJECT_ROOT,
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
		expect(sourceFolderInDb).toBeNull();
		expect(childFolderInDb).toBeDefined();
		expect(childFolderInDb?.parentFolder).toBe(null);
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
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:viewer');
		await (0, folders_1.createFolder)(project, { name: 'Test Folder' });
		await authMemberAgent.get(`/projects/${project.id}/folders`).expect(403);
	});
	test('should not list folders when project does not exist', async () => {
		await authOwnerAgent.get('/projects/non-existing-id/folders').expect(403);
	});
	test('should not list folders if user has no access to project', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		await authMemberAgent.get(`/projects/${project.id}/folders`).expect(403);
	});
	test("should not allow listing folders from another user's personal project", async () => {
		await authMemberAgent.get(`/projects/${ownerProject.id}/folders`).expect(403);
	});
	test('should list folders if user has project:viewer role in team project', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:viewer');
		await (0, folders_1.createFolder)(project, { name: 'Test Folder' });
		const response = await authMemberAgent.get(`/projects/${project.id}/folders`).expect(200);
		expect(response.body.count).toBe(1);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe('Test Folder');
	});
	test('should list folders from personal project', async () => {
		await (0, folders_1.createFolder)(ownerProject, { name: 'Personal Folder 1' });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Personal Folder 2' });
		const response = await authOwnerAgent.get(`/projects/${ownerProject.id}/folders`).expect(200);
		expect(response.body.count).toBe(2);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.data.map((f) => f.name).sort()).toEqual(
			['Personal Folder 1', 'Personal Folder 2'].sort(),
		);
	});
	test('should filter folders by name', async () => {
		await (0, folders_1.createFolder)(ownerProject, { name: 'Test Folder' });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Another Folder' });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Test Something Else' });
		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ filter: '{ "name": "test" }' })
			.expect(200);
		expect(response.body.count).toBe(2);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.data.map((f) => f.name).sort()).toEqual(
			['Test Folder', 'Test Something Else'].sort(),
		);
	});
	test('should filter folders by parent folder ID', async () => {
		const parentFolder = await (0, folders_1.createFolder)(ownerProject, { name: 'Parent' });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Child 1', parentFolder });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Child 2', parentFolder });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Standalone' });
		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ filter: `{ "parentFolderId": "${parentFolder.id}" }` })
			.expect(200);
		expect(response.body.count).toBe(2);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.data.map((f) => f.name).sort()).toEqual(['Child 1', 'Child 2'].sort());
	});
	test('should filter root-level folders when parentFolderId=0', async () => {
		const parentFolder = await (0, folders_1.createFolder)(ownerProject, { name: 'Parent' });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Child 1', parentFolder });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Standalone 1' });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Standalone 2' });
		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ filter: `{ "parentFolderId": "${n8n_workflow_1.PROJECT_ROOT}" }` })
			.expect(200);
		expect(response.body.count).toBe(3);
		expect(response.body.data).toHaveLength(3);
		expect(response.body.data.map((f) => f.name).sort()).toEqual(
			['Parent', 'Standalone 1', 'Standalone 2'].sort(),
		);
	});
	test('should filter folders by tag', async () => {
		const tag1 = await (0, tags_1.createTag)({ name: 'important' });
		const tag2 = await (0, tags_1.createTag)({ name: 'archived' });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Folder 1', tags: [tag1] });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Folder 2', tags: [tag2] });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Folder 3', tags: [tag1, tag2] });
		const response = await authOwnerAgent.get(
			`/projects/${ownerProject.id}/folders?filter={ "tags": ["important"]}`,
		);
		expect(response.body.count).toBe(2);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.data.map((f) => f.name).sort()).toEqual(['Folder 1', 'Folder 3'].sort());
	});
	test('should filter folders by multiple tags (AND operator)', async () => {
		const tag1 = await (0, tags_1.createTag)({ name: 'important' });
		const tag2 = await (0, tags_1.createTag)({ name: 'active' });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Folder 1', tags: [tag1] });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Folder 2', tags: [tag2] });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Folder 3', tags: [tag1, tag2] });
		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders?filter={ "tags": ["important", "active"]}`)
			.expect(200);
		expect(response.body.count).toBe(1);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe('Folder 3');
	});
	test('should filter folders by excludeFolderIdAndDescendants', async () => {
		const folder1 = await (0, folders_1.createFolder)(ownerProject, { name: 'folder level 1' });
		await (0, folders_1.createFolder)(ownerProject, {
			name: 'folder level 1.1',
			parentFolder: folder1,
		});
		const folder12 = await (0, folders_1.createFolder)(ownerProject, {
			name: 'folder level 1.2',
			parentFolder: folder1,
		});
		await (0, folders_1.createFolder)(ownerProject, {
			name: 'folder level 1.2.1',
			parentFolder: folder12,
		});
		const folder122 = await (0, folders_1.createFolder)(ownerProject, {
			name: 'folder level 1.2.2',
			parentFolder: folder12,
		});
		await (0, folders_1.createFolder)(ownerProject, {
			name: 'folder level 1.2.2.1',
			parentFolder: folder122,
		});
		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ filter: `{ "excludeFolderIdAndDescendants": "${folder122.id}" }` });
		expect(response.body.data.length).toBe(4);
		expect(response.body.data.map((f) => f.name).sort()).toEqual(
			['folder level 1', 'folder level 1.1', 'folder level 1.2.1', 'folder level 1.2'].sort(),
		);
	});
	test('should apply pagination with take parameter', async () => {
		for (let i = 1; i <= 5; i++) {
			await (0, folders_1.createFolder)(ownerProject, {
				name: `Folder ${i}`,
				updatedAt: luxon_1.DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}
		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ take: 3 })
			.expect(200);
		expect(response.body.count).toBe(5);
		expect(response.body.data).toHaveLength(3);
		expect(response.body.data.map((f) => f.name)).toEqual(['Folder 5', 'Folder 4', 'Folder 3']);
	});
	test('should apply pagination with skip parameter', async () => {
		for (let i = 1; i <= 5; i++) {
			await (0, folders_1.createFolder)(ownerProject, {
				name: `Folder ${i}`,
				updatedAt: luxon_1.DateTime.now()
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
		expect(response.body.data.map((f) => f.name)).toEqual(['Folder 3', 'Folder 2', 'Folder 1']);
	});
	test('should apply combined skip and take parameters', async () => {
		for (let i = 1; i <= 5; i++) {
			await (0, folders_1.createFolder)(ownerProject, {
				name: `Folder ${i}`,
				updatedAt: luxon_1.DateTime.now()
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
		expect(response.body.data.map((f) => f.name)).toEqual(['Folder 4', 'Folder 3']);
	});
	test('should sort folders by name ascending', async () => {
		await (0, folders_1.createFolder)(ownerProject, { name: 'Z Folder' });
		await (0, folders_1.createFolder)(ownerProject, { name: 'A Folder' });
		await (0, folders_1.createFolder)(ownerProject, { name: 'M Folder' });
		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ sortBy: 'name:asc' })
			.expect(200);
		expect(response.body.data.map((f) => f.name)).toEqual(['A Folder', 'M Folder', 'Z Folder']);
	});
	test('should sort folders by name descending', async () => {
		await (0, folders_1.createFolder)(ownerProject, { name: 'Z Folder' });
		await (0, folders_1.createFolder)(ownerProject, { name: 'A Folder' });
		await (0, folders_1.createFolder)(ownerProject, { name: 'M Folder' });
		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ sortBy: 'name:desc' })
			.expect(200);
		expect(response.body.data.map((f) => f.name)).toEqual(['Z Folder', 'M Folder', 'A Folder']);
	});
	test('should sort folders by updatedAt', async () => {
		await (0, folders_1.createFolder)(ownerProject, {
			name: 'Older Folder',
			updatedAt: luxon_1.DateTime.now().minus({ days: 2 }).toJSDate(),
		});
		await (0, folders_1.createFolder)(ownerProject, {
			name: 'Newest Folder',
			updatedAt: luxon_1.DateTime.now().toJSDate(),
		});
		await (0, folders_1.createFolder)(ownerProject, {
			name: 'Middle Folder',
			updatedAt: luxon_1.DateTime.now().minus({ days: 1 }).toJSDate(),
		});
		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders`)
			.query({ sortBy: 'updatedAt:desc' })
			.expect(200);
		expect(response.body.data.map((f) => f.name)).toEqual([
			'Newest Folder',
			'Middle Folder',
			'Older Folder',
		]);
	});
	test('should select specific fields when requested', async () => {
		await (0, folders_1.createFolder)(ownerProject, { name: 'Test Folder' });
		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/folders?select=["id","name"]`)
			.expect(200);
		expect(response.body.data[0]).toEqual({
			id: expect.any(String),
			name: 'Test Folder',
		});
		expect(response.body.data[0].createdAt).toBeUndefined();
		expect(response.body.data[0].updatedAt).toBeUndefined();
		expect(response.body.data[0].parentFolder).toBeUndefined();
	});
	test('should select path field when requested', async () => {
		const folder1 = await (0, folders_1.createFolder)(ownerProject, { name: 'Test Folder' });
		const folder2 = await (0, folders_1.createFolder)(ownerProject, {
			name: 'Test Folder 2',
			parentFolder: folder1,
		});
		const folder3 = await (0, folders_1.createFolder)(ownerProject, {
			name: 'Test Folder 3',
			parentFolder: folder2,
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
		const tag = await (0, tags_1.createTag)({ name: 'important' });
		const parentFolder = await (0, folders_1.createFolder)(ownerProject, { name: 'Parent' });
		await (0, folders_1.createFolder)(ownerProject, {
			name: 'Test Child 1',
			parentFolder,
			tags: [tag],
		});
		await (0, folders_1.createFolder)(ownerProject, {
			name: 'Another Child',
			parentFolder,
		});
		await (0, folders_1.createFolder)(ownerProject, {
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
		await (0, folders_1.createFolder)(ownerProject, { name: 'Owner Folder 1' });
		await (0, folders_1.createFolder)(ownerProject, { name: 'Owner Folder 2' });
		await (0, folders_1.createFolder)(memberProject, { name: 'Member Folder' });
		const response = await authOwnerAgent.get(`/projects/${ownerProject.id}/folders`).expect(200);
		expect(response.body.count).toBe(2);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.data.map((f) => f.name).sort()).toEqual(
			['Owner Folder 1', 'Owner Folder 2'].sort(),
		);
	});
	test('should include workflow count', async () => {
		const folder = await (0, folders_1.createFolder)(ownerProject, { name: 'Test Folder' });
		await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: folder, isArchived: false },
			ownerProject,
		);
		await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: folder, isArchived: false },
			ownerProject,
		);
		await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: folder, isArchived: true },
			ownerProject,
		);
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
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:viewer');
		const folder = await (0, folders_1.createFolder)(project, { name: 'Test Folder' });
		await authMemberAgent.get(`/projects/${project.id}/folders/${folder.id}/content`).expect(403);
	});
	test('should not list folders when project does not exist', async () => {
		await authOwnerAgent
			.get('/projects/non-existing-id/folders/no-existing-id/content')
			.expect(403);
	});
	test('should not return folder content if user has no access to project', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		await authMemberAgent
			.get(`/projects/${project.id}/folders/non-existing-id/content`)
			.expect(403);
	});
	test('should not return folder content if folder does not belong to project', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		await authOwnerAgent.get(`/projects/${project.id}/folders/non-existing-id/content`).expect(404);
	});
	test('should return folder content if user has project:viewer role in team project', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:viewer');
		const folder = await (0, folders_1.createFolder)(project, { name: 'Test Folder' });
		const response = await authMemberAgent
			.get(`/projects/${project.id}/folders/${folder.id}/content`)
			.expect(200);
		expect(response.body.data.totalWorkflows).toBeDefined();
		expect(response.body.data.totalSubFolders).toBeDefined();
	});
	test('should return folder content', async () => {
		const personalFolder1 = await (0, folders_1.createFolder)(ownerProject, {
			name: 'Personal Folder 1',
		});
		await (0, folders_1.createFolder)(ownerProject, { name: 'Personal Folder 2' });
		const personalProjectSubfolder1 = await (0, folders_1.createFolder)(ownerProject, {
			name: 'Personal Folder 1 Subfolder 1',
			parentFolder: personalFolder1,
		});
		const personalProjectSubfolder2 = await (0, folders_1.createFolder)(ownerProject, {
			name: 'Personal Folder 1 Subfolder 2',
			parentFolder: personalFolder1,
		});
		await (0, backend_test_utils_1.createWorkflow)({ parentFolder: personalFolder1 }, ownerProject);
		await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: personalProjectSubfolder1 },
			ownerProject,
		);
		await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: personalProjectSubfolder2 },
			ownerProject,
		);
		await (0, backend_test_utils_1.createWorkflow)(
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
		const admin = await (0, users_1.createUser)({ role: 'global:admin' });
		const sourceProject = await (0, backend_test_utils_1.createTeamProject)(
			'source project',
			admin,
		);
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'destination project',
			member,
		);
		const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 1',
		});
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: sourceProject,
				role: 'credential:owner',
			},
		);
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
		const sourceProject = await (0, backend_test_utils_1.createTeamProject)(
			'source project',
			member,
		);
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'Team Project',
			member,
		);
		const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 1',
		});
		await (0, backend_test_utils_1.createWorkflow)(
			{ active: true, parentFolder: sourceFolder1 },
			destinationProject,
		);
		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id, destinationParentFolderId: '0' })
			.expect(400);
	});
	test('cannot transfer somebody elses folder', async () => {
		const sourceProject = await (0, backend_test_utils_1.createTeamProject)(
			'source project',
			member,
		);
		const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 1',
		});
		await (0, backend_test_utils_1.createWorkflow)({ parentFolder: sourceFolder1 }, owner);
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'Team Project',
			admin,
		);
		const destinationFolder1 = await (0, folders_1.createFolder)(destinationProject, {
			name: 'Source Folder 1',
		});
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
		const sourceProject = await (0, backend_test_utils_1.getPersonalProject)(member);
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'Team Project',
			owner,
		);
		const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 1',
		});
		await (0, backend_test_utils_1.createWorkflow)({ active: true }, destinationProject);
		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id, destinationParentFolderId: '0' })
			.expect(404);
	});
	test.each(['project:editor', 'project:viewer'])(
		'%ss cannot transfer workflows',
		async (projectRole) => {
			const sourceProject = await (0, backend_test_utils_1.createTeamProject)();
			await (0, backend_test_utils_1.linkUserToProject)(member, sourceProject, projectRole);
			const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
				name: 'Source Folder 1',
			});
			await (0, backend_test_utils_1.createWorkflow)({}, sourceProject);
			const destinationProject = await (0, backend_test_utils_1.createTeamProject)();
			await (0, backend_test_utils_1.linkUserToProject)(
				member,
				destinationProject,
				'project:admin',
			);
			await testServer
				.authAgentFor(member)
				.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id, destinationParentFolderId: '0' })
				.expect(403);
		},
	);
	test.each([
		[
			'owners',
			'team',
			'team',
			() => owner,
			async () => await (0, backend_test_utils_1.createTeamProject)('Source Project'),
			async () => await (0, backend_test_utils_1.createTeamProject)('Destination Project'),
		],
		[
			'owners',
			'team',
			'personal',
			() => owner,
			async () => await (0, backend_test_utils_1.createTeamProject)('Source Project'),
			() => memberProject,
		],
		[
			'owners',
			'personal',
			'team',
			() => owner,
			() => memberProject,
			async () => await (0, backend_test_utils_1.createTeamProject)('Destination Project'),
		],
		[
			'admins',
			'team',
			'team',
			() => admin,
			async () => await (0, backend_test_utils_1.createTeamProject)('Source Project'),
			async () => await (0, backend_test_utils_1.createTeamProject)('Destination Project'),
		],
		[
			'admins',
			'team',
			'personal',
			() => admin,
			async () => await (0, backend_test_utils_1.createTeamProject)('Source Project'),
			() => memberProject,
		],
		[
			'admins',
			'personal',
			'team',
			() => admin,
			() => memberProject,
			async () => await (0, backend_test_utils_1.createTeamProject)('Destination Project'),
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
			const actor = getActor();
			const sourceProject = await getSourceProject();
			const destinationProject = await getDestinationProject();
			const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
				name: 'Source Folder 1',
			});
			const workflow = await (0, backend_test_utils_1.createWorkflow)(
				{ parentFolder: sourceFolder1 },
				sourceProject,
			);
			const response = await testServer
				.authAgentFor(actor)
				.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id, destinationParentFolderId: '0' })
				.expect(200);
			expect(response.body).toEqual({});
			const allSharings = await (0, backend_test_utils_1.getWorkflowSharing)(workflow);
			expect(allSharings).toHaveLength(1);
			expect(allSharings[0]).toMatchObject({
				projectId: destinationProject.id,
				workflowId: workflow.id,
				role: 'workflow:owner',
			});
		},
	);
	test('owner transfers folder from project they are not part of, e.g. test global cred sharing scope', async () => {
		const admin = await (0, users_1.createUser)({ role: 'global:admin' });
		const sourceProject = await (0, backend_test_utils_1.createTeamProject)(
			'source project',
			admin,
		);
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'destination project',
			member,
		);
		const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 1',
		});
		const sourceFolder2 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});
		const workflow1 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder1 },
			sourceProject,
		);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder2 },
			sourceProject,
		);
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: sourceProject,
				role: 'credential:owner',
			},
		);
		await testServer
			.authAgentFor(owner)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id],
			})
			.expect(200);
		const workflow1Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});
		const workflow2Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow2);
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
		const allCredentialSharings = await (0, credentials_1.getCredentialSharings)(credential);
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
		const admin = await (0, users_1.createUser)({ role: 'global:admin' });
		const sourceProject = await (0, backend_test_utils_1.createTeamProject)(
			'source project',
			owner,
		);
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'destination project',
			owner,
		);
		const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 1',
		});
		const sourceFolder2 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});
		const workflow1 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder1 },
			sourceProject,
		);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder2 },
			sourceProject,
		);
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: sourceProject,
				role: 'credential:owner',
			},
		);
		await testServer
			.authAgentFor(admin)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id],
			})
			.expect(200);
		const workflow1Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});
		const workflow2Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow2);
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
		const allCredentialSharings = await (0, credentials_1.getCredentialSharings)(credential);
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
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const sourceProject = await projectRepository.getPersonalProjectForUserOrFail(member.id);
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'destination project',
			member,
		);
		const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 1',
		});
		const sourceFolder2 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});
		const workflow1 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder1 },
			sourceProject,
		);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder2 },
			sourceProject,
		);
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		await (0, credentials_1.shareCredentialWithUsers)(credential, [member]);
		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id],
			})
			.expect(200);
		const workflow1Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});
		const workflow2Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow2);
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
		const allCredentialSharings = await (0, credentials_1.getCredentialSharings)(credential);
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
		const sourceProject = await projectRepository.getPersonalProjectForUserOrFail(member.id);
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'destination project',
		);
		const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 1',
		});
		const sourceFolder2 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});
		const workflow1 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder1 },
			sourceProject,
		);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder2 },
			sourceProject,
		);
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: sourceProject,
				role: 'credential:owner',
			},
		);
		await (0, backend_test_utils_1.linkUserToProject)(member, destinationProject, 'project:editor');
		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id],
			})
			.expect(200);
		const workflow1Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});
		const workflow2Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow2);
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
		const allCredentialSharings = await (0, credentials_1.getCredentialSharings)(credential);
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
		const sourceProject = await (0, backend_test_utils_1.createTeamProject)(
			'source project',
			member,
		);
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'destination project',
		);
		const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 1',
		});
		const sourceFolder2 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});
		const workflow1 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder1 },
			sourceProject,
		);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder2 },
			sourceProject,
		);
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: sourceProject,
				role: 'credential:owner',
			},
		);
		await (0, backend_test_utils_1.linkUserToProject)(member, destinationProject, 'project:editor');
		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id],
			})
			.expect(200);
		const workflow1Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});
		const workflow2Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow2);
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
		const allCredentialSharings = await (0, credentials_1.getCredentialSharings)(credential);
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
		const sourceProject = await (0, backend_test_utils_1.createTeamProject)(
			'source project',
			member,
		);
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'destination project',
		);
		const ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
		const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 1',
		});
		const sourceFolder2 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});
		const workflow1 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder1 },
			sourceProject,
		);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder2 },
			sourceProject,
		);
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		await (0, backend_test_utils_1.linkUserToProject)(member, destinationProject, 'project:editor');
		await (0, credentials_1.shareCredentialWithProjects)(credential, [sourceProject]);
		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id],
			})
			.expect(200);
		const workflow1Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});
		const workflow2Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow2);
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
		const allCredentialSharings = await (0, credentials_1.getCredentialSharings)(credential);
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
		const sourceProject = await (0, backend_test_utils_1.createTeamProject)(
			'source project',
			member,
		);
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'destination project',
		);
		const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 1',
		});
		const sourceFolder2 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});
		const workflow1 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder1 },
			sourceProject,
		);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: sourceFolder2 },
			sourceProject,
		);
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: sourceProject,
				role: 'credential:owner',
			},
		);
		const ownersCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		await (0, backend_test_utils_1.linkUserToProject)(member, destinationProject, 'project:editor');
		await testServer
			.authAgentFor(member)
			.put(`/projects/${sourceProject.id}/folders/${sourceFolder1.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				destinationParentFolderId: '0',
				shareCredentials: [credential.id, ownersCredential.id],
			})
			.expect(200);
		const workflow1Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow1);
		expect(workflow1Sharing).toHaveLength(1);
		expect(workflow1Sharing[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow1.id,
			role: 'workflow:owner',
		});
		const workflow2Sharing = await (0, backend_test_utils_1.getWorkflowSharing)(workflow2);
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
		const allCredentialSharings = await (0, credentials_1.getCredentialSharings)(credential);
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
		const sourceProject = await (0, backend_test_utils_1.createTeamProject)(
			'source project',
			member,
		);
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'Team Project',
			member,
		);
		const sourceFolder1 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 1',
		});
		const sourceFolder2 = await (0, folders_1.createFolder)(sourceProject, {
			name: 'Source Folder 2',
			parentFolder: sourceFolder1,
		});
		await (0, backend_test_utils_1.createWorkflow)(
			{ active: true, parentFolder: sourceFolder1 },
			sourceProject,
		);
		await (0, backend_test_utils_1.createWorkflow)({ parentFolder: sourceFolder2 }, sourceProject);
		activeWorkflowManager.add.mockRejectedValue(new n8n_workflow_1.ApplicationError('Oh no!'));
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
//# sourceMappingURL=folder.controller.test.js.map
