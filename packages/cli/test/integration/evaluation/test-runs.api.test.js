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
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const utils_1 = require('n8n-core/test/utils');
const test_runner_service_ee_1 = require('@/evaluation.ee/test-runner/test-runner.service.ee');
const evaluation_1 = require('@test-integration/db/evaluation');
const users_1 = require('@test-integration/db/users');
const utils = __importStar(require('@test-integration/utils'));
let authOwnerAgent;
let workflowUnderTest;
let otherWorkflow;
let ownerShell;
const testRunner = (0, utils_1.mockInstance)(test_runner_service_ee_1.TestRunnerService);
let testRunRepository;
const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'evaluation'],
	enabledFeatures: ['feat:sharing', 'feat:multipleMainInstances'],
});
beforeAll(async () => {
	ownerShell = await (0, users_1.createUserShell)('global:owner');
	authOwnerAgent = testServer.authAgentFor(ownerShell);
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate([
		'TestRun',
		'TestCaseExecution',
		'WorkflowEntity',
		'SharedWorkflow',
	]);
	testRunRepository = di_1.Container.get(db_1.TestRunRepository);
	workflowUnderTest = await (0, backend_test_utils_1.createWorkflow)(
		{ name: 'workflow-under-test' },
		ownerShell,
	);
	otherWorkflow = await (0, backend_test_utils_1.createWorkflow)({ name: 'other-workflow' });
});
describe('GET /workflows/:workflowId/test-runs', () => {
	test('should retrieve empty list of test runs', async () => {
		const resp = await authOwnerAgent.get(`/workflows/${workflowUnderTest.id}/test-runs`);
		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual([]);
	});
	test('should return 404 if user does not have access to workflow', async () => {
		const testRun = await testRunRepository.createTestRun(otherWorkflow.id);
		const resp = await authOwnerAgent.get(`/workflows/${otherWorkflow.id}/test-runs/${testRun.id}`);
		expect(resp.statusCode).toBe(404);
	});
	test('should retrieve list of test runs for a workflow', async () => {
		const testRun = await testRunRepository.createTestRun(workflowUnderTest.id);
		const resp = await authOwnerAgent.get(`/workflows/${workflowUnderTest.id}/test-runs`);
		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual([
			expect.objectContaining({
				id: testRun.id,
				status: 'new',
				runAt: null,
				completedAt: null,
			}),
		]);
	});
	test('should retrieve list of test runs for a workflow with pagination', async () => {
		const testRun1 = await testRunRepository.createTestRun(workflowUnderTest.id);
		await testRunRepository.markAsRunning(testRun1.id);
		const testRun2 = await testRunRepository.createTestRun(workflowUnderTest.id);
		const resp = await authOwnerAgent.get(`/workflows/${workflowUnderTest.id}/test-runs?take=1`);
		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual([
			expect.objectContaining({
				id: testRun2.id,
				status: 'new',
				runAt: null,
				completedAt: null,
			}),
		]);
		const resp2 = await authOwnerAgent.get(
			`/workflows/${workflowUnderTest.id}/test-runs?take=1&skip=1`,
		);
		expect(resp2.statusCode).toBe(200);
		expect(resp2.body.data).toEqual([
			expect.objectContaining({
				id: testRun1.id,
				status: 'running',
				runAt: expect.any(String),
				completedAt: null,
			}),
		]);
	});
	test('should retrieve list of test runs for a shared workflow', async () => {
		const memberShell = await (0, users_1.createUserShell)('global:member');
		const memberAgent = testServer.authAgentFor(memberShell);
		const memberPersonalProject = await di_1.Container.get(
			db_1.ProjectRepository,
		).getPersonalProjectForUserOrFail(memberShell.id);
		const sharingResponse = await authOwnerAgent
			.put(`/workflows/${workflowUnderTest.id}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] });
		expect(sharingResponse.statusCode).toBe(200);
		await testRunRepository.createTestRun(workflowUnderTest.id);
		const resp = await memberAgent.get(`/workflows/${workflowUnderTest.id}/test-runs`);
		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toHaveLength(1);
	});
});
describe('GET /workflows/:workflowId/test-runs/:id', () => {
	test('should retrieve specific test run for a workflow', async () => {
		const testRun = await testRunRepository.createTestRun(workflowUnderTest.id);
		const resp = await authOwnerAgent.get(
			`/workflows/${workflowUnderTest.id}/test-runs/${testRun.id}`,
		);
		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual(
			expect.objectContaining({
				id: testRun.id,
				status: 'new',
				runAt: null,
				completedAt: null,
			}),
		);
	});
	test('should return 404 if test run does not exist', async () => {
		const resp = await authOwnerAgent.get(`/workflows/${workflowUnderTest.id}/test-runs/123`);
		expect(resp.statusCode).toBe(404);
	});
	test('should return 404 if user does not have access to the workflow', async () => {
		const testRun = await testRunRepository.createTestRun(otherWorkflow.id);
		const resp = await authOwnerAgent.get(`/workflows/${otherWorkflow.id}/test-runs/${testRun.id}`);
		expect(resp.statusCode).toBe(404);
	});
	test('should retrieve test run of a shared workflow', async () => {
		const memberShell = await (0, users_1.createUserShell)('global:member');
		const memberAgent = testServer.authAgentFor(memberShell);
		const memberPersonalProject = await di_1.Container.get(
			db_1.ProjectRepository,
		).getPersonalProjectForUserOrFail(memberShell.id);
		const sharingResponse = await authOwnerAgent
			.put(`/workflows/${workflowUnderTest.id}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] });
		expect(sharingResponse.statusCode).toBe(200);
		const testRun = await testRunRepository.createTestRun(workflowUnderTest.id);
		const resp = await memberAgent.get(
			`/workflows/${workflowUnderTest.id}/test-runs/${testRun.id}`,
		);
		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual(
			expect.objectContaining({
				id: testRun.id,
			}),
		);
	});
});
describe('DELETE /workflows/:workflowId/test-runs/:id', () => {
	test('should delete test run of a workflow', async () => {
		const testRun = await testRunRepository.createTestRun(workflowUnderTest.id);
		const resp = await authOwnerAgent.delete(
			`/workflows/${workflowUnderTest.id}/test-runs/${testRun.id}`,
		);
		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual({ success: true });
		const testRunAfterDelete = await testRunRepository.findOne({ where: { id: testRun.id } });
		expect(testRunAfterDelete).toBeNull();
	});
	test('should return 404 if test run does not exist', async () => {
		const resp = await authOwnerAgent.delete(`/workflows/${workflowUnderTest.id}/test-runs/123`);
		expect(resp.statusCode).toBe(404);
	});
	test('should return 404 if user does not have access to workflow', async () => {
		const testRun = await testRunRepository.createTestRun(otherWorkflow.id);
		const resp = await authOwnerAgent.delete(
			`/workflows/${otherWorkflow.id}/test-runs/${testRun.id}`,
		);
		expect(resp.statusCode).toBe(404);
	});
});
describe('POST /workflows/:workflowId/test-runs/:id/cancel', () => {
	test('should cancel test run', async () => {
		const testRun = await testRunRepository.createTestRun(workflowUnderTest.id);
		jest.spyOn(testRunRepository, 'markAsCancelled');
		const resp = await authOwnerAgent.post(
			`/workflows/${workflowUnderTest.id}/test-runs/${testRun.id}/cancel`,
		);
		expect(resp.statusCode).toBe(202);
		expect(resp.body).toEqual({ success: true });
		expect(testRunner.cancelTestRun).toHaveBeenCalledWith(testRun.id);
	});
	test('should return 404 if test run does not exist', async () => {
		const resp = await authOwnerAgent.post(
			`/workflows/${workflowUnderTest.id}/test-runs/123/cancel`,
		);
		expect(resp.statusCode).toBe(404);
	});
	test('should return 404 if workflow does not exist', async () => {
		const resp = await authOwnerAgent.post('/workflows/123/test-runs/123/cancel');
		expect(resp.statusCode).toBe(404);
	});
	test('should return 404 if user does not have access to the workflow', async () => {
		const testRun = await testRunRepository.createTestRun(otherWorkflow.id);
		const resp = await authOwnerAgent.post(
			`/workflows/${otherWorkflow.id}/test-runs/${testRun.id}/cancel`,
		);
		expect(resp.statusCode).toBe(404);
	});
});
describe('GET /workflows/:workflowId/test-runs/:id/test-cases', () => {
	test('should retrieve test cases for a specific test run', async () => {
		const testRun = await (0, evaluation_1.createTestRun)(workflowUnderTest.id);
		await (0, evaluation_1.createTestCaseExecution)(testRun.id, {
			status: 'success',
			runAt: new Date(),
			completedAt: new Date(),
			metrics: { accuracy: 0.95 },
		});
		await (0, evaluation_1.createTestCaseExecution)(testRun.id, {
			status: 'error',
			errorCode: 'UNKNOWN_ERROR',
			runAt: new Date(),
			completedAt: new Date(),
		});
		const resp = await authOwnerAgent.get(
			`/workflows/${workflowUnderTest.id}/test-runs/${testRun.id}/test-cases`,
		);
		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toHaveLength(2);
		expect(resp.body.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					status: 'success',
					metrics: { accuracy: 0.95 },
				}),
				expect.objectContaining({
					status: 'error',
					errorCode: 'UNKNOWN_ERROR',
				}),
			]),
		);
	});
	test('should return empty array when no test cases exist for a test run', async () => {
		const testRun = await (0, evaluation_1.createTestRun)(workflowUnderTest.id);
		const resp = await authOwnerAgent.get(
			`/workflows/${workflowUnderTest.id}/test-runs/${testRun.id}/test-cases`,
		);
		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual([]);
	});
	test('should return 404 if test run does not exist', async () => {
		const resp = await authOwnerAgent.get(
			`/workflows/${workflowUnderTest.id}/test-runs/non-existent-id/test-cases`,
		);
		expect(resp.statusCode).toBe(404);
	});
	test('should return 404 if user does not have access to the workflow', async () => {
		const testRun = await (0, evaluation_1.createTestRun)(otherWorkflow.id);
		const resp = await authOwnerAgent.get(
			`/workflows/${otherWorkflow.id}/test-runs/${testRun.id}/test-cases`,
		);
		expect(resp.statusCode).toBe(404);
	});
	test('should return test cases for a shared workflow', async () => {
		const memberShell = await (0, users_1.createUserShell)('global:member');
		const memberAgent = testServer.authAgentFor(memberShell);
		const memberPersonalProject = await di_1.Container.get(
			db_1.ProjectRepository,
		).getPersonalProjectForUserOrFail(memberShell.id);
		const sharingResponse = await authOwnerAgent
			.put(`/workflows/${workflowUnderTest.id}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] });
		expect(sharingResponse.statusCode).toBe(200);
		const testRun = await (0, evaluation_1.createTestRun)(workflowUnderTest.id);
		await (0, evaluation_1.createTestCaseExecution)(testRun.id, {
			status: 'success',
			runAt: new Date(),
			completedAt: new Date(),
			metrics: { precision: 0.87 },
		});
		const resp = await memberAgent.get(
			`/workflows/${workflowUnderTest.id}/test-runs/${testRun.id}/test-cases`,
		);
		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toHaveLength(1);
		expect(resp.body.data[0]).toMatchObject({
			status: 'success',
			metrics: { precision: 0.87 },
		});
	});
});
//# sourceMappingURL=test-runs.api.test.js.map
