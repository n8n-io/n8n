import {
	createManyWorkflows,
	createTeamProject,
	createWorkflow,
	mockInstance,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import type { ExecutionEntity, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { UnexpectedError, type ExecutionStatus } from 'n8n-workflow';

import {
	createdExecutionWithStatus,
	createErrorExecution,
	createExecution,
	createManyExecutions,
	createSuccessfulExecution,
} from '../shared/db/executions';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import { ExecutionService } from '@/executions/execution.service';
import { Telemetry } from '@/telemetry';
import { QueuedExecutionRetryError } from '@/errors/queued-execution-retry.error';
import { AbortedExecutionRetryError } from '@/errors/aborted-execution-retry.error';

let owner: User;
let user1: User;
let user2: User;
let authOwnerAgent: SuperAgentTest;
let authUser1Agent: SuperAgentTest;
let authUser2Agent: SuperAgentTest;
let workflowRunner: ActiveWorkflowManager;

mockInstance(Telemetry);

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	user1 = await createMemberWithApiKey();
	user2 = await createMemberWithApiKey();

	// TODO: mock BinaryDataService instead
	await utils.initBinaryDataService();
	await utils.initNodeTypes();

	workflowRunner = await utils.initActiveWorkflowManager();
});

beforeEach(async () => {
	await testDb.truncate([
		'SharedCredentials',
		'SharedWorkflow',
		'WorkflowEntity',
		'CredentialsEntity',
		'ExecutionEntity',
		'Settings',
	]);

	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authUser1Agent = testServer.publicApiAgentFor(user1);
	authUser2Agent = testServer.publicApiAgentFor(user2);
});

afterEach(async () => {
	await workflowRunner?.removeAll();
});

const testWithAPIKey =
	(method: 'get' | 'post' | 'put' | 'delete', url: string, apiKey: string | null) => async () => {
		void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
		const response = await authOwnerAgent[method](url);
		expect(response.statusCode).toBe(401);
	};

