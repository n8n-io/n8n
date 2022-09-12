import express from 'express';

import config from '../../../config';
import { ActiveWorkflowRunner, Db } from '../../../src';
import { Role } from '../../../src/databases/entities/Role';
import { randomApiKey } from '../shared/random';

import { TagEntity } from '../../../src/databases/entities/TagEntity';
import * as testDb from '../shared/testDb';
import type { AuthAgent } from '../shared/types';
import { utils } from './shared/utils';

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let workflowOwnerRole: Role;
let workflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner;
let authAgent: AuthAgent;

jest.mock('../../../src/telemetry');

beforeAll(async () => {
	app = await utils.initTestServer();
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	const [fetchedGlobalOwnerRole, fetchedGlobalMemberRole, fetchedWorkflowOwnerRole] =
		await testDb.getAllRoles();

	globalOwnerRole = fetchedGlobalOwnerRole;
	globalMemberRole = fetchedGlobalMemberRole;
	workflowOwnerRole = fetchedWorkflowOwnerRole;

	authAgent = utils.createAuthAgent(app, { version: 1 });

	utils.initTestTelemetry();
	utils.initTestLogger();
	utils.initConfigFile();
	await utils.initNodeTypes();
	workflowRunner = await utils.initActiveWorkflowRunner();
});

beforeEach(async () => {
	await testDb.truncate(
		['SharedCredentials', 'SharedWorkflow', 'Tag', 'User', 'Workflow', 'Credentials'],
		testDbName,
	);

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
});

afterEach(async () => {
	await workflowRunner.removeAll();
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('GET /workflows should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const response = await authAgent(owner).get('/workflows');

	expect(response.statusCode).toBe(401);
});

test('GET /workflows should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = 'abcXYZ';

	const response = await authAgent(owner).get('/workflows');

	expect(response.statusCode).toBe(401);
});

test('GET /workflows should return all owned workflows', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	await Promise.all([
		testDb.createWorkflow({}, member),
		testDb.createWorkflow({}, member),
		testDb.createWorkflow({}, member),
	]);

	const response = await authAgent(member).get('/workflows');

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

test('GET /workflows should return all owned workflows with pagination', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	const agent = authAgent(member);

	await Promise.all([
		testDb.createWorkflow({}, member),
		testDb.createWorkflow({}, member),
		testDb.createWorkflow({}, member),
	]);

	const response = await agent.get('/workflows?limit=1');

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(1);
	expect(response.body.nextCursor).not.toBeNull();

	const response2 = await agent.get(`/workflows?limit=1&cursor=${response.body.nextCursor}`);

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
	expect(response.body.data[0].id).toBeLessThan(response2.body.data[0].id);
});

test('GET /workflows should return all owned workflows filtered by tag', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	const tag = await testDb.createTag({});

	const [workflow] = await Promise.all([
		testDb.createWorkflow({ tags: [tag] }, member),
		testDb.createWorkflow({}, member),
	]);

	const response = await authAgent(member).get(`/workflows?tags=${tag.name}`);

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

test('GET /workflows should return all owned workflows filtered by tags', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	const tags = await Promise.all([await testDb.createTag({}), await testDb.createTag({})]);
	const tagNames = tags.map((tag) => tag.name).join(',');

	const [workflow1, workflow2] = await Promise.all([
		testDb.createWorkflow({ tags }, member),
		testDb.createWorkflow({ tags }, member),
		testDb.createWorkflow({}, member),
		testDb.createWorkflow({ tags: [tags[0]] }, member),
		testDb.createWorkflow({ tags: [tags[1]] }, member),
	]);

	const response = await authAgent(member).get(`/workflows?tags=${tagNames}`);

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

test('GET /workflows should return all workflows for owner', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	await Promise.all([
		testDb.createWorkflow({}, owner),
		testDb.createWorkflow({}, member),
		testDb.createWorkflow({}, owner),
		testDb.createWorkflow({}, member),
		testDb.createWorkflow({}, owner),
	]);

	const response = await authAgent(owner).get('/workflows');

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

test('GET /workflows/:id should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	owner.apiKey = null;

	const response = await authAgent(owner).get(`/workflows/2`);

	expect(response.statusCode).toBe(401);
});

test('GET /workflows/:id should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = 'abcXYZ';

	const response = await authAgent(owner).get(`/workflows/2`);

	expect(response.statusCode).toBe(401);
});

test('GET /workflows/:id should fail due to non-existing workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const response = await authAgent(owner).get(`/workflows/2`);

	expect(response.statusCode).toBe(404);
});

