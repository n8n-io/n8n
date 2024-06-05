import { Container } from 'typedi';
import type { INode } from 'n8n-workflow';

import config from '@/config';
import { STARTING_NODES } from '@/constants';
import type { TagEntity } from '@db/entities/TagEntity';
import type { User } from '@db/entities/User';
import type { Project } from '@db/entities/Project';
import { ProjectRepository } from '@db/repositories/project.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { WorkflowHistoryRepository } from '@db/repositories/workflowHistory.repository';
import { ActiveWorkflowManager } from '@/ActiveWorkflowManager';
import { ExecutionService } from '@/executions/execution.service';

import { randomApiKey } from '../shared/random';
import * as utils from '../shared/utils/';
import * as testDb from '../shared/testDb';
import { createUser } from '../shared/db/users';
import { createWorkflow, createWorkflowWithTrigger } from '../shared/db/workflows';
import { createTag } from '../shared/db/tags';
import { mockInstance } from '../../shared/mocking';
import type { SuperAgentTest } from '../shared/types';

let owner: User;
let ownerPersonalProject: Project;
let member: User;
let memberPersonalProject: Project;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let activeWorkflowManager: ActiveWorkflowManager;

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });
const license = testServer.license;

mockInstance(ExecutionService);

beforeAll(async () => {
	owner = await createUser({
		role: 'global:owner',
		apiKey: randomApiKey(),
	});
	ownerPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		owner.id,
	);

	member = await createUser({
		role: 'global:member',
		apiKey: randomApiKey(),
	});
	memberPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		member.id,
	);

	await utils.initNodeTypes();

	activeWorkflowManager = Container.get(ActiveWorkflowManager);

	await activeWorkflowManager.init();
});

beforeEach(async () => {
	await testDb.truncate([
		'SharedCredentials',
		'SharedWorkflow',
		'Tag',
		'Workflow',
		'Credentials',
		'WorkflowHistory',
	]);

	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
});

afterEach(async () => {
	await activeWorkflowManager?.removeAll();
});

const testWithAPIKey =
	(method: 'get' | 'post' | 'put' | 'delete', url: string, apiKey: string | null) => async () => {
		void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
		const response = await authOwnerAgent[method](url);
		expect(response.statusCode).toBe(401);
	};