describe('GET /executions/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/executions/1', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/executions/1', 'abcXYZ'));

	test('owner should be able to get an execution owned by him', async () => {
		const workflow = await createWorkflow({}, owner);

		const execution = await createSuccessfulExecution(workflow);

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

	test('owner should be able to read executions of other users', async () => {
		const workflow = await createWorkflow({}, user1);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authOwnerAgent.get(`/executions/${execution.id}`);

		expect(response.statusCode).toBe(200);
	});

	test('member should be able to fetch his own executions', async () => {
		const workflow = await createWorkflow({}, user1);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authUser1Agent.get(`/executions/${execution.id}`);

		expect(response.statusCode).toBe(200);
	});

	test('member should not be able to fetch custom data when includeData is not set', async () => {
		const workflow = await createWorkflow({}, user1);
		const execution = await createExecution(
			{
				finished: true,
				status: 'success',
				metadata: [
					{ key: 'test1', value: 'value1' },
					{ key: 'test2', value: 'value2' },
				],
			},
			workflow,
		);

		const response = await authUser1Agent.get(`/executions/${execution.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.customData).toBeUndefined();
	});

	test('member should be able to fetch custom data when includeData=true', async () => {
		const workflow = await createWorkflow({}, user1);
		const execution = await createExecution(
			{
				finished: true,
				status: 'success',
				metadata: [
					{ key: 'test1', value: 'value1' },
					{ key: 'test2', value: 'value2' },
				],
			},
			workflow,
		);

		const response = await authUser1Agent.get(`/executions/${execution.id}?includeData=true`);

		expect(response.statusCode).toBe(200);
		expect(response.body.customData).toEqual({
			test1: 'value1',
			test2: 'value2',
		});
	});

	test('member should not get an execution of another user without the workflow being shared', async () => {
		const workflow = await createWorkflow({}, owner);

		const execution = await createSuccessfulExecution(workflow);

		const response = await authUser1Agent.get(`/executions/${execution.id}`);

		expect(response.statusCode).toBe(404);
	});

	test('member should be able to fetch executions of workflows shared with him', async () => {
		testServer.license.enable('feat:sharing');
		const workflow = await createWorkflow({}, user1);

		const execution = await createSuccessfulExecution(workflow);

		await shareWorkflowWithUsers(workflow, [user2]);

		const response = await authUser2Agent.get(`/executions/${execution.id}`);

		expect(response.statusCode).toBe(200);
	});
});

describe('DELETE /executions/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('delete', '/executions/1', null));

	test('should fail due to invalid API Key', testWithAPIKey('delete', '/executions/1', 'abcXYZ'));

	test('should delete an execution', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createSuccessfulExecution(workflow);

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

		await authOwnerAgent.get(`/executions/${execution.id}`).expect(404);
	});
});

describe('POST /executions/:id/retry', () => {
	test('should fail due to missing API Key', testWithAPIKey('post', '/executions/1/retry', null));

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('post', '/executions/1/retry', 'abcXYZ'),
	);

	test('should retry an execution', async () => {
		const mockedExecutionResponse = { status: 'waiting' } as any;
		const executionServiceSpy = jest
			.spyOn(Container.get(ExecutionService), 'retry')
			.mockResolvedValue(mockedExecutionResponse);

		const workflow = await createWorkflow({}, user1);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authUser1Agent.post(`/executions/${execution.id}/retry`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(mockedExecutionResponse);

		executionServiceSpy.mockRestore();
	});

	test('should return 404 when execution is not found', async () => {
		const nonExistentExecutionId = 99999999;

		const response = await authUser1Agent.post(`/executions/${nonExistentExecutionId}/retry`);

		expect(response.statusCode).toBe(404);
		expect(response.body.message).toBe('Not Found');
	});

	test('should return 409 when trying to retry a queued execution', async () => {
		const executionServiceSpy = jest
			.spyOn(Container.get(ExecutionService), 'retry')
			.mockRejectedValue(new QueuedExecutionRetryError());

		const workflow = await createWorkflow({}, user1);
		const execution = await createExecution({ status: 'new', finished: false }, workflow);

		const response = await authUser1Agent.post(`/executions/${execution.id}/retry`);

		expect(response.statusCode).toBe(409);
		expect(response.body.message).toBe(
			'Execution is queued to run (not yet started) so it cannot be retried',
		);

		executionServiceSpy.mockRestore();
	});

	test('should return 409 when trying to retry an aborted execution without execution data', async () => {
		const executionServiceSpy = jest
			.spyOn(Container.get(ExecutionService), 'retry')
			.mockRejectedValue(new AbortedExecutionRetryError());

		const workflow = await createWorkflow({}, user1);
		const execution = await createExecution(
			{
				status: 'error',
				finished: false,
				data: JSON.stringify({ executionData: null }),
			},
			workflow,
		);

		const response = await authUser1Agent.post(`/executions/${execution.id}/retry`);

		expect(response.statusCode).toBe(409);
		expect(response.body.message).toBe(
			'The execution was aborted before starting, so it cannot be retried',
		);

		executionServiceSpy.mockRestore();
	});

	test('should return 400 when trying to retry a finished execution', async () => {
		const executionServiceSpy = jest
			.spyOn(Container.get(ExecutionService), 'retry')
			.mockRejectedValue(new UnexpectedError('The execution succeeded, so it cannot be retried.'));

		const workflow = await createWorkflow({}, user1);
		const execution = await createExecution(
			{
				status: 'success',
				finished: true,
				data: JSON.stringify({ executionData: null }),
			},
			workflow,
		);

		const response = await authUser1Agent.post(`/executions/${execution.id}/retry`);

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('The execution succeeded, so it cannot be retried.');

		executionServiceSpy.mockRestore();
	});
});

describe('GET /executions', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/executions', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/executions', 'abcXYZ'));

	test('should paginate two executions', async () => {
		const workflow = await createWorkflow({}, owner);

		const firstSuccessfulExecution = await createSuccessfulExecution(workflow);
		const secondSuccessfulExecution = await createSuccessfulExecution(workflow);

		await createErrorExecution(workflow);

		const firstExecutionResponse = await authOwnerAgent.get('/executions').query({
			status: 'success',
			limit: 1,
		});

		expect(firstExecutionResponse.statusCode).toBe(200);
		expect(firstExecutionResponse.body.data.length).toBe(1);
		expect(firstExecutionResponse.body.nextCursor).toBeDefined();

		const secondExecutionResponse = await authOwnerAgent.get('/executions').query({
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
				status,
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
			expect(status).toBe(successfulExecutions[i].status);
		}
	});

	describe('with query status', () => {
		type AllowedQueryStatus = 'canceled' | 'error' | 'running' | 'success' | 'waiting';
		test.each`
			queryStatus   | entityStatus
			${'canceled'} | ${'canceled'}
			${'error'}    | ${'error'}
			${'error'}    | ${'crashed'}
			${'running'}  | ${'running'}
			${'success'}  | ${'success'}
			${'waiting'}  | ${'waiting'}
		`(
			'should retrieve all $queryStatus executions',
			async ({
				queryStatus,
				entityStatus,
			}: { queryStatus: AllowedQueryStatus; entityStatus: ExecutionStatus }) => {
				const workflow = await createWorkflow({}, owner);

				await createdExecutionWithStatus(workflow, queryStatus === 'success' ? 'error' : 'success');
				if (queryStatus !== 'running') {
					// ensure there is a running execution that gets excluded unless filtering by `running`
					await createdExecutionWithStatus(workflow, 'running');
				}

				const expectedExecution = await createdExecutionWithStatus(workflow, entityStatus);

				const response = await authOwnerAgent.get('/executions').query({
					status: queryStatus,
				});

				expect(response.statusCode).toBe(200);
				expect(response.body.data.length).toBe(1);
				expect(response.body.nextCursor).toBe(null);

				const { id, status } = response.body.data[0];

				expect(id).toBeDefined();
				expect(status).toBe(expectedExecution.status);
			},
		);
	});

	test('should retrieve all executions of specific workflow', async () => {
		const [workflow, workflow2] = await createManyWorkflows(2, {}, owner);

		const savedExecutions = await createManyExecutions(2, workflow, createSuccessfulExecution);
		await createManyExecutions(2, workflow2, createSuccessfulExecution);

		const response = await authOwnerAgent.get('/executions').query({
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
				status,
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
			expect(status).toBe(execution.status);
		}
	});

	test('should return executions filtered by project ID', async () => {
		/**
		 * Arrange
		 */
		const [firstProject, secondProject] = await Promise.all([
			createTeamProject(),
			createTeamProject(),
		]);
		const [firstWorkflow, secondWorkflow] = await Promise.all([
			createWorkflow({}, firstProject),
			createWorkflow({}, secondProject),
		]);
		const [firstExecution, secondExecution, _] = await Promise.all([
			createExecution({}, firstWorkflow),
			createExecution({}, firstWorkflow),
			createExecution({}, secondWorkflow),
		]);

		/**
		 * Act
		 */
		const response = await authOwnerAgent.get('/executions').query({
			projectId: firstProject.id,
		});

		/**
		 * Assert
		 */
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(2);
		expect(response.body.nextCursor).toBeNull();
		expect(response.body.data.map((execution: ExecutionEntity) => execution.id)).toEqual(
			expect.arrayContaining([firstExecution.id, secondExecution.id]),
		);
	});

	test('owner should retrieve all executions regardless of ownership', async () => {
		const [firstWorkflowForUser1, secondWorkflowForUser1] = await createManyWorkflows(2, {}, user1);
		await createManyExecutions(2, firstWorkflowForUser1, createSuccessfulExecution);
		await createManyExecutions(2, secondWorkflowForUser1, createSuccessfulExecution);

		const [firstWorkflowForUser2, secondWorkflowForUser2] = await createManyWorkflows(2, {}, user2);
		await createManyExecutions(2, firstWorkflowForUser2, createSuccessfulExecution);
		await createManyExecutions(2, secondWorkflowForUser2, createSuccessfulExecution);

		const response = await authOwnerAgent.get('/executions');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(8);
		expect(response.body.nextCursor).toBe(null);
	});

	test('member should not see executions of workflows not shared with him', async () => {
		const [firstWorkflowForUser1, secondWorkflowForUser1] = await createManyWorkflows(2, {}, user1);
		await createManyExecutions(2, firstWorkflowForUser1, createSuccessfulExecution);
		await createManyExecutions(2, secondWorkflowForUser1, createSuccessfulExecution);

		const [firstWorkflowForUser2, secondWorkflowForUser2] = await createManyWorkflows(2, {}, user2);
		await createManyExecutions(2, firstWorkflowForUser2, createSuccessfulExecution);
		await createManyExecutions(2, secondWorkflowForUser2, createSuccessfulExecution);

		const response = await authUser1Agent.get('/executions');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(4);
		expect(response.body.nextCursor).toBe(null);
	});

	test('member should also see executions of workflows shared with him', async () => {
		testServer.license.enable('feat:sharing');
		const [firstWorkflowForUser1, secondWorkflowForUser1] = await createManyWorkflows(2, {}, user1);
		await createManyExecutions(2, firstWorkflowForUser1, createSuccessfulExecution);
		await createManyExecutions(2, secondWorkflowForUser1, createSuccessfulExecution);

		const [firstWorkflowForUser2, secondWorkflowForUser2] = await createManyWorkflows(2, {}, user2);
		await createManyExecutions(2, firstWorkflowForUser2, createSuccessfulExecution);
		await createManyExecutions(2, secondWorkflowForUser2, createSuccessfulExecution);

		await shareWorkflowWithUsers(firstWorkflowForUser2, [user1]);

		const response = await authUser1Agent.get('/executions');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(6);
		expect(response.body.nextCursor).toBe(null);
	});
});
