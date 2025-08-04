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
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const constants_1 = require('@/constants');
const execution_service_1 = require('@/executions/execution.service');
const project_service_ee_1 = require('@/services/project.service.ee');
const telemetry_1 = require('@/telemetry');
const tags_1 = require('../shared/db/tags');
const users_1 = require('../shared/db/users');
const utils = __importStar(require('../shared/utils/'));
(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
let owner;
let ownerPersonalProject;
let member;
let memberPersonalProject;
let authOwnerAgent;
let authMemberAgent;
let activeWorkflowManager;
const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });
const license = testServer.license;
const globalConfig = di_1.Container.get(config_1.GlobalConfig);
(0, backend_test_utils_1.mockInstance)(execution_service_1.ExecutionService);
beforeAll(async () => {
	owner = await (0, users_1.createOwnerWithApiKey)();
	di_1.Container.get(n8n_core_1.InstanceSettings).markAsLeader();
	ownerPersonalProject = await di_1.Container.get(
		db_1.ProjectRepository,
	).getPersonalProjectForUserOrFail(owner.id);
	member = await (0, users_1.createMemberWithApiKey)();
	memberPersonalProject = await di_1.Container.get(
		db_1.ProjectRepository,
	).getPersonalProjectForUserOrFail(member.id);
	await utils.initNodeTypes();
	activeWorkflowManager = di_1.Container.get(active_workflow_manager_1.ActiveWorkflowManager);
	await activeWorkflowManager.init();
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate([
		'SharedCredentials',
		'SharedWorkflow',
		'TagEntity',
		'WorkflowEntity',
		'CredentialsEntity',
		'WorkflowHistory',
	]);
	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
	globalConfig.tags.disabled = false;
});
afterEach(async () => {
	await activeWorkflowManager?.removeAll();
});
const testWithAPIKey = (method, url, apiKey) => async () => {
	void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
	const response = await authOwnerAgent[method](url);
	expect(response.statusCode).toBe(401);
};
describe('GET /workflows', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/workflows', null));
	test('should fail due to invalid API Key', testWithAPIKey('get', '/workflows', 'abcXYZ'));
	test('should return all owned workflows', async () => {
		await Promise.all([
			(0, backend_test_utils_1.createWorkflow)({}, member),
			(0, backend_test_utils_1.createWorkflow)({}, member),
			(0, backend_test_utils_1.createWorkflow)({}, member),
		]);
		const response = await authMemberAgent.get('/workflows');
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(3);
		expect(response.body.nextCursor).toBeNull();
		for (const workflow of response.body.data) {
			const {
				id,
				connections,
				active,
				staticData,
				nodes,
				settings,
				name,
				createdAt,
				updatedAt,
				tags,
			} = workflow;
			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(connections).toBeDefined();
			expect(active).toBe(false);
			expect(staticData).toBeDefined();
			expect(nodes).toBeDefined();
			expect(tags).toBeDefined();
			expect(settings).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
		}
	});
	test('should return all owned workflows with pagination', async () => {
		await Promise.all([
			(0, backend_test_utils_1.createWorkflow)({}, member),
			(0, backend_test_utils_1.createWorkflow)({}, member),
			(0, backend_test_utils_1.createWorkflow)({}, member),
		]);
		const response = await authMemberAgent.get('/workflows?limit=1');
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1);
		expect(response.body.nextCursor).not.toBeNull();
		const response2 = await authMemberAgent.get(
			`/workflows?limit=1&cursor=${response.body.nextCursor}`,
		);
		expect(response2.statusCode).toBe(200);
		expect(response2.body.data.length).toBe(1);
		expect(response2.body.nextCursor).not.toBeNull();
		expect(response2.body.nextCursor).not.toBe(response.body.nextCursor);
		const responses = [...response.body.data, ...response2.body.data];
		for (const workflow of responses) {
			const {
				id,
				connections,
				active,
				staticData,
				nodes,
				settings,
				name,
				createdAt,
				updatedAt,
				tags,
			} = workflow;
			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(connections).toBeDefined();
			expect(active).toBe(false);
			expect(staticData).toBeDefined();
			expect(nodes).toBeDefined();
			expect(tags).toBeDefined();
			expect(settings).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
		}
		expect(response.body.data[0].id).not.toEqual(response2.body.data[0].id);
	});
	test('should return all owned workflows filtered by tag', async () => {
		const tag = await (0, tags_1.createTag)({});
		const [workflow] = await Promise.all([
			(0, backend_test_utils_1.createWorkflow)({ tags: [tag] }, member),
			(0, backend_test_utils_1.createWorkflow)({}, member),
		]);
		const response = await authMemberAgent.get(`/workflows?tags=${tag.name}`);
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1);
		const {
			id,
			connections,
			active,
			staticData,
			nodes,
			settings,
			name,
			createdAt,
			updatedAt,
			tags: wfTags,
		} = response.body.data[0];
		expect(id).toBe(workflow.id);
		expect(name).toBeDefined();
		expect(connections).toBeDefined();
		expect(active).toBe(false);
		expect(staticData).toBeDefined();
		expect(nodes).toBeDefined();
		expect(settings).toBeDefined();
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();
		expect(wfTags.length).toBe(1);
		expect(wfTags[0].id).toBe(tag.id);
	});
	test('should return all owned workflows filtered by tags', async () => {
		const tags = await Promise.all([
			await (0, tags_1.createTag)({}),
			await (0, tags_1.createTag)({}),
		]);
		const tagNames = tags.map((tag) => tag.name).join(',');
		const [workflow1, workflow2] = await Promise.all([
			(0, backend_test_utils_1.createWorkflow)({ tags }, member),
			(0, backend_test_utils_1.createWorkflow)({ tags }, member),
			(0, backend_test_utils_1.createWorkflow)({}, member),
			(0, backend_test_utils_1.createWorkflow)({ tags: [tags[0]] }, member),
			(0, backend_test_utils_1.createWorkflow)({ tags: [tags[1]] }, member),
		]);
		const response = await authMemberAgent.get(`/workflows?tags=${tagNames}`);
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(2);
		for (const workflow of response.body.data) {
			const { id, connections, active, staticData, nodes, settings, name, createdAt, updatedAt } =
				workflow;
			expect(id).toBeDefined();
			expect([workflow1.id, workflow2.id].includes(id)).toBe(true);
			expect(name).toBeDefined();
			expect(connections).toBeDefined();
			expect(active).toBe(false);
			expect(staticData).toBeDefined();
			expect(nodes).toBeDefined();
			expect(settings).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
			expect(workflow.tags.length).toBe(2);
			workflow.tags.forEach((tag) => {
				expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
			});
		}
	});
	test('for owner, should return all workflows filtered by `projectId`', async () => {
		license.setQuota('quota:maxTeamProjects', -1);
		const firstProject = await di_1.Container.get(
			project_service_ee_1.ProjectService,
		).createTeamProject(owner, {
			name: 'First',
		});
		const secondProject = await di_1.Container.get(
			project_service_ee_1.ProjectService,
		).createTeamProject(member, {
			name: 'Second',
		});
		await Promise.all([
			(0, backend_test_utils_1.createWorkflow)({ name: 'First workflow' }, firstProject),
			(0, backend_test_utils_1.createWorkflow)({ name: 'Second workflow' }, secondProject),
		]);
		const firstResponse = await authOwnerAgent.get(`/workflows?projectId=${firstProject.id}`);
		const secondResponse = await authOwnerAgent.get(`/workflows?projectId=${secondProject.id}`);
		expect(firstResponse.statusCode).toBe(200);
		expect(firstResponse.body.data.length).toBe(1);
		expect(firstResponse.body.data[0].name).toBe('First workflow');
		expect(secondResponse.statusCode).toBe(200);
		expect(secondResponse.body.data.length).toBe(1);
		expect(secondResponse.body.data[0].name).toBe('Second workflow');
	});
	test('for member, should return all member-accessible workflows filtered by `projectId`', async () => {
		license.setQuota('quota:maxTeamProjects', -1);
		const otherProject = await di_1.Container.get(
			project_service_ee_1.ProjectService,
		).createTeamProject(member, {
			name: 'Other project',
		});
		await Promise.all([
			(0, backend_test_utils_1.createWorkflow)({}, member),
			(0, backend_test_utils_1.createWorkflow)({ name: 'Other workflow' }, otherProject),
		]);
		const response = await authMemberAgent.get(`/workflows?projectId=${otherProject.id}`);
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1);
		expect(response.body.data[0].name).toBe('Other workflow');
	});
	test('should return all owned workflows filtered by name', async () => {
		const workflowName = 'Workflow 1';
		await Promise.all([
			(0, backend_test_utils_1.createWorkflow)({ name: workflowName }, member),
			(0, backend_test_utils_1.createWorkflow)({}, member),
		]);
		const response = await authMemberAgent.get(`/workflows?name=${workflowName}`);
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1);
		const {
			id,
			connections,
			active,
			staticData,
			nodes,
			settings,
			name,
			createdAt,
			updatedAt,
			tags,
		} = response.body.data[0];
		expect(id).toBeDefined();
		expect(name).toBe(workflowName);
		expect(connections).toBeDefined();
		expect(active).toBe(false);
		expect(staticData).toBeDefined();
		expect(nodes).toBeDefined();
		expect(settings).toBeDefined();
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();
		expect(tags).toEqual([]);
	});
	test('should return all workflows for owner', async () => {
		await Promise.all([
			(0, backend_test_utils_1.createWorkflow)({}, owner),
			(0, backend_test_utils_1.createWorkflow)({}, member),
			(0, backend_test_utils_1.createWorkflow)({}, owner),
			(0, backend_test_utils_1.createWorkflow)({}, member),
			(0, backend_test_utils_1.createWorkflow)({}, owner),
		]);
		const response = await authOwnerAgent.get('/workflows');
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(5);
		expect(response.body.nextCursor).toBeNull();
		for (const workflow of response.body.data) {
			const {
				id,
				connections,
				active,
				staticData,
				nodes,
				settings,
				name,
				createdAt,
				updatedAt,
				tags,
			} = workflow;
			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(connections).toBeDefined();
			expect(active).toBe(false);
			expect(staticData).toBeDefined();
			expect(nodes).toBeDefined();
			expect(tags).toBeDefined();
			expect(settings).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
		}
	});
	test('should return all owned workflows without pinned data', async () => {
		await Promise.all([
			(0, backend_test_utils_1.createWorkflow)(
				{
					pinData: {
						Webhook1: [{ json: { first: 'first' } }],
					},
				},
				member,
			),
			(0, backend_test_utils_1.createWorkflow)(
				{
					pinData: {
						Webhook2: [{ json: { second: 'second' } }],
					},
				},
				member,
			),
			(0, backend_test_utils_1.createWorkflow)(
				{
					pinData: {
						Webhook3: [{ json: { third: 'third' } }],
					},
				},
				member,
			),
		]);
		const response = await authMemberAgent.get('/workflows?excludePinnedData=true');
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(3);
		expect(response.body.nextCursor).toBeNull();
		for (const workflow of response.body.data) {
			const { pinData } = workflow;
			expect(pinData).not.toBeDefined();
		}
	});
});
describe('GET /workflows/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/workflows/2', null));
	test('should fail due to invalid API Key', testWithAPIKey('get', '/workflows/2', 'abcXYZ'));
	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.get('/workflows/2');
		expect(response.statusCode).toBe(404);
	});
	test('should retrieve workflow', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const response = await authMemberAgent.get(`/workflows/${workflow.id}`);
		expect(response.statusCode).toBe(200);
		const {
			id,
			connections,
			active,
			staticData,
			nodes,
			settings,
			name,
			createdAt,
			updatedAt,
			tags,
		} = response.body;
		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(false);
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(tags).toEqual([]);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toEqual(workflow.createdAt.toISOString());
		expect(updatedAt).toEqual(workflow.updatedAt.toISOString());
	});
	test('should retrieve non-owned workflow for owner', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`);
		expect(response.statusCode).toBe(200);
		const { id, connections, active, staticData, nodes, settings, name, createdAt, updatedAt } =
			response.body;
		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(false);
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toEqual(workflow.createdAt.toISOString());
		expect(updatedAt).toEqual(workflow.updatedAt.toISOString());
	});
	test('should retrieve workflow without pinned data', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)(
			{
				pinData: {
					Webhook1: [{ json: { first: 'first' } }],
				},
			},
			member,
		);
		const response = await authMemberAgent.get(`/workflows/${workflow.id}?excludePinnedData=true`);
		expect(response.statusCode).toBe(200);
		const { pinData } = response.body;
		expect(pinData).not.toBeDefined();
	});
});
describe('DELETE /workflows/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('delete', '/workflows/2', null));
	test('should fail due to invalid API Key', testWithAPIKey('delete', '/workflows/2', 'abcXYZ'));
	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.delete('/workflows/2');
		expect(response.statusCode).toBe(404);
	});
	test('should delete the workflow', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const response = await authMemberAgent.delete(`/workflows/${workflow.id}`);
		expect(response.statusCode).toBe(200);
		const { id, connections, active, staticData, nodes, settings, name, createdAt, updatedAt } =
			response.body;
		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(false);
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toEqual(workflow.createdAt.toISOString());
		expect(updatedAt).toEqual(workflow.updatedAt.toISOString());
		const sharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOneBy({
			workflowId: workflow.id,
		});
		expect(sharedWorkflow).toBeNull();
	});
	test('should delete non-owned workflow when owner', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const response = await authMemberAgent.delete(`/workflows/${workflow.id}`);
		expect(response.statusCode).toBe(200);
		const { id, connections, active, staticData, nodes, settings, name, createdAt, updatedAt } =
			response.body;
		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(false);
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toEqual(workflow.createdAt.toISOString());
		expect(updatedAt).toEqual(workflow.updatedAt.toISOString());
		const sharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOneBy({
			workflowId: workflow.id,
		});
		expect(sharedWorkflow).toBeNull();
	});
});
describe('POST /workflows/:id/activate', () => {
	test('should fail due to missing API Key', testWithAPIKey('post', '/workflows/2/activate', null));
	test(
		'should fail due to invalid API Key',
		testWithAPIKey('post', '/workflows/2/activate', 'abcXYZ'),
	);
	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.post('/workflows/2/activate');
		expect(response.statusCode).toBe(404);
	});
	test('should fail due to trying to activate a workflow without any nodes', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ nodes: [] }, owner);
		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/activate`);
		expect(response.statusCode).toBe(400);
	});
	test('should fail due to trying to activate a workflow without a trigger', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)(
			{
				nodes: [
					{
						id: 'uuid-1234',
						name: 'Start',
						parameters: {},
						position: [-20, 260],
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
					},
				],
			},
			owner,
		);
		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/activate`);
		expect(response.statusCode).toBe(400);
	});
	test('should set workflow as active', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflowWithTrigger)({}, member);
		const response = await authMemberAgent.post(`/workflows/${workflow.id}/activate`);
		expect(response.statusCode).toBe(200);
		const { id, connections, active, staticData, nodes, settings, name, createdAt, updatedAt } =
			response.body;
		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(true);
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toEqual(workflow.createdAt.toISOString());
		expect(updatedAt).toEqual(workflow.updatedAt.toISOString());
		const sharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});
		expect(sharedWorkflow?.workflow.active).toBe(true);
		expect(await activeWorkflowManager.isActive(workflow.id)).toBe(true);
	});
	test('should set non-owned workflow as active when owner', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflowWithTrigger)({}, member);
		const response = await authMemberAgent.post(`/workflows/${workflow.id}/activate`).expect(200);
		const { id, connections, active, staticData, nodes, settings, name, createdAt, updatedAt } =
			response.body;
		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(true);
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toEqual(workflow.createdAt.toISOString());
		expect(updatedAt).toEqual(workflow.updatedAt.toISOString());
		const sharedOwnerWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: ownerPersonalProject.id,
				workflowId: workflow.id,
			},
		});
		expect(sharedOwnerWorkflow).toBeNull();
		const sharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});
		expect(sharedWorkflow?.workflow.active).toBe(true);
		expect(await activeWorkflowManager.isActive(workflow.id)).toBe(true);
	});
});
describe('POST /workflows/:id/deactivate', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('post', '/workflows/2/deactivate', null),
	);
	test(
		'should fail due to invalid API Key',
		testWithAPIKey('post', '/workflows/2/deactivate', 'abcXYZ'),
	);
	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.post('/workflows/2/deactivate');
		expect(response.statusCode).toBe(404);
	});
	test('should deactivate workflow', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflowWithTrigger)({}, member);
		await authMemberAgent.post(`/workflows/${workflow.id}/activate`);
		const workflowDeactivationResponse = await authMemberAgent.post(
			`/workflows/${workflow.id}/deactivate`,
		);
		const { id, connections, active, staticData, nodes, settings, name, createdAt, updatedAt } =
			workflowDeactivationResponse.body;
		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(false);
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();
		const sharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});
		expect(sharedWorkflow?.workflow.active).toBe(false);
		expect(await activeWorkflowManager.isActive(workflow.id)).toBe(false);
	});
	test('should deactivate non-owned workflow when owner', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflowWithTrigger)({}, member);
		await authMemberAgent.post(`/workflows/${workflow.id}/activate`);
		const workflowDeactivationResponse = await authMemberAgent.post(
			`/workflows/${workflow.id}/deactivate`,
		);
		const { id, connections, active, staticData, nodes, settings, name, createdAt, updatedAt } =
			workflowDeactivationResponse.body;
		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(false);
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();
		const sharedOwnerWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: ownerPersonalProject.id,
				workflowId: workflow.id,
			},
		});
		expect(sharedOwnerWorkflow).toBeNull();
		const sharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});
		expect(sharedWorkflow?.workflow.active).toBe(false);
		expect(await activeWorkflowManager.isActive(workflow.id)).toBe(false);
	});
});
describe('POST /workflows', () => {
	test('should fail due to missing API Key', testWithAPIKey('post', '/workflows', null));
	test('should fail due to invalid API Key', testWithAPIKey('post', '/workflows', 'abcXYZ'));
	test('should fail due to invalid body', async () => {
		const response = await authOwnerAgent.post('/workflows').send({});
		expect(response.statusCode).toBe(400);
	});
	test('should create workflow', async () => {
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
				executionOrder: 'v1',
			},
		};
		const response = await authMemberAgent.post('/workflows').send(payload);
		expect(response.statusCode).toBe(200);
		const { id, name, nodes, connections, staticData, active, settings, createdAt, updatedAt } =
			response.body;
		expect(id).toBeDefined();
		expect(name).toBe(payload.name);
		expect(connections).toEqual(payload.connections);
		expect(settings).toEqual(payload.settings);
		expect(staticData).toEqual(payload.staticData);
		expect(nodes).toEqual(payload.nodes);
		expect(active).toBe(false);
		expect(createdAt).toBeDefined();
		expect(updatedAt).toEqual(createdAt);
		const sharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: response.body.id,
			},
			relations: ['workflow'],
		});
		expect(sharedWorkflow?.workflow.name).toBe(name);
		expect(sharedWorkflow?.workflow.createdAt.toISOString()).toBe(createdAt);
		expect(sharedWorkflow?.role).toEqual('workflow:owner');
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
		};
		const response = await authMemberAgent.post('/workflows').send(payload);
		expect(response.statusCode).toBe(200);
		const { id } = response.body;
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
		};
		const response = await authMemberAgent.post('/workflows').send(payload);
		expect(response.statusCode).toBe(200);
		const { id } = response.body;
		expect(id).toBeDefined();
		expect(
			await di_1.Container.get(db_1.WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(0);
	});
	test('should not add a starting node if the payload has no starting nodes', async () => {
		const response = await authMemberAgent.post('/workflows').send({
			name: 'testing',
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Hacker News',
					type: 'n8n-nodes-base.hackerNews',
					typeVersion: 1,
					position: [240, 300],
				},
			],
			connections: {},
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
		});
		const found = response.body.nodes.find((node) =>
			constants_1.STARTING_NODES.includes(node.type),
		);
		expect(found).toBeUndefined();
	});
});
describe('PUT /workflows/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('put', '/workflows/1', null));
	test('should fail due to invalid API Key', testWithAPIKey('put', '/workflows/1', 'abcXYZ'));
	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.put('/workflows/1').send({
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
		});
		expect(response.statusCode).toBe(404);
	});
	test('should fail due to invalid body', async () => {
		const response = await authOwnerAgent.put('/workflows/1').send({
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
		});
		expect(response.statusCode).toBe(400);
	});
	test('should update workflow', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const payload = {
			name: 'name updated',
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
		const response = await authMemberAgent.put(`/workflows/${workflow.id}`).send(payload);
		const { id, name, nodes, connections, staticData, active, settings, createdAt, updatedAt } =
			response.body;
		expect(response.statusCode).toBe(200);
		expect(id).toBe(workflow.id);
		expect(name).toBe(payload.name);
		expect(connections).toEqual(payload.connections);
		expect(settings).toEqual(payload.settings);
		expect(staticData).toMatchObject(JSON.parse(payload.staticData));
		expect(nodes).toEqual(payload.nodes);
		expect(active).toBe(false);
		expect(createdAt).toBe(workflow.createdAt.toISOString());
		expect(updatedAt).not.toBe(workflow.updatedAt.toISOString());
		const sharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: response.body.id,
			},
			relations: ['workflow'],
		});
		expect(sharedWorkflow?.workflow.name).toBe(payload.name);
		expect(sharedWorkflow?.workflow.updatedAt.getTime()).toBeGreaterThan(
			workflow.updatedAt.getTime(),
		);
	});
	test('should create workflow history version when licensed', async () => {
		license.enable('feat:workflowHistory');
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const payload = {
			name: 'name updated',
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
		const response = await authMemberAgent.put(`/workflows/${workflow.id}`).send(payload);
		const { id } = response.body;
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
	test('should not create workflow history when not licensed', async () => {
		license.disable('feat:workflowHistory');
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const payload = {
			name: 'name updated',
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
		const response = await authMemberAgent.put(`/workflows/${workflow.id}`).send(payload);
		const { id } = response.body;
		expect(response.statusCode).toBe(200);
		expect(id).toBe(workflow.id);
		expect(
			await di_1.Container.get(db_1.WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(0);
	});
	test('should update non-owned workflow if owner', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const payload = {
			name: 'name owner updated',
			nodes: [
				{
					id: 'uuid-1',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
				{
					id: 'uuid-2',
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
		const response = await authMemberAgent.put(`/workflows/${workflow.id}`).send(payload);
		const { id, name, nodes, connections, staticData, active, settings, createdAt, updatedAt } =
			response.body;
		expect(response.statusCode).toBe(200);
		expect(id).toBe(workflow.id);
		expect(name).toBe(payload.name);
		expect(connections).toEqual(payload.connections);
		expect(settings).toEqual(payload.settings);
		expect(staticData).toMatchObject(JSON.parse(payload.staticData));
		expect(nodes).toEqual(payload.nodes);
		expect(active).toBe(false);
		expect(createdAt).toBe(workflow.createdAt.toISOString());
		expect(updatedAt).not.toBe(workflow.updatedAt.toISOString());
		const sharedOwnerWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: ownerPersonalProject.id,
				workflowId: response.body.id,
			},
		});
		expect(sharedOwnerWorkflow).toBeNull();
		const sharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: response.body.id,
			},
			relations: ['workflow'],
		});
		expect(sharedWorkflow?.workflow.name).toBe(payload.name);
		expect(sharedWorkflow?.workflow.updatedAt.getTime()).toBeGreaterThan(
			workflow.updatedAt.getTime(),
		);
		expect(sharedWorkflow?.role).toEqual('workflow:owner');
	});
});
describe('GET /workflows/:id/tags', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/workflows/2/tags', null));
	test('should fail due to invalid API Key', testWithAPIKey('get', '/workflows/2/tags', 'abcXYZ'));
	test('should fail if N8N_WORKFLOW_TAGS_DISABLED', async () => {
		globalConfig.tags.disabled = true;
		const response = await authOwnerAgent.get('/workflows/2/tags');
		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('Workflow Tags Disabled');
	});
	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.get('/workflows/2/tags');
		expect(response.statusCode).toBe(404);
	});
	test('should return all tags of owned workflow', async () => {
		const tags = await Promise.all([
			await (0, tags_1.createTag)({}),
			await (0, tags_1.createTag)({}),
		]);
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ tags }, member);
		const response = await authMemberAgent.get(`/workflows/${workflow.id}/tags`);
		expect(response.statusCode).toBe(200);
		expect(response.body.length).toBe(2);
		for (const tag of response.body) {
			const { id, name, createdAt, updatedAt } = tag;
			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
			tags.forEach((tag) => {
				expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
			});
		}
	});
	test('should return empty array if workflow does not have tags', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const response = await authMemberAgent.get(`/workflows/${workflow.id}/tags`);
		expect(response.statusCode).toBe(200);
		expect(response.body.length).toBe(0);
	});
});
describe('PUT /workflows/:id/tags', () => {
	test('should fail due to missing API Key', testWithAPIKey('put', '/workflows/2/tags', null));
	test('should fail due to invalid API Key', testWithAPIKey('put', '/workflows/2/tags', 'abcXYZ'));
	test('should fail if N8N_WORKFLOW_TAGS_DISABLED', async () => {
		globalConfig.tags.disabled = true;
		const response = await authOwnerAgent.put('/workflows/2/tags').send([]);
		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('Workflow Tags Disabled');
	});
	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.put('/workflows/2/tags').send([]);
		expect(response.statusCode).toBe(404);
	});
	test('should add the tags, workflow have not got tags previously', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const tags = await Promise.all([
			await (0, tags_1.createTag)({}),
			await (0, tags_1.createTag)({}),
		]);
		const payload = [
			{
				id: tags[0].id,
			},
			{
				id: tags[1].id,
			},
		];
		const response = await authMemberAgent.put(`/workflows/${workflow.id}/tags`).send(payload);
		expect(response.statusCode).toBe(200);
		expect(response.body.length).toBe(2);
		for (const tag of response.body) {
			const { id, name, createdAt, updatedAt } = tag;
			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
			tags.forEach((tag) => {
				expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
			});
		}
		const sharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow.tags'],
		});
		expect(sharedWorkflow?.workflow.tags).toBeDefined();
		expect(sharedWorkflow?.workflow.tags?.length).toBe(2);
		if (sharedWorkflow?.workflow.tags !== undefined) {
			for (const tag of sharedWorkflow?.workflow.tags) {
				const { id, name, createdAt, updatedAt } = tag;
				expect(id).toBeDefined();
				expect(name).toBeDefined();
				expect(createdAt).toBeDefined();
				expect(updatedAt).toBeDefined();
				tags.forEach((tag) => {
					expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
				});
			}
		}
	});
	test('should add the tags, workflow have some tags previously', async () => {
		const tags = await Promise.all([
			await (0, tags_1.createTag)({}),
			await (0, tags_1.createTag)({}),
			await (0, tags_1.createTag)({}),
		]);
		const oldTags = [tags[0], tags[1]];
		const newTags = [tags[0], tags[2]];
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ tags: oldTags }, member);
		const oldSharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow.tags'],
		});
		expect(oldSharedWorkflow?.workflow.tags).toBeDefined();
		expect(oldSharedWorkflow?.workflow.tags?.length).toBe(2);
		if (oldSharedWorkflow?.workflow.tags !== undefined) {
			for (const tag of oldSharedWorkflow?.workflow.tags) {
				const { id, name, createdAt, updatedAt } = tag;
				expect(id).toBeDefined();
				expect(name).toBeDefined();
				expect(createdAt).toBeDefined();
				expect(updatedAt).toBeDefined();
				oldTags.forEach((tag) => {
					expect(oldTags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
				});
			}
		}
		const payload = [
			{
				id: newTags[0].id,
			},
			{
				id: newTags[1].id,
			},
		];
		const response = await authMemberAgent.put(`/workflows/${workflow.id}/tags`).send(payload);
		expect(response.statusCode).toBe(200);
		expect(response.body.length).toBe(2);
		for (const tag of response.body) {
			const { id, name, createdAt, updatedAt } = tag;
			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
			newTags.forEach((tag) => {
				expect(newTags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
			});
		}
		const sharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow.tags'],
		});
		expect(sharedWorkflow?.workflow.tags).toBeDefined();
		expect(sharedWorkflow?.workflow.tags?.length).toBe(2);
		if (sharedWorkflow?.workflow.tags !== undefined) {
			for (const tag of sharedWorkflow?.workflow.tags) {
				const { id, name, createdAt, updatedAt } = tag;
				expect(id).toBeDefined();
				expect(name).toBeDefined();
				expect(createdAt).toBeDefined();
				expect(updatedAt).toBeDefined();
				newTags.forEach((tag) => {
					expect(newTags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
				});
			}
		}
	});
	test('should fail to add the tags as one does not exist, workflow should maintain previous tags', async () => {
		const tags = await Promise.all([
			await (0, tags_1.createTag)({}),
			await (0, tags_1.createTag)({}),
		]);
		const oldTags = [tags[0], tags[1]];
		const workflow = await (0, backend_test_utils_1.createWorkflow)({ tags: oldTags }, member);
		const oldSharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow.tags'],
		});
		expect(oldSharedWorkflow?.workflow.tags).toBeDefined();
		expect(oldSharedWorkflow?.workflow.tags?.length).toBe(2);
		if (oldSharedWorkflow?.workflow.tags !== undefined) {
			for (const tag of oldSharedWorkflow?.workflow.tags) {
				const { id, name, createdAt, updatedAt } = tag;
				expect(id).toBeDefined();
				expect(name).toBeDefined();
				expect(createdAt).toBeDefined();
				expect(updatedAt).toBeDefined();
				oldTags.forEach((tag) => {
					expect(oldTags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
				});
			}
		}
		const payload = [
			{
				id: oldTags[0].id,
			},
			{
				id: 'TagDoesNotExist',
			},
		];
		const response = await authMemberAgent.put(`/workflows/${workflow.id}/tags`).send(payload);
		expect(response.statusCode).toBe(404);
		expect(response.body.message).toBe('Some tags not found');
		const sharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow.tags'],
		});
		expect(sharedWorkflow?.workflow.tags).toBeDefined();
		expect(sharedWorkflow?.workflow.tags?.length).toBe(2);
		if (sharedWorkflow?.workflow.tags !== undefined) {
			for (const tag of sharedWorkflow?.workflow.tags) {
				const { id, name, createdAt, updatedAt } = tag;
				expect(id).toBeDefined();
				expect(name).toBeDefined();
				expect(createdAt).toBeDefined();
				expect(updatedAt).toBeDefined();
				oldTags.forEach((tag) => {
					expect(oldTags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
				});
			}
		}
	});
});
describe('PUT /workflows/:id/transfer', () => {
	test('should transfer workflow to project', async () => {
		const firstProject = await (0, backend_test_utils_1.createTeamProject)('first-project', member);
		const secondProject = await (0, backend_test_utils_1.createTeamProject)(
			'second-project',
			member,
		);
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, firstProject);
		await (0, backend_test_utils_1.createTeamProject)('third-project', member);
		await (0, backend_test_utils_1.createWorkflow)({}, firstProject);
		const response = await authMemberAgent.put(`/workflows/${workflow.id}/transfer`).send({
			destinationProjectId: secondProject.id,
		});
		expect(response.statusCode).toBe(204);
		const workflowsInProjectResponse = await authMemberAgent
			.get(`/workflows?projectId=${secondProject.id}`)
			.send();
		expect(workflowsInProjectResponse.statusCode).toBe(200);
		expect(workflowsInProjectResponse.body.data[0].id).toBe(workflow.id);
	});
	test('if no destination project, should reject', async () => {
		const firstProject = await (0, backend_test_utils_1.createTeamProject)('first-project', member);
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, firstProject);
		const response = await authMemberAgent.put(`/workflows/${workflow.id}/transfer`).send({});
		expect(response.statusCode).toBe(400);
	});
});
//# sourceMappingURL=workflows.test.js.map
