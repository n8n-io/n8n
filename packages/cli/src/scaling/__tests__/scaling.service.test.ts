import { mockLogger, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import * as BullModule from 'bull';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import { ApplicationError, ExecutionCancelledError } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';

import { JOB_TYPE_NAME, QUEUE_NAME } from '../constants';
import type { JobProcessor } from '../job-processor';
import { ScalingService } from '../scaling.service';
import type { Job, JobData, JobId, JobQueue } from '../scaling.types';

const queue = mock<JobQueue>({
	client: { ping: jest.fn() },
});

jest.mock('bull', () => ({
	__esModule: true,
	default: jest.fn(() => queue),
}));

describe('ScalingService', () => {
	const Bull = jest.mocked(BullModule.default);

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
		},
	});

	const instanceSettings = Container.get(InstanceSettings);
	const jobProcessor = mock<JobProcessor>();

	let scalingService: ScalingService;

	let registerMainOrWebhookListenersSpy: jest.SpyInstance;
	let registerWorkerListenersSpy: jest.SpyInstance;
	let scheduleQueueRecoverySpy: jest.SpyInstance;
	let stopQueueRecoverySpy: jest.SpyInstance;
	let stopQueueMetricsSpy: jest.SpyInstance;
	let getRunningJobsCountSpy: jest.SpyInstance;

	const bullConstructorArgs = [
		QUEUE_NAME,
		{
			prefix: globalConfig.queue.bull.prefix,
			settings: globalConfig.queue.bull.settings,
			createClient: expect.any(Function),
		},
	];

	beforeEach(() => {
		jest.clearAllMocks();
		// @ts-expect-error readonly property
		instanceSettings.instanceType = 'main';
		instanceSettings.markAsLeader();

		scalingService = new ScalingService(
			mockLogger(),
			mock(),
			mock(),
			jobProcessor,
			globalConfig,
			mock(),
			instanceSettings,
			mock(),
		);

		getRunningJobsCountSpy = jest.spyOn(scalingService, 'getRunningJobsCount');

		// @ts-expect-error Private method
		ScalingService.prototype.scheduleQueueRecovery = jest.fn();
		registerMainOrWebhookListenersSpy = jest.spyOn(
			scalingService,
			// @ts-expect-error Private method
			'registerMainOrWebhookListeners',
		);
		// @ts-expect-error Private method
		registerWorkerListenersSpy = jest.spyOn(scalingService, 'registerWorkerListeners');
		// @ts-expect-error Private method
		scheduleQueueRecoverySpy = jest.spyOn(scalingService, 'scheduleQueueRecovery');
		// @ts-expect-error Private method
		stopQueueRecoverySpy = jest.spyOn(scalingService, 'stopQueueRecovery');

		// @ts-expect-error Private method
		stopQueueMetricsSpy = jest.spyOn(scalingService, 'stopQueueMetrics');
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
				jest.spyOn(scalingService, 'isQueueMetricsEnabled', 'get').mockReturnValue(true);

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
		it('should add a job', async () => {
			await scalingService.setupQueue();
			queue.add.mockResolvedValue(mock<Job>({ id: '456' }));

			const jobData = mock<JobData>({ executionId: '123' });
			await scalingService.addJob(jobData, { priority: 100 });

			expect(queue.add).toHaveBeenCalledWith(JOB_TYPE_NAME, jobData, {
				priority: 100,
				removeOnComplete: true,
				removeOnFail: true,
			});
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
		it('should stop an active job', async () => {
			await scalingService.setupQueue();
			const job = mock<Job>({ isActive: jest.fn().mockResolvedValue(true) });

			const result = await scalingService.stopJob(job);

			expect(job.progress).toHaveBeenCalledWith({ kind: 'abort-job' });
			expect(job.discard).toHaveBeenCalled();
			expect(job.moveToFailed).toHaveBeenCalledWith(new ExecutionCancelledError('123'), true);
			expect(result).toBe(true);
		});

		it('should stop an inactive job', async () => {
			await scalingService.setupQueue();
			const job = mock<Job>({ isActive: jest.fn().mockResolvedValue(false) });

			const result = await scalingService.stopJob(job);

			expect(job.remove).toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it('should report failure to stop a job', async () => {
			await scalingService.setupQueue();
			const job = mock<Job>({
				isActive: jest.fn().mockImplementation(() => {
					throw new ApplicationError('Something went wrong');
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
				instanceSettings,
				mock(),
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
	});
});
