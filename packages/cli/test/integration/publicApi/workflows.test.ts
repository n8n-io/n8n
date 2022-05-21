import express = require('express');
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowRunner, Db } from '../../../src';
import config = require('../../../config');
import { Role } from '../../../src/databases/entities/Role';
import { randomApiKey, randomEmail, randomName, randomValidPassword } from '../shared/random';

import * as utils from '../shared/utils';
import * as testDb from '../shared/testDb';

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let workflowOwnerRole: Role;
let credentialOwnerRole: Role;
let workflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner;

jest.mock('../../../src/telemetry');

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['publicApi'], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	const [
		fetchedGlobalOwnerRole,
		fetchedGlobalMemberRole,
		fetchedWorkflowOwnerRole,
		fetchedCredentialOwnerRole,
	] = await testDb.getAllRoles();

	globalOwnerRole = fetchedGlobalOwnerRole;
	globalMemberRole = fetchedGlobalMemberRole;
	workflowOwnerRole = fetchedWorkflowOwnerRole;
	credentialOwnerRole = fetchedCredentialOwnerRole;

	utils.initTestTelemetry();
	utils.initTestLogger();
	await utils.initNodeTypes();
	workflowRunner = await utils.initActiveWorkflowRunner();
});

beforeEach(async () => {
	// do not combine calls - shared tables must be cleared first and separately
	await testDb.truncate(['SharedCredentials', 'SharedWorkflow'], testDbName);
	await testDb.truncate(['User', 'Workflow', 'Credentials'], testDbName);

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('userManagement.emails.mode', 'smtp');
});

afterEach(async () => {
	await workflowRunner.removeAll();
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('GET /workflows should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get('/workflows');

	expect(response.statusCode).toBe(401);
});

test('GET /workflows should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get('/workflows');

	expect(response.statusCode).toBe(401);
});

test('GET /workflows should return all workflows', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	await testDb.createWorkflow({}, owner);

	const response = await authOwnerAgent.get('/workflows');

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(1);
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

test('GET /workflows/:workflowId should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get(`/workflows/2`);

	expect(response.statusCode).toBe(401);
});

test('GET /workflows/:workflowId should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get(`/workflows/2`);

	expect(response.statusCode).toBe(401);
});

test('GET /workflows/:workflowId should fail due to non existing workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get(`/workflows/2`);

	expect(response.statusCode).toBe(404);
});

test('GET /workflows/:workflowId should retrieve workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	// create and assign workflow to owner
	const workflow = await testDb.createWorkflow({}, owner);

	const response = await authOwnerAgent.get(`/workflows/${workflow.id}`);

	expect(response.statusCode).toBe(200);

	const { id, connections, active, staticData, nodes, settings, name, createdAt, updatedAt } =
		response.body;

	expect(id).toBeDefined();
	expect(name).toBeDefined();
	expect(connections).toBeDefined();
	expect(active).toBe(false);
	expect(staticData).toBeDefined();
	expect(nodes).toBeDefined();
	expect(settings).toBeDefined();
	expect(createdAt).toBeDefined();
	expect(updatedAt).toBeDefined();
});

test('DELETE /workflows/:workflowId should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete(`/workflows/2`);

	expect(response.statusCode).toBe(401);
});

test('DELETE /workflows/:workflowId should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete(`/workflows/2`);

	expect(response.statusCode).toBe(401);
});

test('DELETE /workflows/:workflowId should fail due to non existing workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete(`/workflows/2`);

	expect(response.statusCode).toBe(404);
});

test('DELETE /workflows/:workflowId should delete the workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	// create and assign workflow to owner
	const workflow = await testDb.createWorkflow({}, owner);

	const response = await authOwnerAgent.delete(`/workflows/${workflow.id}`);

	expect(response.statusCode).toBe(200);

	const { id, connections, active, staticData, nodes, settings, name, createdAt, updatedAt } =
		response.body;

	expect(id).toBeDefined();
	expect(name).toBeDefined();
	expect(connections).toBeDefined();
	expect(active).toBe(false);
	expect(staticData).toBeDefined();
	expect(nodes).toBeDefined();
	expect(settings).toBeDefined();
	expect(createdAt).toBeDefined();
	expect(updatedAt).toBeDefined();

	// make sure the workflow actually deleted from the db
	const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
		user: owner,
		workflow,
	});

	expect(sharedWorkflow).toBeUndefined();
});

