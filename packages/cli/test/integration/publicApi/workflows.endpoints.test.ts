import express = require('express');
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowRunner, Db, LoadNodesAndCredentials, NodeTypes } from '../../../src';
import config = require('../../../config');
import { Role } from '../../../src/databases/entities/Role';
import { randomApiKey, randomEmail, randomName, randomValidPassword } from '../shared/random';

import * as utils from '../shared/utils';
import * as testDb from '../shared/testDb';
import { ActiveWorkflows } from 'n8n-core';

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let workflowOwnerRole: Role;
let credentialOwnerRole: Role;

jest.mock('../../../src/telemetry');

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['publicApi'], applyAuth: false });
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

	// const loadNodesAndCredentials = LoadNodesAndCredentials();
	// const loadNodesAndCredentialsPromise = await loadNodesAndCredentials.init();
	// const nodeTypes = NodeTypes();
	// await nodeTypes.init(loadNodesAndCredentials.nodeTypes);
	const workflowRunner = ActiveWorkflowRunner.getInstance();
	await workflowRunner.init();
});

beforeEach(async () => {
	// do not combine calls - shared tables must be cleared first and separately
	await testDb.truncate(['SharedCredentials', 'SharedWorkflow'], testDbName);
	await testDb.truncate(['User', 'Workflow', 'Credentials'], testDbName);

	await testDb.createUser({
		id: INITIAL_TEST_USER.id,
		email: INITIAL_TEST_USER.email,
		password: INITIAL_TEST_USER.password,
		firstName: INITIAL_TEST_USER.firstName,
		lastName: INITIAL_TEST_USER.lastName,
		globalRole: globalOwnerRole,
		apiKey: INITIAL_TEST_USER.apiKey,
	});

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('userManagement.emails.mode', 'smtp');
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('GET /workflows should fail due to missing API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: false, user: owner });

	const response = await authOwnerAgent.get('/v1/workflows');

	expect(response.statusCode).toBe(401);
});

test('GET /workflows should fail due to invalid API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: false, user: owner });

	const response = await authOwnerAgent.get('/v1/workflows');

	expect(response.statusCode).toBe(401);
});

test('GET /workflows should return all workflows', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	await testDb.createWorkflow({}, owner);

	const response = await authOwnerAgent.get('/v1/workflows');

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

test('GET /workflows should fail due no instance owner not setup', async () => {
	config.set('userManagement.isInstanceOwnerSetUp', false);

	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.get('/v1/workflows');

	expect(response.statusCode).toBe(500);
});

test('GET /workflows/:workflowId should fail due to missing API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: false, user: owner });

	const response = await authOwnerAgent.get(`/v1/workflows/2`);

	expect(response.statusCode).toBe(401);
});

test('GET /workflows/:workflowId should fail due to invalid API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: false, user: owner });

	const response = await authOwnerAgent.get(`/v1/workflows/2`);

	expect(response.statusCode).toBe(401);
});

test('GET /workflows/:workflowId should fail due to non existing workflow', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.get(`/v1/workflows/2`);

	expect(response.statusCode).toBe(404);
});

test('GET /workflows/:workflowId should retrieve workflow', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	// create and assign workflow to owner
	const workflow = await testDb.createWorkflow({}, owner);

	const response = await authOwnerAgent.get(`/v1/workflows/${workflow.id}`);

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
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: false, user: owner });

	const response = await authOwnerAgent.delete(`/v1/workflows/2`);

	expect(response.statusCode).toBe(401);
});

test('DELETE /workflows/:workflowId should fail due to invalid API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: false, user: owner });

	const response = await authOwnerAgent.delete(`/v1/workflows/2`);

	expect(response.statusCode).toBe(401);
});

test('DELETE /workflows/:workflowId should fail due to non existing workflow', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.delete(`/v1/workflows/2`);

	expect(response.statusCode).toBe(404);
});

test('DELETE /workflows/:workflowId should delete the workflow', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	// create and assign workflow to owner
	const workflow = await testDb.createWorkflow({}, owner);

	const response = await authOwnerAgent.delete(`/v1/workflows/${workflow.id}`);

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
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: false, user: owner });

	const response = await authOwnerAgent.post(`/v1/workflows/2/activate`);

	expect(response.statusCode).toBe(401);
});

test('POST /workflows/:workflowId/activate should fail due to invalid API Key', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.post(`/v1/workflows/2/activate`);

	expect(response.statusCode).toBe(401);
});

test('POST /workflows/:workflowId/activate should fail due to non existing workflow', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const response = await authOwnerAgent.post(`/v1/workflows/2/activate`);

	expect(response.statusCode).toBe(404);
});

test('POST /workflows/:workflowId/activate should fail due to trying to activate a workflow without a trigger', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const workflow = await testDb.createWorkflow({}, owner);

	const response = await authOwnerAgent.post(`/v1/workflows/${workflow.id}/activate`);

	expect(response.statusCode).toBe(400);
});

test.skip('POST /workflows/:workflowId/activate should active workflow', async () => {
	const owner = await Db.collections.User!.findOneOrFail();

	const authOwnerAgent = utils.createAgent(app, { apiPath: 'public', auth: true, user: owner });

	const workflow = await testDb.createWorkflowWithTrigger(owner);

	const response = await authOwnerAgent.post(`/v1/workflows/${workflow.id}/activate`);

	console.log(response.body);

	expect(response.statusCode).toBe(200);

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

	//Getting error  { error: 'The node-type "n8n-nodes-base.start" is not known!' }
	// Create a test version of nodetypes that includes the nodes used in the workflow

	// check whether the workflow is on the active workflow runner
	//const workflowRunner = ActiveWorkflowRunner.getInstance();
	// activeWorkflows.allActiveWorkflows()
	// await workflowRunner.init();
	// expect(workflowRunner.isActive(workflow.id.toString())).toBe(true);

});

const INITIAL_TEST_USER = {
	id: uuid(),
	email: randomEmail(),
	firstName: randomName(),
	lastName: randomName(),
	password: randomValidPassword(),
	apiKey: randomApiKey(),
};