test('GET /workflows/:id should retrieve workflow', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });
	// create and assign workflow to owner
	const workflow = await testDb.createWorkflow({}, member);

	const response = await authAgent(member).get(`/workflows/${workflow.id}`);

	expect(response.statusCode).toBe(200);

	const { id, connections, active, staticData, nodes, settings, name, createdAt, updatedAt, tags } =
		response.body;

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

test('GET /workflows/:id should retrieve non-owned workflow for owner', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	// create and assign workflow to owner
	const workflow = await testDb.createWorkflow({}, member);

	const response = await authAgent(owner).get(`/workflows/${workflow.id}`);

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

test('DELETE /workflows/:id should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const response = await authAgent(owner).delete(`/workflows/2`);

	expect(response.statusCode).toBe(401);
});

test('DELETE /workflows/:id should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = 'abcXYZ';

	const response = await authAgent(owner).delete(`/workflows/2`);

	expect(response.statusCode).toBe(401);
});

test('DELETE /workflows/:id should fail due to non-existing workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const response = await authAgent(owner).delete(`/workflows/2`);

	expect(response.statusCode).toBe(404);
});

test('DELETE /workflows/:id should delete the workflow', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	// create and assign workflow to owner
	const workflow = await testDb.createWorkflow({}, member);

	const response = await authAgent(member).delete(`/workflows/${workflow.id}`);

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
	const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
		workflow,
	});

	expect(sharedWorkflow).toBeUndefined();
});

test('DELETE /workflows/:id should delete non-owned workflow when owner', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	// create and assign workflow to owner
	const workflow = await testDb.createWorkflow({}, member);

	const response = await authAgent(owner).delete(`/workflows/${workflow.id}`);

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
	const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
		workflow,
	});

	expect(sharedWorkflow).toBeUndefined();
});

test('POST /workflows/:id/activate should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const response = await authAgent(owner).post(`/workflows/2/activate`);

	expect(response.statusCode).toBe(401);
});

test('POST /workflows/:id/activate should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = 'abcXYZ';

	const response = await authAgent(owner).post(`/workflows/2/activate`);

	expect(response.statusCode).toBe(401);
});

test('POST /workflows/:id/activate should fail due to non-existing workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const response = await authAgent(owner).post(`/workflows/2/activate`);

	expect(response.statusCode).toBe(404);
});

test('POST /workflows/:id/activate should fail due to trying to activate a workflow without a trigger', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const workflow = await testDb.createWorkflow({}, owner);

	const response = await authAgent(owner).post(`/workflows/${workflow.id}/activate`);

	expect(response.statusCode).toBe(400);
});

test('POST /workflows/:id/activate should set workflow as active', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	const workflow = await testDb.createWorkflowWithTrigger({}, member);

	const response = await authAgent(member).post(`/workflows/${workflow.id}/activate`);

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
			user: member,
			workflow,
		},
		relations: ['workflow'],
	});

	expect(sharedWorkflow?.workflow.active).toBe(true);

	// check whether the workflow is on the active workflow runner
	expect(await workflowRunner.isActive(workflow.id.toString())).toBe(true);
});

test('POST /workflows/:id/activate should set non-owned workflow as active when owner', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	const workflow = await testDb.createWorkflowWithTrigger({}, member);

	const response = await authAgent(owner).post(`/workflows/${workflow.id}/activate`);

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
			user: owner,
			workflow,
		},
	});

	expect(sharedOwnerWorkflow).toBeUndefined();

	const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
		where: {
			user: member,
			workflow,
		},
		relations: ['workflow'],
	});

	expect(sharedWorkflow?.workflow.active).toBe(true);

	// check whether the workflow is on the active workflow runner
	expect(await workflowRunner.isActive(workflow.id.toString())).toBe(true);
});

test('POST /workflows/:id/deactivate should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const response = await authAgent(owner).post(`/workflows/2/deactivate`);

	expect(response.statusCode).toBe(401);
});

test('POST /workflows/:id/deactivate should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = 'abcXYZ';

	const response = await authAgent(owner).post(`/workflows/2/deactivate`);

	expect(response.statusCode).toBe(401);
});

