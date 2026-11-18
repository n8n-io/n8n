import type { ExecutionStatus } from 'n8n-workflow';

const FAILED_STATUSES: ReadonlySet<ExecutionStatus> = new Set(['error', 'crashed']);

interface Bucket {
	second: number;
	started: number;
	succeeded: number;
	failed: number;
	/** Runs that stopped at a Wait node or a form, to go on later. */
	paused: number;
}

interface WorkflowActivity {
	/** Execution id to start time in ms. */
	running: Map<string, number>;
	/** Execution id to the time it paused, in ms. */
	waiting: Map<string, number>;
	/**
	 * Ring of one-second buckets, so memory stays fixed at any run rate. It has one more slot than
	 * the window, so the current second does not overwrite the oldest full second.
	 */
	buckets: Bucket[];
	lastEventAt: number;
}

export interface WorkflowActivitySnapshot {
	workflowId: string;
	running: number;
	started: number;
	succeeded: number;
	failed: number;
	/** Runs that are paused now, waiting to go on. A paused run is not a failure. */
	waiting: number;
	/** Pauses in the window. */
	paused: number;
	/** Starts in each full second of the window, oldest first. The current second is not in it. */
	startedPerSecond: number[];
	lastEventAt: number;
}

/** In-memory run counts for each workflow. All methods take `now` in ms, so tests control time. */
export class ActivityTracker {
	private readonly workflows = new Map<string, WorkflowActivity>();

	private readonly ringSize: number;

	constructor(
		readonly windowSeconds: number,
		private readonly maxRunningMs: number,
		private readonly maxWaitingMs: number,
	) {
		this.ringSize = windowSeconds + 1;
	}

	recordStarted(workflowId: string, executionId: string, now: number): void {
		const activity = this.activityOf(workflowId);
		activity.waiting.delete(executionId);
		activity.running.set(executionId, now);
		this.bucketAt(activity, now).started++;
		activity.lastEventAt = now;
	}

	/** A run that continues after a wait. It is running again, but it is not a new run. */
	recordResumed(workflowId: string, executionId: string, now: number): void {
		const activity = this.activityOf(workflowId);
		activity.waiting.delete(executionId);
		activity.running.set(executionId, now);
		activity.lastEventAt = now;
	}

	recordEnded(workflowId: string, executionId: string, status: ExecutionStatus, now: number): void {
		const activity = this.activityOf(workflowId);
		activity.running.delete(executionId);
		const bucket = this.bucketAt(activity, now);
		if (status === 'waiting') {
			activity.waiting.set(executionId, now);
			bucket.paused++;
		} else {
			activity.waiting.delete(executionId);
			if (status === 'success') bucket.succeeded++;
			else if (FAILED_STATUSES.has(status)) bucket.failed++;
		}
		activity.lastEventAt = now;
	}

	snapshot(now: number): WorkflowActivitySnapshot[] {
		this.prune(now);
		const currentSecond = Math.floor(now / 1000);
		const oldestSecond = currentSecond - this.windowSeconds;

		return [...this.workflows.entries()].map(([workflowId, activity]) => {
			const recent = activity.buckets.filter((bucket) => bucket.second > oldestSecond);
			const sum = (key: 'started' | 'succeeded' | 'failed' | 'paused') =>
				recent.reduce((total, bucket) => total + bucket[key], 0);
			return {
				workflowId,
				running: activity.running.size,
				started: sum('started'),
				succeeded: sum('succeeded'),
				failed: sum('failed'),
				waiting: activity.waiting.size,
				paused: sum('paused'),
				startedPerSecond: Array.from({ length: this.windowSeconds }, (_, i) => {
					const second = oldestSecond + i;
					const bucket = activity.buckets[second % this.ringSize];
					return bucket?.second === second ? bucket.started : 0;
				}),
				lastEventAt: activity.lastEventAt,
			};
		});
	}

	/** Drops stale runs, and workflows with no run and no event in the window. */
	prune(now: number): void {
		for (const [workflowId, activity] of this.workflows) {
			for (const [executionId, startedAt] of activity.running) {
				if (now - startedAt > this.maxRunningMs) activity.running.delete(executionId);
			}
			for (const [executionId, pausedAt] of activity.waiting) {
				if (now - pausedAt > this.maxWaitingMs) activity.waiting.delete(executionId);
			}
			const isQuiet = now - activity.lastEventAt > this.windowSeconds * 1000;
			const isIdle = activity.running.size === 0 && activity.waiting.size === 0;
			if (isIdle && isQuiet) this.workflows.delete(workflowId);
		}
	}

	private activityOf(workflowId: string): WorkflowActivity {
		let activity = this.workflows.get(workflowId);
		if (!activity) {
			activity = { running: new Map(), waiting: new Map(), buckets: [], lastEventAt: 0 };
			this.workflows.set(workflowId, activity);
		}
		return activity;
	}

	private bucketAt(activity: WorkflowActivity, now: number): Bucket {
		const second = Math.floor(now / 1000);
		const index = second % this.ringSize;
		let bucket = activity.buckets[index];
		if (bucket?.second !== second) {
			bucket = { second, started: 0, succeeded: 0, failed: 0, paused: 0 };
			activity.buckets[index] = bucket;
		}
		return bucket;
	}
}
