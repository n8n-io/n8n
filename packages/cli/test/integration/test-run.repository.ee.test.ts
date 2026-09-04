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

	describe('findOneByIdAndWorkflowId', () => {
		it('returns the run when it belongs to the workflow', async () => {
			const workflow = await createWorkflow();
			const testRun = await createTestRun(workflow.id, { status: 'running' });

			const result = await testRunRepository.findOneByIdAndWorkflowId(testRun.id, workflow.id);

			expect(result).toEqual(expect.objectContaining({ id: testRun.id, workflowId: workflow.id }));
		});

		it('returns null when the run belongs to a different workflow', async () => {
			const workflowA = await createWorkflow();
			const workflowB = await createWorkflow();
			const runB = await createTestRun(workflowB.id, { status: 'running' });

			expect(await testRunRepository.findOneByIdAndWorkflowId(runB.id, workflowA.id)).toBeNull();
		});
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