test('POST /workflows/:workflowId/activate should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post(`/workflows/2/activate`);

	expect(response.statusCode).toBe(401);
});

test('POST /workflows/:workflowId/activate should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post(`/workflows/2/activate`);

	expect(response.statusCode).toBe(401);
});

test('POST /workflows/:workflowId/activate should fail due to non existing workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post(`/workflows/2/activate`);

	expect(response.statusCode).toBe(404);
});

test('POST /workflows/:workflowId/activate should fail due to trying to activate a workflow without a trigger', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflow({}, owner);

	const response = await authOwnerAgent.post(`/workflows/${workflow.id}/activate`);

	expect(response.statusCode).toBe(400);
});

test('POST /workflows/:workflowId/activate should active workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflowWithTrigger(owner);

	const response = await authOwnerAgent.post(`/workflows/${workflow.id}/activate`);

	expect(response.statusCode).toBe(200);

	const { id, connections, active, staticData, nodes, settings, name, createdAt, updatedAt } =
		response.body;

	expect(id).toBeDefined();
	expect(name).toBeDefined();
	expect(connections).toBeDefined();
	expect(active).toBe(true);
	expect(staticData).toBeDefined();
	expect(nodes).toBeDefined();
	expect(settings).toBeDefined();
	expect(createdAt).toBeDefined();
	expect(updatedAt).toBeDefined();

	// check whether the workflow is on the database
	const sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
		where: {
			user: owner,
			workflow,
		},
		relations: ['workflow'],
	});

	expect(sharedWorkflow).not.toBeUndefined();
	expect(sharedWorkflow?.workflow.active).toBe(true);

	// check whether the workflow is on the active workflow runner
	expect(await workflowRunner.isActive(workflow.id.toString())).toBe(true);
});

test('POST /workflows/:workflowId/deactivate should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post(`/workflows/2/deactivate`);

	expect(response.statusCode).toBe(401);
});

test('POST /workflows/:workflowId/deactivate should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post(`/workflows/2/deactivate`);

	expect(response.statusCode).toBe(401);
});

test('POST /workflows/:workflowId/deactivate should fail due to non existing workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post(`/workflows/2/deactivate`);

	expect(response.statusCode).toBe(404);
});

test('POST /workflows/:workflowId/deactivate should deactive workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflowWithTrigger(owner);

	const workflowActivationResponse = await authOwnerAgent.post(
		`/workflows/${workflow.id}/activate`,
	);

	expect(workflowActivationResponse.statusCode).toBe(200);

	// check whether the workflow is on the database
	let sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
		where: {
			user: owner,
			workflow,
		},
		relations: ['workflow'],
	});

	expect(sharedWorkflow).not.toBeUndefined();
	expect(sharedWorkflow?.workflow.active).toBe(true);

	// check whether the workflow is on the active workflow runner
	expect(await workflowRunner.isActive(workflow.id.toString())).toBe(true);

	const workflowDeactivationResponse = await authOwnerAgent.post(
		`/workflows/${workflow.id}/deactivate`,
	);

	const { id, connections, active, staticData, nodes, settings, name, createdAt, updatedAt } =
		workflowDeactivationResponse.body;

	expect(id).toBeDefined();
	expect(name).toBeDefined();
	expect(connections).toBeDefined();
	expect(active).toBe(false);
	expect(staticData).toBeDefined();
	expect(nodes).toBeDefined();
	expect(settings).toBeDefined();
	expect(createdAt).toBeDefined();
	expect(updatedAt).toBeDefined();

	// get the workflow after it was deactivated
	sharedWorkflow = await Db.collections.SharedWorkflow.findOne({
		where: {
			user: owner,
			workflow,
		},
		relations: ['workflow'],
	});

	// check wheather the workflow is deactivated in the database
	expect(sharedWorkflow).not.toBeUndefined();
	expect(sharedWorkflow?.workflow.active).toBe(false);

	expect(await workflowRunner.isActive(workflow.id.toString())).toBe(false);
});

test('POST /workflows should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post(`/workflows`);

	expect(response.statusCode).toBe(401);
});

test('POST /workflows should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post(`/workflows`);

	expect(response.statusCode).toBe(401);
});

test('POST /workflows should fail due to invalid body', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post(`/workflows`).send({});

	expect(response.statusCode).toBe(400);
});

