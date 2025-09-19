import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import {
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	ProjectRepository,
	TestRunRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mockInstance } from 'n8n-core/test/utils';
import type { IWorkflowBase } from 'n8n-workflow';

import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { createTestRun, createTestCaseExecution } from '@test-integration/db/evaluation';
import { createUserShell } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let authOwnerAgent: SuperAgentTest;
let workflowUnderTest: IWorkflowBase;
let otherWorkflow: IWorkflowBase;
let ownerShell: User;

const testRunner = mockInstance(TestRunnerService);
let testRunRepository: TestRunRepository;

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'evaluation'],
	enabledFeatures: ['feat:sharing', 'feat:multipleMainInstances'],
});

beforeAll(async () => {
	ownerShell = await createUserShell(GLOBAL_OWNER_ROLE);
	authOwnerAgent = testServer.authAgentFor(ownerShell);
});

beforeEach(async () => {
	await testDb.truncate(['TestRun', 'TestCaseExecution', 'WorkflowEntity', 'SharedWorkflow']);

	testRunRepository = Container.get(TestRunRepository);

	workflowUnderTest = await createWorkflow({ name: 'workflow-under-test' }, ownerShell);
	otherWorkflow = await createWorkflow({ name: 'other-workflow' });
});

describe('GET /workflows/:workflowId/test-runs', () => {
	test('should retrieve empty list of test runs', async () => {
		const resp = await authOwnerAgent.get(`/workflows/${workflowUnderTest.id}/test-runs`);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual([]);
	});

	// TODO: replace with non existent workflow
	// test('should return 404 if test definition does not exist', async () => {
	// 	const resp = await authOwnerAgent.get('/evaluation/test-definitions/123/runs');
	//
	// 	expect(resp.statusCode).toBe(404);
	// });

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
		// Mark as running just to make a slight delay between the runs
		await testRunRepository.markAsRunning(testRun1.id);
		const testRun2 = await testRunRepository.createTestRun(workflowUnderTest.id);

		// Fetch the first page
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

		// Fetch the second page
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
		const memberShell = await createUserShell(GLOBAL_MEMBER_ROLE);
		const memberAgent = testServer.authAgentFor(memberShell);
		const memberPersonalProject = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(memberShell.id);

		// Share workflow with a member
		const sharingResponse = await authOwnerAgent
			.put(`/workflows/${workflowUnderTest.id}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] });

		expect(sharingResponse.statusCode).toBe(200);

		// Create a test run for the shared workflow
		await testRunRepository.createTestRun(workflowUnderTest.id);

		// Check if member can retrieve the test runs of a shared workflow
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
		const memberShell = await createUserShell(GLOBAL_MEMBER_ROLE);
		const memberAgent = testServer.authAgentFor(memberShell);
		const memberPersonalProject = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(memberShell.id);

		// Share workflow with a member
		const sharingResponse = await authOwnerAgent
			.put(`/workflows/${workflowUnderTest.id}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] });

		expect(sharingResponse.statusCode).toBe(200);

		// Create a test run for the shared workflow
		const testRun = await testRunRepository.createTestRun(workflowUnderTest.id);

		// Check if member can retrieve the test run of a shared workflow
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
		// Create a test run
		const testRun = await createTestRun(workflowUnderTest.id);

		// Create some test case executions for this test run
		await createTestCaseExecution(testRun.id, {
			status: 'success',
			runAt: new Date(),
			completedAt: new Date(),
			metrics: { accuracy: 0.95 },
		});

		await createTestCaseExecution(testRun.id, {
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
		// Create a test run with no test cases
		const testRun = await createTestRun(workflowUnderTest.id);

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
		const testRun = await createTestRun(otherWorkflow.id);

		const resp = await authOwnerAgent.get(
			`/workflows/${otherWorkflow.id}/test-runs/${testRun.id}/test-cases`,
		);

		expect(resp.statusCode).toBe(404);
	});

	test('should return test cases for a shared workflow', async () => {
		const memberShell = await createUserShell(GLOBAL_MEMBER_ROLE);
		const memberAgent = testServer.authAgentFor(memberShell);
		const memberPersonalProject = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(memberShell.id);

		// Share workflow with a member
		const sharingResponse = await authOwnerAgent
			.put(`/workflows/${workflowUnderTest.id}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] });

		expect(sharingResponse.statusCode).toBe(200);

		// Create a test run with test cases
		const testRun = await createTestRun(workflowUnderTest.id);

		await createTestCaseExecution(testRun.id, {
			status: 'success',
			runAt: new Date(),
			completedAt: new Date(),
			metrics: { precision: 0.87 },
		});

		// Check if member can retrieve the test cases of a shared workflow
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
