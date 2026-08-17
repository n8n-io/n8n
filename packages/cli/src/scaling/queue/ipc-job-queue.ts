import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

import { MaxStalledCountError } from '@/errors/max-stalled-count.error';
import type {
	HypervisorMessageHandler,
	HypervisorWorker,
} from '@/scaling/hypervisor-message-router';

import type { JobData, JobMessage } from '../scaling.types';
import { isJobMessage } from './job-queue.interface';
import type { EnqueueOptions, IJobQueue, JobStatus, QueueJob } from './job-queue.interface';

const REQUEST_TIMEOUT_MS = 10_000;

type JobSnapshot = { id: string; data: JobData; status: JobStatus };

// Child -> primary
export type QueueAttach = { type: 'queue:attach' };
export type QueueEnqueue = {
	type: 'queue:enqueue';
	requestId: number;
	data: JobData;
	priority: number;
};
export type QueueRegisterWorker = { type: 'queue:register-worker'; concurrency: number };
export type QueuePause = { type: 'queue:pause' };
export type QueueJobDone = { type: 'queue:job-done'; jobId: string };
export type QueueJobError = {
	type: 'queue:job-error';
	jobId: string;
	errorMsg: string;
	errorStack: string;
};
export type QueueGetJob = { type: 'queue:get-job'; requestId: number; jobId: string };
export type QueueFindJobs = { type: 'queue:find-jobs'; requestId: number; statuses: JobStatus[] };
export type QueueCounts = { type: 'queue:counts'; requestId: number };
export type QueueRemove = { type: 'queue:remove'; requestId: number; jobId: string };
export type QueuePing = { type: 'queue:ping'; requestId: number };

// Primary -> child
export type QueueDispatch = { type: 'queue:dispatch'; job: { id: string; data: JobData } };
export type QueueJobOutcome = {
	type: 'queue:job-outcome';
	jobId: string;
	outcome: 'completed' | 'failed' | 'stalled';
	errorMsg?: string;
	errorStack?: string;
};
export type QueueReply = {
	type: 'queue:reply';
	requestId: number;
	job?: JobSnapshot | null;
	jobs?: JobSnapshot[];
	counts?: { active: number; waiting: number };
	error?: string;
};

// Both directions: sent by any child, broadcast by the primary to every
// attached child, including the sender (mirrors Bull `global:progress`).
export type QueueJobMessage = { type: 'queue:job-message'; jobId: string; msg: JobMessage };

const isType = <T extends { type: string }>(message: unknown, type: T['type']): message is T =>
	typeof message === 'object' && message !== null && (message as { type?: unknown }).type === type;

/**
 * `IJobQueue` over the cluster IPC channel set up by `n8n hypervisor` (see
 * {@link JobQueueHost} below, the primary-side broker). Only ever constructed
 * in a child forked by the hypervisor; `TransportModeService.validateAtBoot()`
 * rejects `queue=ipc` otherwise. Mirrors today's Bull behavior per the
 * hackmation decisions: no automatic retries (a job whose worker exits fails
 * immediately with `MaxStalledCountError`), finished jobs are dropped
 * (retention 0), and the job message channel broadcasts to every attached
 * process including the sender.
 */
@Service()
export class IpcJobQueue implements IJobQueue {
	private started = false;

	private nextRequestId = 0;

	private readonly pendingReplies = new Map<
		number,
		{ resolve: (reply: QueueReply) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }
	>();

	private readonly outcomeWatchers = new Map<
		string,
		{ resolve: () => void; reject: (error: Error) => void }
	>();

	/** Outcomes that arrived before `finished()` registered a watcher. */
	private readonly settledOutcomes = new Map<string, Error | null>();

	private processor?: (job: QueueJob) => Promise<void>;

	private readonly messageHandlers: Array<(jobId: string, msg: JobMessage) => void> = [];

	private readonly outcomeHandlers: Array<(outcome: 'completed' | 'failed') => void> = [];

	async start() {
		if (this.started) return;
		this.started = true;

		process.on('message', this.onIpcMessage);
		process.send?.({ type: 'queue:attach' } satisfies QueueAttach);
	}

	async enqueue(data: JobData, { priority }: EnqueueOptions): Promise<QueueJob> {
		const reply = await this.request<QueueEnqueue>({
			type: 'queue:enqueue',
			requestId: 0, // assigned by request()
			data,
			priority,
		});
		if (!reply.job) throw new OperationalError('Primary failed to enqueue job');
		return this.toQueueJob(reply.job);
	}