test('POST /workflows should create workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post(`/workflows`).send({
		name: 'testing',
		nodes: [
			{
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

	expect(response.statusCode).toBe(200);

	const { name, nodes, connections, staticData, active, settings, createdAt, updatedAt } =
		response.body;

	expect(name).toBeDefined();
	expect(name).toBe('testing');
	expect(connections).toBeDefined();
	expect(connections).toMatchObject({});
	expect(settings).toBeDefined();
	expect(nodes).toBeDefined();
	expect(staticData).toBeDefined();
	expect(staticData).toBeNull();
	expect(nodes).toMatchObject([
		{
			parameters: {},
			name: 'Start',
			type: 'n8n-nodes-base.start',
			typeVersion: 1,
			position: [240, 300],
		},
	]);
	expect(active).toBeDefined();
	expect(active).toBe(false);
	expect(settings.saveExecutionProgress).toBeDefined();
	expect(settings.saveExecutionProgress).toBe(true);
	expect(settings.saveManualExecutions).toBeDefined();
	expect(settings.saveManualExecutions).toBe(true);
	expect(settings.saveDataErrorExecution).toBeDefined();
	expect(settings.saveDataErrorExecution).toBe('all');
	expect(settings.saveDataSuccessExecution).toBeDefined();
	expect(settings.saveDataSuccessExecution).toBe('all');
	expect(settings.executionTimeout).toBeDefined();
	expect(settings.executionTimeout).toBe(3600);
	expect(settings.timezone).toBeDefined();
	expect(settings.timezone).toBe('America/New_York');
	expect(createdAt).toBeDefined();
	expect(updatedAt).toBeDefined();
});

test('PUT /workflows/:workflowId should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.put(`/workflows/1`);

	expect(response.statusCode).toBe(401);
});

test('PUT /workflows/:workflowId should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.put(`/workflows/1`).send({});

	expect(response.statusCode).toBe(401);
});

test('PUT /workflows/:workflowId should fail due to non existing workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.put(`/workflows/1`).send({
		name: 'testing',
		nodes: [
			{
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

test('PUT /workflows/:workflowId should fail due to invalid body', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.put(`/workflows/1`).send({
		nodes: [
			{
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

test('PUT /workflows/:workflowId should update workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const workflow = await testDb.createWorkflow({}, owner);

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.put(`/workflows/${workflow.id}`).send({
		name: 'name updated',
		nodes: [
			{
				parameters: {},
				name: 'Start',
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
				position: [240, 300],
			},
			{
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
	});

	const { name, nodes, connections, staticData, active, settings, createdAt, updatedAt } =
		response.body;

	expect(response.statusCode).toBe(200);

	expect(name).toBeDefined();
	expect(name).toBe('name updated');
	expect(connections).toBeDefined();
	expect(connections).toMatchObject({});
	expect(nodes).toBeDefined();
	expect(nodes).toMatchObject([
		{
			parameters: {},
			name: 'Start',
			type: 'n8n-nodes-base.start',
			typeVersion: 1,
			position: [240, 300],
		},
		{
			parameters: {},
			name: 'Cron',
			type: 'n8n-nodes-base.cron',
			typeVersion: 1,
			position: [400, 300],
		},
	]);
	expect(staticData).toBeDefined();
	expect(staticData).toStrictEqual('{"id":1}');
	expect(active).toBeDefined();
	expect(active).toBe(false);
	expect(settings).toBeDefined();
	expect(settings.saveExecutionProgress).toBeDefined();
	expect(settings.saveExecutionProgress).toBe(false);
	expect(settings.saveManualExecutions).toBeDefined();
	expect(settings.saveManualExecutions).toBe(false);
	expect(settings.saveDataErrorExecution).toBeDefined();
	expect(settings.saveDataErrorExecution).toBe('all');
	expect(settings.saveDataSuccessExecution).toBeDefined();
	expect(settings.saveDataSuccessExecution).toBe('all');
	expect(settings.executionTimeout).toBeDefined();
	expect(settings.executionTimeout).toBe(3600);
	expect(settings.timezone).toBeDefined();
	expect(settings.timezone).toBe('America/New_York');
	expect(createdAt).toBeDefined();
	expect(updatedAt).not.toBe(createdAt);
});

const INITIAL_TEST_USER = {
	id: uuid(),
	email: randomEmail(),
	firstName: randomName(),
	lastName: randomName(),
	password: randomValidPassword(),
	apiKey: randomApiKey(),
};
