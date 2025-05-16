import type { User } from '@n8n/db';
import type { TestDefinition } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { TestDefinitionRepository } from '@n8n/db';
import { TestRunRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mockInstance } from 'n8n-core/test/utils';
import type { IWorkflowBase } from 'n8n-workflow';

import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { createUserShell } from '@test-integration/db/users';
import { createWorkflow } from '@test-integration/db/workflows';
import * as testDb from '@test-integration/test-db';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let authOwnerAgent: SuperAgentTest;
let workflowUnderTest: IWorkflowBase;
let otherWorkflow: IWorkflowBase;
let testDefinition: TestDefinition;
let otherTestDefinition: TestDefinition;
let ownerShell: User;

const testRunner = mockInstance(TestRunnerService);

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'evaluation'],
	enabledFeatures: ['feat:sharing', 'feat:multipleMainInstances'],
});

beforeAll(async () => {
	ownerShell = await createUserShell('global:owner');
	authOwnerAgent = testServer.authAgentFor(ownerShell);
});

beforeEach(async () => {
	await testDb.truncate(['TestDefinition', 'TestRun', 'WorkflowEntity', 'SharedWorkflow']);

	workflowUnderTest = await createWorkflow({ name: 'workflow-under-test' }, ownerShell);

	testDefinition = Container.get(TestDefinitionRepository).create({
		name: 'test',
		workflow: { id: workflowUnderTest.id },
	});
	await Container.get(TestDefinitionRepository).save(testDefinition);

	otherWorkflow = await createWorkflow({ name: 'other-workflow' });

	otherTestDefinition = Container.get(TestDefinitionRepository).create({
		name: 'other-test',
		workflow: { id: otherWorkflow.id },
	});
	await Container.get(TestDefinitionRepository).save(otherTestDefinition);
});

describe('GET /evaluation/test-definitions/:testDefinitionId/runs', () => {
	test('should retrieve empty list of runs for a test definition', async () => {
		const resp = await authOwnerAgent.get(`/evaluation/test-definitions/${testDefinition.id}/runs`);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual([]);
	});

	test('should return 404 if test definition does not exist', async () => {
		const resp = await authOwnerAgent.get('/evaluation/test-definitions/123/runs');

		expect(resp.statusCode).toBe(404);
	});

	test('should return 404 if user does not have access to test definition', async () => {
		const resp = await authOwnerAgent.get(
			`/evaluation/test-definitions/${otherTestDefinition.id}/runs`,
		);

		expect(resp.statusCode).toBe(404);
	});

	test('should retrieve list of runs for a test definition', async () => {
		const testRunRepository = Container.get(TestRunRepository);
		const testRun = await testRunRepository.createTestRun(testDefinition.id);

		const resp = await authOwnerAgent.get(`/evaluation/test-definitions/${testDefinition.id}/runs`);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual([
			expect.objectContaining({
				id: testRun.id,
				status: 'new',
				testDefinitionId: testDefinition.id,
				runAt: null,
				completedAt: null,
			}),
		]);
	});

	test('should retrieve list of runs for a test definition with pagination', async () => {
		const testRunRepository = Container.get(TestRunRepository);
		const testRun1 = await testRunRepository.createTestRun(testDefinition.id);
		// Mark as running just to make a slight delay between the runs
		await testRunRepository.markAsRunning(testRun1.id, 10);
		const testRun2 = await testRunRepository.createTestRun(testDefinition.id);

		// Fetch the first page
		const resp = await authOwnerAgent.get(
			`/evaluation/test-definitions/${testDefinition.id}/runs?take=1`,
		);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual([
			expect.objectContaining({
				id: testRun2.id,
				status: 'new',
				testDefinitionId: testDefinition.id,
				runAt: null,
				completedAt: null,
			}),
		]);

		// Fetch the second page
		const resp2 = await authOwnerAgent.get(
			`/evaluation/test-definitions/${testDefinition.id}/runs?take=1&skip=1`,
		);

		expect(resp2.statusCode).toBe(200);
		expect(resp2.body.data).toEqual([
			expect.objectContaining({
				id: testRun1.id,
				status: 'running',
				testDefinitionId: testDefinition.id,
				runAt: expect.any(String),
				completedAt: null,
			}),
		]);
	});
});