	registerProcessor(concurrency: number, handler: (job: QueueJob) => Promise<void>) {
		this.processor = handler;
		process.send?.({ type: 'queue:register-worker', concurrency } satisfies QueueRegisterWorker);
	}

	async pause() {
		process.send?.({ type: 'queue:pause' } satisfies QueuePause);
	}

	async getJob(jobId: string): Promise<QueueJob | null> {
		const reply = await this.request<QueueGetJob>({ type: 'queue:get-job', requestId: 0, jobId });
		return reply.job ? this.toQueueJob(reply.job) : null;
	}

	async findJobsByStatus(statuses: JobStatus[]): Promise<QueueJob[]> {
		const reply = await this.request<QueueFindJobs>({
			type: 'queue:find-jobs',
			requestId: 0,
			statuses,
		});
		return (reply.jobs ?? []).map((job) => this.toQueueJob(job));
	}

	async getPendingCounts() {
		const reply = await this.request<QueueCounts>({ type: 'queue:counts', requestId: 0 });
		return reply.counts ?? { active: 0, waiting: 0 };
	}

	async ping() {
		await this.request<QueuePing>({ type: 'queue:ping', requestId: 0 });
	}

	onMessage(handler: (jobId: string, msg: JobMessage) => void): void {
		this.messageHandlers.push(handler);
	}

	onError(_handler: (error: Error) => void) {} // channel errors surface as request timeouts

	onJobOutcome(handler: (outcome: 'completed' | 'failed') => void) {
		this.outcomeHandlers.push(handler);
	}

	shutdown() {
		process.off('message', this.onIpcMessage);
		for (const { timer, reject } of this.pendingReplies.values()) {
			clearTimeout(timer);
			reject(new OperationalError('Queue IPC channel shut down'));
		}
		this.pendingReplies.clear();
	}

	private readonly onIpcMessage = (message: unknown) => {
		if (isType<QueueReply>(message, 'queue:reply')) {
			const pending = this.pendingReplies.get(message.requestId);
			if (!pending) return;
			clearTimeout(pending.timer);
			this.pendingReplies.delete(message.requestId);
			if (message.error) pending.reject(new OperationalError(message.error));
			else pending.resolve(message);
			return;
		}

		if (isType<QueueDispatch>(message, 'queue:dispatch')) {
			void this.process(message.job);
			return;
		}

		if (isType<QueueJobOutcome>(message, 'queue:job-outcome')) {
			this.settleOutcome(message);
			return;
		}

		if (isType<QueueJobMessage>(message, 'queue:job-message') && isJobMessage(message.msg)) {
			for (const handler of this.messageHandlers) handler(message.jobId, message.msg);
		}
	};

	private async process(job: { id: string; data: JobData }) {
		if (!this.processor) return;
		try {
			await this.processor(this.toQueueJob(job));
			process.send?.({ type: 'queue:job-done', jobId: job.id } satisfies QueueJobDone);
		} catch (error) {
			const failure = error instanceof Error ? error : new Error(String(error));
			process.send?.({
				type: 'queue:job-error',
				jobId: job.id,
				errorMsg: failure.message,
				errorStack: failure.stack ?? '',
			} satisfies QueueJobError);
		}
	}

	private settleOutcome(outcome: QueueJobOutcome) {
		const watcher = this.outcomeWatchers.get(outcome.jobId);
		this.outcomeWatchers.delete(outcome.jobId);

		if (outcome.outcome === 'completed') {
			if (watcher) watcher.resolve();
			else this.settledOutcomes.set(outcome.jobId, null);
			this.outcomeHandlers.forEach((handler) => handler('completed'));
			return;
		}

		let error: Error;
		if (outcome.outcome === 'stalled') {
			error = new MaxStalledCountError(new Error(outcome.errorMsg ?? 'Job stalled'));
		} else {
			error = new Error(outcome.errorMsg ?? 'Job failed');
			error.stack = outcome.errorStack || error.stack;
		}
		if (watcher) watcher.reject(error);
		else this.settledOutcomes.set(outcome.jobId, error);
		this.outcomeHandlers.forEach((handler) => handler('failed'));
	}

