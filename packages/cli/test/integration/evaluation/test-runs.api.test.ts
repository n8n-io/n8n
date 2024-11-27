import { Container } from 'typedi';

import type { TestDefinition } from '@/databases/entities/test-definition.ee';
import type { User } from '@/databases/entities/user';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { TestDefinitionRepository } from '@/databases/repositories/test-definition.repository.ee';
import { TestRunRepository } from '@/databases/repositories/test-run.repository.ee';
import { createUserShell } from '@test-integration/db/users';
import { createWorkflow } from '@test-integration/db/workflows';
import * as testDb from '@test-integration/test-db';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let authOwnerAgent: SuperAgentTest;
let workflowUnderTest: WorkflowEntity;
let otherWorkflow: WorkflowEntity;
let testDefinition: TestDefinition;
let otherTestDefinition: TestDefinition;
let ownerShell: User;

const testServer = utils.setupTestServer({ endpointGroups: ['evaluation'] });

beforeAll(async () => {
	ownerShell = await createUserShell('global:owner');
	authOwnerAgent = testServer.authAgentFor(ownerShell);
});

beforeEach(async () => {
	await testDb.truncate(['TestDefinition', 'TestRun']);

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

	test('should retrieve 404 if test definition does not exist', async () => {
		const resp = await authOwnerAgent.get('/evaluation/test-definitions/123/runs');

		expect(resp.statusCode).toBe(404);
	});

	test('should retrieve 404 if user does not have access to test definition', async () => {
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

	test('should retrieve 404 if test run does not exist', async () => {
		const resp = await authOwnerAgent.get(
			`/evaluation/test-definitions/${testDefinition.id}/runs/123`,
		);

		expect(resp.statusCode).toBe(404);
	});

	test('should retrieve 404 if user does not have access to test definition', async () => {
		const testRunRepository = Container.get(TestRunRepository);
		const testRun = await testRunRepository.createTestRun(otherTestDefinition.id);

		const resp = await authOwnerAgent.get(
			`/evaluation/test-definitions/${otherTestDefinition.id}/runs/${testRun.id}`,
		);

		expect(resp.statusCode).toBe(404);
	});
});
