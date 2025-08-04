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
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const luxon_1 = require('luxon');
const n8n_workflow_1 = require('n8n-workflow');
const uuid_1 = require('uuid');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const license_1 = require('@/license');
const project_service_ee_1 = require('@/services/project.service.ee');
const workflow_service_ee_1 = require('@/workflows/workflow.service.ee');
const folders_1 = require('@test-integration/db/folders');
const credentials_1 = require('../shared/db/credentials');
const tags_1 = require('../shared/db/tags');
const users_1 = require('../shared/db/users');
const utils = __importStar(require('../shared/utils/'));
const utils_1 = require('../shared/utils/');
let owner;
let member;
let anotherMember;
let authOwnerAgent;
let authMemberAgent;
const testServer = utils.setupTestServer({
	endpointGroups: ['workflows'],
	enabledFeatures: ['feat:sharing'],
	quotas: {
		'quota:maxTeamProjects': -1,
	},
});
const license = testServer.license;
const { objectContaining, arrayContaining, any } = expect;
const activeWorkflowManagerLike = (0, backend_test_utils_1.mockInstance)(
	active_workflow_manager_1.ActiveWorkflowManager,
);
let projectRepository;
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate([
		'SharedWorkflow',
		'WorkflowHistory',
		'ProjectRelation',
		'Folder',
		'WorkflowEntity',
		'TagEntity',
		'Project',
		'User',
	]);
	projectRepository = di_1.Container.get(db_1.ProjectRepository);
	owner = await (0, users_1.createOwner)();
	authOwnerAgent = testServer.authAgentFor(owner);
	member = await (0, users_1.createMember)();
	authMemberAgent = testServer.authAgentFor(member);
	anotherMember = await (0, users_1.createMember)();
});
afterEach(() => {
	jest.clearAllMocks();
});
describe('POST /workflows', () => {
	const testWithPinData = async (withPinData) => {
		const workflow = (0, utils_1.makeWorkflow)({ withPinData });
		const response = await authOwnerAgent.post('/workflows').send(workflow);
		expect(response.statusCode).toBe(200);
		return response.body.data.pinData;
	};
	test('should store pin data for node in workflow', async () => {
		const pinData = await testWithPinData(true);
		expect(pinData).toMatchObject(utils_1.MOCK_PINDATA);
	});
	test('should set pin data to null if no pin data', async () => {
		const pinData = await testWithPinData(false);
		expect(pinData).toBeNull();
	});
	test('should return scopes on created workflow', async () => {
		const payload = {
			name: 'testing',
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
			],
			connections: {},
			staticData: null,
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
			active: false,
		};
		const response = await authMemberAgent.post('/workflows').send(payload);
		expect(response.statusCode).toBe(200);
		const {
			data: { id, scopes },
		} = response.body;
		expect(id).toBeDefined();
		expect(scopes).toEqual(
			[
				'workflow:delete',
				'workflow:execute',
				'workflow:move',
				'workflow:read',
				'workflow:share',
				'workflow:update',
			].sort(),
		);
	});
	test('should create workflow history version when licensed', async () => {
		license.enable('feat:workflowHistory');
		const payload = {
			name: 'testing',
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
			],
			connections: {},
			staticData: null,
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
			active: false,
		};
		const response = await authOwnerAgent.post('/workflows').send(payload);
		expect(response.statusCode).toBe(200);
		const {
			data: { id },
		} = response.body;
		expect(id).toBeDefined();
		expect(
			await di_1.Container.get(db_1.WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(1);
		const historyVersion = await di_1.Container.get(db_1.WorkflowHistoryRepository).findOne({
			where: {
				workflowId: id,
			},
		});
		expect(historyVersion).not.toBeNull();
		expect(historyVersion.connections).toEqual(payload.connections);
		expect(historyVersion.nodes).toEqual(payload.nodes);
	});
	test('should not create workflow history version when not licensed', async () => {
		license.disable('feat:workflowHistory');
		const payload = {
			name: 'testing',
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
			],
			connections: {},
			staticData: null,
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
			active: false,
		};
		const response = await authOwnerAgent.post('/workflows').send(payload);
		expect(response.statusCode).toBe(200);
		const {
			data: { id },
		} = response.body;
		expect(id).toBeDefined();
		expect(
			await di_1.Container.get(db_1.WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(0);
	});
	test('create workflow in personal project by default', async () => {
		const tag = await (0, tags_1.createTag)({ name: 'A' });
		const workflow = (0, utils_1.makeWorkflow)();
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const response = await authOwnerAgent
			.post('/workflows')
			.send({ ...workflow, tags: [tag.id] })
			.expect(200);
		await di_1.Container.get(db_1.SharedWorkflowRepository).findOneOrFail({
			where: {
				projectId: personalProject.id,
				workflowId: response.body.data.id,
			},
		});
		expect(response.body.data).toMatchObject({
			active: false,
			id: expect.any(String),
			name: workflow.name,
			sharedWithProjects: [],
			usedCredentials: [],
			homeProject: {
				id: personalProject.id,
				name: personalProject.name,
				type: personalProject.type,
			},
			tags: [{ id: tag.id, name: tag.name }],
		});
		expect(response.body.data.shared).toBeUndefined();
	});
	test('creates workflow in a specific project if the projectId is passed', async () => {
		const tag = await (0, tags_1.createTag)({ name: 'A' });
		const workflow = (0, utils_1.makeWorkflow)();
		const project = await projectRepository.save(
			projectRepository.create({
				name: 'Team Project',
				type: 'team',
			}),
		);
		await di_1.Container.get(project_service_ee_1.ProjectService).addUser(project.id, {
			userId: owner.id,
			role: 'project:admin',
		});
		const response = await authOwnerAgent
			.post('/workflows')
			.send({ ...workflow, projectId: project.id, tags: [tag.id] })
			.expect(200);
		await di_1.Container.get(db_1.SharedWorkflowRepository).findOneOrFail({
			where: {
				projectId: project.id,
				workflowId: response.body.data.id,
			},
		});
		expect(response.body.data).toMatchObject({
			active: false,
			id: expect.any(String),
			name: workflow.name,
			sharedWithProjects: [],
			usedCredentials: [],
			homeProject: {
				id: project.id,
				name: project.name,
				type: project.type,
			},
			tags: [{ id: tag.id, name: tag.name }],
		});
		expect(response.body.data.shared).toBeUndefined();
	});
	test('does not create the workflow in a specific project if the user is not part of the project', async () => {
		const workflow = (0, utils_1.makeWorkflow)();
		const project = await projectRepository.save(
			projectRepository.create({
				name: 'Team Project',
				type: 'team',
			}),
		);
		await testServer
			.authAgentFor(member)
			.post('/workflows')
			.send({ ...workflow, projectId: project.id })
			.expect(400, {
				code: 400,
				message: "You don't have the permissions to save the workflow in this project.",
			});
	});
	test('does not create the workflow in a specific project if the user does not have the right role to do so', async () => {
		const workflow = (0, utils_1.makeWorkflow)();
		const project = await projectRepository.save(
			projectRepository.create({
				name: 'Team Project',
				type: 'team',
			}),
		);
		await di_1.Container.get(project_service_ee_1.ProjectService).addUser(project.id, {
			userId: member.id,
			role: 'project:viewer',
		});
		await testServer
			.authAgentFor(member)
			.post('/workflows')
			.send({ ...workflow, projectId: project.id })
			.expect(400, {
				code: 400,
				message: "You don't have the permissions to save the workflow in this project.",
			});
	});
	test('create link workflow with folder if one is provided', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder = await (0, folders_1.createFolder)(personalProject, { name: 'Folder 1' });
		const workflow = (0, utils_1.makeWorkflow)();
		const response = await authOwnerAgent
			.post('/workflows')
			.send({ ...workflow, parentFolderId: folder.id });
		expect(response.body.data).toMatchObject({
			active: false,
			id: expect.any(String),
			name: workflow.name,
			sharedWithProjects: [],
			usedCredentials: [],
			homeProject: {
				id: personalProject.id,
				name: personalProject.name,
				type: personalProject.type,
			},
			parentFolder: {
				id: folder.id,
				name: folder.name,
			},
		});
		expect(response.body.data.shared).toBeUndefined();
	});
	test('create workflow without parent folder if no folder is provided', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const workflow = (0, utils_1.makeWorkflow)();
		const response = await authOwnerAgent
			.post('/workflows')
			.send({ ...workflow })
			.expect(200);
		expect(response.body.data).toMatchObject({
			active: false,
			id: expect.any(String),
			name: workflow.name,
			sharedWithProjects: [],
			usedCredentials: [],
			homeProject: {
				id: personalProject.id,
				name: personalProject.name,
				type: personalProject.type,
			},
			parentFolder: null,
		});
		expect(response.body.data.shared).toBeUndefined();
	});
	test('create workflow without parent is provided folder does not exist in the project', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const workflow = (0, utils_1.makeWorkflow)();
		const response = await authOwnerAgent
			.post('/workflows')
			.send({ ...workflow, parentFolderId: 'non-existing-folder-id' })
			.expect(200);
		expect(response.body.data).toMatchObject({
			active: false,
			id: expect.any(String),
			name: workflow.name,
			sharedWithProjects: [],
			usedCredentials: [],
			homeProject: {
				id: personalProject.id,
				name: personalProject.name,
				type: personalProject.type,
			},
			parentFolder: null,
		});
		expect(response.body.data.shared).toBeUndefined();
	});
});
describe('GET /workflows/:workflowId', () => {
	test('should return pin data', async () => {
		const workflow = (0, utils_1.makeWorkflow)({ withPinData: true });
		const workflowCreationResponse = await authOwnerAgent.post('/workflows').send(workflow);
		const { id } = workflowCreationResponse.body.data;
		const workflowRetrievalResponse = await authOwnerAgent.get(`/workflows/${id}`);
		expect(workflowRetrievalResponse.statusCode).toBe(200);
		const { pinData } = workflowRetrievalResponse.body.data;
		expect(pinData).toMatchObject(utils_1.MOCK_PINDATA);
	});
	test('should return tags', async () => {
		const tag = await (0, tags_1.createTag)({ name: 'A' });
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ tags: [tag] }, owner);
		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`).expect(200);
		expect(response.body.data).toMatchObject({
			tags: [expect.objectContaining({ id: tag.id, name: tag.name })],
		});
	});
	test('should return parent folder', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder1 = await (0, folders_1.createFolder)(personalProject, { name: 'Folder 1' });
		const folder2 = await (0, folders_1.createFolder)(personalProject, {
			name: 'Folder 2',
			parentFolder: folder1,
		});
		const workflow1 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: folder2 },
			owner,
		);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const workflow3 = await (0, backend_test_utils_1.createWorkflow)(
			{ parentFolder: folder1 },
			owner,
		);
		const workflowInNestedFolderWithGrantParent = await authOwnerAgent
			.get(`/workflows/${workflow1.id}`)
			.expect(200);
		expect(workflowInNestedFolderWithGrantParent.body.data).toMatchObject({
			parentFolder: expect.objectContaining({
				id: folder2.id,
				name: folder2.name,
				parentFolderId: folder1.id,
			}),
		});
		const workflowInProjectRoot = await authOwnerAgent
			.get(`/workflows/${workflow2.id}`)
			.expect(200);
		expect(workflowInProjectRoot.body.data).toMatchObject({
			parentFolder: null,
		});
		const workflowInNestedFolder = await authOwnerAgent
			.get(`/workflows/${workflow3.id}`)
			.expect(200);
		expect(workflowInNestedFolder.body.data).toMatchObject({
			parentFolder: expect.objectContaining({
				id: folder1.id,
				name: folder1.name,
				parentFolderId: null,
			}),
		});
	});
});
describe('GET /workflows', () => {
	test('should return zero workflows if none exist', async () => {
		const response = await authOwnerAgent.get('/workflows').expect(200);
		expect(response.body).toEqual({ count: 0, data: [] });
	});
	test('should return workflows', async () => {
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const nodes = [
			{
				id: (0, uuid_1.v4)(),
				name: 'Action Network',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					actionNetworkApi: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		];
		const tag = await (0, tags_1.createTag)({ name: 'A' });
		await (0, backend_test_utils_1.createWorkflow)({ name: 'First', nodes, tags: [tag] }, owner);
		await (0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, owner);
		const response = await authOwnerAgent.get('/workflows').expect(200);
		expect(response.body).toEqual({
			count: 2,
			data: arrayContaining([
				objectContaining({
					id: any(String),
					name: 'First',
					active: any(Boolean),
					createdAt: any(String),
					updatedAt: any(String),
					tags: [{ id: any(String), name: 'A' }],
					versionId: any(String),
					homeProject: {
						id: ownerPersonalProject.id,
						name: owner.createPersonalProjectName(),
						icon: null,
						type: ownerPersonalProject.type,
					},
					sharedWithProjects: [],
				}),
				objectContaining({
					id: any(String),
					name: 'Second',
					active: any(Boolean),
					createdAt: any(String),
					updatedAt: any(String),
					tags: [],
					versionId: any(String),
					homeProject: {
						id: ownerPersonalProject.id,
						name: owner.createPersonalProjectName(),
						icon: null,
						type: ownerPersonalProject.type,
					},
					sharedWithProjects: [],
				}),
			]),
		});
		const found = response.body.data.find((w) => w.name === 'First');
		expect(found.nodes).toBeUndefined();
		expect(found.sharedWithProjects).toHaveLength(0);
		expect(found.usedCredentials).toBeUndefined();
	});
	test('should return workflows with scopes when ?includeScopes=true', async () => {
		const [member1, member2] = await (0, users_1.createManyUsers)(2, {
			role: 'global:member',
		});
		const teamProject = await (0, backend_test_utils_1.createTeamProject)(undefined, member1);
		await (0, backend_test_utils_1.linkUserToProject)(member2, teamProject, 'project:editor');
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		const nodes = [
			{
				id: (0, uuid_1.v4)(),
				name: 'Action Network',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					actionNetworkApi: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		];
		const tag = await (0, tags_1.createTag)({ name: 'A' });
		const [savedWorkflow1, savedWorkflow2] = await Promise.all([
			(0, backend_test_utils_1.createWorkflow)({ name: 'First', nodes, tags: [tag] }, teamProject),
			(0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, member2),
		]);
		await (0, backend_test_utils_1.shareWorkflowWithProjects)(savedWorkflow2, [
			{ project: teamProject },
		]);
		{
			const response = await testServer.authAgentFor(member1).get('/workflows?includeScopes=true');
			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(2);
			const workflows = response.body.data;
			const wf1 = workflows.find((w) => w.id === savedWorkflow1.id);
			const wf2 = workflows.find((w) => w.id === savedWorkflow2.id);
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf1.scopes).toEqual(
				[
					'workflow:delete',
					'workflow:execute',
					'workflow:move',
					'workflow:read',
					'workflow:update',
				].sort(),
			);
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(wf2.scopes).toEqual(['workflow:read', 'workflow:update', 'workflow:execute'].sort());
		}
		{
			const response = await testServer.authAgentFor(member2).get('/workflows?includeScopes=true');
			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(2);
			const workflows = response.body.data;
			const wf1 = workflows.find((w) => w.id === savedWorkflow1.id);
			const wf2 = workflows.find((w) => w.id === savedWorkflow2.id);
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf1.scopes).toEqual([
				'workflow:delete',
				'workflow:execute',
				'workflow:read',
				'workflow:update',
			]);
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(wf2.scopes).toEqual(
				[
					'workflow:delete',
					'workflow:execute',
					'workflow:move',
					'workflow:read',
					'workflow:share',
					'workflow:update',
				].sort(),
			);
		}
		{
			const response = await testServer.authAgentFor(owner).get('/workflows?includeScopes=true');
			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(2);
			const workflows = response.body.data;
			const wf1 = workflows.find((w) => w.id === savedWorkflow1.id);
			const wf2 = workflows.find((w) => w.id === savedWorkflow2.id);
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf1.scopes).toEqual(
				[
					'workflow:create',
					'workflow:delete',
					'workflow:execute',
					'workflow:list',
					'workflow:move',
					'workflow:read',
					'workflow:share',
					'workflow:update',
				].sort(),
			);
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(wf2.scopes).toEqual(
				[
					'workflow:create',
					'workflow:delete',
					'workflow:execute',
					'workflow:list',
					'workflow:move',
					'workflow:read',
					'workflow:share',
					'workflow:update',
				].sort(),
			);
		}
	});
	describe('filter', () => {
		test('should filter workflows by field: name', async () => {
			await (0, backend_test_utils_1.createWorkflow)({ name: 'First' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, owner);
			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={"name":"First"}')
				.expect(200);
			expect(response.body).toEqual({
				count: 1,
				data: [objectContaining({ name: 'First' })],
			});
		});
		test('should filter workflows by field: active', async () => {
			await (0, backend_test_utils_1.createWorkflow)({ active: true }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ active: false }, owner);
			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "active": true }')
				.expect(200);
			expect(response.body).toEqual({
				count: 1,
				data: [objectContaining({ active: true })],
			});
		});
		test('should filter workflows by field: tags (AND operator)', async () => {
			const workflow1 = await (0, backend_test_utils_1.createWorkflow)({ name: 'First' }, owner);
			const workflow2 = await (0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, owner);
			const baseDate = luxon_1.DateTime.now();
			await (0, tags_1.createTag)(
				{
					name: 'A',
					createdAt: baseDate.toJSDate(),
				},
				workflow1,
			);
			await (0, tags_1.createTag)(
				{
					name: 'B',
					createdAt: baseDate.plus({ seconds: 1 }).toJSDate(),
				},
				workflow1,
			);
			const tagC = await (0, tags_1.createTag)({ name: 'C' }, workflow2);
			await (0, tags_1.assignTagToWorkflow)(tagC, workflow2);
			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "tags": ["A", "B"] }')
				.expect(200);
			expect(response.body).toEqual({
				count: 1,
				data: [
					objectContaining({
						name: 'First',
						tags: expect.arrayContaining([
							{ id: any(String), name: 'A' },
							{ id: any(String), name: 'B' },
						]),
					}),
				],
			});
		});
		test('should filter workflows by projectId', async () => {
			const workflow = await (0, backend_test_utils_1.createWorkflow)({ name: 'First' }, owner);
			const pp = await di_1.Container.get(db_1.ProjectRepository).getPersonalProjectForUserOrFail(
				owner.id,
			);
			const response1 = await authOwnerAgent
				.get('/workflows')
				.query(`filter={ "projectId": "${pp.id}" }`)
				.expect(200);
			expect(response1.body.data).toHaveLength(1);
			expect(response1.body.data[0].id).toBe(workflow.id);
			const response2 = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "projectId": "Non-Existing Project ID" }')
				.expect(200);
			expect(response2.body.data).toHaveLength(0);
		});
		test('should filter by personal project and return only workflows where the user is owner', async () => {
			const workflow = await (0, backend_test_utils_1.createWorkflow)({ name: 'First' }, owner);
			const workflow2 = await (0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, member);
			await (0, backend_test_utils_1.shareWorkflowWithUsers)(workflow2, [owner]);
			const pp = await di_1.Container.get(db_1.ProjectRepository).getPersonalProjectForUserOrFail(
				owner.id,
			);
			const response1 = await authOwnerAgent
				.get('/workflows')
				.query(`filter={ "projectId": "${pp.id}" }`)
				.expect(200);
			expect(response1.body.data).toHaveLength(1);
			expect(response1.body.data[0].id).toBe(workflow.id);
			const response2 = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "projectId": "Non-Existing Project ID" }')
				.expect(200);
			expect(response2.body.data).toHaveLength(0);
			const response3 = await authOwnerAgent.get('/workflows').query('filter={}').expect(200);
			expect(response3.body.data).toHaveLength(2);
		});
		test('should filter by personal project and return only workflows where the user is member', async () => {
			const workflow = await (0, backend_test_utils_1.createWorkflow)({ name: 'First' }, member);
			const workflow2 = await (0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, owner);
			await (0, backend_test_utils_1.shareWorkflowWithUsers)(workflow2, [member]);
			const pp = await di_1.Container.get(db_1.ProjectRepository).getPersonalProjectForUserOrFail(
				member.id,
			);
			const response1 = await authMemberAgent
				.get('/workflows')
				.query(`filter={ "projectId": "${pp.id}" }`)
				.expect(200);
			expect(response1.body.data).toHaveLength(1);
			expect(response1.body.data[0].id).toBe(workflow.id);
			const response2 = await authMemberAgent
				.get('/workflows')
				.query('filter={ "projectId": "Non-Existing Project ID" }')
				.expect(200);
			expect(response2.body.data).toHaveLength(0);
			const response3 = await authMemberAgent.get('/workflows').query('filter={}').expect(200);
			expect(response3.body.data).toHaveLength(2);
		});
		test('should filter workflows by parentFolderId', async () => {
			const pp = await di_1.Container.get(db_1.ProjectRepository).getPersonalProjectForUserOrFail(
				owner.id,
			);
			const folder1 = await (0, folders_1.createFolder)(pp, { name: 'Folder 1' });
			const workflow1 = await (0, backend_test_utils_1.createWorkflow)(
				{ name: 'First', parentFolder: folder1 },
				owner,
			);
			const workflow2 = await (0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, owner);
			const response1 = await authOwnerAgent
				.get('/workflows')
				.query(`filter={ "parentFolderId": "${folder1.id}" }`)
				.expect(200);
			expect(response1.body.data).toHaveLength(1);
			expect(response1.body.data[0].id).toBe(workflow1.id);
			const response2 = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "parentFolderId": "0" }');
			expect(200);
			expect(response2.body.data).toHaveLength(1);
			expect(response2.body.data[0].id).toBe(workflow2.id);
		});
	});
	describe('select', () => {
		test('should select workflow field: name', async () => {
			await (0, backend_test_utils_1.createWorkflow)({ name: 'First' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, owner);
			const response = await authOwnerAgent.get('/workflows').query('select=["name"]').expect(200);
			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{ id: any(String), name: 'First' },
					{ id: any(String), name: 'Second' },
				]),
			});
		});
		test('should select workflow field: active', async () => {
			await (0, backend_test_utils_1.createWorkflow)({ active: true }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ active: false }, owner);
			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["active"]')
				.expect(200);
			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{ id: any(String), active: true },
					{ id: any(String), active: false },
				]),
			});
		});
		test('should select workflow field: tags', async () => {
			const firstWorkflow = await (0, backend_test_utils_1.createWorkflow)(
				{ name: 'First' },
				owner,
			);
			const secondWorkflow = await (0, backend_test_utils_1.createWorkflow)(
				{ name: 'Second' },
				owner,
			);
			await (0, tags_1.createTag)({ name: 'A' }, firstWorkflow);
			await (0, tags_1.createTag)({ name: 'B' }, secondWorkflow);
			const response = await authOwnerAgent.get('/workflows').query('select=["tags"]').expect(200);
			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					objectContaining({ id: any(String), tags: [{ id: any(String), name: 'A' }] }),
					objectContaining({ id: any(String), tags: [{ id: any(String), name: 'B' }] }),
				]),
			});
		});
		test('should select workflow fields: createdAt and updatedAt', async () => {
			const firstWorkflowCreatedAt = '2023-08-08T09:31:25.000Z';
			const firstWorkflowUpdatedAt = '2023-08-08T09:31:40.000Z';
			const secondWorkflowCreatedAt = '2023-07-07T09:31:25.000Z';
			const secondWorkflowUpdatedAt = '2023-07-07T09:31:40.000Z';
			await (0, backend_test_utils_1.createWorkflow)(
				{
					createdAt: new Date(firstWorkflowCreatedAt),
					updatedAt: new Date(firstWorkflowUpdatedAt),
				},
				owner,
			);
			await (0, backend_test_utils_1.createWorkflow)(
				{
					createdAt: new Date(secondWorkflowCreatedAt),
					updatedAt: new Date(secondWorkflowUpdatedAt),
				},
				owner,
			);
			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["createdAt", "updatedAt"]')
				.expect(200);
			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					objectContaining({
						id: any(String),
						createdAt: firstWorkflowCreatedAt,
						updatedAt: firstWorkflowUpdatedAt,
					}),
					objectContaining({
						id: any(String),
						createdAt: secondWorkflowCreatedAt,
						updatedAt: secondWorkflowUpdatedAt,
					}),
				]),
			});
		});
		test('should select workflow field: versionId', async () => {
			const firstWorkflowVersionId = 'e95ccdde-2b4e-4fd0-8834-220a2b5b4353';
			const secondWorkflowVersionId = 'd099b8dc-b1d8-4b2d-9b02-26f32c0ee785';
			await (0, backend_test_utils_1.createWorkflow)({ versionId: firstWorkflowVersionId }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ versionId: secondWorkflowVersionId }, owner);
			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["versionId"]')
				.expect(200);
			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{ id: any(String), versionId: firstWorkflowVersionId },
					{ id: any(String), versionId: secondWorkflowVersionId },
				]),
			});
		});
		test('should select workflow field: ownedBy', async () => {
			await (0, backend_test_utils_1.createWorkflow)({}, owner);
			await (0, backend_test_utils_1.createWorkflow)({}, owner);
			const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
				owner.id,
			);
			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["ownedBy"]')
				.expect(200);
			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{
						id: any(String),
						homeProject: {
							id: ownerPersonalProject.id,
							name: owner.createPersonalProjectName(),
							icon: null,
							type: ownerPersonalProject.type,
						},
						sharedWithProjects: [],
					},
					{
						id: any(String),
						homeProject: {
							id: ownerPersonalProject.id,
							name: owner.createPersonalProjectName(),
							icon: null,
							type: ownerPersonalProject.type,
						},
						sharedWithProjects: [],
					},
				]),
			});
		});
		test('should select workflow field: parentFolder', async () => {
			const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
				owner.id,
			);
			const folder = await (0, folders_1.createFolder)(ownerPersonalProject, { name: 'Folder 1' });
			await (0, backend_test_utils_1.createWorkflow)({ parentFolder: folder }, owner);
			await (0, backend_test_utils_1.createWorkflow)({}, owner);
			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["parentFolder"]')
				.expect(200);
			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{
						id: any(String),
						parentFolder: {
							id: folder.id,
							name: folder.name,
							parentFolderId: null,
						},
					},
					{
						id: any(String),
						parentFolder: null,
					},
				]),
			});
		});
	});
	describe('sortBy', () => {
		test('should fail when trying to sort by non sortable column', async () => {
			await authOwnerAgent.get('/workflows').query('sortBy=nonSortableColumn:asc').expect(500);
		});
		test('should sort by createdAt column', async () => {
			await (0, backend_test_utils_1.createWorkflow)({ name: 'First' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, owner);
			let response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=createdAt:asc')
				.expect(200);
			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					expect.objectContaining({ name: 'First' }),
					expect.objectContaining({ name: 'Second' }),
				]),
			});
			response = await authOwnerAgent.get('/workflows').query('sortBy=createdAt:desc').expect(200);
			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					expect.objectContaining({ name: 'Second' }),
					expect.objectContaining({ name: 'First' }),
				]),
			});
		});
		test('should sort by name column', async () => {
			await (0, backend_test_utils_1.createWorkflow)({ name: 'a' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'b' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'My workflow' }, owner);
			let response;
			response = await authOwnerAgent.get('/workflows').query('sortBy=name:asc').expect(200);
			expect(response.body).toEqual({
				count: 3,
				data: [
					expect.objectContaining({ name: 'a' }),
					expect.objectContaining({ name: 'b' }),
					expect.objectContaining({ name: 'My workflow' }),
				],
			});
			response = await authOwnerAgent.get('/workflows').query('sortBy=name:desc').expect(200);
			expect(response.body).toEqual({
				count: 3,
				data: [
					expect.objectContaining({ name: 'My workflow' }),
					expect.objectContaining({ name: 'b' }),
					expect.objectContaining({ name: 'a' }),
				],
			});
		});
		test('should sort by updatedAt column', async () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 10);
			await (0, backend_test_utils_1.createWorkflow)(
				{ name: 'First', updatedAt: futureDate },
				owner,
			);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, owner);
			let response;
			response = await authOwnerAgent.get('/workflows').query('sortBy=updatedAt:asc').expect(200);
			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					expect.objectContaining({ name: 'Second' }),
					expect.objectContaining({ name: 'First' }),
				]),
			});
			response = await authOwnerAgent.get('/workflows').query('sortBy=name:desc').expect(200);
			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					expect.objectContaining({ name: 'First' }),
					expect.objectContaining({ name: 'Second' }),
				]),
			});
		});
	});
	describe('pagination', () => {
		beforeEach(async () => {
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Workflow 1' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Workflow 2' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Workflow 3' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Workflow 4' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Workflow 5' }, owner);
		});
		test('should fail when skip is provided without take', async () => {
			await authOwnerAgent.get('/workflows').query('skip=2').expect(500);
		});
		test('should handle skip with take parameter', async () => {
			const response = await authOwnerAgent.get('/workflows').query('skip=2&take=2').expect(200);
			expect(response.body.data).toHaveLength(2);
			expect(response.body.count).toBe(5);
			expect(response.body.data[0].name).toBe('Workflow 3');
			expect(response.body.data[1].name).toBe('Workflow 4');
		});
		test('should handle pagination with sorting', async () => {
			const response = await authOwnerAgent
				.get('/workflows')
				.query('take=2&skip=1&sortBy=name:desc');
			expect(response.body.data).toHaveLength(2);
			expect(response.body.count).toBe(5);
			expect(response.body.data[0].name).toBe('Workflow 4');
			expect(response.body.data[1].name).toBe('Workflow 3');
		});
		test('should handle pagination with filtering', async () => {
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Special Workflow 1' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Special Workflow 2' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Special Workflow 3' }, owner);
			const response = await authOwnerAgent
				.get('/workflows')
				.query('take=2&skip=1')
				.query('filter={"name":"Special"}')
				.expect(200);
			expect(response.body.data).toHaveLength(2);
			expect(response.body.count).toBe(3);
			expect(response.body.data[0].name).toBe('Special Workflow 2');
			expect(response.body.data[1].name).toBe('Special Workflow 3');
		});
		test('should return empty array when pagination exceeds total count', async () => {
			const response = await authOwnerAgent.get('/workflows').query('take=2&skip=10').expect(200);
			expect(response.body.data).toHaveLength(0);
			expect(response.body.count).toBe(5);
		});
		test('should return all results when no pagination parameters are provided', async () => {
			const response = await authOwnerAgent.get('/workflows').expect(200);
			expect(response.body.data).toHaveLength(5);
			expect(response.body.count).toBe(5);
		});
	});
});
describe('GET /workflows?onlySharedWithMe=true', () => {
	test('should return only workflows shared with me', async () => {
		const memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member.id,
		);
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		await (0, backend_test_utils_1.createWorkflow)({ name: 'First' }, owner);
		await (0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, member);
		const workflow3 = await (0, backend_test_utils_1.createWorkflow)({ name: 'Third' }, member);
		await (0, backend_test_utils_1.shareWorkflowWithUsers)(workflow3, [owner]);
		const response = await authOwnerAgent.get('/workflows').query({ onlySharedWithMe: true });
		expect(200);
		expect(response.body).toEqual({
			count: 1,
			data: arrayContaining([
				objectContaining({
					id: any(String),
					name: 'Third',
					active: any(Boolean),
					createdAt: any(String),
					updatedAt: any(String),
					versionId: any(String),
					parentFolder: null,
					homeProject: {
						id: memberPersonalProject.id,
						name: member.createPersonalProjectName(),
						icon: null,
						type: memberPersonalProject.type,
					},
					sharedWithProjects: [
						objectContaining({
							id: any(String),
							name: ownerPersonalProject.name,
							icon: null,
							type: ownerPersonalProject.type,
						}),
					],
				}),
			]),
		});
	});
});
describe('GET /workflows?includeFolders=true', () => {
	test('should return zero workflows and folders if none exist', async () => {
		const response = await authOwnerAgent.get('/workflows').query({ includeFolders: true });
		expect(response.body).toEqual({ count: 0, data: [] });
	});
	test('should return workflows and folders', async () => {
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const nodes = [
			{
				id: (0, uuid_1.v4)(),
				name: 'Action Network',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					actionNetworkApi: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		];
		const tag = await (0, tags_1.createTag)({ name: 'A' });
		await (0, backend_test_utils_1.createWorkflow)({ name: 'First', nodes, tags: [tag] }, owner);
		await (0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, owner);
		await (0, folders_1.createFolder)(ownerPersonalProject, { name: 'Folder' });
		const response = await authOwnerAgent.get('/workflows').query({ includeFolders: true });
		expect(200);
		expect(response.body).toEqual({
			count: 3,
			data: arrayContaining([
				objectContaining({
					resource: 'workflow',
					id: any(String),
					name: 'First',
					active: any(Boolean),
					createdAt: any(String),
					updatedAt: any(String),
					tags: [{ id: any(String), name: 'A' }],
					versionId: any(String),
					homeProject: {
						id: ownerPersonalProject.id,
						name: owner.createPersonalProjectName(),
						icon: null,
						type: ownerPersonalProject.type,
					},
					sharedWithProjects: [],
				}),
				objectContaining({
					id: any(String),
					name: 'Second',
					active: any(Boolean),
					createdAt: any(String),
					updatedAt: any(String),
					tags: [],
					versionId: any(String),
					homeProject: {
						id: ownerPersonalProject.id,
						name: owner.createPersonalProjectName(),
						icon: null,
						type: ownerPersonalProject.type,
					},
					sharedWithProjects: [],
				}),
				objectContaining({
					resource: 'folder',
					id: any(String),
					name: 'Folder',
					createdAt: any(String),
					updatedAt: any(String),
					tags: [],
					homeProject: {
						id: ownerPersonalProject.id,
						name: owner.createPersonalProjectName(),
						icon: null,
						type: ownerPersonalProject.type,
					},
					parentFolder: null,
					workflowCount: 0,
					subFolderCount: 0,
				}),
			]),
		});
		const found = response.body.data.find((w) => w.name === 'First');
		expect(found.nodes).toBeUndefined();
		expect(found.sharedWithProjects).toHaveLength(0);
		expect(found.usedCredentials).toBeUndefined();
	});
	test('should return workflows with scopes and folders when ?includeScopes=true', async () => {
		const [member1, member2] = await (0, users_1.createManyUsers)(2, {
			role: 'global:member',
		});
		const teamProject = await (0, backend_test_utils_1.createTeamProject)(undefined, member1);
		await (0, backend_test_utils_1.linkUserToProject)(member2, teamProject, 'project:editor');
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		const nodes = [
			{
				id: (0, uuid_1.v4)(),
				name: 'Action Network',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					actionNetworkApi: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		];
		const tag = await (0, tags_1.createTag)({ name: 'A' });
		const [savedWorkflow1, savedWorkflow2, savedFolder1] = await Promise.all([
			(0, backend_test_utils_1.createWorkflow)({ name: 'First', nodes, tags: [tag] }, teamProject),
			(0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, member2),
			(0, folders_1.createFolder)(teamProject, { name: 'Folder' }),
		]);
		await (0, backend_test_utils_1.shareWorkflowWithProjects)(savedWorkflow2, [
			{ project: teamProject },
		]);
		{
			const response = await testServer
				.authAgentFor(member1)
				.get('/workflows?includeScopes=true&includeFolders=true');
			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(3);
			const workflows = response.body.data;
			const wf1 = workflows.find((wf) => wf.id === savedWorkflow1.id);
			const wf2 = workflows.find((wf) => wf.id === savedWorkflow2.id);
			const f1 = workflows.find((wf) => wf.id === savedFolder1.id);
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf1.scopes).toEqual(
				[
					'workflow:delete',
					'workflow:execute',
					'workflow:move',
					'workflow:read',
					'workflow:update',
				].sort(),
			);
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(wf2.scopes).toEqual(['workflow:read', 'workflow:update', 'workflow:execute'].sort());
			expect(f1.id).toBe(savedFolder1.id);
		}
		{
			const response = await testServer
				.authAgentFor(member2)
				.get('/workflows?includeScopes=true&includeFolders=true');
			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(3);
			const workflows = response.body.data;
			const wf1 = workflows.find((w) => w.id === savedWorkflow1.id);
			const wf2 = workflows.find((w) => w.id === savedWorkflow2.id);
			const f1 = workflows.find((wf) => wf.id === savedFolder1.id);
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf1.scopes).toEqual([
				'workflow:delete',
				'workflow:execute',
				'workflow:read',
				'workflow:update',
			]);
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(wf2.scopes).toEqual(
				[
					'workflow:delete',
					'workflow:execute',
					'workflow:move',
					'workflow:read',
					'workflow:share',
					'workflow:update',
				].sort(),
			);
			expect(f1.id).toBe(savedFolder1.id);
		}
		{
			const response = await testServer
				.authAgentFor(owner)
				.get('/workflows?includeScopes=true&includeFolders=true');
			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(3);
			const workflows = response.body.data;
			const wf1 = workflows.find((w) => w.id === savedWorkflow1.id);
			const wf2 = workflows.find((w) => w.id === savedWorkflow2.id);
			const f1 = workflows.find((wf) => wf.id === savedFolder1.id);
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf1.scopes).toEqual(
				[
					'workflow:create',
					'workflow:delete',
					'workflow:execute',
					'workflow:list',
					'workflow:move',
					'workflow:read',
					'workflow:share',
					'workflow:update',
				].sort(),
			);
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(wf2.scopes).toEqual(
				[
					'workflow:create',
					'workflow:delete',
					'workflow:execute',
					'workflow:list',
					'workflow:move',
					'workflow:read',
					'workflow:share',
					'workflow:update',
				].sort(),
			);
			expect(f1.id).toBe(savedFolder1.id);
		}
	});
	describe('filter', () => {
		test('should filter workflows and folders by field: name', async () => {
			const workflow1 = await (0, backend_test_utils_1.createWorkflow)({ name: 'First' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, owner);
			const ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
			const folder1 = await (0, folders_1.createFolder)(ownerProject, { name: 'First' });
			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={"name":"First"}&includeFolders=true')
				.expect(200);
			expect(response.body).toEqual({
				count: 2,
				data: [
					objectContaining({ id: folder1.id, name: 'First' }),
					objectContaining({ id: workflow1.id, name: 'First' }),
				],
			});
		});
		test('should filter workflows and folders by field: active', async () => {
			const workflow1 = await (0, backend_test_utils_1.createWorkflow)({ active: true }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ active: false }, owner);
			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "active": true }&includeFolders=true')
				.expect(200);
			expect(response.body).toEqual({
				count: 1,
				data: [objectContaining({ id: workflow1.id, active: true })],
			});
		});
		test('should filter workflows and folders by field: tags (AND operator)', async () => {
			const baseDate = luxon_1.DateTime.now();
			const workflow1 = await (0, backend_test_utils_1.createWorkflow)(
				{ name: 'First', updatedAt: baseDate.toJSDate() },
				owner,
			);
			const workflow2 = await (0, backend_test_utils_1.createWorkflow)(
				{ name: 'Second', updatedAt: baseDate.toJSDate() },
				owner,
			);
			const ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
			const tagA = await (0, tags_1.createTag)(
				{
					name: 'A',
				},
				workflow1,
			);
			const tagB = await (0, tags_1.createTag)(
				{
					name: 'B',
				},
				workflow1,
			);
			await (0, tags_1.createTag)({ name: 'C' }, workflow2);
			await (0, folders_1.createFolder)(ownerProject, {
				name: 'First Folder',
				tags: [tagA, tagB],
				updatedAt: baseDate.plus({ minutes: 2 }).toJSDate(),
			});
			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "tags": ["A", "B"] }&includeFolders=true')
				.expect(200);
			expect(response.body).toEqual({
				count: 2,
				data: [
					objectContaining({
						name: 'First Folder',
						tags: expect.arrayContaining([
							{ id: any(String), name: 'A' },
							{ id: any(String), name: 'B' },
						]),
					}),
					objectContaining({
						name: 'First',
						tags: expect.arrayContaining([
							{ id: any(String), name: 'A' },
							{ id: any(String), name: 'B' },
						]),
					}),
				],
			});
		});
		test('should filter workflows by projectId', async () => {
			const workflow = await (0, backend_test_utils_1.createWorkflow)({ name: 'First' }, owner);
			const pp = await di_1.Container.get(db_1.ProjectRepository).getPersonalProjectForUserOrFail(
				owner.id,
			);
			const folder = await (0, folders_1.createFolder)(pp, {
				name: 'First Folder',
			});
			const response1 = await authOwnerAgent
				.get('/workflows')
				.query(`filter={ "projectId": "${pp.id}" }&includeFolders=true`)
				.expect(200);
			expect(response1.body.data).toHaveLength(2);
			expect(response1.body.data[0].id).toBe(folder.id);
			expect(response1.body.data[1].id).toBe(workflow.id);
			const response2 = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "projectId": "Non-Existing Project ID" }&includeFolders=true')
				.expect(200);
			expect(response2.body.data).toHaveLength(0);
		});
		test('should filter workflows by parentFolderId and its descendants when filtering by name', async () => {
			const pp = await di_1.Container.get(db_1.ProjectRepository).getPersonalProjectForUserOrFail(
				owner.id,
			);
			await (0, folders_1.createFolder)(pp, {
				name: 'Root Folder 1',
			});
			const rootFolder2 = await (0, folders_1.createFolder)(pp, {
				name: 'Root Folder 2',
			});
			await (0, folders_1.createFolder)(pp, {
				name: 'Root Folder 3',
			});
			const subfolder1 = await (0, folders_1.createFolder)(pp, {
				name: 'Root folder 2 subfolder 1 key',
				parentFolder: rootFolder2,
			});
			await (0, backend_test_utils_1.createWorkflow)(
				{
					name: 'Workflow 1 key',
					parentFolder: rootFolder2,
				},
				pp,
			);
			await (0, backend_test_utils_1.createWorkflow)(
				{
					name: 'workflow 2 key',
					parentFolder: rootFolder2,
				},
				pp,
			);
			await (0, backend_test_utils_1.createWorkflow)(
				{
					name: 'workflow 3 key',
					parentFolder: subfolder1,
				},
				pp,
			);
			const filter2Response = await authOwnerAgent
				.get('/workflows')
				.query(
					`filter={ "projectId": "${pp.id}", "parentFolderId": "${rootFolder2.id}", "name": "key" }&includeFolders=true`,
				);
			expect(filter2Response.body.count).toBe(4);
			expect(filter2Response.body.data).toHaveLength(4);
			expect(filter2Response.body.data.filter((w) => w.resource === 'workflow')).toHaveLength(3);
			expect(filter2Response.body.data.filter((w) => w.resource === 'folder')).toHaveLength(1);
		});
		test('should return homeProject when filtering workflows and folders by projectId', async () => {
			const workflow = await (0, backend_test_utils_1.createWorkflow)({ name: 'First' }, member);
			const pp = await (0, backend_test_utils_1.getPersonalProject)(member);
			const folder = await (0, folders_1.createFolder)(pp, {
				name: 'First Folder',
			});
			const response = await authMemberAgent
				.get('/workflows')
				.query(`filter={ "projectId": "${pp.id}" }&includeFolders=true`)
				.expect(200);
			expect(response.body.data).toHaveLength(2);
			expect(response.body.data[0].id).toBe(folder.id);
			expect(response.body.data[0].homeProject).not.toBeNull();
			expect(response.body.data[1].id).toBe(workflow.id);
			expect(response.body.data[1].homeProject).not.toBeNull();
		});
	});
	describe('sortBy', () => {
		test('should fail when trying to sort by non sortable column', async () => {
			await authOwnerAgent
				.get('/workflows')
				.query('sortBy=nonSortableColumn:asc&?includeFolders=true')
				.expect(500);
		});
		test('should sort by createdAt column', async () => {
			await (0, backend_test_utils_1.createWorkflow)({ name: 'First' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Second' }, owner);
			const pp = await (0, backend_test_utils_1.getPersonalProject)(owner);
			await (0, folders_1.createFolder)(pp, {
				name: 'First Folder',
			});
			await (0, folders_1.createFolder)(pp, {
				name: 'Z Folder',
			});
			let response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=createdAt:asc&includeFolders=true')
				.expect(200);
			expect(response.body).toEqual({
				count: 4,
				data: arrayContaining([
					expect.objectContaining({ name: 'First Folder' }),
					expect.objectContaining({ name: 'Z Folder' }),
					expect.objectContaining({ name: 'First' }),
					expect.objectContaining({ name: 'Second' }),
				]),
			});
			response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=createdAt:asc&includeFolders=true')
				.expect(200);
			expect(response.body).toEqual({
				count: 4,
				data: arrayContaining([
					expect.objectContaining({ name: 'Z Folder' }),
					expect.objectContaining({ name: 'First Folder' }),
					expect.objectContaining({ name: 'Second' }),
					expect.objectContaining({ name: 'First' }),
				]),
			});
		});
		test('should sort by name column', async () => {
			await (0, backend_test_utils_1.createWorkflow)({ name: 'a' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'b' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'My workflow' }, owner);
			const pp = await (0, backend_test_utils_1.getPersonalProject)(owner);
			await (0, folders_1.createFolder)(pp, {
				name: 'a Folder',
			});
			await (0, folders_1.createFolder)(pp, {
				name: 'Z Folder',
			});
			let response;
			response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=name:asc&includeFolders=true')
				.expect(200);
			expect(response.body).toEqual({
				count: 5,
				data: [
					expect.objectContaining({ name: 'a Folder' }),
					expect.objectContaining({ name: 'Z Folder' }),
					expect.objectContaining({ name: 'a' }),
					expect.objectContaining({ name: 'b' }),
					expect.objectContaining({ name: 'My workflow' }),
				],
			});
			response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=name:desc&includeFolders=true')
				.expect(200);
			expect(response.body).toEqual({
				count: 5,
				data: [
					expect.objectContaining({ name: 'Z Folder' }),
					expect.objectContaining({ name: 'a Folder' }),
					expect.objectContaining({ name: 'My workflow' }),
					expect.objectContaining({ name: 'b' }),
					expect.objectContaining({ name: 'a' }),
				],
			});
		});
		test('should sort by updatedAt column', async () => {
			const baseDate = luxon_1.DateTime.now();
			const pp = await (0, backend_test_utils_1.getPersonalProject)(owner);
			await (0, folders_1.createFolder)(pp, {
				name: 'Folder',
			});
			await (0, folders_1.createFolder)(pp, {
				name: 'Z Folder',
			});
			await (0, backend_test_utils_1.createWorkflow)(
				{ name: 'Second', updatedAt: baseDate.plus({ minutes: 1 }).toJSDate() },
				owner,
			);
			await (0, backend_test_utils_1.createWorkflow)(
				{ name: 'First', updatedAt: baseDate.plus({ minutes: 2 }).toJSDate() },
				owner,
			);
			let response;
			response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=updatedAt:asc&includeFolders=true')
				.expect(200);
			expect(response.body).toEqual({
				count: 4,
				data: arrayContaining([
					expect.objectContaining({ name: 'Folder' }),
					expect.objectContaining({ name: 'Z Folder' }),
					expect.objectContaining({ name: 'Second' }),
					expect.objectContaining({ name: 'First' }),
				]),
			});
			response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=updatedAt:desc&includeFolders=true')
				.expect(200);
			expect(response.body).toEqual({
				count: 4,
				data: arrayContaining([
					expect.objectContaining({ name: 'Z Folder' }),
					expect.objectContaining({ name: 'Folder' }),
					expect.objectContaining({ name: 'First' }),
					expect.objectContaining({ name: 'Second' }),
				]),
			});
		});
	});
	describe('pagination', () => {
		beforeEach(async () => {
			const pp = await (0, backend_test_utils_1.getPersonalProject)(owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Workflow 1' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Workflow 2' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Workflow 3' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Workflow 4' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Workflow 5' }, owner);
			await (0, folders_1.createFolder)(pp, {
				name: 'Folder 1',
			});
		});
		test('should fail when skip is provided without take', async () => {
			await authOwnerAgent.get('/workflows?includeFolders=true').query('skip=2').expect(500);
		});
		test('should handle skip with take parameter', async () => {
			const response = await authOwnerAgent
				.get('/workflows')
				.query('skip=2&take=4&includeFolders=true');
			expect(response.body.data).toHaveLength(4);
			expect(response.body.count).toBe(6);
			expect(response.body.data[0].name).toBe('Workflow 2');
			expect(response.body.data[1].name).toBe('Workflow 3');
			expect(response.body.data[2].name).toBe('Workflow 4');
			expect(response.body.data[3].name).toBe('Workflow 5');
		});
		test('should handle pagination with sorting', async () => {
			const response = await authOwnerAgent
				.get('/workflows')
				.query('skip=1&take=2&sortBy=name:desc&includeFolders=true');
			expect(response.body.data).toHaveLength(2);
			expect(response.body.count).toBe(6);
			expect(response.body.data[0].name).toBe('Workflow 5');
			expect(response.body.data[1].name).toBe('Workflow 4');
		});
		test('should handle pagination with filtering', async () => {
			const pp = await (0, backend_test_utils_1.getPersonalProject)(owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Special Workflow 1' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Special Workflow 2' }, owner);
			await (0, backend_test_utils_1.createWorkflow)({ name: 'Special Workflow 3' }, owner);
			await (0, folders_1.createFolder)(pp, {
				name: 'Special Folder 1',
			});
			const response = await authOwnerAgent
				.get('/workflows')
				.query('take=2&skip=1')
				.query('filter={"name":"Special"}&includeFolders=true')
				.expect(200);
			expect(response.body.data).toHaveLength(2);
			expect(response.body.count).toBe(4);
			expect(response.body.data[0].name).toBe('Special Workflow 1');
			expect(response.body.data[1].name).toBe('Special Workflow 2');
		});
		test('should return empty array when pagination exceeds total count', async () => {
			const response = await authOwnerAgent
				.get('/workflows')
				.query('take=2&skip=10&includeFolders=true')
				.expect(200);
			expect(response.body.data).toHaveLength(0);
			expect(response.body.count).toBe(6);
		});
		test('should return all results when no pagination parameters are provided', async () => {
			const response = await authOwnerAgent
				.get('/workflows')
				.query('includeFolders=true')
				.expect(200);
			expect(response.body.data).toHaveLength(6);
			expect(response.body.count).toBe(6);
		});
	});
});
describe('PATCH /workflows/:workflowId', () => {
	test('should create workflow history version when licensed', async () => {
		license.enable('feat:workflowHistory');
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const payload = {
			name: 'name updated',
			versionId: workflow.versionId,
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Cron',
					type: 'n8n-nodes-base.cron',
					typeVersion: 1,
					position: [400, 300],
				},
			],
			connections: {},
			staticData: '{"id":1}',
			settings: {
				saveExecutionProgress: false,
				saveManualExecutions: false,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
		};
		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);
		const {
			data: { id },
		} = response.body;
		expect(response.statusCode).toBe(200);
		expect(id).toBe(workflow.id);
		expect(
			await di_1.Container.get(db_1.WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(1);
		const historyVersion = await di_1.Container.get(db_1.WorkflowHistoryRepository).findOne({
			where: {
				workflowId: id,
			},
		});
		expect(historyVersion).not.toBeNull();
		expect(historyVersion.connections).toEqual(payload.connections);
		expect(historyVersion.nodes).toEqual(payload.nodes);
	});
	test('should not create workflow history version when not licensed', async () => {
		license.disable('feat:workflowHistory');
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const payload = {
			name: 'name updated',
			versionId: workflow.versionId,
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Cron',
					type: 'n8n-nodes-base.cron',
					typeVersion: 1,
					position: [400, 300],
				},
			],
			connections: {},
			staticData: '{"id":1}',
			settings: {
				saveExecutionProgress: false,
				saveManualExecutions: false,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
		};
		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);
		const {
			data: { id },
		} = response.body;
		expect(response.statusCode).toBe(200);
		expect(id).toBe(workflow.id);
		expect(
			await di_1.Container.get(db_1.WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(0);
	});
	test('should activate workflow without changing version ID', async () => {
		license.disable('feat:workflowHistory');
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const payload = {
			versionId: workflow.versionId,
			active: true,
		};
		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);
		expect(response.statusCode).toBe(200);
		expect(activeWorkflowManagerLike.add).toBeCalled();
		const {
			data: { id, versionId, active },
		} = response.body;
		expect(id).toBe(workflow.id);
		expect(versionId).toBe(workflow.versionId);
		expect(active).toBe(true);
	});
	test('should deactivate workflow without changing version ID', async () => {
		license.disable('feat:workflowHistory');
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ active: true }, owner);
		const payload = {
			versionId: workflow.versionId,
			active: false,
		};
		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);
		expect(response.statusCode).toBe(200);
		expect(activeWorkflowManagerLike.add).not.toBeCalled();
		expect(activeWorkflowManagerLike.remove).toBeCalled();
		const {
			data: { id, versionId, active },
		} = response.body;
		expect(id).toBe(workflow.id);
		expect(versionId).toBe(workflow.versionId);
		expect(active).toBe(false);
	});
	test('should update workflow meta', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const payload = {
			...workflow,
			meta: {
				templateCredsSetupCompleted: true,
			},
		};
		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);
		const { data: updatedWorkflow } = response.body;
		expect(response.statusCode).toBe(200);
		expect(updatedWorkflow.id).toBe(workflow.id);
		expect(updatedWorkflow.meta).toEqual(payload.meta);
	});
	test('should move workflow to folder', async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder1 = await (0, folders_1.createFolder)(ownerPersonalProject, { name: 'folder1' });
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const payload = {
			versionId: workflow.versionId,
			parentFolderId: folder1.id,
		};
		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);
		expect(response.statusCode).toBe(200);
		const updatedWorkflow = await di_1.Container.get(db_1.WorkflowRepository).findOneOrFail({
			where: { id: workflow.id },
			relations: ['parentFolder'],
		});
		expect(updatedWorkflow.parentFolder?.id).toBe(folder1.id);
	});
	test('should move workflow to project root', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const payload = {
			versionId: workflow.versionId,
			parentFolderId: n8n_workflow_1.PROJECT_ROOT,
		};
		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);
		expect(response.statusCode).toBe(200);
		const updatedWorkflow = await di_1.Container.get(db_1.WorkflowRepository).findOneOrFail({
			where: { id: workflow.id },
			relations: ['parentFolder'],
		});
		expect(updatedWorkflow.parentFolder).toBe(null);
	});
	test('should fail if trying update workflow parent folder with a folder that does not belong to project', async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member.id,
		);
		await (0, folders_1.createFolder)(ownerPersonalProject, { name: 'folder1' });
		const folder2 = await (0, folders_1.createFolder)(memberPersonalProject, { name: 'folder2' });
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const payload = {
			versionId: workflow.versionId,
			parentFolderId: folder2.id,
		};
		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);
		expect(response.statusCode).toBe(500);
	});
});
describe('POST /workflows/:workflowId/run', () => {
	let sharingSpy;
	let tamperingSpy;
	let workflow;
	beforeAll(() => {
		const enterpriseWorkflowService = di_1.Container.get(
			workflow_service_ee_1.EnterpriseWorkflowService,
		);
		const workflowRepository = di_1.Container.get(db_1.WorkflowRepository);
		sharingSpy = jest.spyOn(license_1.License.prototype, 'isSharingEnabled');
		tamperingSpy = jest.spyOn(enterpriseWorkflowService, 'preventTampering');
		workflow = workflowRepository.create({ id: (0, uuid_1.v4)() });
	});
	test('should prevent tampering if sharing is enabled', async () => {
		sharingSpy.mockReturnValue(true);
		await authOwnerAgent.post(`/workflows/${workflow.id}/run`).send({ workflowData: workflow });
		expect(tamperingSpy).toHaveBeenCalledTimes(1);
	});
	test('should skip tampering prevention if sharing is disabled', async () => {
		sharingSpy.mockReturnValue(false);
		await authOwnerAgent.post(`/workflows/${workflow.id}/run`).send({ workflowData: workflow });
		expect(tamperingSpy).not.toHaveBeenCalled();
	});
});
describe('POST /workflows/:workflowId/archive', () => {
	test('should archive workflow', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/archive`)
			.send()
			.expect(200);
		const {
			data: { isArchived, versionId },
		} = response.body;
		expect(isArchived).toBe(true);
		expect(versionId).not.toBe(workflow.versionId);
		const updatedWorkflow = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		expect(updatedWorkflow).not.toBeNull();
		expect(updatedWorkflow.isArchived).toBe(true);
	});
	test('should deactivate active workflow on archive', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ active: true }, owner);
		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/archive`)
			.send()
			.expect(200);
		const {
			data: { isArchived, versionId, active },
		} = response.body;
		expect(isArchived).toBe(true);
		expect(active).toBe(false);
		expect(versionId).not.toBe(workflow.versionId);
		expect(activeWorkflowManagerLike.remove).toBeCalledWith(workflow.id);
		const updatedWorkflow = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		expect(updatedWorkflow).not.toBeNull();
		expect(updatedWorkflow.isArchived).toBe(true);
	});
	test('should not archive workflow that is already archived', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ isArchived: true }, owner);
		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/archive`)
			.send()
			.expect(400);
		expect(response.body.message).toBe('Workflow is already archived.');
		const updatedWorkflow = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		expect(updatedWorkflow).not.toBeNull();
		expect(updatedWorkflow.isArchived).toBe(true);
	});
	test('should not archive missing workflow', async () => {
		const response = await authOwnerAgent.post('/workflows/404/archive').send().expect(403);
		expect(response.body.message).toBe(
			'Could not archive the workflow - workflow was not found in your projects',
		);
	});
	test('should not archive a workflow that is not owned by the user', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ isArchived: false }, member);
		await testServer
			.authAgentFor(anotherMember)
			.post(`/workflows/${workflow.id}/archive`)
			.send()
			.expect(403);
		const workflowsInDb = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		const sharedWorkflowsInDb = await di_1.Container.get(db_1.SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});
		expect(workflowsInDb).not.toBeNull();
		expect(workflowsInDb.isArchived).toBe(false);
		expect(sharedWorkflowsInDb).toHaveLength(1);
	});
	test("should allow the owner to archive workflows they don't own", async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ isArchived: false }, member);
		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/archive`)
			.send()
			.expect(200);
		const {
			data: { isArchived, versionId },
		} = response.body;
		expect(isArchived).toBe(true);
		expect(versionId).not.toBe(workflow.versionId);
		const workflowsInDb = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		const sharedWorkflowsInDb = await di_1.Container.get(db_1.SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});
		expect(workflowsInDb).not.toBeNull();
		expect(workflowsInDb.isArchived).toBe(true);
		expect(sharedWorkflowsInDb).toHaveLength(1);
	});
});
describe('POST /workflows/:workflowId/unarchive', () => {
	test('should unarchive workflow', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ isArchived: true }, owner);
		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/unarchive`)
			.send()
			.expect(200);
		const {
			data: { isArchived, versionId },
		} = response.body;
		expect(isArchived).toBe(false);
		expect(versionId).not.toBe(workflow.versionId);
		const updatedWorkflow = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		expect(updatedWorkflow).not.toBeNull();
		expect(updatedWorkflow.isArchived).toBe(false);
	});
	test('should not unarchive workflow that is already not archived', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ isArchived: false }, owner);
		await authOwnerAgent.post(`/workflows/${workflow.id}/unarchive`).send().expect(400);
		const updatedWorkflow = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		expect(updatedWorkflow).not.toBeNull();
		expect(updatedWorkflow.isArchived).toBe(false);
	});
	test('should not unarchive missing workflow', async () => {
		const response = await authOwnerAgent.post('/workflows/404/unarchive').send().expect(403);
		expect(response.body.message).toBe(
			'Could not unarchive the workflow - workflow was not found in your projects',
		);
	});
	test('should not unarchive a workflow that is not owned by the user', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ isArchived: true }, member);
		await testServer
			.authAgentFor(anotherMember)
			.post(`/workflows/${workflow.id}/unarchive`)
			.send()
			.expect(403);
		const workflowsInDb = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		const sharedWorkflowsInDb = await di_1.Container.get(db_1.SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});
		expect(workflowsInDb).not.toBeNull();
		expect(workflowsInDb.isArchived).toBe(true);
		expect(sharedWorkflowsInDb).toHaveLength(1);
	});
	test("should allow the owner to unarchive workflows they don't own", async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ isArchived: true }, member);
		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/unarchive`)
			.send()
			.expect(200);
		const {
			data: { isArchived, versionId },
		} = response.body;
		expect(isArchived).toBe(false);
		expect(versionId).not.toBe(workflow.versionId);
		const workflowsInDb = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		const sharedWorkflowsInDb = await di_1.Container.get(db_1.SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});
		expect(workflowsInDb).not.toBeNull();
		expect(workflowsInDb.isArchived).toBe(false);
		expect(sharedWorkflowsInDb).toHaveLength(1);
	});
});
describe('DELETE /workflows/:workflowId', () => {
	test('deletes an archived workflow owned by the user', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ isArchived: true }, owner);
		await authOwnerAgent.delete(`/workflows/${workflow.id}`).send().expect(200);
		const workflowInDb = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		const sharedWorkflowsInDb = await di_1.Container.get(db_1.SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});
		expect(workflowInDb).toBeNull();
		expect(sharedWorkflowsInDb).toHaveLength(0);
	});
	test('should not delete missing workflow', async () => {
		const response = await authOwnerAgent.delete('/workflows/404').send().expect(403);
		expect(response.body.message).toBe(
			'Could not delete the workflow - workflow was not found in your projects',
		);
	});
	test('deletes an archived workflow owned by the user, even if the user is just a member', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ isArchived: true }, member);
		await testServer.authAgentFor(member).delete(`/workflows/${workflow.id}`).send().expect(200);
		const workflowInDb = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		const sharedWorkflowsInDb = await di_1.Container.get(db_1.SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});
		expect(workflowInDb).toBeNull();
		expect(sharedWorkflowsInDb).toHaveLength(0);
	});
	test('does not delete a workflow that is not archived', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const response = await authOwnerAgent.delete(`/workflows/${workflow.id}`).send().expect(400);
		expect(response.body.message).toBe('Workflow must be archived before it can be deleted.');
		const workflowInDb = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		const sharedWorkflowsInDb = await di_1.Container.get(db_1.SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});
		expect(workflowInDb).not.toBeNull();
		expect(sharedWorkflowsInDb).toHaveLength(1);
	});
	test('does not delete an archived workflow that is not owned by the user', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ isArchived: true }, member);
		await testServer
			.authAgentFor(anotherMember)
			.delete(`/workflows/${workflow.id}`)
			.send()
			.expect(403);
		const workflowsInDb = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		const sharedWorkflowsInDb = await di_1.Container.get(db_1.SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});
		expect(workflowsInDb).not.toBeNull();
		expect(sharedWorkflowsInDb).toHaveLength(1);
	});
	test("allows the owner to delete archived workflows they don't own", async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ isArchived: true }, member);
		await authOwnerAgent.delete(`/workflows/${workflow.id}`).send().expect(200);
		const workflowsInDb = await di_1.Container.get(db_1.WorkflowRepository).findById(workflow.id);
		const sharedWorkflowsInDb = await di_1.Container.get(db_1.SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});
		expect(workflowsInDb).toBeNull();
		expect(sharedWorkflowsInDb).toHaveLength(0);
	});
});
//# sourceMappingURL=workflows.controller.test.js.map
