/**
 * Integration test to reproduce GHC-7772: Workflow execution status stays as 'running'
 * after node timeout — no automatic error state transition
 *
 * This test demonstrates that when a workflow execution times out, the execution status
 * in the database remains stuck as "running" instead of transitioning to "canceled" or "error".
 */

import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { TimeoutExecutionCancelledError } from 'n8n-workflow';
import { sleep } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';

import { createOwner } from './shared/db/users';
import { createExecution } from './shared/db/executions';

describe('Execution Timeout Status (GHC-7772)', () => {
	let executionRepository: ExecutionRepository;
	let activeExecutions: ActiveExecutions;
	let executionPersistence: ExecutionPersistence;
	let globalConfig: GlobalConfig;

	beforeAll(async () => {
		await testDb.init();

		executionRepository = Container.get(ExecutionRepository);
		activeExecutions = Container.get(ActiveExecutions);
		executionPersistence = Container.get(ExecutionPersistence);
		globalConfig = Container.get(GlobalConfig);
	});

	afterEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'ExecutionData', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('when an execution times out', () => {
		test('execution status should transition from "running" to "canceled" after stopExecution is called with TimeoutExecutionCancelledError', async () => {
			// ARRANGE
			const owner = await createOwner();
			const workflow = await createWorkflow({}, owner);

			// Create an execution in "running" state
			const execution = await createExecution(
				{
					status: 'running',
					finished: false,
					startedAt: new Date(),
					mode: 'manual',
				},
				workflow,
			);

			// Verify initial state
			expect(execution.status).toBe('running');

			// Simulate the workflow execution being tracked by ActiveExecutions
			// In a real scenario, this would be done by WorkflowRunner
			const mockPostExecutePromise = new Promise<void>((_, reject) => {
				// Simulate timeout cancellation
				setTimeout(() => {
					reject(new TimeoutExecutionCancelledError(execution.id));
				}, 100);
			});

			// ACT: Simulate timeout by calling stopExecution
			// This is what WorkflowRunner does when a timeout occurs
			activeExecutions.stopExecution(
				execution.id,
				new TimeoutExecutionCancelledError(execution.id),
			);

			// Wait a moment for async operations
			await sleep(500);

			// ASSERT
			const updatedExecution = await executionRepository.findOne({
				where: { id: execution.id },
			});

			expect(updatedExecution).toBeDefined();

			// BUG REPRODUCTION: The execution status should be "canceled" or "error" after timeout,
			// but it likely remains "running" because the workflowExecuteAfter hooks
			// may not be called when stopExecution is invoked.
			//
			// Expected behavior: status should be "canceled"
			// Actual behavior (bug): status remains "running"
			expect(updatedExecution?.status).not.toBe('running');
			expect(['canceled', 'error']).toContain(updatedExecution?.status);
			expect(updatedExecution?.finished).toBe(true);
			expect(updatedExecution?.stoppedAt).toBeDefined();
		});

		test('execution status should not remain "running" indefinitely after timeout', async () => {
			// ARRANGE
			const owner = await createOwner();
			const workflow = await createWorkflow({}, owner);

			// Create an execution that started 10 seconds ago with a 5-second timeout
			const startedAt = new Date(Date.now() - 10000); // 10 seconds ago

			const execution = await createExecution(
				{
					status: 'running',
					finished: false,
					startedAt,
					mode: 'manual',
				},
				workflow,
			);

			// ACT: Simulate the timeout error being thrown
			const timeoutError = new TimeoutExecutionCancelledError(execution.id);

			// Call stopExecution to cancel the execution
			activeExecutions.stopExecution(execution.id, timeoutError);

			// Wait for status update
			await sleep(500);

			// ASSERT
			const updatedExecution = await executionRepository.findOne({
				where: { id: execution.id },
			});

			expect(updatedExecution).toBeDefined();

			// The execution should not remain in "running" status
			// It should transition to "canceled" or "error"
			expect(updatedExecution?.status).not.toBe('running');
			expect(['canceled', 'error', 'crashed']).toContain(updatedExecution?.status);
		});

		test('execution with timeout should have stoppedAt timestamp', async () => {
			// ARRANGE
			const owner = await createOwner();
			const workflow = await createWorkflow({}, owner);

			const execution = await createExecution(
				{
					status: 'running',
					finished: false,
					startedAt: new Date(),
					stoppedAt: undefined,
					mode: 'manual',
				},
				workflow,
			);

			// ACT: Simulate timeout
			activeExecutions.stopExecution(
				execution.id,
				new TimeoutExecutionCancelledError(execution.id),
			);

			await sleep(500);

			// ASSERT
			const updatedExecution = await executionRepository.findOne({
				where: { id: execution.id },
			});

			expect(updatedExecution).toBeDefined();

			// BUG: After timeout, the execution should have a stoppedAt timestamp
			// but it might not be set if the status update doesn't happen
			expect(updatedExecution?.stoppedAt).toBeDefined();
			expect(updatedExecution?.stoppedAt).toBeInstanceOf(Date);
		});
	});

	describe('execution recovery', () => {
		test('should identify stuck "running" executions that have timed out', async () => {
			// ARRANGE
			const owner = await createOwner();
			const workflow = await createWorkflow({}, owner);

			// Create multiple executions in "running" state
			// Some started recently, some started long ago (timed out)
			const recentExecution = await createExecution(
				{
					status: 'running',
					finished: false,
					startedAt: new Date(Date.now() - 1000), // 1 second ago
					mode: 'manual',
				},
				workflow,
			);

			const timedOutExecution = await createExecution(
				{
					status: 'running',
					finished: false,
					startedAt: new Date(Date.now() - 600000), // 10 minutes ago
					mode: 'manual',
				},
				workflow,
			);

			// ACT: Query for running executions
			const runningExecutions = await executionRepository.find({
				where: { status: 'running' },
			});

			// ASSERT
			expect(runningExecutions).toHaveLength(2);

			// Both executions are in "running" state
			// The timedOutExecution should have been marked as "canceled" or "error"
			// This demonstrates the bug where executions can get stuck as "running"
			const timedOut = runningExecutions.find((e) => e.id === timedOutExecution.id);
			expect(timedOut).toBeDefined();
			expect(timedOut?.status).toBe('running'); // BUG: Should not be running

			// This test documents the expected behavior:
			// Executions that timeout should not remain in "running" status
			// They should be automatically transitioned to "canceled" or "error"
		});
	});
});
