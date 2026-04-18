import { mockLogger, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type * as BullModule from 'bull';
import { mock } from 'jest-mock-extended';
import { InstanceSettings, WorkflowExecute } from 'n8n-core';
import type { IRun, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { Workflow, createRunExecutionData } from 'n8n-workflow';

import { ManualExecutionService } from '@/manual-execution.service';
import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import { JOB_TYPE_NAME, QUEUE_NAME } from '../constants';
import { JobProcessor } from '../job-processor';
import { ScalingService } from '../scaling.service';
import type { Job, JobData, JobQueue } from '../scaling.types';

/**
 * Regression test for GHC-7734: Wait node breaks concurrency=1 in queue mode
 *
 * Issue: When a workflow with a Wait node is executed in queue mode with worker
 * concurrency=1, the Wait node releases the worker slot when reached, allowing
 * multiple executions to run simultaneously. This violates the concurrency=1 constraint.
 *
 * Root cause: When putExecutionToWait() is called, the workflow execution completes
 * with status 'waiting', which causes the job processor to finish and release the
 * worker slot in Bull queue, allowing the next job to start immediately.
 */
describe('Wait node concurrency in queue mode', () => {
	let scalingService: ScalingService;
	let jobProcessor: JobProcessor;
	let queue: JobQueue;
	let processCallback: (job: Job) => Promise<unknown>;

	const executionRepository = mock<ExecutionRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const nodeTypes = mock<NodeTypes>();
	const instanceSettings = Container.get(InstanceSettings);
	const manualExecutionService = mock<ManualExecutionService>();

	const globalConfig = mockInstance(GlobalConfig, {
		queue: {
			bull: {
				prefix: 'test-bull',
				settings: {},
			},
		},
		endpoints: {
			metrics: {
				includeQueueMetrics: false,
				queueMetricsInterval: 20,
			},
		},
		executions: {
			queueRecovery: {
				interval: 180,
				batchSize: 100,
			},
			timeout: -1,
			maxTimeout: -1,
			concurrency: {
				productionLimit: -1,
			},
		},
	});

	beforeEach(() => {
		jest.clearAllMocks();

		// @ts-expect-error readonly property
		instanceSettings.instanceType = 'worker';

		// Create a mock queue that captures the process callback
		queue = {
			process: jest.fn((jobType: string, concurrency: number, callback: typeof processCallback) => {
				processCallback = callback;
			}),
			on: jest.fn(),
			client: { ping: jest.fn() },
		} as unknown as JobQueue;

		// Mock Bull to return our mock queue
		jest.mock('bull', () => ({
			__esModule: true,
			default: jest.fn(() => queue),
		}));

		jobProcessor = new JobProcessor(
			mockLogger(),
			executionRepository,
			workflowRepository,
			nodeTypes,
			instanceSettings,
			manualExecutionService,
			globalConfig.executions,
			mock(),
		);

		scalingService = new ScalingService(
			mockLogger(),
			mock(),
			mock(),
			jobProcessor,
			globalConfig,
			executionRepository,
			instanceSettings,
			mock(),
		);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should not release worker slot when Wait node is encountered', async () => {
		/**
		 * Setup: Create a workflow with a Wait node that waits for 10 seconds
		 */
		const workflowData = {
			id: '1',
			name: 'Test Workflow with Wait',
			nodes: [
				{
					id: 'trigger',
					name: 'Start',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1,
					position: [250, 300] as [number, number],
					parameters: {},
				},
				{
					id: 'wait',
					name: 'Wait',
					type: 'n8n-nodes-base.wait',
					typeVersion: 1,
					position: [450, 300] as [number, number],
					parameters: {
						resume: 'timeInterval',
						amount: 10,
						unit: 'seconds',
					},
				},
			],
			connections: {
				Start: {
					main: [[{ node: 'Wait', type: 'main', index: 0 }]],
				},
			},
			active: true,
			settings: {},
			staticData: {},
		};

		// Create two execution records that would be processed
		const execution1 = {
			id: 'exec-1',
			workflowId: '1',
			workflowData,
			mode: 'trigger' as const,
			status: 'new' as const,
			data: {
				startData: {},
				resultData: { runData: {} },
			},
			startedAt: new Date(),
			stoppedAt: undefined,
			finished: false,
			storedAt: new Date(),
		};

		const execution2 = {
			id: 'exec-2',
			workflowId: '1',
			workflowData,
			mode: 'trigger' as const,
			status: 'new' as const,
			data: {
				startData: {},
				resultData: { runData: {} },
			},
			startedAt: new Date(),
			stoppedAt: undefined,
			finished: false,
			storedAt: new Date(),
		};

		executionRepository.findSingleExecution
			.mockResolvedValueOnce(execution1)
			.mockResolvedValueOnce(execution2);

		executionRepository.setRunning.mockResolvedValue(new Date());

		// Track active jobs - this is the key metric for the bug
		const activeJobs = new Set<string>();
		let maxConcurrentJobs = 0;

		// Mock the workflow execution to simulate Wait node behavior
		jest.spyOn(WorkflowExecute.prototype, 'processRunExecutionData').mockImplementation(function (
			this: WorkflowExecute,
		) {
			const executionId = (this as any).additionalData?.executionId;

			return new Promise((resolve) => {
				activeJobs.add(executionId);
				maxConcurrentJobs = Math.max(maxConcurrentJobs, activeJobs.size);

				// Simulate Wait node setting waitTill
				setTimeout(() => {
					const runData = this.runExecutionData;
					runData.waitTill = new Date(Date.now() + 10000); // Wait for 10 seconds

					const run: IRun = {
						mode: 'trigger',
						status: 'waiting',
						finished: false,
						startedAt: new Date(),
						stoppedAt: new Date(),
						data: createRunExecutionData({ resultData: { runData: {} } }),
						waitTill: runData.waitTill,
					};

					activeJobs.delete(executionId);
					resolve(run);
				}, 100); // Small delay to simulate node execution
			}) as any;
		});

		// Setup the worker with concurrency=1
		await scalingService.setupQueue();
		scalingService.setupWorker(1);

		expect(queue.process).toHaveBeenCalledWith(JOB_TYPE_NAME, 1, expect.any(Function));

		// Create two jobs
		const job1: Job = {
			id: 'job-1',
			data: {
				executionId: 'exec-1',
				workflowId: '1',
				loadStaticData: false,
			} as JobData,
			progress: jest.fn(),
		} as unknown as Job;

		const job2: Job = {
			id: 'job-2',
			data: {
				executionId: 'exec-2',
				workflowId: '1',
				loadStaticData: false,
			} as JobData,
			progress: jest.fn(),
		} as unknown as Job;

		/**
		 * Act: Process both jobs and track concurrency
		 */
		const job1Promise = processCallback(job1);
		const job2Promise = processCallback(job2);

		await Promise.all([job1Promise, job2Promise]);

		/**
		 * Assert: With concurrency=1, max concurrent jobs should never exceed 1
		 *
		 * BUG: Currently this test will FAIL because when the Wait node is encountered,
		 * the execution completes with status 'waiting', releasing the worker slot.
		 * This allows job2 to start before job1 has actually finished waiting,
		 * causing maxConcurrentJobs to be 2 instead of 1.
		 */
		expect(maxConcurrentJobs).toBe(1);
	});

	it('should keep worker slot occupied while execution is waiting', async () => {
		/**
		 * This test verifies that the worker slot is NOT released when an execution
		 * goes into waiting state. The execution should remain "active" from Bull's
		 * perspective until it actually completes (either after the wait period or
		 * when resumed by a webhook).
		 */
		const workflowData = {
			id: '1',
			name: 'Test Workflow',
			nodes: [
				{
					id: 'wait',
					name: 'Wait',
					type: 'n8n-nodes-base.wait',
					typeVersion: 1,
					position: [250, 300] as [number, number],
					parameters: {
						resume: 'timeInterval',
						amount: 5,
						unit: 'seconds',
					},
				},
			],
			connections: {},
			active: true,
			settings: {},
			staticData: {},
		};

		const execution = {
			id: 'exec-1',
			workflowId: '1',
			workflowData,
			mode: 'manual' as const,
			status: 'new' as const,
			data: {
				startData: {},
				resultData: { runData: {} },
			},
			startedAt: new Date(),
			stoppedAt: undefined,
			finished: false,
			storedAt: new Date(),
		};

		executionRepository.findSingleExecution.mockResolvedValue(execution);
		executionRepository.setRunning.mockResolvedValue(new Date());

		let jobCompleted = false;

		// Mock workflow execution to set waitTill
		jest.spyOn(WorkflowExecute.prototype, 'processRunExecutionData').mockImplementation(function (
			this: WorkflowExecute,
		) {
			return new Promise((resolve) => {
				const runData = this.runExecutionData;
				runData.waitTill = new Date(Date.now() + 5000);

				const run: IRun = {
					mode: 'manual',
					status: 'waiting',
					finished: false,
					startedAt: new Date(),
					stoppedAt: new Date(),
					data: createRunExecutionData({ resultData: { runData: {} } }),
					waitTill: runData.waitTill,
				};

				// The job should NOT complete immediately when waitTill is set
				setTimeout(() => {
					jobCompleted = true;
					resolve(run);
				}, 100);
			}) as any;
		});

		await scalingService.setupQueue();
		scalingService.setupWorker(1);

		const job: Job = {
			id: 'job-1',
			data: {
				executionId: 'exec-1',
				workflowId: '1',
				loadStaticData: false,
			} as JobData,
			progress: jest.fn(),
		} as unknown as Job;

		/**
		 * Act: Start processing the job
		 */
		const jobPromise = processCallback(job);

		// Wait a bit to let the workflow reach the Wait node
		await new Promise((resolve) => setTimeout(resolve, 50));

		/**
		 * Assert: The job should NOT have completed yet
		 *
		 * BUG: Currently this test will FAIL because the job completes immediately
		 * when waitTill is set, releasing the worker slot.
		 */
		expect(jobCompleted).toBe(false);

		// Wait for the job to actually complete
		await jobPromise;

		expect(jobCompleted).toBe(true);
	});
});