describe('GET /evaluation/test-definitions/:testDefinitionId/runs/:id', () => {
	test('should retrieve test run for a test definition', async () => {
		const testRunRepository = Container.get(TestRunRepository);
		const testRun = await testRunRepository.createTestRun(testDefinition.id);

		const resp = await authOwnerAgent.get(
			`/evaluation/test-definitions/${testDefinition.id}/runs/${testRun.id}`,
		);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual(
			expect.objectContaining({
				id: testRun.id,
				status: 'new',
				testDefinitionId: testDefinition.id,
				runAt: null,
				completedAt: null,
			}),
		);
	});

	test('should return 404 if test run does not exist', async () => {
		const resp = await authOwnerAgent.get(
			`/evaluation/test-definitions/${testDefinition.id}/runs/123`,
		);

		expect(resp.statusCode).toBe(404);
	});

	test('should return 404 if user does not have access to test definition', async () => {
		const testRunRepository = Container.get(TestRunRepository);
		const testRun = await testRunRepository.createTestRun(otherTestDefinition.id);

		const resp = await authOwnerAgent.get(
			`/evaluation/test-definitions/${otherTestDefinition.id}/runs/${testRun.id}`,
		);

		expect(resp.statusCode).toBe(404);
	});

	test('should retrieve test run for a test definition of a shared workflow', async () => {
		const memberShell = await createUserShell('global:member');
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
		const testRunRepository = Container.get(TestRunRepository);
		const testRun = await testRunRepository.createTestRun(testDefinition.id);

		// Check if member can retrieve the test run of a shared workflow
		const resp = await memberAgent.get(
			`/evaluation/test-definitions/${testDefinition.id}/runs/${testRun.id}`,
		);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual(
			expect.objectContaining({
				id: testRun.id,
			}),
		);
	});
});

describe('DELETE /evaluation/test-definitions/:testDefinitionId/runs/:id', () => {
	test('should delete test run for a test definition', async () => {
		const testRunRepository = Container.get(TestRunRepository);
		const testRun = await testRunRepository.createTestRun(testDefinition.id);

		const resp = await authOwnerAgent.delete(
			`/evaluation/test-definitions/${testDefinition.id}/runs/${testRun.id}`,
		);

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual({ success: true });

		const testRunAfterDelete = await testRunRepository.findOne({ where: { id: testRun.id } });
		expect(testRunAfterDelete).toBeNull();
	});

	test('should return 404 if test run does not exist', async () => {
		const resp = await authOwnerAgent.delete(
			`/evaluation/test-definitions/${testDefinition.id}/runs/123`,
		);

		expect(resp.statusCode).toBe(404);
	});

	test('should return 404 if user does not have access to test definition', async () => {
		const testRunRepository = Container.get(TestRunRepository);
		const testRun = await testRunRepository.createTestRun(otherTestDefinition.id);

		const resp = await authOwnerAgent.delete(
			`/evaluation/test-definitions/${otherTestDefinition.id}/runs/${testRun.id}`,
		);

		expect(resp.statusCode).toBe(404);
	});
});

describe('POST /evaluation/test-definitions/:testDefinitionId/runs/:id/cancel', () => {
	test('should cancel test run', async () => {
		const testRunRepository = Container.get(TestRunRepository);
		const testRun = await testRunRepository.createTestRun(testDefinition.id);

		jest.spyOn(testRunRepository, 'markAsCancelled');

		const resp = await authOwnerAgent.post(
			`/evaluation/test-definitions/${testDefinition.id}/runs/${testRun.id}/cancel`,
		);

		expect(resp.statusCode).toBe(202);
		expect(resp.body).toEqual({ success: true });

		expect(testRunner.cancelTestRun).toHaveBeenCalledWith(testRun.id);
	});

	test('should return 404 if test run does not exist', async () => {
		const resp = await authOwnerAgent.post(
			`/evaluation/test-definitions/${testDefinition.id}/runs/123/cancel`,
		);

		expect(resp.statusCode).toBe(404);
	});

	test('should return 404 if test definition does not exist', async () => {
		const resp = await authOwnerAgent.post('/evaluation/test-definitions/123/runs/123/cancel');

		expect(resp.statusCode).toBe(404);
	});

	test('should return 404 if user does not have access to test definition', async () => {
		const testRunRepository = Container.get(TestRunRepository);
		const testRun = await testRunRepository.createTestRun(otherTestDefinition.id);

		const resp = await authOwnerAgent.post(
			`/evaluation/test-definitions/${otherTestDefinition.id}/runs/${testRun.id}/cancel`,
		);

		expect(resp.statusCode).toBe(404);
	});
});
