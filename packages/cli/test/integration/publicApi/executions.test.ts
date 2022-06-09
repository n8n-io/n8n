import express = require('express');

import { ActiveWorkflowRunner } from '../../../src';
import config = require('../../../config');
import { Role } from '../../../src/databases/entities/Role';
import { randomApiKey } from '../shared/random';

import * as utils from '../shared/utils';
import * as testDb from '../shared/testDb';

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;

let workflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner;

jest.mock('../../../src/telemetry');

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['publicApi'], applyAuth: false });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();

	utils.initTestTelemetry();
	utils.initTestLogger();
	// initializing binary manager leave some async operations open
	// TODO mockup binary data mannager to avoid error
	await utils.initBinaryManager();
	await utils.initNodeTypes();
	workflowRunner = await utils.initActiveWorkflowRunner();
});

beforeEach(async () => {
	// do not combine calls - shared tables must be cleared first and separately
	await testDb.truncate(['SharedCredentials', 'SharedWorkflow'], testDbName);
	await testDb.truncate(['User', 'Workflow', 'Credentials', 'Execution', 'Settings'], testDbName);

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

test.skip('GET /executions/:executionId should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get('/executions/1');

	expect(response.statusCode).toBe(401);
});

test.skip('GET /executions/:executionId should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });
	owner.apiKey = 'abcXYZ';

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get('/executions/1');

	expect(response.statusCode).toBe(401);
});

test.skip('GET /executions/:executionId should get an execution', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflow({}, owner);

	const execution = await testDb.createSuccessfullExecution(workflow);

	const response = await authOwnerAgent.get(`/executions/${execution.id}`);

	expect(response.statusCode).toBe(200);

	const {
		id,
		finished,
		mode,
		retryOf,
		retrySuccessId,
		startedAt,
		stoppedAt,
		workflowId,
		waitTill,
	} = response.body;

	expect(id).toBeDefined();
	expect(finished).toBe(true);
	expect(mode).toEqual(execution.mode);
	expect(retrySuccessId).toBeNull();
	expect(retryOf).toBeNull();
	expect(startedAt).not.toBeNull();
	expect(stoppedAt).not.toBeNull();
	expect(workflowId).toBe(execution.workflowId);
	expect(waitTill).toBeNull();
});

test.skip('DELETE /executions/:executionId should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete('/executions/1');

	expect(response.statusCode).toBe(401);
});

test.skip('DELETE /executions/:executionId should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });
	owner.apiKey = 'abcXYZ';

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete('/executions/1');

	expect(response.statusCode).toBe(401);
});

test.skip('DELETE /executions/:executionId should delete an execution', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflow({}, owner);

	const execution = await testDb.createSuccessfullExecution(workflow);

	const response = await authOwnerAgent.delete(`/executions/${execution.id}`);

	expect(response.statusCode).toBe(200);

	const {
		id,
		finished,
		mode,
		retryOf,
		retrySuccessId,
		startedAt,
		stoppedAt,
		workflowId,
		waitTill,
	} = response.body;

	expect(id).toBeDefined();
	expect(finished).toBe(true);
	expect(mode).toEqual(execution.mode);
	expect(retrySuccessId).toBeNull();
	expect(retryOf).toBeNull();
	expect(startedAt).not.toBeNull();
	expect(stoppedAt).not.toBeNull();
	expect(workflowId).toBe(execution.workflowId);
	expect(waitTill).toBeNull();
});

test.skip('GET /executions should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get('/executions');

	expect(response.statusCode).toBe(401);
});

test.skip('GET /executions should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });
	owner.apiKey = 'abcXYZ';

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get('/executions');

	expect(response.statusCode).toBe(401);
});

