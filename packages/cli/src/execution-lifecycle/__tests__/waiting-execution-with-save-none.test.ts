/**
 * Regression test for GHC-8083
 *
 * Bug: When a workflow has `saveDataSuccessExecution: "none"` (and potentially
 * `saveDataErrorExecution: "none"`), executions that enter a waiting state
 * (e.g., Wait node with resume="webhook") are prematurely deleted by the
 * `workflowExecuteAfter` hook, making them unavailable for resume via
 * `/webhook-waiting/<execId>`.
 *
 * Root cause: The hook's `shouldNotSave` logic treats waiting executions
 * (`status === 'waiting'`) as non-success executions, and if
 * `!saveSettings.error`, it deletes them even when `waitTill` is set.
 *
 * Expected: Waiting executions should NEVER be deleted, regardless of save
 * settings, because they are still active and waiting for external input.
 */

import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ExecutionRepository, UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { BinaryDataService, ErrorReporter, InstanceSettings } from 'n8n-core';
import { createRunExecutionData } from 'n8n-workflow';
import type { IRun, IWorkflowBase } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { ExecutionMetadataService } from '@/services/execution-metadata.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { getLifecycleHooksForRegularMain } from '../execution-lifecycle-hooks';

describe('[GHC-8083] Waiting execution with saveDataSuccessExecution: "none"', () => {
	mockInstance(Logger);
	mockInstance(InstanceSettings);
	mockInstance(ErrorReporter);
	const eventService = mockInstance(EventService);
	const executionRepository = mockInstance(ExecutionRepository);
	const executionPersistence = mockInstance(ExecutionPersistence);
	mockInstance(ExecutionMetadataService);
	mockInstance(ExternalHooks);
	mockInstance(Push);
	mockInstance(WorkflowStaticDataService);
	mockInstance(WorkflowStatisticsService);
	mockInstance(BinaryDataService);
	const userRepository = mockInstance(UserRepository);
	const redactionProxy = mockInstance(ExecutionRedactionServiceProxy);

	const executionId = 'test-execution-id';
	const workflowId = 'test-workflow-id';

	beforeEach(() => {
		jest.clearAllMocks();
		userRepository.findOne.mockResolvedValue(mock<User>());
		redactionProxy.processExecution.mockImplementation(async (execution) => execution);
	});

	describe('Regular mode (own execution)', () => {
		it('should NOT delete waiting execution when saveDataSuccessExecution=none and saveDataErrorExecution=all', async () => {
			// GHC-8083: Arrange - Workflow configured to not save successful executions
			const workflowData: IWorkflowBase = {
				id: workflowId,
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'some-version-id',
				isArchived: false,
				connections: {},
				nodes: [
					{
						id: 'wait-node-id',
						name: 'Wait',
						type: 'n8n-nodes-base.wait',
						typeVersion: 1,
						position: [100, 200],
						parameters: { resume: 'webhook' },
					},
				],
				settings: {
					saveDataSuccessExecution: 'none', // Do not save successful executions
					saveDataErrorExecution: 'all', // Save failed executions (default)
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const waitingRun = mock<IRun>({
				status: 'waiting',
				finished: false,
				waitTill: new Date(Date.now() + 60000), // Waiting for 1 minute
				storedAt: 'db',
			});
			waitingRun.data = createRunExecutionData({
				resultData: {
					lastNodeExecuted: 'Wait',
					runData: {
						Wait: [
							{
								startTime: Date.now(),
								executionTime: 100,
								source: [],
								executionIndex: 0,
								metadata: {
									resumeUrl: 'https://test.n8n.io/webhook-waiting/test-execution-id?signature=abc123',
								},
							},
						],
					},
				},
			});

			const lifecycleHooks = getLifecycleHooksForRegularMain(
				{
					executionMode: 'trigger',
					workflowData,
					userId: 'test-user-id',
				},
				executionId,
			);

			// GHC-8083: Act - Execute the workflowExecuteAfter hook
			await lifecycleHooks.runHook('workflowExecuteAfter', [waitingRun, {}]);

			// GHC-8083: Assert - Execution should NOT be deleted
			expect(executionPersistence.deleteInFlightExecution).not.toHaveBeenCalled();
		});

		it('should NOT delete waiting execution when both saveDataSuccessExecution=none AND saveDataErrorExecution=none', async () => {
			// GHC-8083: Arrange - Workflow configured to not save any executions
			// This is the most aggressive "do not save" configuration
			const workflowData: IWorkflowBase = {
				id: workflowId,
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'some-version-id',
				isArchived: false,
				connections: {},
				nodes: [
					{
						id: 'wait-node-id',
						name: 'Wait',
						type: 'n8n-nodes-base.wait',
						typeVersion: 1,
						position: [100, 200],
						parameters: { resume: 'webhook' },
					},
				],
				settings: {
					saveDataSuccessExecution: 'none', // Do not save successful executions
					saveDataErrorExecution: 'none', // Do not save failed executions either
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const waitingRun = mock<IRun>({
				status: 'waiting',
				finished: false,
				waitTill: new Date(Date.now() + 60000), // Waiting for 1 minute
				storedAt: 'db',
			});
			waitingRun.data = createRunExecutionData({
				resultData: {
					lastNodeExecuted: 'Wait',
					runData: {
						Wait: [
							{
								startTime: Date.now(),
								executionTime: 100,
								source: [],
								executionIndex: 0,
								metadata: {
									resumeUrl: 'https://test.n8n.io/webhook-waiting/test-execution-id?signature=abc123',
								},
							},
						],
					},
				},
			});

			const lifecycleHooks = getLifecycleHooksForRegularMain(
				{
					executionMode: 'trigger',
					workflowData,
					userId: 'test-user-id',
				},
				executionId,
			);

			// GHC-8083: Act - Execute the workflowExecuteAfter hook
			await lifecycleHooks.runHook('workflowExecuteAfter', [waitingRun, {}]);

			// GHC-8083: Assert - Execution should NOT be deleted even with aggressive "none" settings
			// A waiting execution is still active and needs to remain accessible for resume
			expect(executionPersistence.deleteInFlightExecution).not.toHaveBeenCalled();
		});

		it('should emit execution-waiting event for webhook wait nodes', async () => {
			// GHC-8083: Arrange - Verify that waiting events are emitted correctly
			const workflowData: IWorkflowBase = {
				id: workflowId,
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'some-version-id',
				isArchived: false,
				connections: {},
				nodes: [
					{
						id: 'wait-node-id',
						name: 'Wait',
						type: 'n8n-nodes-base.wait',
						typeVersion: 1,
						position: [100, 200],
						parameters: { resume: 'webhook' },
					},
				],
				settings: {
					saveDataSuccessExecution: 'none',
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const waitingRun = mock<IRun>({
				status: 'waiting',
				finished: false,
				waitTill: new Date(Date.now() + 60000),
				storedAt: 'db',
			});
			waitingRun.data = createRunExecutionData({
				resultData: {
					lastNodeExecuted: 'Wait',
					runData: {
						Wait: [
							{
								startTime: Date.now(),
								executionTime: 100,
								source: [],
								executionIndex: 0,
								metadata: {
									resumeUrl: 'https://test.n8n.io/webhook-waiting/test-execution-id?signature=abc123',
								},
							},
						],
					},
				},
			});

			const lifecycleHooks = getLifecycleHooksForRegularMain(
				{
					executionMode: 'trigger',
					workflowData,
					userId: 'test-user-id',
				},
				executionId,
			);

			// GHC-8083: Act
			await lifecycleHooks.runHook('workflowExecuteAfter', [waitingRun, {}]);

			// GHC-8083: Assert - execution-waiting event should be emitted
			expect(eventService.emit).toHaveBeenCalledWith('execution-waiting', {
				executionId,
				workflowId,
			});
		});
	});

	describe('Scaling mode (queue)', () => {
		const { getLifecycleHooksForScalingMain, getLifecycleHooksForScalingWorker } = require('../execution-lifecycle-hooks');

		it('should persist metadata for waiting execution in scaling main process', async () => {
			// GHC-8083: In scaling mode, main process should save metadata for waiting executions
			const workflowData: IWorkflowBase = {
				id: workflowId,
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'some-version-id',
				isArchived: false,
				connections: {},
				nodes: [
					{
						id: 'wait-node-id',
						name: 'Wait',
						type: 'n8n-nodes-base.wait',
						typeVersion: 1,
						position: [100, 200],
						parameters: { resume: 'webhook' },
					},
				],
				settings: {
					saveDataSuccessExecution: 'none',
					saveDataErrorExecution: 'none', // Aggressive "none" setting
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const waitingRun = mock<IRun>({
				status: 'waiting',
				finished: false,
				waitTill: new Date(Date.now() + 60000),
				storedAt: 'db',
			});
			waitingRun.data = createRunExecutionData({
				resultData: {
					lastNodeExecuted: 'Wait',
					runData: {
						Wait: [
							{
								startTime: Date.now(),
								executionTime: 100,
								source: [],
								executionIndex: 0,
								metadata: {
									resumeUrl: 'https://test.n8n.io/webhook-waiting/test-execution-id?signature=abc123',
								},
							},
						],
					},
					metadata: {
						customKey: 'customValue',
					},
				},
			});

			const lifecycleHooks = getLifecycleHooksForScalingMain(
				{
					executionMode: 'trigger',
					workflowData,
					userId: 'test-user-id',
				},
				executionId,
			);

			// GHC-8083: Act
			await lifecycleHooks.runHook('workflowExecuteAfter', [waitingRun]);

			// GHC-8083: Assert - Execution should NOT be deleted
			expect(executionPersistence.deleteInFlightExecution).not.toHaveBeenCalled();
		});


		it('[FAILING] should NOT delete waiting execution when waitTill is undefined in scaling mode', async () => {
			// GHC-8083: This test exposes a potential bug scenario
			// If waitTill is somehow not set correctly, the execution might be deleted
			const workflowData: IWorkflowBase = {
				id: workflowId,
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'some-version-id',
				isArchived: false,
				connections: {},
				nodes: [
					{
						id: 'wait-node-id',
						name: 'Wait',
						type: 'n8n-nodes-base.wait',
						typeVersion: 1,
						position: [100, 200],
						parameters: { resume: 'webhook' },
					},
				],
				settings: {
					saveDataSuccessExecution: 'none',
					saveDataErrorExecution: 'none',
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// GHC-8083: BUG SCENARIO - waitTill is undefined/null
			const waitingRunWithoutWaitTill = mock<IRun>({
				status: 'waiting',
				finished: false,
				waitTill: undefined, // This should never happen, but if it does...
				storedAt: 'db',
			});
			waitingRunWithoutWaitTill.data = createRunExecutionData({
				resultData: {
					lastNodeExecuted: 'Wait',
					runData: {},
				},
			});

			const lifecycleHooks = getLifecycleHooksForScalingMain(
				{
					executionMode: 'trigger',
					workflowData,
					userId: 'test-user-id',
				},
				executionId,
			);

			// GHC-8083: Act
			await lifecycleHooks.runHook('workflowExecuteAfter', [waitingRunWithoutWaitTill]);

			// GHC-8083: Assert - Even without waitTill, a WAITING execution should not be deleted
			// because status='waiting' indicates the execution is active
			expect(executionPersistence.deleteInFlightExecution).not.toHaveBeenCalled();
		});
	});
});