test('POST /workflows/:id/deactivate should fail due to non-existing workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const response = await authAgent(owner).post(`/workflows/2/deactivate`);

	expect(response.statusCode).toBe(404);
});

test('POST /workflows/:id/deactivate should deactivate workflow', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	const agent = authAgent(member);

	const workflow = await testDb.createWorkflowWithTrigger({}, member);

	await agent.post(`/workflows/${workflow.id}/activate`);

	const workflowDeactivationResponse = await agent.post(`/workflows/${workflow.id}/deactivate`);

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
			user: member,
			workflow,
		},
		relations: ['workflow'],
	});

	// check whether the workflow is deactivated in the database
	expect(sharedWorkflow?.workflow.active).toBe(false);

	expect(await workflowRunner.isActive(workflow.id.toString())).toBe(false);
});

test('POST /workflows/:id/deactivate should deactivate non-owned workflow when owner', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	const agent = authAgent(owner);

	const workflow = await testDb.createWorkflowWithTrigger({}, member);

	await agent.post(`/workflows/${workflow.id}/activate`);

	const workflowDeactivationResponse = await agent.post(`/workflows/${workflow.id}/deactivate`);

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
			user: owner,
			workflow,
		},
	});

	expect(sharedOwnerWorkflow).toBeUndefined();

	const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
		where: {
			user: member,
			workflow,
		},
		relations: ['workflow'],
	});

	expect(sharedWorkflow?.workflow.active).toBe(false);

	expect(await workflowRunner.isActive(workflow.id.toString())).toBe(false);
});

test('POST /workflows should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const response = await authAgent(owner).post('/workflows');

	expect(response.statusCode).toBe(401);
});

test('POST /workflows should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = 'abcXYZ';

	const response = await authAgent(owner).post('/workflows');

	expect(response.statusCode).toBe(401);
});

test('POST /workflows should fail due to invalid body', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const response = await authAgent(owner).post('/workflows').send({});

	expect(response.statusCode).toBe(400);
});

test('POST /workflows should create workflow', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

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

	const response = await authAgent(member).post('/workflows').send(payload);

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
			user: member,
			workflow: response.body,
		},
		relations: ['workflow', 'role'],
	});

	expect(sharedWorkflow?.workflow.name).toBe(name);
	expect(sharedWorkflow?.workflow.createdAt.toISOString()).toBe(createdAt);
	expect(sharedWorkflow?.role).toEqual(workflowOwnerRole);
});

test('PUT /workflows/:id should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const response = await authAgent(owner).put(`/workflows/1`);

	expect(response.statusCode).toBe(401);
});

test('PUT /workflows/:id should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = 'abcXYZ';

	const response = await authAgent(owner).put(`/workflows/1`).send({});

	expect(response.statusCode).toBe(401);
});

test('PUT /workflows/:id should fail due to non-existing workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const response = await authAgent(owner)
		.put(`/workflows/1`)
		.send({
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

test('PUT /workflows/:id should fail due to invalid body', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const response = await authAgent(owner)
		.put(`/workflows/1`)
		.send({
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

test('PUT /workflows/:id should update workflow', async () => {
	const member = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

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

	const response = await authAgent(member).put(`/workflows/${workflow.id}`).send(payload);

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
			user: member,
			workflow: response.body,
		},
		relations: ['workflow'],
	});

	expect(sharedWorkflow?.workflow.name).toBe(payload.name);
	expect(sharedWorkflow?.workflow.updatedAt.getTime()).toBeGreaterThan(
		workflow.updatedAt.getTime(),
	);
});

test('PUT /workflows/:id should update non-owned workflow if owner', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });
	const member = await testDb.createUser({ globalRole: globalMemberRole });

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

	const response = await authAgent(owner).put(`/workflows/${workflow.id}`).send(payload);

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
			user: owner,
			workflow: response.body,
		},
	});

	expect(sharedOwnerWorkflow).toBeUndefined();

	const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
		where: {
			user: member,
			workflow: response.body,
		},
		relations: ['workflow', 'role'],
	});

	expect(sharedWorkflow?.workflow.name).toBe(payload.name);
	expect(sharedWorkflow?.workflow.updatedAt.getTime()).toBeGreaterThan(
		workflow.updatedAt.getTime(),
	);
	expect(sharedWorkflow?.role).toEqual(workflowOwnerRole);
});
