import { mock } from 'vitest-mock-extended';

import { MaxStalledCountError } from '@/errors/max-stalled-count.error';
import type { HypervisorWorker } from '@/scaling/hypervisor-message-router';

import { defineJobQueueContractTests } from './job-queue.contract';
import type { JobData } from '../../scaling.types';
import { IpcJobQueue, JobQueueHost } from '../ipc-job-queue';
import type { QueueRegisterWorker } from '../ipc-job-queue';

const registerWorker = (concurrency: number): QueueRegisterWorker => ({
	type: 'queue:register-worker',
	concurrency,
});

/**
 * Loopback harness: the child's `process.send` feeds the primary-side host, and
 * the host's `worker.send` feeds `process.emit('message')`, so a real
 * IpcJobQueue and a real JobQueueHost talk to each other inside one process.
 */
let host: JobQueueHost;
let createdQueues: IpcJobQueue[] = [];
let originalSend: typeof process.send;

const loopbackWorker: HypervisorWorker = {
	id: 1,
	send: (message) =>
		(process.emit as (event: string, message: unknown) => boolean)('message', message),
	process: { pid: 123 },
};

beforeEach(() => {
	host = new JobQueueHost();
	originalSend = process.send;
	process.send = vi.fn((message: unknown) => {
		host.onMessage(loopbackWorker, message as { type: string });
		return true;
	});
});

afterEach(() => {
	// Old instances keep listening on `process`; shut them down so a later
	// test's dispatches are not double-processed.
	createdQueues.forEach((queue) => queue.shutdown());
	createdQueues = [];
	process.send = originalSend;
});

const createQueue = async () => {
	const queue = new IpcJobQueue();
	createdQueues.push(queue);
	await queue.start();
	return queue;
};

defineJobQueueContractTests('IpcJobQueue', createQueue);

describe('IpcJobQueue over the hypervisor channel', () => {
	const jobData = (executionId: string): JobData =>
		mock<JobData>({ executionId, workflowId: 'wf-1', loadStaticData: false });

	it('rejects finished() with MaxStalledCountError when the processing child exits', async () => {
		// Enqueuer talks over the loopback; the processor is a separate fake child
		// driven directly against the host, so its exit can be simulated.
		const enqueuer = await createQueue();
		const dispatches: unknown[] = [];
		const processorWorker: HypervisorWorker = {
			id: 2,
			send: (message) => dispatches.push(message),
			process: { pid: 456 },
		};
		host.onMessage(processorWorker, registerWorker(1));

		const job = await enqueuer.enqueue(jobData('e1'), { priority: 100 });
		expect(dispatches).toContainEqual(
			expect.objectContaining({
				type: 'queue:dispatch',
				job: expect.objectContaining({ id: job.id }),
			}),
		);

		host.onExit(processorWorker);

		await expect(job.finished()).rejects.toBeInstanceOf(MaxStalledCountError);
		expect(await enqueuer.getJob(job.id)).toBeNull();
	});

	it('spreads dispatches across workers within each concurrency limit', async () => {
		const enqueuer = await createQueue();
		const dispatchesByWorker = new Map<number, number>();
		const fakeProcessor = (id: number): HypervisorWorker => ({
			id,
			send: (message) => {
				if ((message as { type: string }).type === 'queue:dispatch') {
					dispatchesByWorker.set(id, (dispatchesByWorker.get(id) ?? 0) + 1);
				}
			},
			process: { pid: 1000 + id },
		});
		const workerA = fakeProcessor(2);
		const workerB = fakeProcessor(3);
		host.onMessage(workerA, registerWorker(2));
		host.onMessage(workerB, registerWorker(2));

		for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) {
			await enqueuer.enqueue(jobData(id), { priority: 100 });
		}

		// 4 slots total; the remaining 2 jobs stay waiting until a slot frees up.
		expect(dispatchesByWorker.get(2)).toBe(2);
		expect(dispatchesByWorker.get(3)).toBe(2);
		expect(await enqueuer.getPendingCounts()).toEqual({ active: 4, waiting: 2 });
	});

	it('does not re-deliver a stalled job to surviving workers', async () => {
		const enqueuer = await createQueue();
		const dispatches: unknown[] = [];
		const dying: HypervisorWorker = { id: 2, send: () => {}, process: { pid: 456 } };
		const surviving: HypervisorWorker = {
			id: 3,
			send: (message) => dispatches.push(message),
			process: { pid: 789 },
		};
		host.onMessage(dying, registerWorker(1));

		const job = await enqueuer.enqueue(jobData('e1'), { priority: 100 });
		host.onMessage(surviving, registerWorker(1));
		host.onExit(dying);

		await expect(job.finished()).rejects.toBeInstanceOf(MaxStalledCountError);
		expect(
			dispatches.filter((m) => (m as { type: string }).type === 'queue:dispatch'),
		).toHaveLength(0);
	});
});
