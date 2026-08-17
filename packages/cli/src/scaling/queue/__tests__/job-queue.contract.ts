import { mock } from 'vitest-mock-extended';

import type { JobData } from '../../scaling.types';
import type { IJobQueue } from '../job-queue.interface';

const jobData = (executionId: string): JobData =>
	mock<JobData>({ executionId, workflowId: 'wf-1', loadStaticData: false });

/**
 * Behavioral contract every IJobQueue implementation must satisfy. Run it from
 * an implementation-specific test file via a factory that returns a started
 * queue. Deliberately excludes stall detection: that requires a second
 * process, so it stays implementation-specific.
 */
export function defineJobQueueContractTests(name: string, factory: () => Promise<IJobQueue>) {
	describe(`IJobQueue contract: ${name}`, () => {
		let queue: IJobQueue;

		beforeEach(async () => {
			queue = await factory();
		});

		it('delivers an enqueued job to the registered processor exactly once', async () => {
			const processed: string[] = [];
			queue.registerProcessor(1, async (job) => {
				processed.push(job.data.executionId);
			});
			const job = await queue.enqueue(jobData('e1'), { priority: 100 });
			await job.finished();
			expect(processed).toEqual(['e1']);
		});

		it('processes higher-priority (lower number) jobs first', async () => {
			const order: string[] = [];
			const low = await queue.enqueue(jobData('low'), { priority: 100 });
			const high = await queue.enqueue(jobData('high'), { priority: 50 });
			queue.registerProcessor(1, async (job) => {
				order.push(job.data.executionId);
			});
			await Promise.all([low.finished(), high.finished()]);
			expect(order[0]).toBe('high');
		});

		it('never exceeds the configured concurrency', async () => {
			let active = 0;
			let peak = 0;
			queue.registerProcessor(2, async () => {
				active++;
				peak = Math.max(peak, active);
				await new Promise((resolve) => setTimeout(resolve, 20));
				active--;
			});
			const jobs = await Promise.all(
				['a', 'b', 'c', 'd', 'e'].map(
					async (id) => await queue.enqueue(jobData(id), { priority: 100 }),
				),
			);
			await Promise.all(jobs.map(async (job) => await job.finished()));
			expect(peak).toBe(2);
		});

		it('broadcasts sendMessage to onMessage subscribers, including the sender side', async () => {
			const received: Array<{ jobId: string; kind: string }> = [];
			queue.onMessage((jobId, msg) => received.push({ jobId, kind: msg.kind }));
			queue.registerProcessor(1, async (job) => {
				await job.sendMessage({
					kind: 'job-failed',
					executionId: job.data.executionId,
					workerId: 'w1',
					errorMsg: 'x',
					errorStack: '',
				});
			});
			const job = await queue.enqueue(jobData('e1'), { priority: 100 });
			await job.finished();
			expect(received).toEqual([{ jobId: job.id, kind: 'job-failed' }]);
		});

		it('rejects finished() when the handler throws, and reports the failed outcome', async () => {
			const outcomes: string[] = [];
			queue.onJobOutcome((outcome) => outcomes.push(outcome));
			queue.registerProcessor(1, async () => {
				throw new Error('boom');
			});
			const job = await queue.enqueue(jobData('e1'), { priority: 100 });
			await expect(job.finished()).rejects.toThrow('boom');
			expect(outcomes).toContain('failed');
		});

		it('remove() on a waiting job prevents processing', async () => {
			const processed: string[] = [];
			const job = await queue.enqueue(jobData('e1'), { priority: 100 });
			expect(await job.isActive()).toBe(false);
			await job.remove();
			queue.registerProcessor(1, async (processedJob) => {
				processed.push(processedJob.data.executionId);
			});
			await new Promise((resolve) => setTimeout(resolve, 30));
			expect(processed).toEqual([]);
			expect(await queue.getJob(job.id)).toBeNull();
		});

		it('reports pending counts and finds jobs by status', async () => {
			await queue.enqueue(jobData('e1'), { priority: 100 });
			await queue.enqueue(jobData('e2'), { priority: 100 });
			expect(await queue.getPendingCounts()).toEqual({ active: 0, waiting: 2 });
			const waiting = await queue.findJobsByStatus(['waiting']);
			expect(waiting.map((job) => job.data.executionId).sort()).toEqual(['e1', 'e2']);
		});

		it('pause() stops job pickup', async () => {
			const processed: string[] = [];
			queue.registerProcessor(1, async (job) => {
				processed.push(job.data.executionId);
			});
			await queue.pause();
			await queue.enqueue(jobData('e1'), { priority: 100 });
			await new Promise((resolve) => setTimeout(resolve, 30));
			expect(processed).toEqual([]);
			expect(await queue.getPendingCounts()).toEqual({ active: 0, waiting: 1 });
		});

		it('ping() resolves while the queue is up', async () => {
			await expect(queue.ping()).resolves.toBeUndefined();
		});
	});
}
