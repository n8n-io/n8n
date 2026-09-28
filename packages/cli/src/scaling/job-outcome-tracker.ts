import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExecutionStatus } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';

import { JOB_WAIT_RECHECK_INTERVAL_MS } from './constants';
import type { Job, JobFinishedProps, JobId } from './scaling.types';

type PendingJobWait = {
	jobKey: string;
	resolve: () => void;
	reject: (error: Error) => void;
	recheckTimer: NodeJS.Timeout;
};

/** Bull job IDs are unique per queue only, so pool queues can reuse them. */
const toJobKey = (queueName: string, jobId: JobId) => `${queueName}:${jobId.toString()}`;

type RecheckedStatus = ExecutionStatus | 'deleted';

/** `unknown` is stoppable and in flight elsewhere in the codebase, so it is in flight here too. */
const IN_FLIGHT_STATUSES = new Set<RecheckedStatus>(['new', 'running', 'unknown']);

/**
 * Tracks the outcome of queued jobs on a `main` or `webhook` process, and lets
 * the process that enqueued a job wait for it.
 *
 * Bull's `job.finished()` is not used because it never settles when the
 * completion event is missed: `removeOnComplete` deletes the job before
 * Bull's poll can see it, so the poll, its listeners and the caller's
 * closure stay alive until restart. Here a missed event is covered by a
 * slow recheck of the execution status in the DB.
 */
@Service()
export class JobOutcomeTracker {
	/** Results the worker reported for jobs this process enqueued. */
	private readonly results = new Map<string, JobFinishedProps>();

	/** Failures the worker reported before this process started waiting for the job. */
	private readonly failures = new Map<string, Error>();

	/** Waits for jobs to end, keyed by execution ID. */
	private readonly pendingWaits = new Map<string, PendingJobWait>();

	/** Execution ID for each job being waited for, keyed by queue name and job ID. */
	private readonly executionIdByJobKey = new Map<string, string>();

	constructor(
		private readonly logger: Logger,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionRepository: ExecutionRepository,
	) {
		this.logger = this.logger.scoped('scaling');
	}

	/**
	 * Record a result the worker reported. Bull broadcasts it to every main and
	 * webhook process, but only the process that enqueued the job ever pops it.
	 */
	recordFinished(executionId: string, result: JobFinishedProps) {
		if (!this.activeExecutions.has(executionId)) return;

		this.results.set(executionId, result);
		this.settle(executionId);
	}

	/** Record a failure the worker reported, or reject the wait for it at once. */
	recordFailed(executionId: string, error: Error) {
		const settled = this.settle(executionId, error);
		if (settled) return;

		// A fast failure can arrive before the enqueuing process starts to wait
		if (this.activeExecutions.has(executionId)) this.failures.set(executionId, error);
	}

	/** Settle the wait for a job from a Bull event, which carries only the job ID. */
	settleByJobKey(queueName: string, jobId: JobId, error?: Error) {
		const executionId = this.executionIdByJobKey.get(toJobKey(queueName, jobId));
		if (!executionId) return;

		this.settle(executionId, error);
	}

	/**
	 * Wait until the worker reports the job as finished, or Bull reports it as
	 * failed. Rejects with the failure reason, like Bull's `job.finished()`.
	 */
	async waitFor(job: Job): Promise<void> {
		const { executionId } = job.data;

		// The worker may have reported the outcome before this wait was registered.
		if (this.results.has(executionId)) return;

		const earlyFailure = this.failures.get(executionId);
		if (earlyFailure) {
			this.failures.delete(executionId);
			throw earlyFailure;
		}

		await new Promise<void>((resolve, reject) => {
			const jobKey = toJobKey(job.queue.name, job.id);

			const recheckTimer = setInterval(() => {
				void this.recheck(executionId);
			}, JOB_WAIT_RECHECK_INTERVAL_MS);

			this.pendingWaits.set(executionId, { jobKey, resolve, reject, recheckTimer });
			this.executionIdByJobKey.set(jobKey, executionId);
		});
	}

	/** Get and remove the result for a finished job. */
	pop(executionId: string): JobFinishedProps | undefined {
		const result = this.results.get(executionId);
		this.results.delete(executionId);
		this.failures.delete(executionId);
		return result;
	}

	/** Drop the wait without settling it, e.g. when the caller cancelled the execution. */
	drop(executionId: string) {
		const wait = this.pendingWaits.get(executionId);
		if (!wait) return undefined;

		clearInterval(wait.recheckTimer);
		this.pendingWaits.delete(executionId);
		this.executionIdByJobKey.delete(wait.jobKey);
		return wait;
	}

	/** Drop every wait, on shutdown. */
	clear() {
		for (const executionId of this.pendingWaits.keys()) this.drop(executionId);
	}

	/** @returns whether a wait was pending for this execution */
	private settle(executionId: string, error?: Error) {
		const wait = this.drop(executionId);
		if (!wait) return false;

		if (error) {
			wait.reject(error);
		} else {
			wait.resolve();
		}

		return true;
	}

	/** Settle a wait whose completion event was missed, once the DB shows the execution ended. */
	private async recheck(executionId: string) {
		if (!this.pendingWaits.has(executionId)) return;

		const status = await this.readStatus(executionId);
		if (status === undefined || IN_FLIGHT_STATUSES.has(status)) return;

		this.logger.warn(
			`Execution ${executionId} ended without a completion event, resolving the wait from the DB`,
			{ executionId, status },
		);
		this.settle(executionId);
	}

	/**
	 * @returns the execution status, `deleted` when the row is gone, or `undefined`
	 * when the read failed and the next recheck should try again.
	 */
	private async readStatus(executionId: string): Promise<RecheckedStatus | undefined> {
		try {
			const execution = await this.executionRepository.findSingleExecution(executionId);

			// A missing row means the worker finished and the execution was not saved,
			// e.g. a manual execution with saving disabled. Nothing is left to wait for.
			return execution?.status ?? 'deleted';
		} catch (error) {
			this.logger.warn(`Failed to recheck the status of execution ${executionId}, will retry`, {
				executionId,
				error,
			});
			return undefined;
		}
	}
}
