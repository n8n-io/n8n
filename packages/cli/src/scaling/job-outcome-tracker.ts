import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExecutionStatus, IExecuteResponsePromiseData } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';

import { JOB_WAIT_RECHECK_INTERVAL_MS } from './constants';
import type { Job, JobFinishedProps, JobId } from './scaling.types';

type PendingJobWait = {
	executionId: string;
	resolve: () => void;
	reject: (error: Error) => void;
};

type JobOutcome = {
	error?: Error;
	/** Whether the request that started the job should get a success response. */
	succeeded: boolean;
};

/** Bull job IDs are unique per queue only, so pool queues can reuse them. */
const toJobKey = (queueName: string, jobId: JobId) => `${queueName}:${jobId.toString()}`;

type RecheckedStatus = ExecutionStatus | 'deleted';

/** `unknown` is stoppable and in flight elsewhere in the codebase, so it is in flight here too. */
const IN_FLIGHT_STATUSES = new Set<RecheckedStatus>(['new', 'running', 'unknown']);

/** A missing row means the worker finished and the execution was not saved, so nothing failed. */
const SUCCEEDED_STATUSES = new Set<RecheckedStatus>(['success', 'waiting', 'deleted']);

const FAILED_RESPONSE: IExecuteResponsePromiseData = {
	body: { message: 'Workflow execution failed' },
	statusCode: 500,
};

/**
 * Tracks the outcome of queued jobs on a `main` or `webhook` process, and lets
 * the process that enqueued a job wait for it.
 *
 * Bull's `job.finished()` is not used because it never settles when the
 * completion event is missed: `removeOnComplete` deletes the job before
 * Bull's poll can see it, so the poll, its listeners and the caller's
 * closure stay alive until restart. Here a missed event is covered by a
 * slow recheck of the execution status in the DB, and by a recheck as soon
 * as the Redis connection recovers.
 */
@Service()
export class JobOutcomeTracker {
	/** Results keyed by queue and job ID, so resumed segments stay separate. */
	private readonly results = new Map<string, { executionId: string; result: JobFinishedProps }>();

	/** Failures reported before this process started waiting, keyed by queue and job ID. */
	private readonly failures = new Map<string, { executionId: string; error: Error }>();

	/** Waits keyed by queue and job ID. */
	private readonly pendingWaits = new Map<string, PendingJobWait>();

	/** One timer for all pending waits, running only while there are any. */
	private recheckTimer?: NodeJS.Timeout;

	/** The recheck currently reading the DB, so a timer tick and a reconnect do not overlap. */
	private recheckInFlight?: Promise<void>;

	constructor(
		private readonly logger: Logger,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionRepository: ExecutionRepository,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('scaling');
	}

	getDiagnosticCounts() {
		return { jobResults: this.results.size };
	}

	/**
	 * Record that the worker reported the job as finished, with the result when
	 * the worker sent one. Bull broadcasts the message to every main and webhook
	 * process, but only the process that enqueued the job ever pops the result.
	 */
	recordFinished(queueName: string, jobId: JobId, executionId: string, result?: JobFinishedProps) {
		const jobKey = toJobKey(queueName, jobId);
		if (result && this.acceptsReport(jobKey, executionId)) {
			this.results.set(jobKey, { executionId, result });
		}

		this.settle(jobKey, { succeeded: result?.success ?? true });
	}

	/** Record a failure the worker reported, or reject the wait for it at once. */
	recordFailed(queueName: string, jobId: JobId, executionId: string, error: Error) {
		const jobKey = toJobKey(queueName, jobId);
		const settled = this.settle(jobKey, { error, succeeded: false });
		if (settled) return;

		// A fast failure can arrive before the enqueuing process starts to wait
		if (this.acceptsReport(jobKey, executionId)) this.failures.set(jobKey, { executionId, error });
	}

	private acceptsReport(jobKey: string, executionId: string) {
		if (!this.activeExecutions.has(executionId)) return false;
		if (this.pendingWaits.has(jobKey)) return true;
		// Reports from old segments can arrive after waitFor() has cleaned up stale outcomes.
		// Reject them so they do not remain in memory after the current job ends.
		return ![...this.pendingWaits.values()].some((wait) => wait.executionId === executionId);
	}

	/** Settle the wait for a job from a Bull event, which carries only the job ID. */
	settleByJobKey(queueName: string, jobId: JobId, error?: Error) {
		this.settle(toJobKey(queueName, jobId), { error, succeeded: !error });
	}