	private async request<T extends { type: string; requestId: number }>(
		message: T,
	): Promise<QueueReply> {
		const requestId = this.nextRequestId++;
		return await new Promise<QueueReply>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingReplies.delete(requestId);
				reject(new OperationalError(`Queue IPC request timed out: ${message.type}`));
			}, REQUEST_TIMEOUT_MS);
			this.pendingReplies.set(requestId, { resolve, reject, timer });
			process.send?.({ ...message, requestId });
		});
	}

	private toQueueJob(job: { id: string; data: JobData }): QueueJob {
		return {
			id: job.id,
			data: job.data,
			sendMessage: async (msg) => {
				process.send?.({ type: 'queue:job-message', jobId: job.id, msg } satisfies QueueJobMessage);
			},
			isActive: async () => {
				const reply = await this.request<QueueGetJob>({
					type: 'queue:get-job',
					requestId: 0,
					jobId: job.id,
				});
				return reply.job?.status === 'active';
			},
			remove: async () => {
				await this.request<QueueRemove>({ type: 'queue:remove', requestId: 0, jobId: job.id });
			},
			finished: async () =>
				await new Promise<void>((resolve, reject) => {
					if (this.settledOutcomes.has(job.id)) {
						const error = this.settledOutcomes.get(job.id);
						this.settledOutcomes.delete(job.id);
						if (error) reject(error);
						else resolve();
						return;
					}
					this.outcomeWatchers.set(job.id, { resolve, reject });
				}),
		};
	}
}

type HostedJob = {
	id: string;
	data: JobData;
	priority: number;
	status: JobStatus;
	/** Cluster worker id of the child currently processing the job. */
	processedBy?: number;
};

type ProcessorEntry = {
	worker: HypervisorWorker;
	concurrency: number;
	active: Set<string>;
	paused: boolean;
};

/**
 * Primary-side counterpart of {@link IpcJobQueue}: the execution queue broker
 * hosted by the hypervisor. Holds all queue state (waiting list ordered by
 * priority, per-processor active sets) and dispatches to registered worker
 * children within their concurrency. A child exit fails its active jobs
 * immediately with a stalled outcome, mirroring Bull with maxStalledCount: 0;
 * queue recovery on the leader main handles the dangling executions.
 */
@Service()
export class JobQueueHost implements HypervisorMessageHandler {
	readonly prefix = 'queue:';

	private nextJobId = 1;

	private readonly jobs = new Map<string, HostedJob>();

	private waiting: HostedJob[] = [];

	private readonly attached = new Map<number, HypervisorWorker>();

	private readonly processors = new Map<number, ProcessorEntry>();

	onMessage(worker: HypervisorWorker, message: { type: string }): void {
		if (isType<QueueAttach>(message, 'queue:attach')) {
			this.attached.set(worker.id, worker);
		} else if (isType<QueueEnqueue>(message, 'queue:enqueue')) {
			this.enqueue(worker, message);
		} else if (isType<QueueRegisterWorker>(message, 'queue:register-worker')) {
			this.processors.set(worker.id, {
				worker,
				concurrency: message.concurrency,
				active: new Set(),
				paused: false,
			});
			this.drain();
		} else if (isType<QueuePause>(message, 'queue:pause')) {
			const processor = this.processors.get(worker.id);
			if (processor) processor.paused = true;
		} else if (isType<QueueJobDone>(message, 'queue:job-done')) {
			this.settle(worker.id, message.jobId, { outcome: 'completed' });
		} else if (isType<QueueJobError>(message, 'queue:job-error')) {
			this.settle(worker.id, message.jobId, {
				outcome: 'failed',
				errorMsg: message.errorMsg,
				errorStack: message.errorStack,
			});
		} else if (isType<QueueJobMessage>(message, 'queue:job-message')) {
			this.broadcast(message);
		} else if (isType<QueueGetJob>(message, 'queue:get-job')) {
			const job = this.jobs.get(message.jobId);
			this.reply(worker, message.requestId, { job: job ? this.snapshot(job) : null });
		} else if (isType<QueueFindJobs>(message, 'queue:find-jobs')) {
			const jobs = [...this.jobs.values()]
				.filter((job) => message.statuses.includes(job.status))
				.map((job) => this.snapshot(job));
			this.reply(worker, message.requestId, { jobs });
		} else if (isType<QueueCounts>(message, 'queue:counts')) {
			this.reply(worker, message.requestId, { counts: this.counts() });
		} else if (isType<QueueRemove>(message, 'queue:remove')) {
			this.remove(worker, message);
		} else if (isType<QueuePing>(message, 'queue:ping')) {
			this.reply(worker, message.requestId, {});
		}
	}

