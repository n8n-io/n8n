import express from 'express';

import config from '@/config';
import { Role } from '@db/entities/Role';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';

import { randomApiKey } from '../shared/random';
import * as utils from '../shared/utils';
import * as testDb from '../shared/testDb';

let app: express.Application;
let globalOwnerRole: Role;
let workflowRunner: ActiveWorkflowRunner;

beforeAll(async () => {
	app = await utils.initTestServer({
		endpointGroups: ['publicApi'],
		applyAuth: false,
		enablePublicAPI: true,
	});
	await testDb.init();

	globalOwnerRole = await testDb.getGlobalOwnerRole();

	utils.initTestTelemetry();
	utils.initTestLogger();

	await utils.initBinaryManager();
	await utils.initNodeTypes();

	workflowRunner = await utils.initActiveWorkflowRunner();
});

beforeEach(async () => {
	await testDb.truncate([
		'SharedCredentials',
		'SharedWorkflow',
		'User',
		'Workflow',
		'Credentials',
		'Execution',
		'Settings',
	]);

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
});

afterEach(async () => {
	await workflowRunner?.removeAll();
});

afterAll(async () => {
	await testDb.terminate();
});

test('GET /executions/:id should fail due to missing API Key', async () => {
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

test('GET /executions/:id should fail due to invalid API Key', async () => {
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

test('GET /executions/:id should get an execution', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflow({}, owner);

	const execution = await testDb.createSuccessfulExecution(workflow);

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

test('DELETE /executions/:id should fail due to missing API Key', async () => {
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

test('DELETE /executions/:id should fail due to invalid API Key', async () => {
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

test('DELETE /executions/:id should delete an execution', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflow({}, owner);

	const execution = await testDb.createSuccessfulExecution(workflow);

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

test('GET /executions should fail due to missing API Key', async () => {
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

test('GET /executions should fail due to invalid API Key', async () => {
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

test('GET /executions should retrieve all successful executions', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflow({}, owner);

	const successfullExecution = await testDb.createSuccessfulExecution(workflow);

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

// failing on Postgres and MySQL - ref: https://github.com/n8n-io/n8n/pull/3834
test.skip('GET /executions should paginate two executions', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflow({}, owner);

	const firstSuccessfulExecution = await testDb.createSuccessfulExecution(workflow);

	const secondSuccessfulExecution = await testDb.createSuccessfulExecution(workflow);

	await testDb.createErrorExecution(workflow);

	const firstExecutionResponse = await authOwnerAgent.get(`/executions`).query({
		status: 'success',
		limit: 1,
	});

	expect(firstExecutionResponse.statusCode).toBe(200);
	expect(firstExecutionResponse.body.data.length).toBe(1);
	expect(firstExecutionResponse.body.nextCursor).toBeDefined();

	const secondExecutionResponse = await authOwnerAgent.get(`/executions`).query({
		status: 'success',
		limit: 1,
		cursor: firstExecutionResponse.body.nextCursor,
	});

	expect(secondExecutionResponse.statusCode).toBe(200);
	expect(secondExecutionResponse.body.data.length).toBe(1);
	expect(secondExecutionResponse.body.nextCursor).toBeNull();

	const successfulExecutions = [firstSuccessfulExecution, secondSuccessfulExecution];
	const executions = [...firstExecutionResponse.body.data, ...secondExecutionResponse.body.data];

	for (let i = 0; i < executions.length; i++) {
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
		} = executions[i];

		expect(id).toBeDefined();
		expect(finished).toBe(true);
		expect(mode).toEqual(successfulExecutions[i].mode);
		expect(retrySuccessId).toBeNull();
		expect(retryOf).toBeNull();
		expect(startedAt).not.toBeNull();
		expect(stoppedAt).not.toBeNull();
		expect(workflowId).toBe(successfulExecutions[i].workflowId);
		expect(waitTill).toBeNull();
	}
});

test('GET /executions should retrieve all error executions', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflow({}, owner);

	await testDb.createSuccessfulExecution(workflow);

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

test('GET /executions should return all waiting executions', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const workflow = await testDb.createWorkflow({}, owner);

	await testDb.createSuccessfulExecution(workflow);

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

test('GET /executions should retrieve all executions of specific workflow', async () => {
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
		testDb.createSuccessfulExecution,
	);
	// @ts-ignore
	await testDb.createManyExecutions(2, workflow2, testDb.createSuccessfulExecution);

	const response = await authOwnerAgent.get(`/executions`).query({
		workflowId: workflow.id,
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
		expect(workflowId).toBe(workflow.id);
		expect(waitTill).toBeNull();
	}
});
