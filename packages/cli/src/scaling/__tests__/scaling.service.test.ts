import type { Logger } from '@n8n/backend-common';
import { mockLogger, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import * as BullModule from 'bull';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { ExecutionPersistence } from '@/executions/execution-persistence';

import { JOB_TYPE_NAME, QUEUE_NAME } from '../constants';
import type { JobProcessor } from '../job-processor';
import { ScalingService } from '../scaling.service';
import type { Job, JobData, JobId, JobQueue } from '../scaling.types';
import { ENCODED_BUFFER_KEY, type WebhookResponseRelay } from '../webhook-response-relay';

const queue = mock<JobQueue>({
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
	const activeExecutions = mock<ActiveExecutions>();
	const jobProcessor = mock<JobProcessor>();
	const executionRepository = mock<ExecutionRepository>();
	const executionPersistence = mock<ExecutionPersistence>();
	const webhookResponseRelay = mock<WebhookResponseRelay>();

	let scalingService: ScalingService;

	let registerMainOrWebhookListenersSpy: MockInstance;
	let registerWorkerListenersSpy: MockInstance;
	let scheduleQueueRecoverySpy: MockInstance;
	let stopQueueRecoverySpy: MockInstance;
	let stopQueueMetricsSpy: MockInstance;
	let getRunningJobsCountSpy: MockInstance;

	const bullConstructorArgs = [
		QUEUE_NAME,
		{
			prefix: globalConfig.queue.bull.prefix,
			settings: { ...globalConfig.queue.bull.settings, maxStalledCount: 0 },
			createClient: expect.any(Function),
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
		// @ts-expect-error readonly property
		instanceSettings.instanceType = 'main';
		instanceSettings.markAsLeader();
		activeExecutions.getRunningExecutionIds.mockReturnValue([]);
		activeExecutions.cancelRunningExecutions.mockResolvedValue([]);
		jobProcessor.getRunningJobsSummary.mockReturnValue([]);
		globalConfig.generic.gracefulShutdownTimeout = 30;

		scalingService = new ScalingService(
			logger,
			mock(),
			activeExecutions,
			jobProcessor,
			globalConfig,
			executionRepository,
			executionPersistence,
			instanceSettings,
			mock(),
			webhookResponseRelay,
		);

		getRunningJobsCountSpy = vi.spyOn(scalingService, 'getRunningJobsCount');

		// @ts-expect-error Private method
		ScalingService.prototype.scheduleQueueRecovery = vi.fn();
		registerMainOrWebhookListenersSpy = vi.spyOn(
			scalingService,
			// @ts-expect-error Private method
			'registerMainOrWebhookListeners',
		);
		// @ts-expect-error Private method
		registerWorkerListenersSpy = vi.spyOn(scalingService, 'registerWorkerListeners');
		// @ts-expect-error Private method
		scheduleQueueRecoverySpy = vi.spyOn(scalingService, 'scheduleQueueRecovery');
		// @ts-expect-error Private method
		stopQueueRecoverySpy = vi.spyOn(scalingService, 'stopQueueRecovery');

		// @ts-expect-error Private method
		stopQueueMetricsSpy = vi.spyOn(scalingService, 'stopQueueMetrics');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('setupQueue', () => {
		describe('if leader main', () => {
			it('should set up queue + listeners + queue recovery', async () => {
				await scalingService.setupQueue();

				expect(Bull).toHaveBeenCalledWith(...bullConstructorArgs);
				expect(registerMainOrWebhookListenersSpy).toHaveBeenCalled();
				expect(registerWorkerListenersSpy).not.toHaveBeenCalled();
				expect(scheduleQueueRecoverySpy).toHaveBeenCalledWith(0);
			});
		});

		describe('if follower main', () => {
			it('should set up queue + listeners', async () => {
				instanceSettings.markAsFollower();

				await scalingService.setupQueue();

				expect(Bull).toHaveBeenCalledWith(...bullConstructorArgs);
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

				expect(Bull).toHaveBeenCalledWith(...bullConstructorArgs);
				expect(registerWorkerListenersSpy).toHaveBeenCalled();
				expect(registerMainOrWebhookListenersSpy).not.toHaveBeenCalled();
			});
		});

		describe('webhook', () => {
			it('should set up a queue + listeners', async () => {
				// @ts-expect-error readonly property
				instanceSettings.instanceType = 'webhook';

				await scalingService.setupQueue();

				expect(Bull).toHaveBeenCalledWith(...bullConstructorArgs);
				expect(registerWorkerListenersSpy).not.toHaveBeenCalled();
				expect(registerMainOrWebhookListenersSpy).toHaveBeenCalled();
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

		it('should keep waitTill when storing a v2 job-finished result', async () => {
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
			);

			await scalingService.setupQueue();

			const messageHandler = queue.on.mock.calls.find(
				([event]) => (event as string) === 'global:progress',
			)?.[1] as (jobId: JobId, msg: unknown) => void;

			const waitTill = new Date('2026-07-25T12:00:00.000Z');
			// Bull delivers progress messages JSON-serialized, so dates arrive as ISO strings
			const jobFinishedMessage = {
				kind: 'job-finished',
				version: 2,
				executionId: 'exec-123',
				workerId: 'worker-456',
				success: true,
				status: 'waiting',
				startedAt: '2026-07-25T11:59:00.000Z',
				stoppedAt: '2026-07-25T11:59:30.000Z',
				waitTill: waitTill.toISOString(),
			};

			messageHandler('job-789', jobFinishedMessage);

			const result = scalingService.popJobResult('exec-123');

			expect(result?.status).toBe('waiting');
			// A missing waitTill makes main treat a waiting execution as finished and
			// delete it when the workflow does not save successful executions
			expect(result?.waitTill).toEqual(waitTill);
		});
	});

	describe('recoverFromQueue', () => {
		it('should mark running executions as crashed if they are missing from the queue and queue is empty', async () => {
			await scalingService.setupQueue();
			executionRepository.getInProgressExecutionIds.mockResolvedValue(['123']);
			queue.getJobs.mockResolvedValue([]);

			await scalingService.recoverFromQueue();

			expect(executionRepository.markAsCrashed).toHaveBeenCalledWith(['123']);
		});

		it('should mark running executions as crashed if they are missing from the queue and queue is not empty', async () => {
			await scalingService.setupQueue();
			executionRepository.getInProgressExecutionIds.mockResolvedValue(['123']);
			queue.getJobs.mockResolvedValue([mock<Job>({ data: { executionId: '321' } })]);

			await scalingService.recoverFromQueue();

			expect(executionRepository.markAsCrashed).toHaveBeenCalledWith(['123']);
		});

		it('should not mark running executions as crashed if they are present in the queue', async () => {
			await scalingService.setupQueue();
			executionRepository.getInProgressExecutionIds.mockResolvedValue(['123']);
			queue.getJobs.mockResolvedValue([mock<Job>({ data: { executionId: '123' } })]);

			await scalingService.recoverFromQueue();

			expect(executionRepository.markAsCrashed).not.toHaveBeenCalled();
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