test.skip('GET /executions should retrieve all successfull executions', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflow({}, owner);

	const successfullExecution = await testDb.createSuccessfullExecution(workflow);

	await testDb.createErrorExecution(workflow);

	const response = await authOwnerAgent.get(`/executions`).query({
		status: 'success',
	});

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(1);
	expect(response.body.nextCursor).toBe(null);

	const {
		id,
		finished,
		mode,
		retryOf,
		retrySuccessId,
		startedAt,
		stoppedAt,
		workflowId,
		waitTill,
	} = response.body.data[0];

	expect(id).toBeDefined();
	expect(finished).toBe(true);
	expect(mode).toEqual(successfullExecution.mode);
	expect(retrySuccessId).toBeNull();
	expect(retryOf).toBeNull();
	expect(startedAt).not.toBeNull();
	expect(stoppedAt).not.toBeNull();
	expect(workflowId).toBe(successfullExecution.workflowId);
	expect(waitTill).toBeNull();
});

test.skip('GET /executions should retrieve all error executions', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflow({}, owner);

	await testDb.createSuccessfullExecution(workflow);

	const errorExecution = await testDb.createErrorExecution(workflow);

	const response = await authOwnerAgent.get(`/executions`).query({
		status: 'error',
	});

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(1);
	expect(response.body.nextCursor).toBe(null);

	const {
		id,
		finished,
		mode,
		retryOf,
		retrySuccessId,
		startedAt,
		stoppedAt,
		workflowId,
		waitTill,
	} = response.body.data[0];

	expect(id).toBeDefined();
	expect(finished).toBe(false);
	expect(mode).toEqual(errorExecution.mode);
	expect(retrySuccessId).toBeNull();
	expect(retryOf).toBeNull();
	expect(startedAt).not.toBeNull();
	expect(stoppedAt).not.toBeNull();
	expect(workflowId).toBe(errorExecution.workflowId);
	expect(waitTill).toBeNull();
});

test.skip('GET /executions should return all waiting executions', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflow({}, owner);

	await testDb.createSuccessfullExecution(workflow);

	await testDb.createErrorExecution(workflow);

	const waitingExecution = await testDb.createWaitingExecution(workflow);

	const response = await authOwnerAgent.get(`/executions`).query({
		status: 'waiting',
	});

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(1);
	expect(response.body.nextCursor).toBe(null);

	const {
		id,
		finished,
		mode,
		retryOf,
		retrySuccessId,
		startedAt,
		stoppedAt,
		workflowId,
		waitTill,
	} = response.body.data[0];

	expect(id).toBeDefined();
	expect(finished).toBe(false);
	expect(mode).toEqual(waitingExecution.mode);
	expect(retrySuccessId).toBeNull();
	expect(retryOf).toBeNull();
	expect(startedAt).not.toBeNull();
	expect(stoppedAt).not.toBeNull();
	expect(workflowId).toBe(waitingExecution.workflowId);
	expect(new Date(waitTill).getTime()).toBeGreaterThan(Date.now() - 1000);
});

test.skip('GET /executions should retrieve all executions of specific workflow', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const [workflow, workflow2] = await testDb.createManyWorkflows(2, {}, owner);

	const savedExecutions = await testDb.createManyExecutions(
		2,
		workflow,
		// @ts-ignore
		testDb.createSuccessfullExecution,
	);
	// @ts-ignore
	await testDb.createManyExecutions(2, workflow2, testDb.createSuccessfullExecution);

	const response = await authOwnerAgent.get(`/executions`).query({
		workflowId: workflow.id.toString(),
	});

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(2);
	expect(response.body.nextCursor).toBe(null);

	for (const execution of response.body.data) {
		const {
			id,
			finished,
			mode,
			retryOf,
			retrySuccessId,
			startedAt,
			stoppedAt,
			workflowId,
			waitTill,
		} = execution;

		expect(savedExecutions.some((exec) => exec.id === id)).toBe(true);
		expect(finished).toBe(true);
		expect(mode).toBeDefined();
		expect(retrySuccessId).toBeNull();
		expect(retryOf).toBeNull();
		expect(startedAt).not.toBeNull();
		expect(stoppedAt).not.toBeNull();
		expect(workflowId).toBe(workflow.id.toString());
		expect(waitTill).toBeNull();
	}
});
