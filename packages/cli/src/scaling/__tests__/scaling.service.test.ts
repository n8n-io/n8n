import type { Logger } from '@n8n/backend-common';
import { mockLogger, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig, WorkerPoolConfig } from '@n8n/config';
import type { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import * as BullModule from 'bull';
import { ENCODED_BUFFER_KEY, InstanceSettings } from 'n8n-core';
import type { ErrorReporter } from 'n8n-core';
import { OperationalError, UnexpectedError } from 'n8n-workflow';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { JobHandedBackError } from '@/errors/job-handed-back.error';
import { ExecutionCrashService } from '@/executions/execution-crash.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';

import { JOB_TYPE_NAME } from '../constants';
import { JobOutcomeTracker } from '../job-outcome-tracker';
import type { JobProcessor } from '../job-processor';
import { ScalingService } from '../scaling.service';
import type { Job, JobData, JobId, JobQueue } from '../scaling.types';
import type { WebhookResponseRelay } from '../webhook-response-relay';

const queue = mock<JobQueue>({
	name: 'jobs',
	client: { ping: vi.fn() },
});

vi.mock('bull', () => ({
	__esModule: true,
	// Source does `new BullQueue(...)`; Vitest constructs the implementation, and
	// arrows aren't constructable. Use a regular function.
	default: vi.fn(function () {
		return queue;
	}),
}));

const { mcpServer } = vi.hoisted(() => ({
	mcpServer: {
		hasSession: vi.fn(),
		hasPendingResponse: vi.fn(),
		handleWorkerResponse: vi.fn(),
		setSessionStore: vi.fn(),
		setExecutionStrategy: vi.fn(),
		getPendingCallsManager: vi.fn(),
	},
}));

vi.mock('@n8n/n8n-nodes-langchain/mcp/core', () => ({
	McpServer: { instance: () => mcpServer },
	RedisSessionStore: vi.fn(function () {
		return {};
	}),
	QueuedExecutionStrategy: vi.fn(function () {
		return {};
	}),
}));

describe('ScalingService', () => {
	const Bull = vi.mocked(BullModule.default);

	const globalConfig = mockInstance(GlobalConfig, {
		queue: {
			bull: {
				prefix: 'bull',
				redis: {
					clusterNodes: '',
					host: 'localhost',
					password: '',
					port: 6379,
					tls: false,
				},
			},
			workerPool: Object.assign(new WorkerPoolConfig(), { enabled: true, name: '' }),
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
			queueRetention: {
				keepLastCompleted: 0,
				keepLastFailed: 0,
			},
		},
		generic: {
			gracefulShutdownTimeout: 30,
		},
	});

	const instanceSettings = Container.get(InstanceSettings);
	// The service scopes its logger on construction, so assertions go to the scoped mock.
	const scopedLogger = mock<Logger>();
	const logger = mock<Logger>({ scoped: () => scopedLogger });
	const errorReporter = mock<ErrorReporter>();
	const activeExecutions = mock<ActiveExecutions>();
	const jobProcessor = mock<JobProcessor>();
	const executionRepository = mock<ExecutionRepository>();
	const executionPersistence = mock<ExecutionPersistence>();
	const executionCrashService = mockInstance(ExecutionCrashService);
	const jobOutcomeTracker = mock<JobOutcomeTracker>();
	const webhookResponseRelay = mock<WebhookResponseRelay>();

	let scalingService: ScalingService;

	let registerMainOrWebhookListenersSpy: MockInstance;
	let registerWorkerListenersSpy: MockInstance;
	let scheduleQueueRecoverySpy: MockInstance;
	let stopQueueRecoverySpy: MockInstance;
	let stopQueueMetricsSpy: MockInstance;
	let getRunningJobsCountSpy: MockInstance;

	const expectedBullArgs = (queueName: string) => [
		queueName,
		{
			prefix: globalConfig.queue.bull.prefix,
			settings: { ...globalConfig.queue.bull.settings, maxStalledCount: 0 },
			createClient: expect.any(Function),
		},
	];

	const defaultBullArgs = expectedBullArgs('jobs');

	const startWorker = async () => {
		Object.assign(instanceSettings, { instanceType: 'worker' });
		await scalingService.setupQueue();
		scalingService.setupWorker(5);
		return queue.process.mock.calls[0][2] as unknown as (job: Job) => Promise<void>;
	};

	const lateJob = ({ attemptsMade = 0 }: { attemptsMade?: number } = {}) =>
		mock<Job>({
			id: '1',
			attemptsMade,
			opts: {},
			data: { executionId: '123', loadStaticData: false },
		});

	const LOCK_TOKEN = 'worker-token';
	let locks: Map<string, string>;
	let pipelineError: Error | undefined;

	const createLockPipeline = () => {
		const keys: string[] = [];
		const pipeline = {
			get: vi.fn((key: string) => {
				keys.push(key);
				return pipeline;
			}),
			exec: vi.fn(async () => {
				if (pipelineError) throw pipelineError;
				return keys.map((key) => [null, locks.get(key) ?? null]);
			}),
		};
		return pipeline;
	};

	const pipelineMock = vi.fn(createLockPipeline);

	beforeEach(() => {
		vi.clearAllMocks();
		locks = new Map();
		pipelineError = undefined;
		Object.assign(queue, { token: LOCK_TOKEN });
		Object.assign(queue.client, { pipeline: pipelineMock });
		queue.getActive.mockResolvedValue([]);
		// @ts-expect-error readonly property
		instanceSettings.instanceType = 'main';
		instanceSettings.markAsLeader();
		activeExecutions.getRunningExecutionIds.mockReturnValue([]);
		activeExecutions.cancelRunningExecutions.mockResolvedValue([]);
		jobProcessor.getRunningJobsSummary.mockReturnValue([]);
		jobProcessor.getJobsInPreflight.mockReturnValue([]);
		queue.whenCurrentJobsFinished.mockResolvedValue(undefined);
		globalConfig.generic.gracefulShutdownTimeout = 30;

		scalingService = new ScalingService(
			logger,
			errorReporter,
			activeExecutions,
			jobProcessor,
			globalConfig,
			executionRepository,
			executionPersistence,
			instanceSettings,
			mock(),
			webhookResponseRelay,
			executionCrashService,
			jobOutcomeTracker,
		);

		getRunningJobsCountSpy = vi.spyOn(scalingService, 'getRunningJobsCount');

		// @ts-expect-error Private method
		ScalingService.prototype.scheduleQueueRecovery = vi.fn();
		registerMainOrWebhookListenersSpy = vi.spyOn(scalingService, 'registerMainOrWebhookListeners');
		registerWorkerListenersSpy = vi.spyOn(scalingService, 'registerWorkerListeners');
		scheduleQueueRecoverySpy = vi.spyOn(scalingService, 'scheduleQueueRecovery');
		stopQueueRecoverySpy = vi.spyOn(scalingService, 'stopQueueRecovery');

		stopQueueMetricsSpy = vi.spyOn(scalingService, 'stopQueueMetrics');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('setupQueue', () => {
		describe('if leader main', () => {
			it('should set up queue + listeners + queue recovery', async () => {
				await scalingService.setupQueue();

				expect(Bull).toHaveBeenCalledWith(...defaultBullArgs);
				expect(registerMainOrWebhookListenersSpy).toHaveBeenCalled();
				expect(registerWorkerListenersSpy).not.toHaveBeenCalled();
				expect(scheduleQueueRecoverySpy).toHaveBeenCalledWith(0);
			});

			it('should recheck pending job waits when the Redis connection recovers', async () => {
				await scalingService.setupQueue();
				const { RedisClientService } = await import('@n8n/backend-services');

				// Completion events sent while the connection was down are lost
				// The service debounces its emits, so the event lands on the next second
				vi.useFakeTimers();
				Container.get(RedisClientService).emit('connection-recovered');
				await vi.advanceTimersByTimeAsync(1000);

				expect(jobOutcomeTracker.recheckAll).toHaveBeenCalled();
			});
		});

		describe('if follower main', () => {
			it('should set up queue + listeners', async () => {
				instanceSettings.markAsFollower();

				await scalingService.setupQueue();

				expect(Bull).toHaveBeenCalledWith(...defaultBullArgs);
				expect(registerMainOrWebhookListenersSpy).toHaveBeenCalled();
				expect(registerWorkerListenersSpy).not.toHaveBeenCalled();
				expect(scheduleQueueRecoverySpy).not.toHaveBeenCalled();
			});
		});

		describe('if worker', () => {
			it('should set up queue + listeners', async () => {
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';

				await scalingService.setupQueue();

				expect(Bull).toHaveBeenCalledWith(...defaultBullArgs);
				expect(registerWorkerListenersSpy).toHaveBeenCalled();
				expect(registerMainOrWebhookListenersSpy).not.toHaveBeenCalled();
			});
		});

		describe('webhook', () => {
			it('should set up a queue + listeners', async () => {
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'webhook';

				await scalingService.setupQueue();

				expect(Bull).toHaveBeenCalledWith(...defaultBullArgs);
				expect(registerWorkerListenersSpy).not.toHaveBeenCalled();
				expect(registerMainOrWebhookListenersSpy).toHaveBeenCalled();
			});
		});

		describe('queue name resolution', () => {
			afterEach(() => {
				globalConfig.queue.workerPool.name = '';
				globalConfig.queue.workerPool.enabled = true;
			});

			it('uses "jobs" on worker when pool is empty', async () => {
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';

				await scalingService.setupQueue();

				expect(Bull).toHaveBeenCalledWith(...expectedBullArgs('jobs'));
			});

			it('uses "jobs-<pool>" on worker when pool is set', async () => {
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';
				globalConfig.queue.workerPool.name = 'gpu';

				await scalingService.setupQueue();

				expect(Bull).toHaveBeenCalledWith(...expectedBullArgs('jobs-gpu'));
			});

			it('uses "jobs" on worker when a pool is set but pools are disabled', async () => {
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';
				globalConfig.queue.workerPool.name = 'gpu';
				globalConfig.queue.workerPool.enabled = false;

				await scalingService.setupQueue();

				expect(Bull).toHaveBeenCalledWith(...expectedBullArgs('jobs'));
			});

			it('ignores pool name on main and uses "jobs"', async () => {
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'main';
				globalConfig.queue.workerPool.name = 'gpu';

				await scalingService.setupQueue();

				expect(Bull).toHaveBeenCalledWith(...expectedBullArgs('jobs'));
			});

			it('ignores pool name on webhook and uses "jobs"', async () => {
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'webhook';
				globalConfig.queue.workerPool.name = 'gpu';

				await scalingService.setupQueue();

				expect(Bull).toHaveBeenCalledWith(...expectedBullArgs('jobs'));
			});
		});
	});

	describe('setupWorker', () => {
		it('should set up a worker with concurrency', async () => {
			// @ts-expect-error readonly property
			instanceSettings.instanceType = 'worker';
			await scalingService.setupQueue();
			const concurrency = 5;

			scalingService.setupWorker(concurrency);

			expect(queue.process).toHaveBeenCalledWith(JOB_TYPE_NAME, concurrency, expect.any(Function));
		});

		it('should throw if called on a non-worker instance', async () => {
			await scalingService.setupQueue();

			expect(() => scalingService.setupWorker(5)).toThrow();
		});

		it('should throw if called before queue is ready', async () => {
			// @ts-expect-error readonly property
			instanceSettings.instanceType = 'worker';

			expect(() => scalingService.setupWorker(5)).toThrow();
		});

		it('should report the original error even if notifying main of the failure fails', async () => {
			// @ts-expect-error readonly property
			instanceSettings.instanceType = 'worker';
			await scalingService.setupQueue();
			scalingService.setupWorker(5);
			const processFn = queue.process.mock.calls[0][2] as unknown as (job: Job) => Promise<void>;

			const job = mock<Job>({ id: '1', data: { executionId: '123', loadStaticData: false } });
			const originalError = new Error('execution errored');
			jobProcessor.processJob.mockRejectedValueOnce(originalError);
			// e.g. the job key was already deleted from Redis by a stall sweep
			job.progress.mockRejectedValueOnce(new Error('Missing key for job 1 updateProgress'));

			await expect(processFn(job)).rejects.toThrow(originalError);

			expect(scopedLogger.warn).toHaveBeenCalledWith(
				'Failed to notify main of failed execution 123 (job 1)',
				expect.objectContaining({ executionId: '123', jobId: '1' }),
			);
			expect(errorReporter.error).toHaveBeenCalledWith(originalError, { executionId: '123' });
		});

		describe('when a job reaches the worker after stop began', () => {
			it('should warn and hand the job back without running it', async () => {
				const processFn = await startWorker();
				jobProcessor.getRunningJobIds.mockReturnValue([]);
				const eventService = scalingService['eventService'];

				await scalingService.stop();

				const job = lateJob();
				await expect(processFn(job)).rejects.toBeInstanceOf(JobHandedBackError);

				expect(scopedLogger.warn).toHaveBeenCalledTimes(1);
				expect(scopedLogger.warn).toHaveBeenCalledWith(
					expect.stringContaining('123'),
					expect.objectContaining({ executionId: '123', jobId: '1' }),
				);
				expect(jobProcessor.processJob).not.toHaveBeenCalled();
				expect(eventService.emit).not.toHaveBeenCalledWith('job-dequeued', expect.anything());
			});

			it('should hand the job back without reporting a failure', async () => {
				const processFn = await startWorker();
				jobProcessor.getRunningJobIds.mockReturnValue([]);

				await scalingService.stop();

				const job = lateJob({ attemptsMade: 1 });
				await processFn(job).catch(() => {});

				expect(job.progress).not.toHaveBeenCalled();
				expect(errorReporter.error).not.toHaveBeenCalled();
			});
		});

		it('should process a job that reaches the worker before shutdown without warning', async () => {
			// @ts-expect-error readonly property
			instanceSettings.instanceType = 'worker';
			await scalingService.setupQueue();
			scalingService.setupWorker(5);
			const processFn = queue.process.mock.calls[0][2] as unknown as (job: Job) => Promise<void>;

			const job = mock<Job>({ id: '1', data: { executionId: '123', loadStaticData: false } });
			await processFn(job);

			expect(scopedLogger.warn).not.toHaveBeenCalled();
			expect(jobProcessor.processJob).toHaveBeenCalledWith(job);
		});
	});

	describe('stop', () => {
		describe('if main', () => {
			it('should pause queue, stop queue recovery and queue metrics', async () => {
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'main';
				await scalingService.setupQueue();
				// @ts-expect-error readonly property
				scalingService.queueRecoveryContext.timeout = 1;
				vi.spyOn(scalingService, 'isQueueMetricsEnabled', 'get').mockReturnValue(true);

				await scalingService.stop();

				expect(getRunningJobsCountSpy).not.toHaveBeenCalled();
				expect(queue.pause).toHaveBeenCalledWith(true, true);
				expect(stopQueueRecoverySpy).toHaveBeenCalled();
				expect(stopQueueMetricsSpy).toHaveBeenCalled();
			});

			it('should keep pending job waits so the active executions drain can settle them', async () => {
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'main';
				await scalingService.setupQueue();

				await scalingService.stop();

				expect(jobOutcomeTracker.clear).not.toHaveBeenCalled();
				expect(jobOutcomeTracker.drop).not.toHaveBeenCalled();
			});
		});

		describe('if worker', () => {
			it('should pause queue and wait for running jobs to finish', async () => {
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';
				await scalingService.setupQueue();
				jobProcessor.getRunningJobIds.mockReturnValue([]);

				await scalingService.stop();

				expect(getRunningJobsCountSpy).toHaveBeenCalled();
				expect(queue.pause).toHaveBeenCalled();
				expect(stopQueueRecoverySpy).not.toHaveBeenCalled();
			});

			it('should log the execution IDs it is waiting for while draining', async () => {
				vi.useFakeTimers();
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';
				await scalingService.setupQueue();
				jobProcessor.getRunningJobIds.mockReturnValueOnce(['1']).mockReturnValue([]);
				jobProcessor.getRunningJobsSummary.mockReturnValue([mock({ executionId: 'exec-1' })]);

				const stopped = scalingService.stop();
				await vi.advanceTimersByTimeAsync(500);
				await stopped;

				expect(scopedLogger.info).toHaveBeenCalledWith(
					'Waiting for 1 active executions to finish... (execution IDs: exec-1)',
					{ executionIds: ['exec-1'] },
				);
			});

			it('should log the execution IDs of jobs still in preflight while draining', async () => {
				vi.useFakeTimers();
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';
				await scalingService.setupQueue();
				jobProcessor.getRunningJobIds.mockReturnValueOnce(['1']).mockReturnValue([]);
				jobProcessor.getJobsInPreflight.mockReturnValue([{ jobId: '1', executionId: 'exec-1' }]);

				const stopped = scalingService.stop();
				await vi.advanceTimersByTimeAsync(500);
				await stopped;

				expect(scopedLogger.info).toHaveBeenCalledWith(
					'Waiting for 1 executions to start... (execution IDs: exec-1)',
					{ executionIds: ['exec-1'] },
				);
			});

			it('should keep waiting for an in-process execution that has no queue job', async () => {
				vi.useFakeTimers();
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';
				await scalingService.setupQueue();
				jobProcessor.getRunningJobIds.mockReturnValue([]);

				let inProcessExecutionIds = ['exec-1'];
				activeExecutions.getRunningExecutionIds.mockImplementation(() => inProcessExecutionIds);

				let hasStopped = false;
				const stopped = scalingService.stop().then(() => (hasStopped = true));

				await vi.advanceTimersByTimeAsync(2_000);

				expect(hasStopped).toBe(false);
				expect(scopedLogger.info).toHaveBeenCalledWith(
					'Waiting for 1 in-process executions to finish... (execution IDs: exec-1)',
					{ executionIds: ['exec-1'] },
				);

				inProcessExecutionIds = [];
				await vi.advanceTimersByTimeAsync(500);
				await stopped;

				expect(hasStopped).toBe(true);
				expect(scopedLogger.warn).not.toHaveBeenCalled();
			});

			it('should stop waiting and cancel the executions once the drain budget is spent', async () => {
				vi.useFakeTimers();
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';
				// The budget is 80% of the shutdown window, so 4s of the 5s here.
				globalConfig.generic.gracefulShutdownTimeout = 5;
				await scalingService.setupQueue();
				jobProcessor.getRunningJobIds.mockReturnValue([]);
				activeExecutions.getRunningExecutionIds.mockReturnValue(['exec-1']);
				activeExecutions.cancelRunningExecutions.mockResolvedValue(['exec-1']);

				let hasStopped = false;
				const stopped = scalingService.stop().then(() => (hasStopped = true));

				await vi.advanceTimersByTimeAsync(3_500);

				expect(hasStopped).toBe(false);
				expect(activeExecutions.cancelRunningExecutions).not.toHaveBeenCalled();

				await vi.advanceTimersByTimeAsync(500);
				await stopped;

				expect(hasStopped).toBe(true);
				expect(activeExecutions.cancelRunningExecutions).toHaveBeenCalled();
				expect(scopedLogger.warn).toHaveBeenCalledWith(
					'Drain timeout reached after 4s, shutting down with executions still active...',
				);
				expect(scopedLogger.warn).toHaveBeenCalledWith(
					'Cancelled 1 in-process executions that could not finish before shutdown (execution IDs: exec-1)',
					{ executionIds: ['exec-1'] },
				);
			});

			it('should not finish the drain until the cancellation has settled', async () => {
				vi.useFakeTimers();
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';
				globalConfig.generic.gracefulShutdownTimeout = 5;
				await scalingService.setupQueue();
				jobProcessor.getRunningJobIds.mockReturnValue([]);
				activeExecutions.getRunningExecutionIds.mockReturnValue(['exec-1']);

				let finishCancellation: (executionIds: string[]) => void = () => {};
				activeExecutions.cancelRunningExecutions.mockReturnValue(
					new Promise((resolve) => (finishCancellation = resolve)),
				);

				let hasStopped = false;
				const stopped = scalingService.stop().then(() => (hasStopped = true));

				await vi.advanceTimersByTimeAsync(4_000);

				expect(activeExecutions.cancelRunningExecutions).toHaveBeenCalled();
				expect(hasStopped).toBe(false);

				finishCancellation(['exec-1']);
				await stopped;

				expect(hasStopped).toBe(true);
				expect(scopedLogger.warn).toHaveBeenCalledWith(
					'Cancelled 1 in-process executions that could not finish before shutdown (execution IDs: exec-1)',
					{ executionIds: ['exec-1'] },
				);
			});

			it('should still drain for part of a one-second shutdown window', async () => {
				vi.useFakeTimers();
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';
				globalConfig.generic.gracefulShutdownTimeout = 1;
				await scalingService.setupQueue();
				jobProcessor.getRunningJobIds.mockReturnValue([]);

				let inProcessExecutionIds = ['exec-1'];
				activeExecutions.getRunningExecutionIds.mockImplementation(() => inProcessExecutionIds);

				let hasStopped = false;
				const stopped = scalingService.stop().then(() => (hasStopped = true));

				await vi.advanceTimersByTimeAsync(0);

				expect(hasStopped).toBe(false);

				inProcessExecutionIds = [];
				await vi.advanceTimersByTimeAsync(500);
				await stopped;

				expect(hasStopped).toBe(true);
				expect(activeExecutions.cancelRunningExecutions).not.toHaveBeenCalled();
				expect(scopedLogger.warn).not.toHaveBeenCalled();
			});

			// The two warnings are the drain timeout and the cancellation summary.
			it.each([
				{ inProcessExecutionIds: [], expectedCancelCalls: 0, expectedWarnings: 0 },
				{ inProcessExecutionIds: ['exec-1'], expectedCancelCalls: 1, expectedWarnings: 2 },
			])(
				'should wait for queued jobs past the drain budget, then cancel in-process executions only if any are left (in-process: $inProcessExecutionIds)',
				async ({ inProcessExecutionIds, expectedCancelCalls, expectedWarnings }) => {
					vi.useFakeTimers();
					// @ts-expect-error readonly property
					instanceSettings.instanceType = 'worker';
					globalConfig.generic.gracefulShutdownTimeout = 2;
					await scalingService.setupQueue();

					let runningJobIds = ['1'];
					jobProcessor.getRunningJobIds.mockImplementation(() => runningJobIds);
					activeExecutions.getRunningExecutionIds.mockReturnValue(inProcessExecutionIds);
					activeExecutions.cancelRunningExecutions.mockResolvedValue(inProcessExecutionIds);

					let hasStopped = false;
					const stopped = scalingService.stop().then(() => (hasStopped = true));

					await vi.advanceTimersByTimeAsync(10_000);

					expect(hasStopped).toBe(false);
					expect(activeExecutions.cancelRunningExecutions).not.toHaveBeenCalled();
					expect(scopedLogger.warn).not.toHaveBeenCalled();

					runningJobIds = [];
					await vi.advanceTimersByTimeAsync(500);
					await stopped;

					expect(hasStopped).toBe(true);
					expect(activeExecutions.cancelRunningExecutions).toHaveBeenCalledTimes(
						expectedCancelCalls,
					);
					expect(scopedLogger.warn).toHaveBeenCalledTimes(expectedWarnings);
				},
			);

			it('should cancel within the shutdown window when the window is short', async () => {
				vi.useFakeTimers();
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';
				// The budget is 800ms, which the force-exit timer at 1s must not beat.
				globalConfig.generic.gracefulShutdownTimeout = 1;
				await scalingService.setupQueue();
				jobProcessor.getRunningJobIds.mockReturnValue([]);
				activeExecutions.getRunningExecutionIds.mockReturnValue(['exec-1']);
				activeExecutions.cancelRunningExecutions.mockResolvedValue(['exec-1']);

				let hasStopped = false;
				const stopped = scalingService.stop().then(() => (hasStopped = true));

				await vi.advanceTimersByTimeAsync(800);

				expect(hasStopped).toBe(true);
				expect(activeExecutions.cancelRunningExecutions).toHaveBeenCalled();

				await stopped;
			});

			it('should not drain or warn when the shutdown window is zero', async () => {
				vi.useFakeTimers();
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';
				globalConfig.generic.gracefulShutdownTimeout = 0;
				await scalingService.setupQueue();
				jobProcessor.getRunningJobIds.mockReturnValue([]);
				activeExecutions.getRunningExecutionIds.mockReturnValue(['exec-1']);

				let hasStopped = false;
				const stopped = scalingService.stop().then(() => (hasStopped = true));

				await vi.advanceTimersByTimeAsync(0);
				await stopped;

				expect(hasStopped).toBe(true);
				expect(activeExecutions.cancelRunningExecutions).not.toHaveBeenCalled();
				expect(scopedLogger.warn).not.toHaveBeenCalled();
			});

			it('should not finish stopping until the current jobs of the queue have finished', async () => {
				vi.useFakeTimers();
				await startWorker();
				jobProcessor.getRunningJobIds.mockReturnValue([]);

				let finishCurrentJobs: () => void = () => {};
				queue.whenCurrentJobsFinished.mockReturnValue(
					new Promise<void>((resolve) => (finishCurrentJobs = resolve)),
				);

				let hasStopped = false;
				const stopped = scalingService.stop().then(() => (hasStopped = true));

				await vi.advanceTimersByTimeAsync(1_000);

				expect(hasStopped).toBe(false);

				finishCurrentJobs();
				await vi.advanceTimersByTimeAsync(0);

				expect(hasStopped).toBe(true);
				await stopped;
			});

			it('should finish stopping after 5s when the current jobs of the queue never finish', async () => {
				vi.useFakeTimers();
				await startWorker();
				jobProcessor.getRunningJobIds.mockReturnValue([]);
				queue.whenCurrentJobsFinished.mockReturnValue(new Promise<void>(() => {}));

				let hasStopped = false;
				const stopped = scalingService.stop().then(() => (hasStopped = true));

				await vi.advanceTimersByTimeAsync(4_999);

				expect(hasStopped).toBe(false);

				await vi.advanceTimersByTimeAsync(1);

				expect(hasStopped).toBe(true);
				await stopped;
			});

			it.each([
				{
					shutdownTimeout: 2,
					drainMs: 0,
					expectedStopMs: 1_000,
					case: 'the shutdown window is short',
				},
				{
					shutdownTimeout: 6,
					drainMs: 3_000,
					expectedStopMs: 4_500,
					case: 'the drain used part of the shutdown window',
				},
				{
					shutdownTimeout: 8,
					drainMs: 0,
					expectedStopMs: 4_000,
					case: 'the shutdown window is long',
				},
			])(
				'should finish stopping halfway through what is left of the shutdown window when $case',
				async ({ shutdownTimeout, drainMs, expectedStopMs }) => {
					vi.useFakeTimers();
					globalConfig.generic.gracefulShutdownTimeout = shutdownTimeout;
					await startWorker();
					const drainStart = Date.now();
					jobProcessor.getRunningJobIds.mockImplementation(() =>
						Date.now() - drainStart < drainMs ? ['1'] : [],
					);
					queue.whenCurrentJobsFinished.mockReturnValue(new Promise<void>(() => {}));

					let hasStopped = false;
					const stopped = scalingService.stop().then(() => (hasStopped = true));

					await vi.advanceTimersByTimeAsync(expectedStopMs - 1);

					expect(hasStopped).toBe(false);

					await vi.advanceTimersByTimeAsync(1);

					expect(hasStopped).toBe(true);
					await stopped;
				},
			);

			it('should finish stopping and cancel the in-process executions when waiting for the current jobs of the queue fails', async () => {
				vi.useFakeTimers();
				globalConfig.generic.gracefulShutdownTimeout = 5;
				await startWorker();
				jobProcessor.getRunningJobIds.mockReturnValue([]);
				activeExecutions.getRunningExecutionIds.mockReturnValue(['exec-1']);
				activeExecutions.cancelRunningExecutions.mockResolvedValue(['exec-1']);
				queue.whenCurrentJobsFinished.mockRejectedValue(new Error('Connection is closed.'));

				const outcome = scalingService.stop().then(
					() => 'resolved',
					() => 'rejected',
				);

				await vi.advanceTimersByTimeAsync(5_000);

				expect(await outcome).toBe('resolved');
				expect(activeExecutions.cancelRunningExecutions).toHaveBeenCalled();
				expect(scopedLogger.warn).toHaveBeenCalledWith(
					'Cancelled 1 in-process executions that could not finish before shutdown (execution IDs: exec-1)',
					{ executionIds: ['exec-1'] },
				);
			});

			it.each([
				{ shutdownTimeout: 30, expectedDeadlineMs: 3_000, case: 'the ceiling on a wide window' },
				{
					shutdownTimeout: 10,
					expectedDeadlineMs: 1_000,
					case: 'half of a short window remainder',
				},
				{ shutdownTimeout: 1, expectedDeadlineMs: 100, case: 'half of a tiny window remainder' },
			])(
				'should give the cancellation write $case',
				async ({ shutdownTimeout, expectedDeadlineMs }) => {
					vi.useFakeTimers();
					// @ts-expect-error readonly property
					instanceSettings.instanceType = 'worker';
					globalConfig.generic.gracefulShutdownTimeout = shutdownTimeout;
					await scalingService.setupQueue();
					jobProcessor.getRunningJobIds.mockReturnValue([]);
					activeExecutions.getRunningExecutionIds.mockReturnValue(['exec-1']);
					activeExecutions.cancelRunningExecutions.mockResolvedValue(['exec-1']);

					const stopped = scalingService.stop();
					await vi.advanceTimersByTimeAsync(shutdownTimeout * 1_000);
					await stopped;

					expect(activeExecutions.cancelRunningExecutions).toHaveBeenCalledWith(expectedDeadlineMs);
				},
			);

			it('should count the time spent pausing the queues against the shutdown window', async () => {
				vi.useFakeTimers();
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'worker';
				globalConfig.generic.gracefulShutdownTimeout = 4;
				await scalingService.setupQueue();
				jobProcessor.getRunningJobIds.mockReturnValue([]);
				queue.pause.mockReturnValue(new Promise((resolve) => setTimeout(resolve, 1_000)));
				queue.whenCurrentJobsFinished.mockReturnValue(new Promise<void>(() => {}));

				let hasStopped = false;
				const stopped = scalingService.stop().then(() => (hasStopped = true));

				await vi.advanceTimersByTimeAsync(2_499);

				expect(hasStopped).toBe(false);

				await vi.advanceTimersByTimeAsync(1);

				expect(hasStopped).toBe(true);
				await stopped;
			});

			describe('handing back jobs fetched before the pause', () => {
				const activeJob = (id: string, { attemptsMade = 0 }: { attemptsMade?: number } = {}) =>
					mock<Job>({
						id,
						attemptsMade,
						opts: {},
						data: { executionId: `exec-${id}`, loadStaticData: false },
						lockKey: () => `bull:jobs:${id}:lock`,
					});

				const lockWith = (job: Job, token: string) => locks.set(job.lockKey(), token);

				const emitWorkerEvent = (event: 'completed' | 'failed', job: Job) => {
					const calls: unknown[][] = queue.on.mock.calls;
					for (const [name, listener] of calls) {
						if (name === event && typeof listener === 'function') listener(job, new Error());
					}
				};

				beforeEach(() => {
					queue.pause.mockResolvedValue(undefined);
					jobProcessor.getRunningJobIds.mockReturnValue([]);
				});

				it('should hand back only active jobs locked with the queue token that never reached the handler', async () => {
					await startWorker();
					const unstarted = activeJob('7');
					lockWith(unstarted, LOCK_TOKEN);
					queue.getActive.mockResolvedValue([unstarted]);

					await scalingService.stop();

					expect(unstarted.moveToFailed).toHaveBeenCalledTimes(1);
					expect(scopedLogger.info).toHaveBeenCalledWith(expect.any(String), {
						jobIds: ['7'],
					});
				});

				it('should skip jobs locked under another token, jobs with no lock, and jobs that reached the handler', async () => {
					const processFn = await startWorker();
					const otherWorker = activeJob('7');
					const unlocked = activeJob('8');
					const started = activeJob('9');
					const unstarted = activeJob('10');
					lockWith(otherWorker, 'other-token');
					lockWith(started, LOCK_TOKEN);
					lockWith(unstarted, LOCK_TOKEN);
					queue.getActive.mockResolvedValue([otherWorker, unlocked, started, unstarted]);
					await processFn(started);

					await scalingService.stop();

					expect(otherWorker.moveToFailed).not.toHaveBeenCalled();
					expect(unlocked.moveToFailed).not.toHaveBeenCalled();
					expect(started.moveToFailed).not.toHaveBeenCalled();
					expect(unstarted.moveToFailed).toHaveBeenCalledTimes(1);
				});

				it('should ignore a null entry from Redis and still hand back the owned job', async () => {
					await startWorker();
					const ownedJob = activeJob('7');
					lockWith(ownedJob, LOCK_TOKEN);
					// @ts-expect-error - Untyped but possible Redis response
					queue.getActive.mockResolvedValue([null, ownedJob]);

					await scalingService.stop();

					expect(ownedJob.moveToFailed).toHaveBeenCalledWith(expect.any(JobHandedBackError));
					expect(scopedLogger.warn).not.toHaveBeenCalledWith(
						'Failed to hand back jobs fetched before the pause',
						expect.anything(),
					);
				});

				it('should raise the attempts limit before failing the job with a hand-back error', async () => {
					await startWorker();
					const unstarted = activeJob('7', { attemptsMade: 2 });
					lockWith(unstarted, LOCK_TOKEN);
					queue.getActive.mockResolvedValue([unstarted]);
					let attemptsAtMove: number | undefined;
					unstarted.moveToFailed.mockImplementation(async () => {
						attemptsAtMove = unstarted.opts.attempts;
						return null;
					});

					await scalingService.stop();

					expect(attemptsAtMove).toBe(4);
					expect(unstarted.moveToFailed).toHaveBeenCalledWith(expect.any(JobHandedBackError));
				});

				it('should hand back after the queues are paused and before the drain starts', async () => {
					await startWorker();
					const order: string[] = [];
					queue.pause.mockImplementation(async () => {
						await Promise.resolve();
						order.push('paused');
					});
					queue.getActive.mockImplementation(async () => {
						order.push('getActive');
						return [];
					});
					jobProcessor.getRunningJobIds.mockImplementation(() => {
						order.push('drain');
						return [];
					});

					await scalingService.stop();

					expect(order.slice(0, 3)).toEqual(['paused', 'getActive', 'drain']);
				});

				it.each([
					{ source: 'getActive', expectWarning: true },
					{ source: 'pipeline', expectWarning: true },
					{ source: 'moveToFailed', expectWarning: false },
				])(
					'should finish stopping and cancel the in-process executions when $source rejects',
					async ({ source, expectWarning }) => {
						vi.useFakeTimers();
						globalConfig.generic.gracefulShutdownTimeout = 5;
						await startWorker();
						activeExecutions.getRunningExecutionIds.mockReturnValue(['exec-1']);
						activeExecutions.cancelRunningExecutions.mockResolvedValue(['exec-1']);
						const error = new Error('Connection is closed.');
						const unstarted = activeJob('7');
						lockWith(unstarted, LOCK_TOKEN);
						queue.getActive.mockResolvedValue([unstarted]);
						if (source === 'getActive') queue.getActive.mockRejectedValue(error);
						if (source === 'pipeline') pipelineError = error;
						if (source === 'moveToFailed') unstarted.moveToFailed.mockRejectedValue(error);

						const outcome = scalingService.stop().then(
							() => 'resolved',
							() => 'rejected',
						);

						await vi.advanceTimersByTimeAsync(5_000);

						expect(await outcome).toBe('resolved');
						expect(activeExecutions.cancelRunningExecutions).toHaveBeenCalled();
						if (expectWarning) {
							expect(scopedLogger.warn).toHaveBeenCalledWith(
								expect.any(String),
								expect.objectContaining({ error }),
							);
						} else {
							expect(unstarted.moveToFailed).toHaveBeenCalled();
							expect(scopedLogger.info).not.toHaveBeenCalledWith(expect.any(String), {
								jobIds: ['7'],
							});
						}
					},
				);

				it.each([
					{ shutdownTimeout: 30, expectedStopMs: 5_000, case: 'the 5s ceiling' },
					{ shutdownTimeout: 2, expectedStopMs: 1_000, case: 'half of a short window' },
				])(
					'should stop waiting for a hand-back that never settles at $case',
					async ({ shutdownTimeout, expectedStopMs }) => {
						vi.useFakeTimers();
						globalConfig.generic.gracefulShutdownTimeout = shutdownTimeout;
						await startWorker();
						queue.getActive.mockReturnValue(new Promise<Job[]>(() => {}));

						let hasStopped = false;
						const stopped = scalingService.stop().then(() => (hasStopped = true));

						await vi.advanceTimersByTimeAsync(expectedStopMs - 1);

						expect(queue.getActive).toHaveBeenCalled();
						expect(hasStopped).toBe(false);

						await vi.advanceTimersByTimeAsync(1);

						expect(hasStopped).toBe(true);
						await stopped;
					},
				);

				it('should warn and skip the hand-back when the queue has no lock token', async () => {
					await startWorker();
					Reflect.deleteProperty(queue, 'token');

					await scalingService.stop();

					expect(scopedLogger.warn).toHaveBeenCalledWith(
						'Skipped handing back jobs fetched before the pause: queue has no lock token',
					);
					expect(queue.getActive).not.toHaveBeenCalled();
				});

				it.each(['completed', 'failed'] as const)(
					'should stop counting a job as started once Bull reports it %s',
					async (event) => {
						const processFn = await startWorker();
						const ended = activeJob('7');
						const stillRunning = activeJob('8');
						lockWith(ended, LOCK_TOKEN);
						lockWith(stillRunning, LOCK_TOKEN);
						queue.getActive.mockResolvedValue([ended, stillRunning]);
						await processFn(ended);
						await processFn(stillRunning);

						emitWorkerEvent(event, ended);
						await scalingService.stop();

						expect(ended.moveToFailed).toHaveBeenCalledTimes(1);
						expect(stillRunning.moveToFailed).not.toHaveBeenCalled();
					},
				);

				it('should not throw when the worker failed listener receives a null job', async () => {
					await startWorker();
					const [, handler] = queue.on.mock.calls.find(([event]) => String(event) === 'failed') as [
						string,
						(job: Job | null, error: Error) => void,
					];

					expect(() => handler(null, new Error('boom'))).not.toThrow();
					expect(scopedLogger.error).not.toHaveBeenCalled();
				});
			});
		});
	});

	describe('pingQueue', () => {
		it('should ping the queue', async () => {
			await scalingService.setupQueue();

			await scalingService.pingQueue();

			expect(queue.client.ping).toHaveBeenCalled();
		});
	});

	describe('addJob', () => {
		it('should add a job with default retention (remove immediately)', async () => {
			await scalingService.setupQueue();
			queue.add.mockResolvedValue(mock<Job>({ id: '456' }));

			const jobData = mock<JobData>({ executionId: '123' });
			await scalingService.addJob(jobData, { priority: 100 });

			expect(queue.add).toHaveBeenCalledWith(JOB_TYPE_NAME, jobData, {
				priority: 100,
				removeOnComplete: 0,
				removeOnFail: 0,
			});
		});

		it('should pass configured retention counts to Bull', async () => {
			globalConfig.executions.queueRetention.keepLastCompleted = 1000;
			globalConfig.executions.queueRetention.keepLastFailed = 500;

			await scalingService.setupQueue();
			queue.add.mockResolvedValue(mock<Job>({ id: '456' }));

			const jobData = mock<JobData>({ executionId: '123' });
			await scalingService.addJob(jobData, { priority: 100 });

			expect(queue.add).toHaveBeenCalledWith(JOB_TYPE_NAME, jobData, {
				priority: 100,
				removeOnComplete: 1000,
				removeOnFail: 500,
			});

			// reset for other tests
			globalConfig.executions.queueRetention.keepLastCompleted = 0;
			globalConfig.executions.queueRetention.keepLastFailed = 0;
		});
	});

	describe('getJob', () => {
		it('should get a job', async () => {
			await scalingService.setupQueue();
			const jobId = '123';
			queue.getJob.mockResolvedValue(mock<Job>({ id: jobId }));

			const job = await scalingService.getJob(jobId);

			expect(queue.getJob).toHaveBeenCalledWith(jobId);
			expect(job?.id).toBe(jobId);
		});
	});

	describe('findJobsByStatus', () => {
		it('should find jobs by status', async () => {
			await scalingService.setupQueue();
			queue.getJobs.mockResolvedValue([mock<Job>({ id: '123' })]);

			const jobs = await scalingService.findJobsByStatus(['active']);

			expect(queue.getJobs).toHaveBeenCalledWith(['active']);
			expect(jobs).toHaveLength(1);
			expect(jobs.at(0)?.id).toBe('123');
		});

		it('should filter out `null` in Redis response', async () => {
			await scalingService.setupQueue();
			// @ts-expect-error - Untyped but possible Redis response
			queue.getJobs.mockResolvedValue([mock<Job>(), null]);

			const jobs = await scalingService.findJobsByStatus(['waiting']);

			expect(jobs).toHaveLength(1);
		});
	});

	describe('stopJob', () => {
		it('should stop an active job by sending abort signal only', async () => {
			await scalingService.setupQueue();
			const job = mock<Job>({ isActive: vi.fn().mockResolvedValue(true) });

			const result = await scalingService.stopJob(job);

			expect(job.progress).toHaveBeenCalledWith({ kind: 'abort-job' });
			expect(job.discard).not.toHaveBeenCalled();
			expect(job.moveToFailed).not.toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it('should stop an inactive job', async () => {
			await scalingService.setupQueue();
			const job = mock<Job>({ isActive: vi.fn().mockResolvedValue(false) });

			const result = await scalingService.stopJob(job);

			expect(job.remove).toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it('should report failure to stop a job', async () => {
			await scalingService.setupQueue();
			const job = mock<Job>({
				isActive: vi.fn().mockImplementation(() => {
					throw new UnexpectedError('Something went wrong');
				}),
			});

			const result = await scalingService.stopJob(job);

			expect(result).toBe(false);
		});
	});

	describe('message handling', () => {
		it('should handle send-chunk messages', async () => {
			const activeExecutions = mock<ActiveExecutions>();
			scalingService = new ScalingService(
				mockLogger(),
				mock(),
				activeExecutions,
				jobProcessor,
				globalConfig,
				mock(),
				mock(),
				instanceSettings,
				mock(),
				webhookResponseRelay,
				executionCrashService,
				jobOutcomeTracker,
			);

			await scalingService.setupQueue();

			// Simulate receiving a send-chunk message
			const messageHandler = queue.on.mock.calls.find(
				([event]) => (event as string) === 'global:progress',
			)?.[1] as (jobId: JobId, msg: unknown) => void;
			expect(messageHandler).toBeDefined();

			const sendChunkMessage = {
				kind: 'send-chunk',
				executionId: 'exec-123',
				chunkText: { type: 'item', content: 'test' },
				workerId: 'worker-456',
			};

			messageHandler('job-789', sendChunkMessage);

			expect(activeExecutions.sendChunk).toHaveBeenCalledWith('exec-123', {
				type: 'item',
				content: 'test',
			});
		});

		it('should resolve responsePromise with empty response when job-finished has success=true', async () => {
			const activeExecutions = mock<ActiveExecutions>();
			scalingService = new ScalingService(
				mockLogger(),
				mock(),
				activeExecutions,
				jobProcessor,
				globalConfig,
				mock(),
				mock(),
				instanceSettings,
				mock(),
				webhookResponseRelay,
				executionCrashService,
				jobOutcomeTracker,
			);

			await scalingService.setupQueue();

			const messageHandler = queue.on.mock.calls.find(
				([event]) => (event as string) === 'global:progress',
			)?.[1] as (jobId: JobId, msg: unknown) => void;

			const jobFinishedMessage = {
				kind: 'job-finished',
				executionId: 'exec-123',
				workerId: 'worker-456',
				success: true,
			};

			messageHandler('job-789', jobFinishedMessage);

			expect(activeExecutions.resolveResponsePromise).toHaveBeenCalledWith('exec-123', {});
		});

		it('should resolve responsePromise with error response when job-finished has success=false', async () => {
			const activeExecutions = mock<ActiveExecutions>();
			scalingService = new ScalingService(
				mockLogger(),
				mock(),
				activeExecutions,
				jobProcessor,
				globalConfig,
				mock(),
				mock(),
				instanceSettings,
				mock(),
				webhookResponseRelay,
				executionCrashService,
				jobOutcomeTracker,
			);

			await scalingService.setupQueue();

			const messageHandler = queue.on.mock.calls.find(
				([event]) => (event as string) === 'global:progress',
			)?.[1] as (jobId: JobId, msg: unknown) => void;

			const jobFinishedMessage = {
				kind: 'job-finished',
				executionId: 'exec-123',
				workerId: 'worker-456',
				success: false,
			};

			messageHandler('job-789', jobFinishedMessage);

			expect(activeExecutions.resolveResponsePromise).toHaveBeenCalledWith('exec-123', {
				body: { message: 'Workflow execution failed' },
				statusCode: 500,
			});
		});
		describe('job outcome wiring', () => {
			const getHandler = (event: string) =>
				queue.on.mock.calls.find(([name]) => (name as string) === event)?.[1] as (
					...args: unknown[]
				) => void;

			beforeEach(async () => {
				await scalingService.setupQueue();
			});

			it('should record a v2 job-finished result with its dates and waitTill', () => {
				const waitTill = new Date('2026-07-25T12:00:00.000Z');
				// Bull delivers progress messages JSON-serialized, so dates arrive as ISO strings
				getHandler('global:progress')('job-789', {
					kind: 'job-finished',
					version: 2,
					executionId: 'exec-123',
					workerId: 'worker-456',
					success: true,
					status: 'waiting',
					startedAt: '2026-07-25T11:59:00.000Z',
					stoppedAt: '2026-07-25T11:59:30.000Z',
					waitTill: waitTill.toISOString(),
				});

				expect(jobOutcomeTracker.recordFinished).toHaveBeenCalledWith(
					'exec-123',
					expect.objectContaining({
						status: 'waiting',
						startedAt: new Date('2026-07-25T11:59:00.000Z'),
						// A missing waitTill makes main treat a waiting execution as finished and
						// delete it when the workflow does not save successful executions
						waitTill,
					}),
				);
			});

			it('should record a v1 job-finished message without a result', () => {
				getHandler('global:progress')('job-789', {
					kind: 'job-finished',
					executionId: 'exec-123',
					workerId: 'worker-456',
					success: true,
				});

				expect(jobOutcomeTracker.recordFinished).toHaveBeenCalledWith('exec-123', undefined);
			});

			it('should record a job-failed report as a handled error', () => {
				getHandler('global:progress')('job-789', {
					kind: 'job-failed',
					executionId: 'exec-123',
					workerId: 'worker-456',
					errorMsg: 'boom',
					errorStack: '',
				});

				expect(jobOutcomeTracker.recordFailed).toHaveBeenCalledWith(
					'exec-123',
					expect.any(OperationalError),
				);
				expect(jobOutcomeTracker.recordFailed.mock.calls[0][1].message).toBe('boom');
			});

			it('should settle the wait for a job Bull reports as failed, by queue and job ID', () => {
				getHandler('global:failed')('job-1', 'job stalled more than maxStalledCount');

				expect(jobOutcomeTracker.settleByJobKey).toHaveBeenCalledWith(
					'jobs',
					'job-1',
					expect.any(OperationalError),
				);
			});

			it('should settle the wait for a job Bull reports as completed, by queue and job ID', () => {
				getHandler('global:completed')('job-1');

				expect(jobOutcomeTracker.settleByJobKey).toHaveBeenCalledWith('jobs', 'job-1');
			});

			it('should end the wait when an older worker reports the job as finished', async () => {
				// A real tracker, so the handler and the tracker are checked together
				const realTracker = new JobOutcomeTracker(mockLogger(), activeExecutions, mock(), mock());
				const service = new ScalingService(
					logger,
					errorReporter,
					activeExecutions,
					jobProcessor,
					globalConfig,
					executionRepository,
					executionPersistence,
					instanceSettings,
					mock(),
					webhookResponseRelay,
					executionCrashService,
					realTracker,
				);
				await service.setupQueue();
				const onProgress = queue.on.mock.calls
					.filter(([event]) => (event as string) === 'global:progress')
					.at(-1)?.[1] as (jobId: JobId, msg: unknown) => void;

				const job = mock<Job>({
					id: 'job-1',
					data: { executionId: 'exec-1' },
					queue: { name: 'jobs' },
				});
				const wait = service.waitForJob(job);

				// A v1 message carries no result, only the fact that the job ended
				onProgress('job-1', {
					kind: 'job-finished',
					executionId: 'exec-1',
					workerId: 'worker-1',
					success: true,
				});

				await expect(wait).resolves.toBeUndefined();
				expect(service.popJobResult('exec-1')).toBeUndefined();
			});
		});
	});

	describe('getDiagnosticCounts', () => {
		it('should report stored job results, queue listeners, and running jobs', async () => {
			const activeExecutions = mock<ActiveExecutions>();
			activeExecutions.has.mockReturnValue(true);
			const outcomeTracker = new JobOutcomeTracker(mockLogger(), activeExecutions, mock(), mock());
			scalingService = new ScalingService(
				mockLogger(),
				mock(),
				activeExecutions,
				jobProcessor,
				globalConfig,
				mock(),
				mock(),
				instanceSettings,
				mock(),
				webhookResponseRelay,
				executionCrashService,
				outcomeTracker,
			);
			await scalingService.setupQueue();
			queue.eventNames.mockReturnValue(['global:progress', 'global:completed']);
			queue.listenerCount.mockImplementation((event) => (event === 'global:completed' ? 2 : 1));
			jobProcessor.getRunningJobIds.mockReturnValue(['job-1']);

			const messageHandler = queue.on.mock.calls.find(
				([event]) => (event as string) === 'global:progress',
			)?.[1] as (jobId: JobId, msg: unknown) => void;
			messageHandler('job-789', {
				kind: 'job-finished',
				version: 2,
				executionId: 'exec-123',
				workerId: 'worker-456',
				success: true,
				status: 'success',
				startedAt: '2026-07-25T11:59:00.000Z',
				stoppedAt: '2026-07-25T11:59:30.000Z',
			});

			expect(scalingService.getDiagnosticCounts()).toEqual({
				jobResults: 1,
				queueListeners: 3,
				runningJobs: 1,
			});

			scalingService.popJobResult('exec-123');

			expect(scalingService.getDiagnosticCounts().jobResults).toBe(0);
		});
	});

	describe('recoverFromQueue', () => {
		it('should mark running executions as crashed if they are missing from the queue and queue is empty', async () => {
			await scalingService.setupQueue();
			executionRepository.getInProgressExecutionIds.mockResolvedValue(['123']);
			queue.getJobs.mockResolvedValue([]);

			await scalingService.recoverFromQueue();

			expect(executionCrashService.markAsCrashed).toHaveBeenCalledWith(['123'], 'queue-recovery');
		});

		it('should mark running executions as crashed if they are missing from the queue and queue is not empty', async () => {
			await scalingService.setupQueue();
			executionRepository.getInProgressExecutionIds.mockResolvedValue(['123']);
			queue.getJobs.mockResolvedValue([mock<Job>({ data: { executionId: '321' } })]);

			await scalingService.recoverFromQueue();

			expect(executionCrashService.markAsCrashed).toHaveBeenCalledWith(['123'], 'queue-recovery');
		});

		it('should not mark running executions as crashed if they are present in the queue', async () => {
			await scalingService.setupQueue();
			executionRepository.getInProgressExecutionIds.mockResolvedValue(['123']);
			queue.getJobs.mockResolvedValue([mock<Job>({ data: { executionId: '123' } })]);

			await scalingService.recoverFromQueue();

			expect(executionCrashService.markAsCrashed).not.toHaveBeenCalled();
		});
	});

	describe('MCP response handling', () => {
		it('should process mcp-response messages without throwing', async () => {
			await scalingService.setupQueue();

			const messageHandler = queue.on.mock.calls.find(
				([event]) => (event as string) === 'global:progress',
			)?.[1] as (jobId: JobId, msg: unknown) => void;
			expect(messageHandler).toBeDefined();

			const mcpResponseMessage = {
				kind: 'mcp-response',
				executionId: 'exec-123',
				mcpType: 'service',
				sessionId: 'session-456',
				messageId: 'msg-789',
				response: { success: true },
				workerId: 'worker-abc',
			};

			// Should not throw - all mains receive and try to process MCP responses
			// Only the one with the pending response/session will handle it successfully
			// The handler is async but we verify it doesn't throw synchronously
			expect(() => messageHandler('job-999', mcpResponseMessage)).not.toThrow();
		});

		it('should handle mcp-response for trigger type', async () => {
			await scalingService.setupQueue();

			const messageHandler = queue.on.mock.calls.find(
				([event]) => (event as string) === 'global:progress',
			)?.[1] as (jobId: JobId, msg: unknown) => void;
			expect(messageHandler).toBeDefined();

			const mcpTriggerResponseMessage = {
				kind: 'mcp-response',
				executionId: 'exec-456',
				mcpType: 'trigger',
				sessionId: 'session-trigger',
				messageId: 'msg-trigger',
				response: { toolResult: 'test-data' },
				workerId: 'worker-xyz',
			};

			// Should not throw for trigger type either
			expect(() => messageHandler('job-trigger', mcpTriggerResponseMessage)).not.toThrow();
		});

		it('should restore an offloaded body without reclaiming it on the session-owning main', async () => {
			await scalingService.setupQueue();
			mcpServer.hasSession.mockReturnValue(true);
			webhookResponseRelay.restoreOffloadedBody.mockImplementation(async (response) => response);

			const messageHandler = queue.on.mock.calls.find(
				([event]) => (event as string) === 'global:progress',
			)?.[1] as (jobId: JobId, msg: unknown) => void;

			const response = {
				body: { binaryData: { id: 'database:abc' } },
				headers: {},
				statusCode: 200,
			};

			messageHandler('job-trigger', {
				kind: 'mcp-response',
				executionId: 'exec-456',
				mcpType: 'trigger',
				sessionId: 'session-trigger',
				messageId: 'msg-trigger',
				response,
				workerId: 'worker-xyz',
			});

			await vi.waitFor(() =>
				expect(webhookResponseRelay.restoreOffloadedBody).toHaveBeenCalledWith(response, {
					reclaim: false,
					context: { executionId: 'exec-456' },
				}),
			);
			expect(mcpServer.handleWorkerResponse).toHaveBeenCalledWith(
				'session-trigger',
				'msg-trigger',
				response,
			);
		});

		it('should decode a Buffer body the worker base64-encoded to relay it', async () => {
			await scalingService.setupQueue();
			mcpServer.hasSession.mockReturnValue(true);
			webhookResponseRelay.restoreOffloadedBody.mockImplementation(async (response) => response);

			const messageHandler = queue.on.mock.calls.find(
				([event]) => (event as string) === 'global:progress',
			)?.[1] as (jobId: JobId, msg: unknown) => void;

			messageHandler('job-trigger', {
				kind: 'mcp-response',
				executionId: 'exec-456',
				mcpType: 'trigger',
				sessionId: 'session-trigger',
				messageId: 'msg-trigger',
				response: {
					body: { [ENCODED_BUFFER_KEY]: Buffer.from('tool output').toString('base64') },
					headers: {},
					statusCode: 200,
				},
				workerId: 'worker-xyz',
			});

			await vi.waitFor(() =>
				expect(webhookResponseRelay.restoreOffloadedBody).toHaveBeenCalledWith(
					expect.objectContaining({ body: Buffer.from('tool output') }),
					{ reclaim: false, context: { executionId: 'exec-456' } },
				),
			);
		});

		it('should not restore an offloaded body on a main that does not hold the session', async () => {
			await scalingService.setupQueue();
			mcpServer.hasSession.mockReturnValue(false);
			mcpServer.hasPendingResponse.mockReturnValue(false);

			const messageHandler = queue.on.mock.calls.find(
				([event]) => (event as string) === 'global:progress',
			)?.[1] as (jobId: JobId, msg: unknown) => void;

			messageHandler('job-trigger', {
				kind: 'mcp-response',
				executionId: 'exec-456',
				mcpType: 'trigger',
				sessionId: 'session-trigger',
				messageId: 'msg-trigger',
				response: {
					body: { binaryData: { id: 'database:abc' } },
					headers: {},
					statusCode: 200,
				},
				workerId: 'worker-xyz',
			});

			await vi.waitFor(() => expect(mcpServer.hasSession).toHaveBeenCalledWith('session-trigger'));
			expect(mcpServer.hasPendingResponse).toHaveBeenCalledWith('session-trigger', 'msg-trigger');
			expect(webhookResponseRelay.restoreOffloadedBody).not.toHaveBeenCalled();
			expect(mcpServer.handleWorkerResponse).not.toHaveBeenCalled();
		});

		it('should deliver a response a pending call awaits when the transport is gone', async () => {
			await scalingService.setupQueue();
			mcpServer.hasSession.mockReturnValue(false);
			mcpServer.hasPendingResponse.mockReturnValue(true);
			webhookResponseRelay.restoreOffloadedBody.mockImplementation(async (response) => response);

			const messageHandler = queue.on.mock.calls.find(
				([event]) => (event as string) === 'global:progress',
			)?.[1] as (jobId: JobId, msg: unknown) => void;

			const response = {
				body: { binaryData: { id: 'database:abc' } },
				headers: {},
				statusCode: 200,
			};

			messageHandler('job-trigger', {
				kind: 'mcp-response',
				executionId: 'exec-456',
				mcpType: 'trigger',
				sessionId: 'session-trigger',
				messageId: 'msg-trigger',
				response,
				workerId: 'worker-xyz',
			});

			await vi.waitFor(() =>
				expect(mcpServer.handleWorkerResponse).toHaveBeenCalledWith(
					'session-trigger',
					'msg-trigger',
					response,
				),
			);
			expect(webhookResponseRelay.restoreOffloadedBody).toHaveBeenCalledWith(response, {
				reclaim: false,
				context: { executionId: 'exec-456' },
			});
		});
	});
});
