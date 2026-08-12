import { OperationalError } from 'n8n-workflow';

import type { JobData, JobMessage } from '../scaling.types';
import type { EnqueueOptions, IJobQueue, JobStatus, QueueJob } from './job-queue.interface';

type StoredJob = {
	id: string;
	data: JobData;
	priority: number;
	status: JobStatus;
	finished: Promise<void>;
	resolveFinished: () => void;
	rejectFinished: (error: Error) => void;
};

/**
 * Single-process `IJobQueue` that proves the interface and carries the
 * contract suite. NOT the hypervisor's queue: under `n8n hypervisor` workers
 * are separate forked processes, so the real ipc implementation needs the
 * cluster primary as broker and heartbeat-based stall handling. Not wired
 * into production; exercised via the contract test suite, which transfers to
 * the ipc implementation as-is.
 */
export class InMemoryJobQueue implements IJobQueue {
	private jobs = new Map<string, StoredJob>();

	private waiting: StoredJob[] = [];

	private nextId = 1;

	private paused = false;

	private activeCount = 0;

	private processor?: { concurrency: number; handler: (job: QueueJob) => Promise<void> };

	private messageHandlers: Array<(jobId: string, msg: JobMessage) => void> = [];

	private outcomeHandlers: Array<(outcome: 'completed' | 'failed') => void> = [];

	async start() {}

	async enqueue(data: JobData, { priority }: EnqueueOptions): Promise<QueueJob> {
		const id = (this.nextId++).toString();

		let resolveFinished!: () => void;
		let rejectFinished!: (error: Error) => void;
		const finished = new Promise<void>((resolve, reject) => {
			resolveFinished = resolve;
			rejectFinished = reject;
		});
		finished.catch(() => {}); // consumers may never await; avoid unhandled rejection

		const stored: StoredJob = {
			id,
			data,
			priority,
			status: 'waiting',
			finished,
			resolveFinished,
			rejectFinished,
		};
		this.jobs.set(id, stored);

		// Insert keeping priority order (lower number first), FIFO within equal priority.
		const at = this.waiting.findIndex((job) => job.priority > priority);
		if (at === -1) this.waiting.push(stored);
		else this.waiting.splice(at, 0, stored);

		queueMicrotask(() => this.drain());
		return this.toQueueJob(stored);
	}

	registerProcessor(concurrency: number, handler: (job: QueueJob) => Promise<void>) {
		this.processor = { concurrency, handler };
		queueMicrotask(() => this.drain());
	}

	async pause() {
		this.paused = true;
	}

	async getJob(jobId: string): Promise<QueueJob | null> {
		const stored = this.jobs.get(jobId);
		return stored ? this.toQueueJob(stored) : null;
	}

	async findJobsByStatus(statuses: JobStatus[]): Promise<QueueJob[]> {
		return [...this.jobs.values()]
			.filter((job) => statuses.includes(job.status))
			.map((job) => this.toQueueJob(job));
	}

	async getPendingCounts() {
		return { active: this.activeCount, waiting: this.waiting.length };
	}

	async ping() {}

	onMessage(handler: (jobId: string, msg: JobMessage) => void) {
		this.messageHandlers.push(handler);
	}

	onError(_handler: (error: Error) => void) {} // no transport, no transport errors

	onJobOutcome(handler: (outcome: 'completed' | 'failed') => void) {
		this.outcomeHandlers.push(handler);
	}

	private drain() {
		if (this.paused || !this.processor) return;

		while (this.activeCount < this.processor.concurrency && this.waiting.length > 0) {
			const stored = this.waiting.shift();
			if (!stored) return;
			this.run(stored);
		}
	}

	private run(stored: StoredJob) {
		if (!this.processor) return;
		this.activeCount++;
		stored.status = 'active';

		void this.processor
			.handler(this.toQueueJob(stored))
			.then(
				() => {
					stored.status = 'completed';
					stored.resolveFinished();
					this.outcomeHandlers.forEach((handler) => handler('completed'));
				},
				(error: Error) => {
					stored.status = 'failed';
					stored.rejectFinished(error);
					this.outcomeHandlers.forEach((handler) => handler('failed'));
				},
			)
			.finally(() => {
				this.activeCount--;
				this.drain();
			});
	}

	private toQueueJob(stored: StoredJob): QueueJob {
		return {
			id: stored.id,
			data: stored.data,
			sendMessage: async (msg) => {
				this.messageHandlers.forEach((handler) => handler(stored.id, msg));
			},
			isActive: async () => stored.status === 'active',
			remove: async () => {
				if (stored.status === 'active') throw new OperationalError('Cannot remove an active job');
				this.waiting = this.waiting.filter((job) => job.id !== stored.id);
				this.jobs.delete(stored.id);
			},
			finished: async () => await stored.finished,
		};
	}
}