	onExit(worker: HypervisorWorker): void {
		this.attached.delete(worker.id);

		// Fail the exited child's in-flight jobs immediately (no re-delivery, per
		// the no-retry decision); enqueuers see MaxStalledCountError via 'stalled'.
		const processor = this.processors.get(worker.id);
		this.processors.delete(worker.id);
		if (!processor) return;
		for (const jobId of processor.active) {
			const job = this.jobs.get(jobId);
			if (!job) continue;
			this.jobs.delete(jobId);
			this.broadcastOutcome({
				type: 'queue:job-outcome',
				jobId,
				outcome: 'stalled',
				errorMsg: `Worker (cluster id ${worker.id}) exited while processing job ${jobId}`,
			});
		}
		this.drain();
	}

	private enqueue(worker: HypervisorWorker, message: QueueEnqueue): void {
		const job: HostedJob = {
			id: (this.nextJobId++).toString(),
			data: message.data,
			priority: message.priority,
			status: 'waiting',
		};
		this.jobs.set(job.id, job);

		// Insert keeping priority order (lower number first), FIFO within equal priority.
		const at = this.waiting.findIndex((waitingJob) => waitingJob.priority > job.priority);
		if (at === -1) this.waiting.push(job);
		else this.waiting.splice(at, 0, job);

		this.reply(worker, message.requestId, { job: this.snapshot(job) });
		this.drain();
	}

	private settle(
		workerId: number,
		jobId: string,
		result: { outcome: 'completed' | 'failed'; errorMsg?: string; errorStack?: string },
	): void {
		this.processors.get(workerId)?.active.delete(jobId);
		const job = this.jobs.get(jobId);
		if (job) this.jobs.delete(jobId); // retention 0: finished jobs are dropped, like removeOnComplete/removeOnFail
		this.broadcastOutcome({ type: 'queue:job-outcome', jobId, ...result });
		this.drain();
	}

	private remove(worker: HypervisorWorker, message: QueueRemove): void {
		const job = this.jobs.get(message.jobId);
		if (job?.status === 'active') {
			this.reply(worker, message.requestId, { error: 'Cannot remove an active job' });
			return;
		}
		if (job) {
			this.jobs.delete(job.id);
			this.waiting = this.waiting.filter((waitingJob) => waitingJob.id !== job.id);
		}
		this.reply(worker, message.requestId, {});
	}

	private drain(): void {
		while (this.waiting.length > 0) {
			const processor = this.pickProcessor();
			if (!processor) return;
			const job = this.waiting.shift();
			if (!job) return;
			job.status = 'active';
			job.processedBy = processor.worker.id;
			processor.active.add(job.id);
			processor.worker.send({
				type: 'queue:dispatch',
				job: { id: job.id, data: job.data },
			} satisfies QueueDispatch);
		}
	}

	/** The non-paused processor with the most free slots, or undefined when all are full. */
	private pickProcessor(): ProcessorEntry | undefined {
		let best: ProcessorEntry | undefined;
		let bestFree = 0;
		for (const processor of this.processors.values()) {
			if (processor.paused) continue;
			const free = processor.concurrency - processor.active.size;
			if (free > bestFree) {
				best = processor;
				bestFree = free;
			}
		}
		return best;
	}

	private counts() {
		let active = 0;
		for (const processor of this.processors.values()) active += processor.active.size;
		return { active, waiting: this.waiting.length };
	}

	private snapshot(job: HostedJob): JobSnapshot {
		return { id: job.id, data: job.data, status: job.status };
	}

	private reply(worker: HypervisorWorker, requestId: number, body: Partial<QueueReply>): void {
		worker.send({ type: 'queue:reply', requestId, ...body } satisfies QueueReply);
	}

	private broadcast(message: QueueJobMessage): void {
		for (const worker of this.attached.values()) worker.send(message);
	}

	private broadcastOutcome(outcome: QueueJobOutcome): void {
		for (const worker of this.attached.values()) worker.send(outcome);
	}
}