describe('GET /workflows', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/workflows', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/workflows', 'abcXYZ'));

	test('should return all owned workflows', async () => {
		await Promise.all([
			createWorkflow({}, member),
			createWorkflow({}, member),
			createWorkflow({}, member),
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
			createWorkflow({}, member),
			createWorkflow({}, member),
			createWorkflow({}, member),
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

		// check that we really received a different result
		expect(response.body.data[0].id).not.toEqual(response2.body.data[0].id);
	});

	test('should return all owned workflows filtered by tag', async () => {
		const tag = await createTag({});

		const [workflow] = await Promise.all([
			createWorkflow({ tags: [tag] }, member),
			createWorkflow({}, member),
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
		const tags = await Promise.all([await createTag({}), await createTag({})]);
		const tagNames = tags.map((tag) => tag.name).join(',');

		const [workflow1, workflow2] = await Promise.all([
			createWorkflow({ tags }, member),
			createWorkflow({ tags }, member),
			createWorkflow({}, member),
			createWorkflow({ tags: [tags[0]] }, member),
			createWorkflow({ tags: [tags[1]] }, member),
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
			workflow.tags.forEach((tag: TagEntity) => {
				expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
			});
		}
	});

	test('should return all owned workflows filtered by name', async () => {
		const workflowName = 'Workflow 1';

		await Promise.all([createWorkflow({ name: workflowName }, member), createWorkflow({}, member)]);

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
			createWorkflow({}, owner),
			createWorkflow({}, member),
			createWorkflow({}, owner),
			createWorkflow({}, member),
			createWorkflow({}, owner),
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
});

describe('GET /workflows/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/workflows/2', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/workflows/2', 'abcXYZ'));

	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.get('/workflows/2');
		expect(response.statusCode).toBe(404);
	});

	test('should retrieve workflow', async () => {
		// create and assign workflow to owner
		const workflow = await createWorkflow({}, member);

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
		// create and assign workflow to owner
		const workflow = await createWorkflow({}, member);

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
});

describe('DELETE /workflows/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('delete', '/workflows/2', null));

	test('should fail due to invalid API Key', testWithAPIKey('delete', '/workflows/2', 'abcXYZ'));

	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.delete('/workflows/2');
		expect(response.statusCode).toBe(404);
	});

	test('should delete the workflow', async () => {
		// create and assign workflow to owner
		const workflow = await createWorkflow({}, member);

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

		// make sure the workflow actually deleted from the db
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOneBy({
			workflowId: workflow.id,
		});

		expect(sharedWorkflow).toBeNull();
	});

	test('should delete non-owned workflow when owner', async () => {
		// create and assign workflow to owner
		const workflow = await createWorkflow({}, member);

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

		// make sure the workflow actually deleted from the db
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOneBy({
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

	test('should fail due to trying to activate a workflow without a trigger', async () => {
		const workflow = await createWorkflow({}, owner);
		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/activate`);
		expect(response.statusCode).toBe(400);
	});

	test('should set workflow as active', async () => {
		const workflow = await createWorkflowWithTrigger({}, member);

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

		// check whether the workflow is on the database
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.active).toBe(true);

		// check whether the workflow is on the active workflow runner
		expect(await activeWorkflowManager.isActive(workflow.id)).toBe(true);
	});

	test('should set non-owned workflow as active when owner', async () => {
		const workflow = await createWorkflowWithTrigger({}, member);

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

		// check whether the workflow is on the database
		const sharedOwnerWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: ownerPersonalProject.id,
				workflowId: workflow.id,
			},
		});

		expect(sharedOwnerWorkflow).toBeNull();

		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.active).toBe(true);

		// check whether the workflow is on the active workflow runner
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
		const workflow = await createWorkflowWithTrigger({}, member);

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

		// get the workflow after it was deactivated
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		// check whether the workflow is deactivated in the database
		expect(sharedWorkflow?.workflow.active).toBe(false);

		expect(await activeWorkflowManager.isActive(workflow.id)).toBe(false);
	});

	test('should deactivate non-owned workflow when owner', async () => {
		const workflow = await createWorkflowWithTrigger({}, member);

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

		// check whether the workflow is deactivated in the database
		const sharedOwnerWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: ownerPersonalProject.id,
				workflowId: workflow.id,
			},
		});

		expect(sharedOwnerWorkflow).toBeNull();

		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
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

		// check if created workflow in DB
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
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
			await Container.get(WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(1);
		const historyVersion = await Container.get(WorkflowHistoryRepository).findOne({
			where: {
				workflowId: id,
			},
		});
		expect(historyVersion).not.toBeNull();
		expect(historyVersion!.connections).toEqual(payload.connections);
		expect(historyVersion!.nodes).toEqual(payload.nodes);
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
			await Container.get(WorkflowHistoryRepository).count({ where: { workflowId: id } }),
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

		const found = response.body.nodes.find((node: INode) => STARTING_NODES.includes(node.type));

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
		const workflow = await createWorkflow({}, member);
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

		// check updated workflow in DB
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
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
		const workflow = await createWorkflow({}, member);
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
			await Container.get(WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(1);
		const historyVersion = await Container.get(WorkflowHistoryRepository).findOne({
			where: {
				workflowId: id,
			},
		});
		expect(historyVersion).not.toBeNull();
		expect(historyVersion!.connections).toEqual(payload.connections);
		expect(historyVersion!.nodes).toEqual(payload.nodes);
	});

	test('should not create workflow history when not licensed', async () => {
		license.disable('feat:workflowHistory');
		const workflow = await createWorkflow({}, member);
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
			await Container.get(WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(0);
	});

	test('should update non-owned workflow if owner', async () => {
		const workflow = await createWorkflow({}, member);

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

		// check updated workflow in DB
		const sharedOwnerWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: ownerPersonalProject.id,
				workflowId: response.body.id,
			},
		});

		expect(sharedOwnerWorkflow).toBeNull();

		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
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

	test('should fail if workflowTagsDisabled', async () => {
		config.set('workflowTagsDisabled', true);

		const response = await authOwnerAgent.get('/workflows/2/tags');

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('Workflow Tags Disabled');
	});

	test('should fail due to non-existing workflow', async () => {
		config.set('workflowTagsDisabled', false);

		const response = await authOwnerAgent.get('/workflows/2/tags');

		expect(response.statusCode).toBe(404);
	});

	test('should return all tags of owned workflow', async () => {
		config.set('workflowTagsDisabled', false);

		const tags = await Promise.all([await createTag({}), await createTag({})]);

		const workflow = await createWorkflow({ tags }, member);

		const response = await authMemberAgent.get(`/workflows/${workflow.id}/tags`);

		expect(response.statusCode).toBe(200);
		expect(response.body.length).toBe(2);

		for (const tag of response.body) {
			const { id, name, createdAt, updatedAt } = tag;

			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();

			tags.forEach((tag: TagEntity) => {
				expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
			});
		}
	});

	test('should return empty array if workflow does not have tags', async () => {
		config.set('workflowTagsDisabled', false);

		const workflow = await createWorkflow({}, member);

		const response = await authMemberAgent.get(`/workflows/${workflow.id}/tags`);

		expect(response.statusCode).toBe(200);
		expect(response.body.length).toBe(0);
	});
});

describe('PUT /workflows/:id/tags', () => {
	test('should fail due to missing API Key', testWithAPIKey('put', '/workflows/2/tags', null));

	test('should fail due to invalid API Key', testWithAPIKey('put', '/workflows/2/tags', 'abcXYZ'));

	test('should fail if workflowTagsDisabled', async () => {
		config.set('workflowTagsDisabled', true);

		const response = await authOwnerAgent.put('/workflows/2/tags').send([]);

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('Workflow Tags Disabled');
	});

	test('should fail due to non-existing workflow', async () => {
		config.set('workflowTagsDisabled', false);

		const response = await authOwnerAgent.put('/workflows/2/tags').send([]);

		expect(response.statusCode).toBe(404);
	});

	test('should add the tags, workflow have not got tags previously', async () => {
		config.set('workflowTagsDisabled', false);

		const workflow = await createWorkflow({}, member);
		const tags = await Promise.all([await createTag({}), await createTag({})]);

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

			tags.forEach((tag: TagEntity) => {
				expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
			});
		}

		// Check the association in DB
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
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

				tags.forEach((tag: TagEntity) => {
					expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
				});
			}
		}
	});

	test('should add the tags, workflow have some tags previously', async () => {
		config.set('workflowTagsDisabled', false);

		const tags = await Promise.all([await createTag({}), await createTag({}), await createTag({})]);
		const oldTags = [tags[0], tags[1]];
		const newTags = [tags[0], tags[2]];
		const workflow = await createWorkflow({ tags: oldTags }, member);

		// Check the association in DB
		const oldSharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
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

				oldTags.forEach((tag: TagEntity) => {
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

			newTags.forEach((tag: TagEntity) => {
				expect(newTags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
			});
		}

		// Check the association in DB
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
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

				newTags.forEach((tag: TagEntity) => {
					expect(newTags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
				});
			}
		}
	});

	test('should fail to add the tags as one does not exist, workflow should maintain previous tags', async () => {
		config.set('workflowTagsDisabled', false);

		const tags = await Promise.all([await createTag({}), await createTag({})]);
		const oldTags = [tags[0], tags[1]];
		const workflow = await createWorkflow({ tags: oldTags }, member);

		// Check the association in DB
		const oldSharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
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

				oldTags.forEach((tag: TagEntity) => {
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

		// Check the association in DB
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
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

				oldTags.forEach((tag: TagEntity) => {
					expect(oldTags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
				});
			}
		}
	});
});
