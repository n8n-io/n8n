import {
	createWorkflow,
	mockInstance,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import { LICENSE_QUOTAS, UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import type { TestRun, User } from '@n8n/db';
import { ErrorReporter } from 'n8n-core';
import { EVALUATION_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { Telemetry } from '@/telemetry';

import { createTestCaseExecution, createTestRun } from '../shared/db/evaluation';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let authOwnerAgent: SuperAgentTest;

mockInstance(Telemetry);
const testRunner = mockInstance(TestRunnerService);
const errorReporter = mockInstance(ErrorReporter);

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

// A node array that satisfies the synchronous evaluation-trigger presence check.
const evaluationTriggerNodes: INode[] = [
	{
		id: 'uuid-eval-trigger',
		name: 'When fetching a dataset row',
		type: EVALUATION_TRIGGER_NODE_TYPE,
		typeVersion: 4.7,
		position: [0, 0],
		parameters: {},
	},
];

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	authOwnerAgent = testServer.publicApiAgentFor(owner);
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'TestRun', 'TestCaseExecution']);
});

describe('GET /workflows/:id/test-runs', () => {
	test('should return the test runs of a workflow', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const first = await createTestRun(workflow.id, { status: 'completed' });
		const second = await createTestRun(workflow.id, { status: 'error' });

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}/test-runs`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.nextCursor).toBeNull();
		expect(response.body.data.map((r: { id: string }) => r.id).sort()).toEqual(
			[first.id, second.id].sort(),
		);

		const run = response.body.data.find((r: { id: string }) => r.id === second.id);
		expect(run).toMatchObject({
			id: second.id,
			status: 'error',
			testCaseCount: expect.any(Number),
		});
		// sanitized: no internal entity fields leak
		expect(run).not.toHaveProperty('workflowId');
		expect(run).not.toHaveProperty('workflow');
		expect(run).not.toHaveProperty('runningInstanceId');
		expect(run).not.toHaveProperty('cancelRequested');
		expect(run).not.toHaveProperty('evaluationConfigId');
		expect(run).not.toHaveProperty('evaluationConfigSnapshot');
		expect(run).not.toHaveProperty('collectionId');
		expect(run).not.toHaveProperty('testCaseExecutions');
	});

	test('should filter test runs by status', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const completed = await createTestRun(workflow.id, { status: 'completed' });
		await createTestRun(workflow.id, { status: 'error' });

		const response = await authOwnerAgent
			.get(`/workflows/${workflow.id}/test-runs`)
			.query({ status: 'completed' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].id).toBe(completed.id);
	});

	test('should return 403 when the API key lacks the testRun:list scope', async () => {
		const restricted = await createOwnerWithApiKey({ scopes: ['workflow:read'] });
		const restrictedAgent = testServer.publicApiAgentFor(restricted);
		const workflow = await createWorkflow(undefined, restricted);

		await restrictedAgent.get(`/workflows/${workflow.id}/test-runs`).expect(403);
	});
});

describe('GET /workflows/:id/test-runs/:runId', () => {
	test('should return a single test run summary with finalResult', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const testRun = await createTestRun(workflow.id, {
			status: 'completed',
			metrics: { accuracy: 0.9 },
		});
		await createTestCaseExecution(testRun.id, { status: 'success' });
		await createTestCaseExecution(testRun.id, { status: 'success' });

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}/test-runs/${testRun.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toMatchObject({
			id: testRun.id,
			status: 'completed',
			metrics: { accuracy: 0.9 },
			finalResult: 'success',
			testCaseCount: 2,
		});
		expect(response.body).not.toHaveProperty('workflowId');
		expect(response.body).not.toHaveProperty('testCaseExecutions');
	});

	test('should return 404 for a run belonging to a different workflow', async () => {
		const workflowA = await createWorkflow(undefined, owner);
		const workflowB = await createWorkflow(undefined, owner);
		const runB = await createTestRun(workflowB.id, { status: 'completed' });

		await authOwnerAgent.get(`/workflows/${workflowA.id}/test-runs/${runB.id}`).expect(404);
	});
});

describe('GET /workflows/:id/test-runs/:runId/test-cases', () => {
	test('should return per-case results with sanitized fields', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const testRun = await createTestRun(workflow.id, { status: 'completed' });
		await createTestCaseExecution(testRun.id, {
			status: 'success',
			metrics: { accuracy: 1 },
			executionId: undefined,
		});

		const response = await authOwnerAgent.get(
			`/workflows/${workflow.id}/test-runs/${testRun.id}/test-cases`,
		);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);

		const [testCase] = response.body.data;
		expect(testCase).toMatchObject({ status: 'success', metrics: { accuracy: 1 } });
		expect(testCase).toHaveProperty('inputs');
		expect(testCase).toHaveProperty('outputs');
		// sanitized: no internal relations/indexes leak
		expect(testCase).not.toHaveProperty('testRun');
		expect(testCase).not.toHaveProperty('runIndex');
	});

	test('should paginate per-case results via cursor', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const testRun = await createTestRun(workflow.id, { status: 'completed' });
		for (let i = 0; i < 3; i++) {
			await createTestCaseExecution(testRun.id, { status: 'success' });
		}

		const firstPage = await authOwnerAgent
			.get(`/workflows/${workflow.id}/test-runs/${testRun.id}/test-cases`)
			.query({ limit: 2 });

		expect(firstPage.statusCode).toBe(200);
		expect(firstPage.body.data).toHaveLength(2);
		expect(firstPage.body.nextCursor).toEqual(expect.any(String));

		const secondPage = await authOwnerAgent
			.get(`/workflows/${workflow.id}/test-runs/${testRun.id}/test-cases`)
			.query({ cursor: firstPage.body.nextCursor });

		expect(secondPage.statusCode).toBe(200);
		expect(secondPage.body.data).toHaveLength(1);
		expect(secondPage.body.nextCursor).toBeNull();
	});

	test('should return 404 for a run belonging to a different workflow', async () => {
		const workflowA = await createWorkflow(undefined, owner);
		const workflowB = await createWorkflow(undefined, owner);
		const runB = await createTestRun(workflowB.id, { status: 'completed' });
		await createTestCaseExecution(runB.id, { status: 'success' });

		await authOwnerAgent
			.get(`/workflows/${workflowA.id}/test-runs/${runB.id}/test-cases`)
			.expect(404);
	});
});

describe('scope enforcement on read endpoints', () => {
	test('should return 403 on single-run and cases when the key lacks testRun:read', async () => {
		const restricted = await createOwnerWithApiKey({ scopes: ['workflow:read'] });
		const restrictedAgent = testServer.publicApiAgentFor(restricted);
		const workflow = await createWorkflow(undefined, restricted);
		const run = await createTestRun(workflow.id, { status: 'completed' });

		await restrictedAgent.get(`/workflows/${workflow.id}/test-runs/${run.id}`).expect(403);
		await restrictedAgent
			.get(`/workflows/${workflow.id}/test-runs/${run.id}/test-cases`)
			.expect(403);
	});

	test('should let a member read runs of a workflow shared with them', async () => {
		const member = await createMemberWithApiKey();
		const memberAgent = testServer.publicApiAgentFor(member);
		const workflow = await createWorkflow(undefined, owner);
		await shareWorkflowWithUsers(workflow, [member]);
		const run = await createTestRun(workflow.id, { status: 'completed' });

		const response = await memberAgent.get(`/workflows/${workflow.id}/test-runs`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.map((r: { id: string }) => r.id)).toContain(run.id);
	});
});

describe('POST /workflows/:id/test-runs', () => {
	beforeEach(() => {
		testRunner.startTestRun.mockReset();
		// Evaluations licensed and unlimited by default; individual tests override.
		testServer.license.setQuota(
			LICENSE_QUOTAS.WORKFLOWS_WITH_EVALUATION_LIMIT,
			UNLIMITED_LICENSE_QUOTA,
		);
	});

	test('should trigger a run and return the persisted testRunId', async () => {
		const workflow = await createWorkflow({ nodes: evaluationTriggerNodes }, owner);
		const testRun = await createTestRun(workflow.id, { status: 'new' });
		testRunner.startTestRun.mockResolvedValue({ testRun, finished: Promise.resolve() });

		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/test-runs`);

		expect(response.statusCode).toBe(201);
		expect(response.body).toEqual({
			id: testRun.id,
			status: testRun.status,
			createdAt: testRun.createdAt.toISOString(),
		});
		expect(testRunner.startTestRun).toHaveBeenCalledWith(
			expect.objectContaining({ id: owner.id }),
			workflow.id,
			1,
			{ via: 'public-api' },
		);
	});

	test('should return 403 when the API key lacks the testRun:create scope', async () => {
		const restricted = await createOwnerWithApiKey({ scopes: ['workflow:read'] });
		const restrictedAgent = testServer.publicApiAgentFor(restricted);
		const workflow = await createWorkflow({ nodes: evaluationTriggerNodes }, restricted);

		await restrictedAgent.post(`/workflows/${workflow.id}/test-runs`).expect(403);
		expect(testRunner.startTestRun).not.toHaveBeenCalled();
	});

	test('should return 403 when evaluations are not licensed (quota 0)', async () => {
		testServer.license.setQuota(LICENSE_QUOTAS.WORKFLOWS_WITH_EVALUATION_LIMIT, 0);
		const workflow = await createWorkflow({ nodes: evaluationTriggerNodes }, owner);

		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/test-runs`).expect(403);
		expect(response.body.message).toBe('Evaluations are not available on your plan');
		expect(testRunner.startTestRun).not.toHaveBeenCalled();
	});

	test('should return 402 when the workflow quota is exceeded on a new workflow', async () => {
		testServer.license.setQuota(LICENSE_QUOTAS.WORKFLOWS_WITH_EVALUATION_LIMIT, 1);
		// One workflow already has a run → the single slot is used up.
		const existing = await createWorkflow({ nodes: evaluationTriggerNodes }, owner);
		await createTestRun(existing.id, { status: 'completed' });

		const fresh = await createWorkflow({ nodes: evaluationTriggerNodes }, owner);
		await authOwnerAgent.post(`/workflows/${fresh.id}/test-runs`).expect(402);
		expect(testRunner.startTestRun).not.toHaveBeenCalled();
	});

	test('should allow re-running a workflow that already counts against the quota', async () => {
		testServer.license.setQuota(LICENSE_QUOTAS.WORKFLOWS_WITH_EVALUATION_LIMIT, 1);
		const workflow = await createWorkflow({ nodes: evaluationTriggerNodes }, owner);
		const previous = await createTestRun(workflow.id, { status: 'completed' });
		const next = await createTestRun(workflow.id, { status: 'new' });
		testRunner.startTestRun.mockResolvedValue({ testRun: next, finished: Promise.resolve() });

		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/test-runs`);

		expect(response.statusCode).toBe(201);
		expect(previous.id).not.toBe(next.id);
		expect(testRunner.startTestRun).toHaveBeenCalled();
	});

	test('should return 409 when the workflow has no evaluation trigger', async () => {
		const workflow = await createWorkflow(undefined, owner);

		await authOwnerAgent.post(`/workflows/${workflow.id}/test-runs`).expect(409);
		expect(testRunner.startTestRun).not.toHaveBeenCalled();
	});

	test('should return 404 when the workflow is not accessible', async () => {
		const foreign = await createWorkflow({ nodes: evaluationTriggerNodes });

		await authOwnerAgent.post(`/workflows/${foreign.id}/test-runs`).expect(404);
		expect(testRunner.startTestRun).not.toHaveBeenCalled();
	});

	test('should report a detached-run failure instead of leaving it unhandled', async () => {
		errorReporter.error.mockClear();
		const workflow = await createWorkflow({ nodes: evaluationTriggerNodes }, owner);
		const testRun = await createTestRun(workflow.id, { status: 'new' });
		const failure = new Error('detached failure');
		// Create the rejecting `finished` only when the handler consumes it, so it
		// isn't briefly unhandled during the request round-trip.
		testRunner.startTestRun.mockImplementation(async () => ({
			testRun,
			finished: Promise.reject(failure),
		}));

		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/test-runs`);

		expect(response.statusCode).toBe(201);
		// The handler's `.catch` routes the rejection to the error reporter.
		await vi.waitFor(() => expect(errorReporter.error).toHaveBeenCalledWith(failure));
	});
});

describe('POST /workflows/:id/test-runs/:runId/cancel', () => {
	beforeEach(() => {
		testRunner.cancelTestRun.mockReset();
		testRunner.canBeCancelled.mockReset();
		// Mirror the real (terminal-state) implementation.
		testRunner.canBeCancelled.mockImplementation(
			(run: TestRun) => run.status !== 'running' && run.status !== 'new',
		);
		testServer.license.setQuota(
			LICENSE_QUOTAS.WORKFLOWS_WITH_EVALUATION_LIMIT,
			UNLIMITED_LICENSE_QUOTA,
		);
	});

	test('should cancel a running test run', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const run = await createTestRun(workflow.id, { status: 'running' });

		const response = await authOwnerAgent.post(
			`/workflows/${workflow.id}/test-runs/${run.id}/cancel`,
		);

		expect(response.statusCode).toBe(202);
		expect(response.body).toEqual({ id: run.id, status: 'cancelled' });
		expect(testRunner.cancelTestRun).toHaveBeenCalledWith(run.id);
	});

	test('should return 409 when cancelling a terminal run', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const run = await createTestRun(workflow.id, { status: 'completed' });

		await authOwnerAgent.post(`/workflows/${workflow.id}/test-runs/${run.id}/cancel`).expect(409);
		expect(testRunner.cancelTestRun).not.toHaveBeenCalled();
	});

	test('should return 404 for a run belonging to a different workflow', async () => {
		const workflowA = await createWorkflow(undefined, owner);
		const workflowB = await createWorkflow(undefined, owner);
		const runB = await createTestRun(workflowB.id, { status: 'running' });

		await authOwnerAgent.post(`/workflows/${workflowA.id}/test-runs/${runB.id}/cancel`).expect(404);
		expect(testRunner.cancelTestRun).not.toHaveBeenCalled();
	});

	test('should return 403 when the API key lacks the testRun:cancel scope', async () => {
		const restricted = await createOwnerWithApiKey({ scopes: ['workflow:read'] });
		const restrictedAgent = testServer.publicApiAgentFor(restricted);
		const workflow = await createWorkflow(undefined, restricted);
		const run = await createTestRun(workflow.id, { status: 'running' });

		await restrictedAgent.post(`/workflows/${workflow.id}/test-runs/${run.id}/cancel`).expect(403);
		expect(testRunner.cancelTestRun).not.toHaveBeenCalled();
	});

	test('should return 403 when evaluations are not licensed (quota 0)', async () => {
		testServer.license.setQuota(LICENSE_QUOTAS.WORKFLOWS_WITH_EVALUATION_LIMIT, 0);
		const workflow = await createWorkflow(undefined, owner);
		const run = await createTestRun(workflow.id, { status: 'running' });

		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/test-runs/${run.id}/cancel`)
			.expect(403);
		expect(response.body.message).toBe('Evaluations are not available on your plan');
		expect(testRunner.cancelTestRun).not.toHaveBeenCalled();
	});
});
