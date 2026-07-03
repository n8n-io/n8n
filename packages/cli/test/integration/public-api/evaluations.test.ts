import { LicenseState } from '@n8n/backend-common';
import {
	createWorkflow,
	mockInstance,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { type MockInstance, vi } from 'vitest';

import { Telemetry } from '@/telemetry';

import { createTestCaseExecution, createTestRun } from '../shared/db/evaluation';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let authOwnerAgent: SuperAgentTest;
let licenseSpy: MockInstance;

mockInstance(Telemetry);

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	authOwnerAgent = testServer.publicApiAgentFor(owner);
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'TestRun', 'TestCaseExecution']);

	// `restoreMocks: true` un-spies between tests, so re-create the spy each
	// time. The evaluations read endpoints are gated behind a positive eval
	// quota; grant one for the licensed paths and override per-test where needed.
	licenseSpy = vi
		.spyOn(Container.get(LicenseState), 'getMaxWorkflowsWithEvaluations')
		.mockReturnValue(50);
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

	test('should return 402 when evaluations are not licensed', async () => {
		const workflow = await createWorkflow(undefined, owner);
		licenseSpy.mockReturnValue(0);

		await authOwnerAgent.get(`/workflows/${workflow.id}/test-runs`).expect(402);
	});

	test('should allow access on an unlimited evaluations quota (-1)', async () => {
		const workflow = await createWorkflow(undefined, owner);
		licenseSpy.mockReturnValue(-1);

		await authOwnerAgent.get(`/workflows/${workflow.id}/test-runs`).expect(200);
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

describe('scope and license enforcement on read endpoints', () => {
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

	test('should return 402 on single-run and cases when evaluations are not licensed', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const run = await createTestRun(workflow.id, { status: 'completed' });
		licenseSpy.mockReturnValue(0);

		await authOwnerAgent.get(`/workflows/${workflow.id}/test-runs/${run.id}`).expect(402);
		await authOwnerAgent
			.get(`/workflows/${workflow.id}/test-runs/${run.id}/test-cases`)
			.expect(402);
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
