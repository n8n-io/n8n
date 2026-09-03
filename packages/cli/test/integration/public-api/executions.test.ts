import {
	createManyWorkflows,
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import type { ExecutionEntity, IExecutionResponse, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { type ExecutionStatus } from 'n8n-workflow';
import type { MockInstance } from 'vitest';

import { ActiveExecutions } from '@/active-executions';
import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import { AbortedExecutionRetryError } from '@/errors/aborted-execution-retry.error';
import { QueuedExecutionRetryError } from '@/errors/queued-execution-retry.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ExecutionService } from '@/executions/execution.service';
import { Telemetry } from '@/telemetry';

import {
	createAnnotationTags,
	createdExecutionWithStatus,
	createErrorExecution,
	createExecution,
	createManyExecutions,
	createSuccessfulExecution,
} from '../shared/db/executions';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let user1: User;
let user2: User;
let authOwnerAgent: SuperAgentTest;
let authUser1Agent: SuperAgentTest;
let authUser2Agent: SuperAgentTest;
let workflowRunner: ActiveWorkflowManager;

mockInstance(Telemetry);
mockInstance(InstanceSettings, {
	isMultiMain: false,
	n8nFolder: '/tmp/n8n-test',
});

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
		'ExecutionAnnotation',
		'AnnotationTagEntity',
		'AnnotationTagMapping',
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

	test.each(['abc', '1.5', '-1', '0', '000'])(
		'should reject an execution id that cannot exist with 400: %s',
		async (executionId) => {
			const response = await authOwnerAgent.get(`/executions/${executionId}`);

			expect(response.statusCode).toBe(400);
		},
	);

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

	test('should return execution without data when it exceeds the display size limit', async () => {
		const workflow = await createWorkflow({}, user1);
		const execution = await createExecution(
			{
				finished: true,
				status: 'success',
				// recorded size over the 100 MB default; the guard skips loading the data column
				jsonSizeBytes: 200 * 1024 * 1024,
				data: '[]',
			},
			workflow,
		);

		const response = await authUser1Agent.get(`/executions/${execution.id}?includeData=true`);

		expect(response.statusCode).toBe(200);
		expect(response.body.dataTooLargeToDisplay).toBe(true);
		expect(response.body.data?.resultData?.runData).toEqual({});
	});

	test('should return full data when ignoreDataSizeLimit is set, despite the size limit', async () => {
		const workflow = await createWorkflow({}, user1);
		const execution = await createExecution(
			{
				finished: true,
				status: 'success',
				jsonSizeBytes: 200 * 1024 * 1024,
				data: '[]',
			},
			workflow,
		);

		const response = await authUser1Agent.get(
			`/executions/${execution.id}?includeData=true&ignoreDataSizeLimit=true`,
		);

		expect(response.statusCode).toBe(200);
		// guard bypassed: data is loaded normally, no "too large" flag
		expect(response.body.dataTooLargeToDisplay).toBeUndefined();
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

	test.each(['abc', '1.5', '-1', '0', '000'])(
		'should reject an execution id that cannot exist with 400: %s',
		async (executionId) => {
			const response = await authOwnerAgent.delete(`/executions/${executionId}`);

			expect(response.statusCode).toBe(400);
		},
	);

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
		expect(typeof id).toBe('number');
		expect(id).toBe(Number(execution.id));
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

	test('should return 400 when deleting a running execution', async () => {
		const workflow = await createWorkflow({}, owner);

		const execution = await createdExecutionWithStatus(workflow, 'running');

		const response = await authOwnerAgent.delete(`/executions/${execution.id}`);

		expect(response.statusCode).toBe(400);

		await authOwnerAgent.get(`/executions/${execution.id}`).expect(200);
	});

	test('member should not delete an execution of another user', async () => {
		const workflow = await createWorkflow({}, owner);

		const execution = await createSuccessfulExecution(workflow);

		const response = await authUser1Agent.delete(`/executions/${execution.id}`);

		expect(response.statusCode).toBe(404);

		await authOwnerAgent.get(`/executions/${execution.id}`).expect(200);
	});
});

describe('POST /executions/:id/retry', () => {
	const retryServiceResponse = (overrides: Record<string, unknown> = {}) =>
		({
			id: '1001',
			mode: 'retry',
			startedAt: new Date('2026-01-01T00:00:00.000Z'),
			workflowId: 'workflow-1',
			finished: false,
			retryOf: '1000',
			status: 'waiting',
			waitTill: new Date('2026-01-01T00:05:00.000Z'),
			data: { resultData: { runData: {} } },
			workflowData: { id: 'workflow-1', name: 'My workflow', nodes: [], connections: {} },
			customData: { key: 'value' },
			annotation: { id: 1, vote: 'up', tags: [{ id: 'tag-1', name: 'important' }] },
			storedAt: 'db',
			...overrides,
		}) as unknown as Omit<IExecutionResponse, 'createdAt'>;

	const retryResponseBody = {
		id: '1001',
		mode: 'retry',
		startedAt: '2026-01-01T00:00:00.000Z',
		workflowId: 'workflow-1',
		finished: false,
		retryOf: '1000',
		status: 'waiting',
		waitTill: '2026-01-01T00:05:00.000Z',
		data: { resultData: { runData: {} } },
		workflowData: { id: 'workflow-1', name: 'My workflow', nodes: [], connections: {} },
		customData: { key: 'value' },
		annotation: { id: 1, vote: 'up', tags: [{ id: 'tag-1', name: 'important' }] },
		storedAt: 'db',
	};

	test('should fail due to missing API Key', testWithAPIKey('post', '/executions/1/retry', null));

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('post', '/executions/1/retry', 'abcXYZ'),
	);

	test.each(['abc', '1.5', '-1', '0', '000'])(
		'should reject an execution id that cannot exist with 400: %s',
		async (executionId) => {
			const response = await authUser1Agent.post(`/executions/${executionId}/retry`);

			expect(response.statusCode).toBe(400);
		},
	);

	test('should retry an execution', async () => {
		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'retry')
			.mockResolvedValue(retryServiceResponse());

		const workflow = await createWorkflow({}, user1);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authUser1Agent.post(`/executions/${execution.id}/retry`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(retryResponseBody);

		executionServiceSpy.mockRestore();
	});

	test('should omit waitTill when the retried execution has none', async () => {
		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'retry')
			.mockResolvedValue(retryServiceResponse({ waitTill: undefined, annotation: undefined }));

		const workflow = await createWorkflow({}, user1);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authUser1Agent.post(`/executions/${execution.id}/retry`);

		expect(response.statusCode).toBe(200);
		expect(response.body).not.toHaveProperty('waitTill');
		expect(response.body).not.toHaveProperty('annotation');

		executionServiceSpy.mockRestore();
	});

	test('should pass loadWorkflow from the request body to the service', async () => {
		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'retry')
			.mockResolvedValue(retryServiceResponse());

		const workflow = await createWorkflow({}, user1);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authUser1Agent
			.post(`/executions/${execution.id}/retry`)
			.send({ loadWorkflow: true });

		expect(response.statusCode).toBe(200);
		expect(executionServiceSpy).toHaveBeenCalledWith(
			expect.objectContaining({ id: user1.id }),
			execution.id,
			expect.arrayContaining([workflow.id]),
			{ loadWorkflow: true },
		);

		executionServiceSpy.mockRestore();
	});

	test('should return 404 when execution is not found', async () => {
		const nonExistentExecutionId = 99999999;

		const response = await authUser1Agent.post(`/executions/${nonExistentExecutionId}/retry`);

		expect(response.statusCode).toBe(404);
		expect(response.body.message).toBe('Not Found');
	});

	test('should return 409 when trying to retry a queued execution', async () => {
		const executionServiceSpy = vi
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
		const executionServiceSpy = vi
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

	test('should return 404 when user only has read access to the workflow via project viewer role', async () => {
		testServer.license.enable('feat:sharing');

		const executionServiceSpy = vi.spyOn(Container.get(ExecutionService), 'retry');

		const project = await createTeamProject('project with viewer', owner);
		await linkUserToProject(user1, project, 'project:viewer');

		const workflow = await createWorkflow({}, project);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authUser1Agent.post(`/executions/${execution.id}/retry`);

		expect(response.statusCode).toBe(404);
		expect(response.body.message).toBe('Not Found');
		expect(executionServiceSpy).not.toHaveBeenCalled();

		executionServiceSpy.mockRestore();
	});

	test('should retry an execution when user has execute access via project editor role', async () => {
		testServer.license.enable('feat:sharing');

		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'retry')
			.mockResolvedValue(retryServiceResponse());

		const project = await createTeamProject('project with editor', owner);
		await linkUserToProject(user1, project, 'project:editor');

		const workflow = await createWorkflow({}, project);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authUser1Agent.post(`/executions/${execution.id}/retry`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(retryResponseBody);

		executionServiceSpy.mockRestore();
	});

	test('should return 409 when trying to retry a finished execution', async () => {
		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'retry')
			.mockRejectedValue(new ConflictError('The execution succeeded, so it cannot be retried.'));

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

		expect(response.statusCode).toBe(409);
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

	test('should bound a forged cursor limit instead of querying with it', async () => {
		const workflow = await createWorkflow({}, owner);
		await createSuccessfulExecution(workflow);
		await createSuccessfulExecution(workflow);
		await createSuccessfulExecution(workflow);

		const forge = (limit: unknown) =>
			Buffer.from(JSON.stringify({ lastId: '999999', limit })).toString('base64');

		const cases: Array<[unknown, number]> = [
			[-1, 1],
			[0, 1],
			[2, 2],
			['abc', 3],
			[null, 3],
		];

		for (const [limit, expected] of cases) {
			const response = await authOwnerAgent.get('/executions').query({ cursor: forge(limit) });

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toHaveLength(expected);
		}
	});

	test('should keep dataTooLargeToDisplay on a list item that exceeds the display size limit', async () => {
		const workflow = await createWorkflow({}, owner);
		await createExecution(
			{
				finished: true,
				status: 'success',
				jsonSizeBytes: 200 * 1024 * 1024,
				data: '[]',
			},
			workflow,
		);

		const response = await authOwnerAgent.get('/executions').query({ includeData: true });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].dataTooLargeToDisplay).toBe(true);
		expect(response.body.data[0].data?.resultData?.runData).toEqual({});
	});

	test('should return 400 for an invalid cursor', async () => {
		const response = await authOwnerAgent.get('/executions').query({ cursor: 'not-a-cursor' });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('An invalid cursor was provided');
	});

	test('should keep the legacy accept and reject boundary for odd cursor shapes', async () => {
		const workflow = await createWorkflow({}, owner);
		await createSuccessfulExecution(workflow);
		await createSuccessfulExecution(workflow);
		await createSuccessfulExecution(workflow);

		const encode = (payload: unknown) => Buffer.from(JSON.stringify(payload)).toString('base64');

		const tolerated: Array<[unknown, number]> = [
			[{}, 3],
			[{ limit: 2 }, 2],
			[{ lastId: null }, 3],
			[{ lastId: { id: '1' } }, 3],
			[[], 3],
		];

		for (const [payload, rows] of tolerated) {
			const response = await authOwnerAgent.get('/executions').query({ cursor: encode(payload) });

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toHaveLength(rows);
		}

		for (const payload of ['a string', 42]) {
			const response = await authOwnerAgent.get('/executions').query({ cursor: encode(payload) });

			expect(response.statusCode).toBe(400);
			expect(response.body.message).toBe('An invalid cursor was provided');
		}
	});

	test('should accept a numeric lastId, as the legacy handler did', async () => {
		const workflow = await createWorkflow({}, owner);
		const first = await createSuccessfulExecution(workflow);
		await createSuccessfulExecution(workflow);

		const cursor = Buffer.from(
			JSON.stringify({ lastId: Number(first.id) + 1, limit: 10 }),
		).toString('base64');
		const response = await authOwnerAgent.get('/executions').query({ cursor });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].id).toBe(first.id);
	});

	test('should accept a cursor in either the lastId or the offset form', async () => {
		const workflow = await createWorkflow({}, owner);
		await createSuccessfulExecution(workflow);
		await createSuccessfulExecution(workflow);

		const encode = (payload: unknown) => Buffer.from(JSON.stringify(payload)).toString('base64');

		const cursorForm = await authOwnerAgent
			.get('/executions')
			.query({ cursor: encode({ lastId: '999999', limit: 1 }) });

		expect(cursorForm.statusCode).toBe(200);
		expect(cursorForm.body.data).toHaveLength(1);

		const offsetForm = await authOwnerAgent
			.get('/executions')
			.query({ cursor: encode({ offset: 0, limit: 1 }) });

		expect(offsetForm.statusCode).toBe(200);
		expect(offsetForm.body.data).toHaveLength(1);
	});

	describe('with query status', () => {
		type AllowedQueryStatus =
			| 'canceled'
			| 'crashed'
			| 'error'
			| 'new'
			| 'running'
			| 'success'
			| 'unknown'
			| 'waiting';
		test.each`
			queryStatus   | entityStatus
			${'canceled'} | ${'canceled'}
			${'crashed'}  | ${'crashed'}
			${'error'}    | ${'error'}
			${'new'}      | ${'new'}
			${'running'}  | ${'running'}
			${'success'}  | ${'success'}
			${'unknown'}  | ${'unknown'}
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

	describe('with executions held in the active-executions map', () => {
		// Mirrors a running instance: a `waiting` execution is persisted in the DB
		// and its id is also held in the in-process active-executions map.
		let activeExecutionsSpy: MockInstance | undefined;

		const holdInActiveExecutions = (
			stubs: Array<{ executionId: string; workflowId: string; status: ExecutionStatus }>,
		) => {
			activeExecutionsSpy = vi
				.spyOn(Container.get(ActiveExecutions), 'getActiveExecutions')
				.mockReturnValue(
					stubs.map(({ executionId, workflowId, status }) => ({
						id: executionId,
						retryOf: undefined,
						startedAt: new Date(),
						mode: 'manual',
						workflowId,
						status,
					})),
				);
		};

		afterEach(() => {
			activeExecutionsSpy?.mockRestore();
			activeExecutionsSpy = undefined;
		});

		test.each`
			query                    | description
			${undefined}             | ${'in the default list'}
			${{ status: 'waiting' }} | ${'when filtering by status=waiting'}
		`(
			'should return a held waiting execution $description',
			async ({ query }: { query?: { status: string } }) => {
				const workflow = await createWorkflow({}, owner);
				const waitingExecution = await createdExecutionWithStatus(workflow, 'waiting');
				holdInActiveExecutions([
					{ executionId: waitingExecution.id, workflowId: workflow.id, status: 'waiting' },
				]);

				const response = await authOwnerAgent.get('/executions').query(query ?? {});

				expect(response.statusCode).toBe(200);
				expect(response.body.data.map((e: { id: string }) => e.id)).toContain(waitingExecution.id);
			},
		);

		test('should return both a held waiting execution and a finished one in the default list', async () => {
			const workflow = await createWorkflow({}, owner);
			const finishedExecution = await createdExecutionWithStatus(workflow, 'success');
			const waitingExecution = await createdExecutionWithStatus(workflow, 'waiting');
			holdInActiveExecutions([
				{ executionId: waitingExecution.id, workflowId: workflow.id, status: 'waiting' },
			]);

			const response = await authOwnerAgent.get('/executions');

			expect(response.statusCode).toBe(200);
			const ids = response.body.data.map((e: { id: string }) => e.id);
			expect(ids).toContain(finishedExecution.id);
			expect(ids).toContain(waitingExecution.id);
		});

		test('should still exclude a genuinely running execution from the default list', async () => {
			const workflow = await createWorkflow({}, owner);
			const runningExecution = await createdExecutionWithStatus(workflow, 'running');
			holdInActiveExecutions([
				{ executionId: runningExecution.id, workflowId: workflow.id, status: 'running' },
			]);

			const response = await authOwnerAgent.get('/executions');

			expect(response.statusCode).toBe(200);
			expect(response.body.data.map((e: { id: string }) => e.id)).not.toContain(
				runningExecution.id,
			);
		});

		test('should return a held waiting execution and exclude a held running execution when both are active', async () => {
			const workflow = await createWorkflow({}, owner);
			const waitingExecution = await createdExecutionWithStatus(workflow, 'waiting');
			const runningExecution = await createdExecutionWithStatus(workflow, 'running');
			holdInActiveExecutions([
				{ executionId: waitingExecution.id, workflowId: workflow.id, status: 'waiting' },
				{ executionId: runningExecution.id, workflowId: workflow.id, status: 'running' },
			]);

			const response = await authOwnerAgent.get('/executions');

			expect(response.statusCode).toBe(200);
			const ids = response.body.data.map((e: { id: string }) => e.id);
			expect(ids).toContain(waitingExecution.id);
			expect(ids).not.toContain(runningExecution.id);
		});
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

	describe('with startedAfter and startedBefore filters', () => {
		test('should retrieve executions started after a given time', async () => {
			const workflow = await createWorkflow({}, owner);
			const earlier = await createExecution(
				{ startedAt: new Date('2020-06-01T00:00:00.000Z') },
				workflow,
			);
			const later = await createExecution(
				{ startedAt: new Date('2020-12-31T00:00:00.000Z') },
				workflow,
			);

			const response = await authOwnerAgent.get('/executions').query({
				startedAfter: '2020-07-01T00:00:00.000Z',
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data.map((execution: ExecutionEntity) => execution.id)).toEqual([
				later.id,
			]);
			expect(response.body.data.map((execution: ExecutionEntity) => execution.id)).not.toContain(
				earlier.id,
			);
		});

		test('should retrieve executions started before a given time', async () => {
			const workflow = await createWorkflow({}, owner);
			const earlier = await createExecution(
				{ startedAt: new Date('2020-06-01T00:00:00.000Z') },
				workflow,
			);
			const later = await createExecution(
				{ startedAt: new Date('2020-12-31T00:00:00.000Z') },
				workflow,
			);

			const response = await authOwnerAgent.get('/executions').query({
				startedBefore: '2020-07-01T00:00:00.000Z',
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data.map((execution: ExecutionEntity) => execution.id)).toEqual([
				earlier.id,
			]);
			expect(response.body.data.map((execution: ExecutionEntity) => execution.id)).not.toContain(
				later.id,
			);
		});

		test('should retrieve executions started within a time range', async () => {
			const workflow = await createWorkflow({}, owner);
			const earlier = await createExecution(
				{ startedAt: new Date('2020-01-01T00:00:00.000Z') },
				workflow,
			);
			const inRange = await createExecution(
				{ startedAt: new Date('2020-06-01T00:00:00.000Z') },
				workflow,
			);
			const later = await createExecution(
				{ startedAt: new Date('2020-12-31T00:00:00.000Z') },
				workflow,
			);

			const response = await authOwnerAgent.get('/executions').query({
				startedAfter: '2020-03-01T00:00:00.000Z',
				startedBefore: '2020-09-01T00:00:00.000Z',
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data.map((execution: ExecutionEntity) => execution.id)).toEqual([
				inRange.id,
			]);
			expect(response.body.data.map((execution: ExecutionEntity) => execution.id)).not.toEqual(
				expect.arrayContaining([earlier.id, later.id]),
			);
		});

		test('should combine start-time filters with status and workflowId', async () => {
			const [workflow, otherWorkflow] = await createManyWorkflows(2, {}, owner);
			const matching = await createExecution(
				{ startedAt: new Date('2020-06-01T00:00:00.000Z'), status: 'success' },
				workflow,
			);
			await createExecution(
				{ startedAt: new Date('2020-06-01T00:00:00.000Z'), status: 'error' },
				workflow,
			);
			await createExecution(
				{ startedAt: new Date('2020-12-31T00:00:00.000Z'), status: 'success' },
				workflow,
			);
			await createExecution(
				{ startedAt: new Date('2020-06-01T00:00:00.000Z'), status: 'success' },
				otherWorkflow,
			);

			const response = await authOwnerAgent.get('/executions').query({
				startedAfter: '2020-03-01T00:00:00.000Z',
				startedBefore: '2020-09-01T00:00:00.000Z',
				status: 'success',
				workflowId: workflow.id,
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data.map((execution: ExecutionEntity) => execution.id)).toEqual([
				matching.id,
			]);
		});

		test('should accept an RFC3339 value with a numeric timezone offset', async () => {
			const response = await authOwnerAgent.get('/executions').query({
				startedAfter: '2020-07-01T00:00:00+02:00',
				startedBefore: '2020-09-01T00:00:00-05:00',
			});

			expect(response.statusCode).toBe(200);
		});

		test('should return 400 for a value with no timezone', async () => {
			const response = await authOwnerAgent.get('/executions').query({
				startedAfter: '2020-07-01T00:00:00',
			});

			expect(response.statusCode).toBe(400);
		});

		test('should return 400 for a malformed startedAfter value', async () => {
			const response = await authOwnerAgent.get('/executions').query({
				startedAfter: 'not-a-date',
			});

			expect(response.statusCode).toBe(400);
			expect(response.body.message).toContain('startedAfter');
		});

		test('should return 400 for a malformed startedBefore value', async () => {
			const response = await authOwnerAgent.get('/executions').query({
				startedBefore: 'not-a-date',
			});

			expect(response.statusCode).toBe(400);
			expect(response.body.message).toContain('startedBefore');
		});
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

describe('GET /executions/:id/tags', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/executions/1/tags', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/executions/1/tags', 'abcXYZ'));

	test('should return 404 for non-existent execution', async () => {
		const response = await authOwnerAgent.get('/executions/999/tags');
		expect(response.statusCode).toBe(404);
	});

	test.each(['abc', '1.5', '-1', '0', '000'])(
		'should reject an execution id that cannot exist with 400: %s',
		async (executionId) => {
			const response = await authOwnerAgent.get(`/executions/${executionId}/tags`);

			expect(response.statusCode).toBe(400);
		},
	);

	test('should return empty array for execution with no tags', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authOwnerAgent.get(`/executions/${execution.id}/tags`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual([]);
	});

	test('should return the tags of an execution', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createSuccessfulExecution(workflow);
		const [tag] = await createAnnotationTags(['dataset']);

		await authOwnerAgent.put(`/executions/${execution.id}/tags`).send([{ id: tag.id }]);

		const response = await authOwnerAgent.get(`/executions/${execution.id}/tags`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual([
			{
				id: tag.id,
				name: 'dataset',
				createdAt: tag.createdAt.toISOString(),
				updatedAt: tag.updatedAt.toISOString(),
			},
		]);
	});

	test('member should not get tags from execution in inaccessible workflow', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authUser1Agent.get(`/executions/${execution.id}/tags`);

		expect(response.statusCode).toBe(404);
	});
});

describe('PUT /executions/:id/tags', () => {
	test('should fail due to missing API Key', testWithAPIKey('put', '/executions/1/tags', null));

	test('should fail due to invalid API Key', testWithAPIKey('put', '/executions/1/tags', 'abcXYZ'));

	test('should return 404 for non-existent execution', async () => {
		const response = await authOwnerAgent.put('/executions/999/tags').send([]);
		expect(response.statusCode).toBe(404);
	});

	test.each(['abc', '1.5', '-1', '0', '000'])(
		'should reject an execution id that cannot exist with 400: %s',
		async (executionId) => {
			const response = await authOwnerAgent.put(`/executions/${executionId}/tags`).send([]);

			expect(response.statusCode).toBe(400);
		},
	);

	test('should set tags on execution', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createSuccessfulExecution(workflow);
		const [tag] = await createAnnotationTags(['dataset']);

		const response = await authOwnerAgent
			.put(`/executions/${execution.id}/tags`)
			.send([{ id: tag.id }]);

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveLength(1);
		expect(response.body[0].name).toBe('dataset');
		expect(response.body[0].id).toBe(tag.id);
	});

	test('should replace existing tags', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createSuccessfulExecution(workflow);
		const [tag1, tag2] = await createAnnotationTags(['tag1', 'tag2']);

		// Set first tag
		await authOwnerAgent.put(`/executions/${execution.id}/tags`).send([{ id: tag1.id }]);

		// Replace with second tag
		const response = await authOwnerAgent
			.put(`/executions/${execution.id}/tags`)
			.send([{ id: tag2.id }]);

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveLength(1);
		expect(response.body[0].name).toBe('tag2');
	});

	test('should clear tags with empty array', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createSuccessfulExecution(workflow);
		const [tag] = await createAnnotationTags(['dataset']);

		// Set tag first
		await authOwnerAgent.put(`/executions/${execution.id}/tags`).send([{ id: tag.id }]);

		// Clear with empty array
		const response = await authOwnerAgent.put(`/executions/${execution.id}/tags`).send([]);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual([]);
	});

	test('should return 404 for non-existent tag IDs', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authOwnerAgent
			.put(`/executions/${execution.id}/tags`)
			.send([{ id: 'nonexistent-tag-id' }]);

		expect(response.statusCode).toBe(404);
		expect(response.body.message).toBe('Some tags not found');
	});

	test.each([
		['not an array', { id: 'tag-1' }],
		['an item without an id', [{}]],
		['an item with an unknown property', [{ id: 'tag-1', name: 'dataset' }]],
		['an item with a non-string id', [{ id: 1 }]],
	])('should return 400 when the body is %s', async (_label, body) => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authOwnerAgent.put(`/executions/${execution.id}/tags`).send(body);

		expect(response.statusCode).toBe(400);
	});

	test('member should not update tags on execution in inaccessible workflow', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authUser1Agent.put(`/executions/${execution.id}/tags`).send([]);

		expect(response.statusCode).toBe(404);
	});

	test('GET should return tags after PUT', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createSuccessfulExecution(workflow);
		const [tag1, tag2] = await createAnnotationTags(['important', 'reviewed']);

		// Set tags
		await authOwnerAgent
			.put(`/executions/${execution.id}/tags`)
			.send([{ id: tag1.id }, { id: tag2.id }]);

		// GET should return the same tags
		const response = await authOwnerAgent.get(`/executions/${execution.id}/tags`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveLength(2);
		expect(response.body.map((t: { name: string }) => t.name).sort()).toEqual([
			'important',
			'reviewed',
		]);
	});
});

describe('POST /executions/:id/stop', () => {
	test('should fail due to missing API Key', testWithAPIKey('post', '/executions/1/stop', null));

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('post', '/executions/1/stop', 'abcXYZ'),
	);

	test.each(['abc', '1.5', '-1', '0', '000'])(
		'should reject an execution id that cannot exist with 400: %s',
		async (executionId) => {
			const response = await authUser1Agent.post(`/executions/${executionId}/stop`);

			expect(response.statusCode).toBe(400);
		},
	);

	test('should stop a running execution', async () => {
		const mockedStopResponse = {
			mode: 'manual',
			startedAt: new Date().toISOString(),
			stoppedAt: new Date().toISOString(),
			finished: false,
			status: 'canceled',
		} as any;
		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'stop')
			.mockResolvedValue({
				...mockedStopResponse,
				startedAt: new Date(mockedStopResponse.startedAt),
				stoppedAt: new Date(mockedStopResponse.stoppedAt),
			});

		const workflow = await createWorkflow({}, user1);
		const execution = await createExecution({ status: 'running', finished: false }, workflow);

		const response = await authUser1Agent.post(`/executions/${execution.id}/stop`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(mockedStopResponse);
		expect(executionServiceSpy).toHaveBeenCalled();
		// The execution ID from the route parameter is passed to the service
		const calledExecutionId = executionServiceSpy.mock.calls[0][0];
		// URL parameters come as strings, so we expect string conversion
		expect(String(calledExecutionId)).toBe(execution.id.toString());

		executionServiceSpy.mockRestore();
	});

	test('should return 404 when execution is not found', async () => {
		const nonExistentExecutionId = 99999999;

		const response = await authUser1Agent.post(`/executions/${nonExistentExecutionId}/stop`);

		expect(response.statusCode).toBe(404);
		expect(response.body.message).toBe('Not Found');
	});

	test('member should not be able to stop execution of workflow not shared with them', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createExecution({ status: 'running', finished: false }, workflow);

		const response = await authUser1Agent.post(`/executions/${execution.id}/stop`);

		expect(response.statusCode).toBe(404);
		expect(response.body.message).toBe('Not Found');
	});

	test('should allow stopping execution of shared workflow', async () => {
		testServer.license.enable('feat:sharing');

		const mockedStopResponse = {
			mode: 'manual',
			startedAt: new Date().toISOString(),
			stoppedAt: new Date().toISOString(),
			finished: false,
			status: 'canceled',
		} as any;
		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'stop')
			.mockResolvedValue({
				...mockedStopResponse,
				startedAt: new Date(mockedStopResponse.startedAt),
				stoppedAt: new Date(mockedStopResponse.stoppedAt),
			});

		const workflow = await createWorkflow({}, user1);
		const execution = await createExecution({ status: 'running', finished: false }, workflow);

		await shareWorkflowWithUsers(workflow, [user2]);

		const response = await authUser2Agent.post(`/executions/${execution.id}/stop`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(mockedStopResponse);

		executionServiceSpy.mockRestore();
	});

	test('should omit stoppedAt when the service returns none', async () => {
		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'stop')
			.mockResolvedValue({
				mode: 'manual',
				startedAt: new Date(),
				stoppedAt: undefined,
				finished: false,
				status: 'canceled',
			});

		const workflow = await createWorkflow({}, user1);
		const execution = await createExecution({ status: 'running', finished: false }, workflow);

		const response = await authUser1Agent.post(`/executions/${execution.id}/stop`);

		expect(response.statusCode).toBe(200);
		expect(response.body).not.toHaveProperty('stoppedAt');

		executionServiceSpy.mockRestore();
	});

	test('should return 404 when the execution is missing but a workflow is accessible', async () => {
		await createWorkflow({}, user1);

		const response = await authUser1Agent.post('/executions/99999999/stop');

		expect(response.statusCode).toBe(404);
		expect(response.body.message).toBe('Failed to find execution to stop');
	});

	test('should return 409 when the execution is in a state that cannot be stopped', async () => {
		const workflow = await createWorkflow({}, user1);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authUser1Agent.post(`/executions/${execution.id}/stop`);

		expect(response.statusCode).toBe(409);
		expect(response.body.message).toContain('is currently success');
	});

	test('should stop when the API key has the "execution:stop" scope', async () => {
		const scopedOwner = await createOwnerWithApiKey({ scopes: ['execution:stop'] });
		const scopedAgent = testServer.publicApiAgentFor(scopedOwner);

		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'stop')
			.mockResolvedValue({
				mode: 'manual',
				startedAt: new Date(),
				stoppedAt: new Date(),
				finished: false,
				status: 'canceled',
			});

		const workflow = await createWorkflow({}, scopedOwner);
		const execution = await createExecution({ status: 'running', finished: false }, workflow);

		const response = await scopedAgent.post(`/executions/${execution.id}/stop`);

		expect(response.statusCode).toBe(200);

		executionServiceSpy.mockRestore();
	});

	test('should return 403 when the API key lacks the "execution:stop" scope', async () => {
		const scopedOwner = await createOwnerWithApiKey({ scopes: ['execution:read'] });
		const scopedAgent = testServer.publicApiAgentFor(scopedOwner);

		const workflow = await createWorkflow({}, scopedOwner);
		const execution = await createExecution({ status: 'running', finished: false }, workflow);

		const response = await scopedAgent.post(`/executions/${execution.id}/stop`);

		expect(response.statusCode).toBe(403);
	});
});

describe('POST /executions/stop', () => {
	test('should fail due to missing API Key', testWithAPIKey('post', '/executions/stop', null));

	test('should fail due to invalid API Key', testWithAPIKey('post', '/executions/stop', 'abcXYZ'));

	test('should return 400 when status is not provided', async () => {
		const response = await authUser1Agent.post('/executions/stop').send({});

		expect(response.statusCode).toBe(400);
		// OpenAPI validation catches this before our handler validation
		expect(response.body.message).toContain('status');
	});

	test('should return 400 when status is empty array', async () => {
		const response = await authUser1Agent.post('/executions/stop').send({ status: [] });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('request/body/status must include at least one status');
	});

	test('should stop multiple running executions', async () => {
		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'stopMany')
			.mockResolvedValue(3);

		await createWorkflow({}, user1);

		const response = await authUser1Agent
			.post('/executions/stop')
			.send({ status: ['running', 'waiting'] });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ stopped: 3 });
		expect(executionServiceSpy).toHaveBeenCalledWith(
			{
				workflowId: 'all',
				status: ['running', 'waiting'],
				startedAfter: undefined,
				startedBefore: undefined,
			},
			expect.any(Array),
		);

		executionServiceSpy.mockRestore();
	});

	test('should stop executions filtered by workflowId', async () => {
		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'stopMany')
			.mockResolvedValue(2);

		const workflow = await createWorkflow({}, user1);

		const response = await authUser1Agent
			.post('/executions/stop')
			.send({ status: ['running'], workflowId: workflow.id });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ stopped: 2 });
		expect(executionServiceSpy).toHaveBeenCalledWith(
			{
				workflowId: workflow.id,
				status: ['running'],
				startedAfter: undefined,
				startedBefore: undefined,
			},
			expect.any(Array),
		);

		executionServiceSpy.mockRestore();
	});

	test('should stop executions with date filters', async () => {
		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'stopMany')
			.mockResolvedValue(1);

		await createWorkflow({}, user1);
		const startedAfter = '2024-01-01T00:00:00.000Z';
		const startedBefore = '2024-12-31T23:59:59.999Z';

		const response = await authUser1Agent.post('/executions/stop').send({
			status: ['running'],
			startedAfter,
			startedBefore,
		});

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ stopped: 1 });
		expect(executionServiceSpy).toHaveBeenCalledWith(
			{
				workflowId: 'all',
				status: ['running'],
				startedAfter,
				startedBefore,
			},
			expect.any(Array),
		);

		executionServiceSpy.mockRestore();
	});

	test('should validate workflowId access when provided', async () => {
		// Create a workflow for user1
		const workflow = await createWorkflow({}, user1);

		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'stopMany')
			.mockResolvedValue(1);

		// User1 should be able to stop executions in their own workflow
		const response = await authUser1Agent
			.post('/executions/stop')
			.send({ status: ['running'], workflowId: workflow.id });

		expect(response.statusCode).toBe(200);
		expect(executionServiceSpy).toHaveBeenCalled();
		expect(executionServiceSpy.mock.calls[0][0].workflowId).toBe(workflow.id);

		executionServiceSpy.mockRestore();
	});

	test('should return 0 stopped when user has no workflows', async () => {
		const executionServiceSpy = vi.spyOn(Container.get(ExecutionService), 'stopMany');

		// Create a new user with no workflows
		const userWithNoWorkflows = await createMemberWithApiKey();
		const authAgentWithNoWorkflows = testServer.publicApiAgentFor(userWithNoWorkflows);

		const response = await authAgentWithNoWorkflows
			.post('/executions/stop')
			.send({ status: ['running'] });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ stopped: 0 });
		// stopMany should not be called if user has no workflows
		expect(executionServiceSpy).not.toHaveBeenCalled();

		executionServiceSpy.mockRestore();
	});

	test('owner should be able to stop executions across all workflows', async () => {
		// Create some workflows so owner has workflows to access
		await createManyWorkflows(2, {}, owner);

		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'stopMany')
			.mockResolvedValue(5);

		const response = await authOwnerAgent
			.post('/executions/stop')
			.send({ status: ['running', 'waiting'] });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ stopped: 5 });

		executionServiceSpy.mockRestore();
	});

	test('member should only stop executions in their accessible workflows', async () => {
		testServer.license.enable('feat:sharing');

		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'stopMany')
			.mockResolvedValue(2);

		const [workflow1, workflow2] = await createManyWorkflows(2, {}, user1);
		const workflow3 = await createWorkflow({}, user2);

		// Share workflow3 with user1
		await shareWorkflowWithUsers(workflow3, [user1]);

		const response = await authUser1Agent.post('/executions/stop').send({ status: ['running'] });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ stopped: 2 });
		// Verify that the service was called with workflow IDs accessible to user1
		const calledWithWorkflowIds = executionServiceSpy.mock.calls[0][1];
		expect(calledWithWorkflowIds).toContain(workflow1.id);
		expect(calledWithWorkflowIds).toContain(workflow2.id);
		expect(calledWithWorkflowIds).toContain(workflow3.id);

		executionServiceSpy.mockRestore();
	});

	test('should map the queued status to the internal new status', async () => {
		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'stopMany')
			.mockResolvedValue(1);

		await createWorkflow({}, user1);

		const response = await authUser1Agent
			.post('/executions/stop')
			.send({ status: ['queued', 'running'] });

		expect(response.statusCode).toBe(200);
		expect(executionServiceSpy.mock.calls[0][0].status).toEqual(['new', 'running']);

		executionServiceSpy.mockRestore();
	});

	test('should return 400 for a status outside the stoppable set', async () => {
		const response = await authUser1Agent.post('/executions/stop').send({ status: ['success'] });

		expect(response.statusCode).toBe(400);
	});

	test('should return 404 for a workflowId the caller cannot access', async () => {
		await createWorkflow({}, user1);
		const otherWorkflow = await createWorkflow({}, owner);

		const response = await authUser1Agent
			.post('/executions/stop')
			.send({ status: ['running'], workflowId: otherWorkflow.id });

		expect(response.statusCode).toBe(404);
		expect(response.body.message).toBe('Workflow not found or not accessible');
	});

	test('should accept "all" as the workflowId', async () => {
		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'stopMany')
			.mockResolvedValue(4);

		await createWorkflow({}, user1);

		const response = await authUser1Agent
			.post('/executions/stop')
			.send({ status: ['running'], workflowId: 'all' });

		expect(response.statusCode).toBe(200);
		expect(executionServiceSpy.mock.calls[0][0].workflowId).toBe('all');

		executionServiceSpy.mockRestore();
	});

	test('should stop many when the API key has the "execution:stop" scope', async () => {
		const scopedOwner = await createOwnerWithApiKey({ scopes: ['execution:stop'] });
		const scopedAgent = testServer.publicApiAgentFor(scopedOwner);

		const executionServiceSpy = vi
			.spyOn(Container.get(ExecutionService), 'stopMany')
			.mockResolvedValue(2);

		await createWorkflow({}, scopedOwner);

		const response = await scopedAgent.post('/executions/stop').send({ status: ['running'] });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ stopped: 2 });

		executionServiceSpy.mockRestore();
	});

	test('should return 403 when the API key lacks the "execution:stop" scope', async () => {
		const scopedOwner = await createOwnerWithApiKey({ scopes: ['execution:read'] });
		const scopedAgent = testServer.publicApiAgentFor(scopedOwner);

		await createWorkflow({}, scopedOwner);

		const response = await scopedAgent.post('/executions/stop').send({ status: ['running'] });

		expect(response.statusCode).toBe(403);
	});
});
