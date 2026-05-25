import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import type { ScalingService } from '../scaling.service';
import { WorkerDrainService } from '../worker-drain.service';

const scalingService = mock<ScalingService>();
const instanceSettings = mock<InstanceSettings>({ instanceType: 'worker' });
let service: WorkerDrainService;

beforeEach(() => {
	jest.clearAllMocks();
	// @ts-expect-error readonly property
	instanceSettings.instanceType = 'worker';
	scalingService.getRunningJobsCount.mockReturnValue(0);
	scalingService.pauseLocalQueue.mockResolvedValue(undefined);
	scalingService.resumeLocalQueue.mockResolvedValue(undefined);
	service = new WorkerDrainService(mockLogger(), scalingService, instanceSettings);
});

describe('WorkerDrainService', () => {
	describe('PubSub handlers', () => {
		it('delegates drain-worker events to enterDrain()', async () => {
			const enterDrainSpy = jest.spyOn(service, 'enterDrain').mockResolvedValue(undefined);

			await service.handleDrainWorkerEvent();

			expect(enterDrainSpy).toHaveBeenCalledTimes(1);
		});

		it('delegates resume-worker events to exitDrain()', async () => {
			const exitDrainSpy = jest.spyOn(service, 'exitDrain').mockResolvedValue(undefined);

			await service.handleResumeWorkerEvent();

			expect(exitDrainSpy).toHaveBeenCalledTimes(1);
		});
	});

		describe('enterDrain', () => {
			it('pauses the local queue and marks as draining on a worker instance', async () => {
				await service.enterDrain();

				expect(scalingService.pauseLocalQueue).toHaveBeenCalledTimes(1);
				expect(service.isDraining()).toBe(true);
			});

			it('rejects when pausing the local queue fails and does not start polling', async () => {
				scalingService.pauseLocalQueue.mockRejectedValueOnce(new Error('pause failed'));

				await expect(service.enterDrain()).rejects.toThrow('pause failed');

				expect(service.isDraining()).toBe(false);
				expect(scalingService.getRunningJobsCount).not.toHaveBeenCalled();
			});

			it('shares one in-flight pause attempt across concurrent calls', async () => {
				let resolvePause!: () => void;
				const pausePromise = new Promise<void>((resolve) => {
					resolvePause = resolve;
				});
				scalingService.pauseLocalQueue.mockReturnValueOnce(pausePromise);

				const firstEnterDrain = service.enterDrain();
				const secondEnterDrain = service.enterDrain();

				expect(scalingService.pauseLocalQueue).toHaveBeenCalledTimes(1);
				expect(service.isDraining()).toBe(false);

				resolvePause();

				await expect(firstEnterDrain).resolves.toBeUndefined();
				await expect(secondEnterDrain).resolves.toBeUndefined();
				expect(service.isDraining()).toBe(true);
				expect(scalingService.getRunningJobsCount).toHaveBeenCalledTimes(1);
			});

			it('logs the drain signal message', async () => {
				const logger = mockLogger();
				// scoped() returns a new logger — make it return the same mock so we can assert on it
				(logger.scoped as jest.Mock).mockReturnValue(logger);
			service = new WorkerDrainService(logger, scalingService, instanceSettings);

			await service.enterDrain();

			expect(logger.info).toHaveBeenCalledWith(
				'[Worker] Drain signal received. Stopping new job intake.',
			);
		});

			it('is idempotent — second call does not pause queue again', async () => {
				await service.enterDrain();
				await service.enterDrain();

				expect(scalingService.pauseLocalQueue).toHaveBeenCalledTimes(1);
				expect(service.isDraining()).toBe(true);
			});

		it('throws UnexpectedError when called on a non-worker instance', async () => {
			// @ts-expect-error readonly property
			instanceSettings.instanceType = 'main';

			await expect(service.enterDrain()).rejects.toThrow(UnexpectedError);
		});
	});

	describe('exitDrain', () => {
		it('resumes the local queue and marks as not draining when draining', async () => {
			await service.enterDrain();

			await service.exitDrain();

			expect(scalingService.resumeLocalQueue).toHaveBeenCalledTimes(1);
			expect(service.isDraining()).toBe(false);
		});

		it('logs the resume signal message when draining', async () => {
			const logger = mockLogger();
			(logger.scoped as jest.Mock).mockReturnValue(logger);
			service = new WorkerDrainService(logger, scalingService, instanceSettings);
			await service.enterDrain();

			await service.exitDrain();

			expect(logger.info).toHaveBeenCalledWith(
				'[Worker] Resume signal received. Accepting new jobs.',
			);
		});

		it('does not resume the queue when not draining', async () => {
			await service.exitDrain();

			expect(scalingService.resumeLocalQueue).not.toHaveBeenCalled();
		});

		it('logs a warning when not draining', async () => {
			const logger = mockLogger();
			(logger.scoped as jest.Mock).mockReturnValue(logger);
			service = new WorkerDrainService(logger, scalingService, instanceSettings);

			await service.exitDrain();

			expect(logger.warn).toHaveBeenCalledWith(
				'[Worker] Resume signal received but worker is not draining. No-op.',
			);
		});

		it('throws UnexpectedError when called on a non-worker instance', async () => {
			// @ts-expect-error readonly property
			instanceSettings.instanceType = 'main';

			await expect(service.exitDrain()).rejects.toThrow(UnexpectedError);
		});
	});

	describe('waitForActiveJobsToFinish', () => {
		it('resolves immediately when running job count is 0', async () => {
			scalingService.getRunningJobsCount.mockReturnValue(0);

			await expect(service.waitForActiveJobsToFinish(5000)).resolves.toBeUndefined();
		});

		describe('with fake timers', () => {
			beforeEach(() => {
				jest.useFakeTimers();
			});

			afterEach(() => {
				jest.useRealTimers();
			});

			it('resolves before the deadline when the job count drops to 0', async () => {
				scalingService.getRunningJobsCount.mockReturnValueOnce(1).mockReturnValue(0);

				const promise = service.waitForActiveJobsToFinish(5000);
				await jest.advanceTimersByTimeAsync(600);

				await expect(promise).resolves.toBeUndefined();
			});

			it('resolves at the deadline when jobs never finish', async () => {
				scalingService.getRunningJobsCount.mockReturnValue(1);

				const promise = service.waitForActiveJobsToFinish(500);
				await jest.advanceTimersByTimeAsync(600);

				await expect(promise).resolves.toBeUndefined();
			});
		});
	});
});