	/**
	 * Wait until the worker reports the job as finished, or Bull reports it as
	 * failed. Rejects with the failure reason, like Bull's `job.finished()`.
	 */
	async waitFor(job: Job): Promise<void> {
		const { executionId } = job.data;
		const jobKey = toJobKey(job.queue.name, job.id);

		// Discard broadcasts from another segment that arrived before this wait.
		for (const outcomes of [this.results, this.failures]) {
			for (const [key, outcome] of outcomes) {
				const isOtherSegment = outcome.executionId === executionId && key !== jobKey;
				if (isOtherSegment && !this.pendingWaits.has(key)) {
					outcomes.delete(key);
				}
			}
		}

		// The worker may have reported the outcome before this wait was registered.
		if (this.results.has(jobKey)) return;

		const earlyFailure = this.failures.get(jobKey);
		if (earlyFailure) {
			this.failures.delete(jobKey);
			throw earlyFailure.error;
		}

		await new Promise<void>((resolve, reject) => {
			this.pendingWaits.set(jobKey, { executionId, resolve, reject });
			this.startRecheckTimer();
		});
	}

	/** Get and remove the result for a finished job. */
	popResult(job: Job): JobFinishedProps | undefined {
		const jobKey = toJobKey(job.queue.name, job.id);
		const result = this.results.get(jobKey);
		this.results.delete(jobKey);
		this.failures.delete(jobKey);
		return result?.result;
	}

	/** Drop the wait without settling it, e.g. when the caller cancelled the execution. */
	drop(job: Job) {
		return this.dropByJobKey(toJobKey(job.queue.name, job.id));
	}

	private dropByJobKey(jobKey: string) {
		const wait = this.pendingWaits.get(jobKey);
		if (!wait) return undefined;

		this.pendingWaits.delete(jobKey);
		if (this.pendingWaits.size === 0) this.stopRecheckTimer();

		return wait;
	}

	/** Drop every wait. */
	clear() {
		for (const jobKey of this.pendingWaits.keys()) this.dropByJobKey(jobKey);
	}

	/**
	 * Settle every wait whose completion event was missed, once the DB shows the
	 * execution ended. Runs on the timer, and at once when Redis reconnects.
	 * Only one recheck runs at a time; a call during a recheck joins it.
	 */
	async recheckAll() {
		if (this.pendingWaits.size === 0) return;

		this.recheckInFlight ??= this.recheckPendingWaits().finally(() => {
			this.recheckInFlight = undefined;
		});

		await this.recheckInFlight;
	}

	private async recheckPendingWaits() {
		const waits = [...this.pendingWaits];
		const executionIds = [...new Set(waits.map(([, wait]) => wait.executionId))];
		const statusById = await this.readStatuses(executionIds);
		if (!statusById) return;

		for (const [jobKey, wait] of waits) {
			const { executionId } = wait;
			const status = statusById.get(executionId);
			if (!status) continue;
			if (IN_FLIGHT_STATUSES.has(status)) continue;
			// An event may have settled the wait while the DB read was in flight
			if (this.pendingWaits.get(jobKey) !== wait) continue;

			this.logger.warn(
				`Execution ${executionId} ended without a completion event, resolving the wait from the DB`,
				{ executionId, status },
			);
			this.eventService.emit('job-completion-missed', { status });
			this.settle(jobKey, { succeeded: SUCCEEDED_STATUSES.has(status) });
		}
	}

	/**
	 * @returns the status of each execution, `deleted` when its row is gone, or
	 * `undefined` when the read failed. The recheck interval is the retry.
	 */
	private async readStatuses(
		executionIds: string[],
	): Promise<Map<string, RecheckedStatus> | undefined> {
		try {
			const rows = await this.executionRepository.findStatusesByIds(executionIds);
			const statusById = new Map<string, RecheckedStatus>(rows.map((row) => [row.id, row.status]));

			for (const executionId of executionIds) {
				if (!statusById.has(executionId)) statusById.set(executionId, 'deleted');
			}

			return statusById;
		} catch (error) {
			this.logger.warn(
				`Failed to read the status of ${executionIds.length} executions, next recheck in ${JOB_WAIT_RECHECK_INTERVAL_MS / 1000}s`,
				{ executionIds, error },
			);
			return undefined;
		}
	}

	/** @returns whether a wait was pending for this job */
	private settle(jobKey: string, outcome: JobOutcome) {
		const wait = this.dropByJobKey(jobKey);
		if (!wait) return false;

		// The request may still wait for a response the worker sent while this process
		// was disconnected. Resolving twice is a no-op.
		this.activeExecutions.resolveResponsePromise(
			wait.executionId,
			outcome.succeeded ? {} : FAILED_RESPONSE,
		);

		if (outcome.error) {
			wait.reject(outcome.error);
		} else {
			wait.resolve();
		}

		return true;
	}

	private startRecheckTimer() {
		if (this.recheckTimer) return;

		// Unref'd so pending waits do not hold the process open during shutdown
		this.recheckTimer = setInterval(() => {
			void this.recheckAll();
		}, JOB_WAIT_RECHECK_INTERVAL_MS).unref();
	}

	private stopRecheckTimer() {
		if (!this.recheckTimer) return;

		clearInterval(this.recheckTimer);
		this.recheckTimer = undefined;
	}
}
