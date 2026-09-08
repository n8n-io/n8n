import { Container } from '@n8n/di';
import { isRedisAvailable } from '@test-integration/redis';
import { setupTestServer } from '@test-integration/utils';
import BullQueue from 'bull';
import { v4 as uuid } from 'uuid';

import { ScalingService } from '@/scaling/scaling.service';
import type { JobFinishedProps } from '@/scaling/scaling.types';
import { RedisClientService } from '@/services/redis-client.service';

setupTestServer({ endpointGroups: [] });

describe('ScalingService Integration - waitForJobResult', () => {
	let scalingService: ScalingService;
	let redisClientService: RedisClientService;
	let queue: BullQueue.Queue;
	let redisAvailable = false;

	beforeAll(async () => {
		redisAvailable = await isRedisAvailable();
		if (redisAvailable) {
			scalingService = Container.get(ScalingService);
			redisClientService = Container.get(RedisClientService);
			await scalingService.setupQueue();
		}
	});

	beforeEach((context) => {
		if (!redisAvailable) {
			context.skip();
		}
	});

	afterEach(async () => {
		if (queue) {
			await queue.close();
		}
	});

	it('should timeout when job is deleted without completed event', async () => {
		const setIntervalSpy = vi.spyOn(global, 'setInterval');
		const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

		const queueName = `test-queue-${uuid()}`;
		queue = new BullQueue(queueName, {
			createClient: (type) => {
				return redisClientService.createClient({ type: `${type}(bull)` as never });
			},
			defaultJobOptions: { removeOnComplete: true },
		});

		const executionId = `exec-${uuid()}`;
		const jobData = {
			executionId,
			workflowId: `wf-${uuid()}`,
			loadStaticData: false,
		};

		// 3. Add a test job with a known executionId
		const job = await queue.add('job', jobData);

		// 4. Manually call job.remove() to delete the job from Redis
		await job.remove();

		// 5. Call scalingService.waitForJobResult with short timeout and fast polling
		const promise = scalingService.waitForJobResult(executionId, 500, 50);

		// Assert it rejects with a timeout error
		await expect(promise).rejects.toThrow(
			`Timeout waiting for job result for execution ${executionId}`,
		);

		// 6. Assert that the internal jobResults Map does not contain the executionId after the timeout
		// @ts-expect-error Private property
		expect(scalingService.jobResults.has(executionId)).toBe(false);

		// 7. Assert that intervals/listeners were cleaned up
		expect(setIntervalSpy).toHaveBeenCalled();
		expect(clearIntervalSpy).toHaveBeenCalled();

		setIntervalSpy.mockRestore();
		clearIntervalSpy.mockRestore();
	});

	it('should resolve when job result is available in map (manual resolution)', async () => {
		const executionId = `exec-${uuid()}`;

		const mockJobResult: JobFinishedProps = {
			success: true,
			status: 'success',
			startedAt: new Date(),
			stoppedAt: new Date(),
		};

		const promise = scalingService.waitForJobResult(executionId, 500, 50);

		// @ts-expect-error Private property
		scalingService.jobResults.set(executionId, mockJobResult);

		const result = await promise;
		expect(result).toEqual(mockJobResult);

		// @ts-expect-error Private property
		expect(scalingService.jobResults.has(executionId)).toBe(false);
	});

	it('should resolve when progress event is emitted from queue (event integration)', async () => {
		const executionId = `exec-${uuid()}`;

		const promise = scalingService.waitForJobResult(executionId, 1000, 50);

		const mockMessage = {
			kind: 'job-finished',
			version: 2,
			executionId,
			success: true,
			status: 'success',
			startedAt: new Date().toISOString(),
			stoppedAt: new Date().toISOString(),
		};

		// Simulate global:progress event on the production queue
		// @ts-expect-error Private property
		scalingService.queue.emit('global:progress', 'job-id', mockMessage);

		const result = await promise;
		expect(result.success).toBe(true);
		expect(result.status).toBe('success');

		// @ts-expect-error Private property
		expect(scalingService.jobResults.has(executionId)).toBe(false);
	});
});
