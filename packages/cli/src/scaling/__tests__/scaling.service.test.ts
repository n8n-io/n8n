import { GlobalConfig } from '@n8n/config';
import * as BullModule from 'bull';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import { ApplicationError } from 'n8n-workflow';
import Container from 'typedi';

import type { OrchestrationService } from '@/services/orchestration.service';
import { mockInstance } from '@test/mocking';

import { JOB_TYPE_NAME, QUEUE_NAME } from '../constants';
import type { JobProcessor } from '../job-processor';
import { ScalingService } from '../scaling.service';
import type { Job, JobData, JobOptions, JobQueue } from '../scaling.types';

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
	});

	const instanceSettings = Container.get(InstanceSettings);
	const orchestrationService = mock<OrchestrationService>({ isMultiMainSetupEnabled: false });
	const jobProcessor = mock<JobProcessor>();

	let scalingService: ScalingService;

	let registerMainOrWebhookListenersSpy: jest.SpyInstance;
	let registerWorkerListenersSpy: jest.SpyInstance;
	let scheduleQueueRecoverySpy: jest.SpyInstance;
	let stopQueueRecoverySpy: jest.SpyInstance;
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
			mock(),
			mock(),
			jobProcessor,
			globalConfig,
			mock(),
			instanceSettings,
			orchestrationService,
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
	});

	describe('setupQueue', () => {
		describe('if leader main', () => {
			it('should set up queue + listeners + queue recovery', async () => {
				await scalingService.setupQueue();

				expect(Bull).toHaveBeenCalledWith(...bullConstructorArgs);
				expect(registerMainOrWebhookListenersSpy).toHaveBeenCalled();
				expect(registerWorkerListenersSpy).not.toHaveBeenCalled();
				expect(scheduleQueueRecoverySpy).toHaveBeenCalled();
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
		it('should pause queue, wait for running jobs, stop queue recovery', async () => {
			await scalingService.setupQueue();
			jobProcessor.getRunningJobIds.mockReturnValue([]);

			await scalingService.stop();

			expect(queue.pause).toHaveBeenCalledWith(true, true);
			expect(stopQueueRecoverySpy).toHaveBeenCalled();
			expect(getRunningJobsCountSpy).toHaveBeenCalled();
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
			const jobOptions = mock<JobOptions>();
			await scalingService.addJob(jobData, jobOptions);

			expect(queue.add).toHaveBeenCalledWith(JOB_TYPE_NAME, jobData, jobOptions);
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
});
