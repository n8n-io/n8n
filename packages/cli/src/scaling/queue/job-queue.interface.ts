import type { JobData, JobMessage } from '../scaling.types';

export type JobStatus = 'active' | 'waiting' | 'delayed' | 'completed' | 'failed' | 'paused';

export type EnqueueOptions = {
	/** Priority from `1` (highest) to `MAX_SAFE_INTEGER` (lowest). */
	priority: number;
};

/**
 * Handle to a single enqueued execution job. Wraps the backing library's job
 * object so consumers never hold a `Bull.Job`.
 */
export type QueueJob = {
	id: string;
	data: JobData;
	/**
	 * Send a `JobMessage` on the job's message channel. Delivered to every
	 * process that registered `IJobQueue.onMessage`, including the sender's
	 * own process (mirrors Bull `global:progress` semantics, which callers
	 * depend on). Whether this channel stays part of the queue abstraction or
	 * moves onto `MessageTransport` is an open decision; this seam isolates
	 * that decision from all call sites.
	 */
	sendMessage(msg: JobMessage): Promise<void>;
	isActive(): Promise<boolean>;
	remove(): Promise<void>;
	/**
	 * Resolves when the job completes on a worker. Rejects with the job's
	 * failure error, or with `MaxStalledCountError` when the job stalled.
	 */
	finished(): Promise<void>;
};

/**
 * Storage facet of the transport abstraction from the "Unify modes of
 * operation" RFC: the durable execution queue. Counterpart to the messaging
 * facet (`MessageTransport`). Redis/Bull-backed for multi-host deployments;
 * other implementations must be behaviorally equivalent: single consumer per
 * job, priority ordering, bounded concurrency, in-flight message channel, and
 * NO automatic retries. A job whose worker is lost fails immediately (mirrors
 * Bull with `maxStalledCount: 0`); dangling executions are handled by the
 * leader's queue recovery, not by re-delivery.
 */
export interface IJobQueue {
	/** Create underlying resources (connections, data structures). Idempotent. */
	start(): Promise<void>;
	enqueue(data: JobData, options: EnqueueOptions): Promise<QueueJob>;
	/** Register this process as a consumer. At most one processor per process. */
	registerProcessor(concurrency: number, handler: (job: QueueJob) => Promise<void>): void;
	/** Stop enqueueing and stop picking up jobs in this process. */
	pause(): Promise<void>;
	getJob(jobId: string): Promise<QueueJob | null>;
	findJobsByStatus(statuses: JobStatus[]): Promise<QueueJob[]>;
	getPendingCounts(): Promise<{ active: number; waiting: number }>;
	/** Health check against the backing store. Rejects when unreachable. */
	ping(): Promise<void>;
	/** Receive every `JobMessage` sent via any `QueueJob.sendMessage`. */
	onMessage(handler: (jobId: string, msg: JobMessage) => void): void;
	onError(handler: (error: Error) => void): void;
	/** Job outcome notifications, used only for queue metrics counters. */
	onJobOutcome(handler: (outcome: 'completed' | 'failed') => void): void;
}

/** Whether a value received on the message channel is a `JobMessage`. */
export function isJobMessage(candidate: unknown): candidate is JobMessage {
	return typeof candidate === 'object' && candidate !== null && 'kind' in candidate;
}
