import type { Application } from 'express';
import type { SuperAgentTest } from 'supertest';
import * as Db from '@/Db';
import config from '@/config';
import type { Role } from '@db/entities/Role';
import type { TagEntity } from '@db/entities/TagEntity';
import type { User } from '@db/entities/User';
import type { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';

import { randomApiKey } from '../shared/random';
import * as utils from '../shared/utils';
import * as testDb from '../shared/testDb';

let app: Application;
let workflowOwnerRole: Role;
let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let workflowRunner: ActiveWorkflowRunner;

beforeAll(async () => {
	app = await utils.initTestServer({
		endpointGroups: ['publicApi'],
		applyAuth: false,
		enablePublicAPI: true,
	});

	const [globalOwnerRole, globalMemberRole, fetchedWorkflowOwnerRole] = await testDb.getAllRoles();

	workflowOwnerRole = fetchedWorkflowOwnerRole;

	owner = await testDb.createUser({
		globalRole: globalOwnerRole,
		apiKey: randomApiKey(),
	});

	member = await testDb.createUser({
		globalRole: globalMemberRole,
		apiKey: randomApiKey(),
	});

	await utils.initConfigFile();
	await utils.initNodeTypes();
	workflowRunner = await utils.initActiveWorkflowRunner();
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'SharedWorkflow', 'Tag', 'Workflow', 'Credentials']);

	authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	authMemberAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: member,
		version: 1,
	});

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
});

afterEach(async () => {
	await workflowRunner?.removeAll();
});

afterAll(async () => {
	await testDb.terminate();
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
			testDb.createWorkflow({}, member),
			testDb.createWorkflow({}, member),
			testDb.createWorkflow({}, member),
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
			testDb.createWorkflow({}, member),
			testDb.createWorkflow({}, member),
			testDb.createWorkflow({}, member),
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
		expect(Number(response.body.data[0].id)).toBeLessThan(Number(response2.body.data[0].id));
	});

	test('should return all owned workflows filtered by tag', async () => {
		const tag = await testDb.createTag({});

		const [workflow] = await Promise.all([
			testDb.createWorkflow({ tags: [tag] }, member),
			testDb.createWorkflow({}, member),
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
		const tags = await Promise.all([await testDb.createTag({}), await testDb.createTag({})]);
		const tagNames = tags.map((tag) => tag.name).join(',');

		const [workflow1, workflow2] = await Promise.all([
			testDb.createWorkflow({ tags }, member),
			testDb.createWorkflow({ tags }, member),
			testDb.createWorkflow({}, member),
			testDb.createWorkflow({ tags: [tags[0]] }, member),
			testDb.createWorkflow({ tags: [tags[1]] }, member),
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

	test('should return all workflows for owner', async () => {
		await Promise.all([
			testDb.createWorkflow({}, owner),
			testDb.createWorkflow({}, member),
			testDb.createWorkflow({}, owner),
			testDb.createWorkflow({}, member),
			testDb.createWorkflow({}, owner),
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
		const workflow = await testDb.createWorkflow({}, member);

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
		const workflow = await testDb.createWorkflow({}, member);

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
		const workflow = await testDb.createWorkflow({}, member);

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
		const sharedWorkflow = await Db.collections.SharedWorkflow.findOneBy({
			workflowId: workflow.id,
		});

		expect(sharedWorkflow).toBeNull();
	});

	test('should delete non-owned workflow when owner', async () => {
		// create and assign workflow to owner
		const workflow = await testDb.createWorkflow({}, member);

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
		const sharedWorkflow = await Db.collections.SharedWorkflow.findOneBy({
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
		const workflow = await testDb.createWorkflow({}, owner);
		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/activate`);
		expect(response.statusCode).toBe(400);
	});

	test('should set workflow as active', async () => {
		const workflow = await testDb.createWorkflowWithTrigger({}, member);

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
		const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
			where: {
				userId: member.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.active).toBe(true);

		// check whether the workflow is on the active workflow runner
		expect(await workflowRunner.isActive(workflow.id)).toBe(true);
	});

	test('should set non-owned workflow as active when owner', async () => {
		const workflow = await testDb.createWorkflowWithTrigger({}, member);

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
		const sharedOwnerWorkflow = await Db.collections.SharedWorkflow.findOne({
			where: {
				userId: owner.id,
				workflowId: workflow.id,
			},
		});

		expect(sharedOwnerWorkflow).toBeNull();

		const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
			where: {
				userId: member.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.active).toBe(true);

		// check whether the workflow is on the active workflow runner
		expect(await workflowRunner.isActive(workflow.id)).toBe(true);
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
		const workflow = await testDb.createWorkflowWithTrigger({}, member);

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
		const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
			where: {
				userId: member.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		// check whether the workflow is deactivated in the database
		expect(sharedWorkflow?.workflow.active).toBe(false);

		expect(await workflowRunner.isActive(workflow.id)).toBe(false);
	});

	test('should deactivate non-owned workflow when owner', async () => {
		const workflow = await testDb.createWorkflowWithTrigger({}, member);

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
		const sharedOwnerWorkflow = await Db.collections.SharedWorkflow.findOne({
			where: {
				userId: owner.id,
				workflowId: workflow.id,
			},
		});

		expect(sharedOwnerWorkflow).toBeNull();

		const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
			where: {
				userId: member.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.active).toBe(false);

		expect(await workflowRunner.isActive(workflow.id)).toBe(false);
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
		const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
			where: {
				userId: member.id,
				workflowId: response.body.id,
			},
			relations: ['workflow', 'role'],
		});

		expect(sharedWorkflow?.workflow.name).toBe(name);
		expect(sharedWorkflow?.workflow.createdAt.toISOString()).toBe(createdAt);
		expect(sharedWorkflow?.role).toEqual(workflowOwnerRole);
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
		const workflow = await testDb.createWorkflow({}, member);
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
		const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
			where: {
				userId: member.id,
				workflowId: response.body.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.name).toBe(payload.name);
		expect(sharedWorkflow?.workflow.updatedAt.getTime()).toBeGreaterThan(
			workflow.updatedAt.getTime(),
		);
	});

	test('should update non-owned workflow if owner', async () => {
		const workflow = await testDb.createWorkflow({}, member);

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
		const sharedOwnerWorkflow = await Db.collections.SharedWorkflow.findOne({
			where: {
				userId: owner.id,
				workflowId: response.body.id,
			},
		});

		expect(sharedOwnerWorkflow).toBeNull();

		const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
			where: {
				userId: member.id,
				workflowId: response.body.id,
			},
			relations: ['workflow', 'role'],
		});

		expect(sharedWorkflow?.workflow.name).toBe(payload.name);
		expect(sharedWorkflow?.workflow.updatedAt.getTime()).toBeGreaterThan(
			workflow.updatedAt.getTime(),
		);
		expect(sharedWorkflow?.role).toEqual(workflowOwnerRole);
	});
});
