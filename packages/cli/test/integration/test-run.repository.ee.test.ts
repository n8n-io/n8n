import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { TestCaseExecutionRepository, TestRunRepository, TransactionRunner } from '@n8n/db';
import type { IWorkflowDb, TestRun, WorkflowEntity } from '@n8n/db';
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

	describe('markAsCancelledIfActive', () => {
		// Multi-main race guard: a cancel that lands after another main has
		// already finished the run must not overwrite the terminal state.
		it.each<[TestRun['status'], boolean]>([
			['new', true],
			['running', true],
			['completed', false],
			['error', false],
			['cancelled', false],
		])('a %s run is flipped to cancelled: %s', async (status, flipped) => {
			const workflow = await createWorkflow();
			const completedAt = flipped ? null : new Date('2026-01-01T00:00:00.000Z');
			const run = await createTestRun(workflow.id, { status, completedAt });

			expect(await testRunRepository.markAsCancelledIfActive(run.id)).toBe(flipped);

			const after = await testRunRepository.findOneByOrFail({ id: run.id });
			if (flipped) {
				expect(after.status).toBe('cancelled');
				expect(after.completedAt).toEqual(expect.any(Date));
			} else {
				expect(after.status).toBe(status);
				expect(after.completedAt).toEqual(completedAt);
			}
		});

		it('joins the transaction carried by ctx', async () => {
			const workflow = await createWorkflow();
			const run = await createTestRun(workflow.id, { status: 'running' });
			const txRunner = Container.get(TransactionRunner);

			await expect(
				txRunner.run({}, async (ctx) => {
					expect(await testRunRepository.markAsCancelledIfActive(run.id, ctx)).toBe(true);
					throw new Error('roll back');
				}),
			).rejects.toThrow('roll back');

			const after = await testRunRepository.findOneByOrFail({ id: run.id });
			expect(after.status).toBe('running');
		});
	});

	describe('markAsCancelled + markAllPendingAsCancelled', () => {
		it('cancel the run and its pending cases, leaving finished cases untouched', async () => {
			const workflow = await createWorkflow();
			const run = await createTestRun(workflow.id, { status: 'running' });
			const [pendingNew, pendingRunning, finished] = await Promise.all([
				createTestCaseExecution(run.id, { status: 'new' }),
				createTestCaseExecution(run.id, { status: 'running' }),
				createTestCaseExecution(run.id, { status: 'success' }),
			]);
			const txRunner = Container.get(TransactionRunner);
			const testCaseExecutionRepository = Container.get(TestCaseExecutionRepository);

			await txRunner.run({}, async (ctx) => {
				await testRunRepository.markAsCancelled(run.id, ctx);
				await testCaseExecutionRepository.markAllPendingAsCancelled(run.id, ctx);
			});

			const runAfter = await testRunRepository.findOneByOrFail({ id: run.id });
			expect(runAfter.status).toBe('cancelled');
			expect(runAfter.completedAt).toEqual(expect.any(Date));
			const statusOf = async (id: string) =>
				(await testCaseExecutionRepository.findOneByOrFail({ id })).status;
			expect(await statusOf(pendingNew.id)).toBe('cancelled');
			expect(await statusOf(pendingRunning.id)).toBe('cancelled');
			expect(await statusOf(finished.id)).toBe('success');
		});

		it('join the transaction carried by ctx', async () => {
			const workflow = await createWorkflow();
			const run = await createTestRun(workflow.id, { status: 'running' });
			const pending = await createTestCaseExecution(run.id, { status: 'new' });
			const txRunner = Container.get(TransactionRunner);
			const testCaseExecutionRepository = Container.get(TestCaseExecutionRepository);

			await expect(
				txRunner.run({}, async (ctx) => {
					await testRunRepository.markAsCancelled(run.id, ctx);
					await testCaseExecutionRepository.markAllPendingAsCancelled(run.id, ctx);
					throw new Error('roll back');
				}),
			).rejects.toThrow('roll back');

			const runAfter = await testRunRepository.findOneByOrFail({ id: run.id });
			const caseAfter = await testCaseExecutionRepository.findOneByOrFail({ id: pending.id });
			expect(runAfter.status).toBe('running');
			expect(caseAfter.status).toBe('new');
		});
	});
});
