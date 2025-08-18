import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { TestRunRepository } from '@n8n/db';
import type { IWorkflowDb, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';

import { createTestCaseExecution, createTestRun } from '@test-integration/db/evaluation';

describe('TestRunRepository', () => {
	let testRunRepository: TestRunRepository;

	beforeAll(async () => {
		await testDb.init();

		testRunRepository = Container.get(TestRunRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['User', 'WorkflowEntity', 'TestRun', 'TestCaseExecution']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getTestRunSummaryById', () => {
		let workflow: IWorkflowDb & WorkflowEntity;

		beforeAll(async () => {
			workflow = await createWorkflow();
		});

		it('should return the final result of a test run', async () => {
			const testRun = await createTestRun(workflow.id, {
				status: 'completed',
				runAt: new Date(),
				completedAt: new Date(),
				metrics: { total: 1, success: 1 },
			});

			await Promise.all([
				createTestCaseExecution(testRun.id, {
					status: 'success',
				}),
				createTestCaseExecution(testRun.id, {
					status: 'success',
				}),
			]);

			const result = await testRunRepository.getTestRunSummaryById(testRun.id);

			expect(result).toEqual(
				expect.objectContaining({
					id: testRun.id,
					workflowId: workflow.id,
					status: 'completed',
					finalResult: 'success',
					runAt: expect.any(Date),
					completedAt: expect.any(Date),
					metrics: { total: 1, success: 1 },
				}),
			);
		});
	});
});
