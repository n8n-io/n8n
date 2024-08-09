import { mock } from 'jest-mock-extended';
import { ScalingService } from '../scaling.service';
import { JOB_TYPE_NAME, QUEUE_NAME } from '../constants';
import config from '@/config';
import * as BullModule from 'bull';
import type { Job, JobData, JobOptions, JobQueue } from '../types';
import { ApplicationError } from 'n8n-workflow';

const queue = mock<JobQueue>({
	client: { ping: jest.fn() },
});

jest.mock('bull', () => ({
	__esModule: true,
	default: jest.fn(() => queue),
}));

describe('ScalingService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		config.set('generic.instanceType', 'main');
	});

	describe('setupQueue', () => {
		it('should set up the queue', async () => {
			/**
			 * Arrange
			 */
			const scalingService = new ScalingService(mock(), mock(), mock());
			const { prefix, settings } = config.get('queue.bull');
			const Bull = jest.mocked(BullModule.default);

			/**
			 * Act
			 */
			await scalingService.setupQueue();

			/**
			 * Assert
			 */
			expect(Bull).toHaveBeenCalledWith(QUEUE_NAME, {
				prefix,
				settings,
				createClient: expect.any(Function),
			});
			expect(queue.on).toHaveBeenCalledWith('global:progress', expect.any(Function));
			expect(queue.on).toHaveBeenCalledWith('error', expect.any(Function));
		});
	});

	describe('setupWorker', () => {
		it('should set up a worker with concurrency', async () => {
			/**
			 * Arrange
			 */
			config.set('generic.instanceType', 'worker');
			const scalingService = new ScalingService(mock(), mock(), mock());
			await scalingService.setupQueue();
			const concurrency = 5;

			/**
			 * Act
			 */
			scalingService.setupWorker(concurrency);

			/**
			 * Assert
			 */
			expect(queue.process).toHaveBeenCalledWith(JOB_TYPE_NAME, concurrency, expect.any(Function));
		});

		it('should throw if called on a non-worker instance', async () => {
			/**
			 * Arrange
			 */
			const scalingService = new ScalingService(mock(), mock(), mock());
			await scalingService.setupQueue();

			/**
			 * Act and Assert
			 */
			expect(() => scalingService.setupWorker(5)).toThrow();
		});
	});

	describe('pauseQueue', () => {
		it('should pause the queue', async () => {
			/**
			 * Arrange
			 */
			const scalingService = new ScalingService(mock(), mock(), mock());
			await scalingService.setupQueue();

			/**
			 * Act
			 */
			await scalingService.pauseQueue();

			/**
			 * Assert
			 */
			expect(queue.pause).toHaveBeenCalledWith(true, true);
		});
	});

	describe('pingQueue', () => {
		it('should ping the queue', async () => {
			/**
			 * Arrange
			 */
			const scalingService = new ScalingService(mock(), mock(), mock());
			await scalingService.setupQueue();

			/**
			 * Act
			 */
			await scalingService.pingQueue();

			/**
			 * Assert
			 */
			expect(queue.client.ping).toHaveBeenCalled();
		});
	});

	describe('addJob', () => {
		it('should add a job', async () => {
			/**
			 * Arrange
			 */
			const scalingService = new ScalingService(mock(), mock(), mock());
			await scalingService.setupQueue();
			queue.add.mockResolvedValue(mock<Job>({ id: '456' }));

			/**
			 * Act
			 */
			const jobData = mock<JobData>({ executionId: '123' });
			const jobOptions = mock<JobOptions>();
			await scalingService.addJob(jobData, jobOptions);

			/**
			 * Assert
			 */
			expect(queue.add).toHaveBeenCalledWith(JOB_TYPE_NAME, jobData, jobOptions);
		});
	});

	describe('getJob', () => {
		it('should get a job', async () => {
			/**
			 * Arrange
			 */
			const scalingService = new ScalingService(mock(), mock(), mock());
			await scalingService.setupQueue();
			const jobId = '123';
			queue.getJob.mockResolvedValue(mock<Job>({ id: jobId }));

			/**
			 * Act
			 */
			const job = await scalingService.getJob(jobId);

			/**
			 * Assert
			 */
			expect(queue.getJob).toHaveBeenCalledWith(jobId);
			expect(job?.id).toBe(jobId);
		});
	});

	describe('findJobsByStatus', () => {
		it('should find jobs by status', async () => {
			/**
			 * Arrange
			 */
			const scalingService = new ScalingService(mock(), mock(), mock());
			await scalingService.setupQueue();
			queue.getJobs.mockResolvedValue([mock<Job>({ id: '123' })]);

			/**
			 * Act
			 */
			const jobs = await scalingService.findJobsByStatus(['active']);

			/**
			 * Assert
			 */
			expect(queue.getJobs).toHaveBeenCalledWith(['active']);
			expect(jobs).toHaveLength(1);
			expect(jobs.at(0)?.id).toBe('123');
		});

		it('should filter out `null` in Redis response', async () => {
			/**
			 * Arrange
			 */
			const scalingService = new ScalingService(mock(), mock(), mock());
			await scalingService.setupQueue();
			// @ts-expect-error - Untyped but possible Redis response
			queue.getJobs.mockResolvedValue([mock<Job>(), null]);

			/**
			 * Act
			 */
			const jobs = await scalingService.findJobsByStatus(['waiting']);

			/**
			 * Assert
			 */
			expect(jobs).toHaveLength(1);
		});
	});

	describe('stopJob', () => {
		it('should stop an active job', async () => {
			/**
			 * Arrange
			 */
			const scalingService = new ScalingService(mock(), mock(), mock());
			await scalingService.setupQueue();
			const job = mock<Job>({ isActive: jest.fn().mockResolvedValue(true) });

			/**
			 * Act
			 */
			const result = await scalingService.stopJob(job);

			/**
			 * Assert
			 */
			expect(job.progress).toHaveBeenCalledWith({ kind: 'abort-job' });
			expect(result).toBe(true);
		});

		it('should stop an inactive job', async () => {
			/**
			 * Arrange
			 */
			const scalingService = new ScalingService(mock(), mock(), mock());
			await scalingService.setupQueue();
			const job = mock<Job>({ isActive: jest.fn().mockResolvedValue(false) });

			/**
			 * Act
			 */
			const result = await scalingService.stopJob(job);

			/**
			 * Assert
			 */
			expect(job.remove).toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it('should report failure to stop a job', async () => {
			/**
			 * Arrange
			 */
			const scalingService = new ScalingService(mock(), mock(), mock());
			await scalingService.setupQueue();
			const job = mock<Job>({
				isActive: jest.fn().mockImplementation(() => {
					throw new ApplicationError('Something went wrong');
				}),
			});

			/**
			 * Act
			 */
			const result = await scalingService.stopJob(job);

			/**
			 * Assert
			 */
			expect(result).toBe(false);
		});
	});
});
