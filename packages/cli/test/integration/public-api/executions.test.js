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
const telemetry_1 = require('@/telemetry');
const executions_1 = require('../shared/db/executions');
const users_1 = require('../shared/db/users');
const utils = __importStar(require('../shared/utils/'));
let owner;
let user1;
let user2;
let authOwnerAgent;
let authUser1Agent;
let authUser2Agent;
let workflowRunner;
(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });
beforeAll(async () => {
	owner = await (0, users_1.createOwnerWithApiKey)();
	user1 = await (0, users_1.createMemberWithApiKey)();
	user2 = await (0, users_1.createMemberWithApiKey)();
	await utils.initBinaryDataService();
	await utils.initNodeTypes();
	workflowRunner = await utils.initActiveWorkflowManager();
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate([
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
const testWithAPIKey = (method, url, apiKey) => async () => {
	void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
	const response = await authOwnerAgent[method](url);
	expect(response.statusCode).toBe(401);
};
describe('GET /executions/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/executions/1', null));
	test('should fail due to invalid API Key', testWithAPIKey('get', '/executions/1', 'abcXYZ'));
	test('owner should be able to get an execution owned by him', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const execution = await (0, executions_1.createSuccessfulExecution)(workflow);
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
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, user1);
		const execution = await (0, executions_1.createSuccessfulExecution)(workflow);
		const response = await authOwnerAgent.get(`/executions/${execution.id}`);
		expect(response.statusCode).toBe(200);
	});
	test('member should be able to fetch his own executions', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, user1);
		const execution = await (0, executions_1.createSuccessfulExecution)(workflow);
		const response = await authUser1Agent.get(`/executions/${execution.id}`);
		expect(response.statusCode).toBe(200);
	});
	test('member should not be able to fetch custom data when includeData is not set', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, user1);
		const execution = await (0, executions_1.createExecution)(
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
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, user1);
		const execution = await (0, executions_1.createExecution)(
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
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const execution = await (0, executions_1.createSuccessfulExecution)(workflow);
		const response = await authUser1Agent.get(`/executions/${execution.id}`);
		expect(response.statusCode).toBe(404);
	});
	test('member should be able to fetch executions of workflows shared with him', async () => {
		testServer.license.enable('feat:sharing');
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, user1);
		const execution = await (0, executions_1.createSuccessfulExecution)(workflow);
		await (0, backend_test_utils_1.shareWorkflowWithUsers)(workflow, [user2]);
		const response = await authUser2Agent.get(`/executions/${execution.id}`);
		expect(response.statusCode).toBe(200);
	});
});
describe('DELETE /executions/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('delete', '/executions/1', null));
	test('should fail due to invalid API Key', testWithAPIKey('delete', '/executions/1', 'abcXYZ'));
	test('should delete an execution', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const execution = await (0, executions_1.createSuccessfulExecution)(workflow);
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
describe('GET /executions', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/executions', null));
	test('should fail due to invalid API Key', testWithAPIKey('get', '/executions', 'abcXYZ'));
	test('should retrieve all successful executions', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const successfulExecution = await (0, executions_1.createSuccessfulExecution)(workflow);
		await (0, executions_1.createErrorExecution)(workflow);
		const response = await authOwnerAgent.get('/executions').query({
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
		expect(mode).toEqual(successfulExecution.mode);
		expect(retrySuccessId).toBeNull();
		expect(retryOf).toBeNull();
		expect(startedAt).not.toBeNull();
		expect(stoppedAt).not.toBeNull();
		expect(workflowId).toBe(successfulExecution.workflowId);
		expect(waitTill).toBeNull();
	});
	test('should paginate two executions', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const firstSuccessfulExecution = await (0, executions_1.createSuccessfulExecution)(workflow);
		const secondSuccessfulExecution = await (0, executions_1.createSuccessfulExecution)(workflow);
		await (0, executions_1.createErrorExecution)(workflow);
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
	test('should retrieve all error executions', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		await (0, executions_1.createSuccessfulExecution)(workflow);
		const errorExecution = await (0, executions_1.createErrorExecution)(workflow);
		const response = await authOwnerAgent.get('/executions').query({
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
	test('should return all waiting executions', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		await (0, executions_1.createSuccessfulExecution)(workflow);
		await (0, executions_1.createErrorExecution)(workflow);
		const waitingExecution = await (0, executions_1.createWaitingExecution)(workflow);
		const response = await authOwnerAgent.get('/executions').query({
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
	test('should retrieve all executions of specific workflow', async () => {
		const [workflow, workflow2] = await (0, backend_test_utils_1.createManyWorkflows)(2, {}, owner);
		const savedExecutions = await (0, executions_1.createManyExecutions)(
			2,
			workflow,
			executions_1.createSuccessfulExecution,
		);
		await (0, executions_1.createManyExecutions)(
			2,
			workflow2,
			executions_1.createSuccessfulExecution,
		);
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
	test('should return executions filtered by project ID', async () => {
		const [firstProject, secondProject] = await Promise.all([
			(0, backend_test_utils_1.createTeamProject)(),
			(0, backend_test_utils_1.createTeamProject)(),
		]);
		const [firstWorkflow, secondWorkflow] = await Promise.all([
			(0, backend_test_utils_1.createWorkflow)({}, firstProject),
			(0, backend_test_utils_1.createWorkflow)({}, secondProject),
		]);
		const [firstExecution, secondExecution, _] = await Promise.all([
			(0, executions_1.createExecution)({}, firstWorkflow),
			(0, executions_1.createExecution)({}, firstWorkflow),
			(0, executions_1.createExecution)({}, secondWorkflow),
		]);
		const response = await authOwnerAgent.get('/executions').query({
			projectId: firstProject.id,
		});
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(2);
		expect(response.body.nextCursor).toBeNull();
		expect(response.body.data.map((execution) => execution.id)).toEqual(
			expect.arrayContaining([firstExecution.id, secondExecution.id]),
		);
	});
	test('owner should retrieve all executions regardless of ownership', async () => {
		const [firstWorkflowForUser1, secondWorkflowForUser1] = await (0,
		backend_test_utils_1.createManyWorkflows)(2, {}, user1);
		await (0, executions_1.createManyExecutions)(
			2,
			firstWorkflowForUser1,
			executions_1.createSuccessfulExecution,
		);
		await (0, executions_1.createManyExecutions)(
			2,
			secondWorkflowForUser1,
			executions_1.createSuccessfulExecution,
		);
		const [firstWorkflowForUser2, secondWorkflowForUser2] = await (0,
		backend_test_utils_1.createManyWorkflows)(2, {}, user2);
		await (0, executions_1.createManyExecutions)(
			2,
			firstWorkflowForUser2,
			executions_1.createSuccessfulExecution,
		);
		await (0, executions_1.createManyExecutions)(
			2,
			secondWorkflowForUser2,
			executions_1.createSuccessfulExecution,
		);
		const response = await authOwnerAgent.get('/executions');
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(8);
		expect(response.body.nextCursor).toBe(null);
	});
	test('member should not see executions of workflows not shared with him', async () => {
		const [firstWorkflowForUser1, secondWorkflowForUser1] = await (0,
		backend_test_utils_1.createManyWorkflows)(2, {}, user1);
		await (0, executions_1.createManyExecutions)(
			2,
			firstWorkflowForUser1,
			executions_1.createSuccessfulExecution,
		);
		await (0, executions_1.createManyExecutions)(
			2,
			secondWorkflowForUser1,
			executions_1.createSuccessfulExecution,
		);
		const [firstWorkflowForUser2, secondWorkflowForUser2] = await (0,
		backend_test_utils_1.createManyWorkflows)(2, {}, user2);
		await (0, executions_1.createManyExecutions)(
			2,
			firstWorkflowForUser2,
			executions_1.createSuccessfulExecution,
		);
		await (0, executions_1.createManyExecutions)(
			2,
			secondWorkflowForUser2,
			executions_1.createSuccessfulExecution,
		);
		const response = await authUser1Agent.get('/executions');
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(4);
		expect(response.body.nextCursor).toBe(null);
	});
	test('member should also see executions of workflows shared with him', async () => {
		testServer.license.enable('feat:sharing');
		const [firstWorkflowForUser1, secondWorkflowForUser1] = await (0,
		backend_test_utils_1.createManyWorkflows)(2, {}, user1);
		await (0, executions_1.createManyExecutions)(
			2,
			firstWorkflowForUser1,
			executions_1.createSuccessfulExecution,
		);
		await (0, executions_1.createManyExecutions)(
			2,
			secondWorkflowForUser1,
			executions_1.createSuccessfulExecution,
		);
		const [firstWorkflowForUser2, secondWorkflowForUser2] = await (0,
		backend_test_utils_1.createManyWorkflows)(2, {}, user2);
		await (0, executions_1.createManyExecutions)(
			2,
			firstWorkflowForUser2,
			executions_1.createSuccessfulExecution,
		);
		await (0, executions_1.createManyExecutions)(
			2,
			secondWorkflowForUser2,
			executions_1.createSuccessfulExecution,
		);
		await (0, backend_test_utils_1.shareWorkflowWithUsers)(firstWorkflowForUser2, [user1]);
		const response = await authUser1Agent.get('/executions');
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(6);
		expect(response.body.nextCursor).toBe(null);
	});
});
//# sourceMappingURL=executions.test.js.map
