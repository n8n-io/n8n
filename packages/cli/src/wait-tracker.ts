import { Logger } from '@n8n/backend-common';
import { ExecutionRepository, type IExecutionBase, type IExecutionResponse } from '@n8n/db';
import { Time } from '@n8n/constants';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sleep } from '@n8n/utils/sleep';
import {
	isTerminalExecutionStatus,
	UnexpectedError,
	UserError,
	type IRun,
	type IWorkflowExecutionDataProcess,
	type RelatedExecution,
} from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowRunner } from '@/workflow-runner';

import {
	shouldRestartParentExecution,
	updateParentExecutionWithChildResults,
} from './workflow-helpers';

/** How many times each parent-resume step is attempted before giving up. */
const MAX_PARENT_RESUME_ATTEMPTS = 3;

/**
 * How long `resumeParentExecution` keeps retrying while the parent is still
 * `running` before giving up. A sub-workflow with a human-in-the-loop step can
 * complete while the parent (an in-process Agent v1/v2) is still looping on
 * LLM calls; the parent only parks at `waiting` once its agent node finishes.
 * Generous on purpose: giving up while the parent is still running strands it
 * at `WAIT_INDEFINITELY`, and an agent loop can legitimately run a long time.
 */
const PARENT_RESUME_TIMEOUT_MS = 60 * Time.minutes.toMilliseconds;

/**
 * How long we wait for the child's in-memory `postExecutePromise` before giving up.
 * In queue mode that promise only settles after `job.finished()` to
 * `finalizeExecution`. Polling the DB during this window recovers the cascade.
 */
const CHILD_RUN_SETTLE_TIMEOUT_MS = 60 * Time.minutes.toMilliseconds;

/** Delay before the resume loops re-check the parent / child row in the DB the first time. */
const RESUME_POLL_INTERVAL_MS = 1000;

/**
 * Ceiling for the resume poll delay. Each loop runs for up to an hour and there is one
 * per waiting child, so a fixed one second tick puts a query per second per wait on the
 * executions table. Backing off to ten seconds cuts that tenfold. The added resume
 * latency is not noticeable against the timeouts above.
 */
const MAX_RESUME_POLL_INTERVAL_MS = 10 * Time.seconds.toMilliseconds;

/** Spread applied to a capped poll delay, so waits that start together do not query in lockstep. */
const RESUME_POLL_JITTER = 0.2;

/**
 * Delay before poll number `attempt` (1-based). Doubles up to
 * `MAX_RESUME_POLL_INTERVAL_MS`, then jitters by up to `RESUME_POLL_JITTER` either way.
 * Only the capped delay is jittered: spreading matters for the loops that keep polling
 * for minutes, and it keeps the early delays exact.
 */
function resumePollDelay(attempt: number): number {
	const backoff = RESUME_POLL_INTERVAL_MS * 2 ** (attempt - 1);
	if (backoff < MAX_RESUME_POLL_INTERVAL_MS) return backoff;
	const spread = MAX_RESUME_POLL_INTERVAL_MS * RESUME_POLL_JITTER;
	return Math.round(MAX_RESUME_POLL_INTERVAL_MS - spread + Math.random() * 2 * spread);
}

/**
 * Whether a resume parent failure is worth retrying. Only `UserError` and
 * `UnexpectedError` are not. Everything else is retried, including `OperationalError` (which
 * by convention signals a transient issue) and raw database or Redis failures
 */
function isRetryableResumeError(error: unknown): boolean {
	return !(error instanceof UserError || error instanceof UnexpectedError);
}

/** Project a persisted execution onto the `IRun` shape `resumeParentExecution` consumes. */
function executionResponseToRun(execution: IExecutionResponse): IRun {
	return {
		data: execution.data,
		mode: execution.mode,
		startedAt: execution.startedAt,
		stoppedAt: execution.stoppedAt,
		status: execution.status,
		finished: execution.finished,
		waitTill: execution.waitTill,
		storedAt: execution.storedAt,
	};
}

@Service()
export class WaitTracker {
	private waitingExecutions: {
		[key: string]: {
			executionId: string;
			timer: NodeJS.Timeout;
		};
	} = {};

	mainTimer: NodeJS.Timeout;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly ownershipService: OwnershipService,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRunner: WorkflowRunner,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.scoped('waiting-executions');
	}

	has(executionId: string) {
		return this.waitingExecutions[executionId] !== undefined;
	}

	init() {
		if (this.instanceSettings.isLeader) this.startTracking();
	}

	@OnLeaderTakeover()
	private startTracking() {
		// Poll every 60 seconds a list of upcoming executions
		this.mainTimer = setInterval(() => {
			void this.getWaitingExecutions();
		}, 60000);

		void this.getWaitingExecutions();

		this.logger.debug('Started tracking waiting executions');
	}

	async getWaitingExecutions() {
		this.logger.debug('Querying database for waiting executions');

		const executions = await this.executionRepository.getWaitingExecutions();

		if (executions.length === 0) {
			return;
		}

		const executionIds = executions.map((execution) => execution.id).join(', ');
		this.logger.debug(
			`Found ${executions.length} executions. Setting timer for IDs: ${executionIds}`,
		);

		// Add timers for each waiting execution that they get started at the correct time

		for (const execution of executions) {
			const executionId = execution.id;
			if (this.waitingExecutions[executionId] === undefined) {
				const triggerTime = execution.waitTill!.getTime() - new Date().getTime();
				this.waitingExecutions[executionId] = {
					executionId,
					timer: setTimeout(() => {
						void this.startExecution(executionId).catch((error) => {
							// Another process already resumed this execution (e.g. multi-main
							// duplicate timer) — expected, nothing to do.
							if (error instanceof ExecutionAlreadyResumingError) {
								this.logger.info('Execution already claimed by another process, skipping', {
									executionId,
								});
								return;
							}
							this.logger.error('Failed to start waiting execution', {
								executionId,
								error: ensureError(error).message,
							});
						});
					}, triggerTime),
				};
			}
		}
	}

	stopExecution(executionId: string) {
		if (!this.waitingExecutions[executionId]) return;

		clearTimeout(this.waitingExecutions[executionId].timer);

		delete this.waitingExecutions[executionId];
	}

	async startExecution(executionId: string) {
		this.logger.debug(`Resuming execution ${executionId}`, { executionId });
		delete this.waitingExecutions[executionId];

		// Get the data to execute
		const fullExecutionData = await this.executionPersistence.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!fullExecutionData) {
			throw new UnexpectedError('Execution does not exist.', { extra: { executionId } });
		}
		if (fullExecutionData.finished) {
			throw new UnexpectedError('The execution did succeed and can so not be started again.');
		}

		if (!fullExecutionData.workflowData.id) {
			throw new UnexpectedError('Only saved workflows can be resumed.');
		}

		const workflowId = fullExecutionData.workflowData.id;
		const project = await this.ownershipService.getWorkflowProjectCached(workflowId);

		const data: IWorkflowExecutionDataProcess = {
			executionMode: fullExecutionData.mode,
			executionData: fullExecutionData.data,
			workflowData: fullExecutionData.workflowData,
			projectId: project.id,
			pushRef: fullExecutionData.data.pushRef,
			startedAt: fullExecutionData.startedAt,
		};

		// Start the execution again
		await this.workflowRunner.run(data, false, false, {
			executionId,
			expectedStatus: 'waiting',
		});

		const { parentExecution } = fullExecutionData.data;
		if (shouldRestartParentExecution(parentExecution)) {
			// on child execution completion, resume parent execution
			const { promise, runId } = this.activeExecutions.getPostExecutePromiseWithRunId(executionId);
			void this.resumeParentExecution(parentExecution, promise, { executionId, workflowId }, runId);
		}
	}

	/**
	 * Resume a parent execution once its child execution has completed.
	 *
	 * A sub-workflow with a human-in-the-loop step can complete (the human
	 * approves) while the parent is still `running` — an in-process Agent v1/v2
	 * keeps making LLM calls after the tool returns its placeholder, and only
	 * parks at `waiting` once its agent node finishes. Patching/claiming before
	 * the parent parks is a no-op (`updateParentExecutionWithChildResults`
	 * early-returns on a non-`waiting` parent) and the parent then strands at
	 * `WAIT_INDEFINITELY`, which the waiting-executions sweep never picks up.
	 *
	 * In queue mode the child's `postExecutePromise` only settles after
	 * `job.finished()` to `finalizeExecution`. A lost completion event leaves that
	 * promise pending forever even when the child row is already terminal, so we
	 * race the promise against DB polls and resume from the persisted run when needed.
	 *
	 * So this retries the resume until the parent parks, then patches its stack
	 * and claims it. It bails when the parent is gone/terminal, when a sibling
	 * already claimed it (`ExecutionAlreadyResumingError`, expected in "run once
	 * for each item" mode), when the parent parked at a LATER wait than the one
	 * this child belongs to (`updateParentExecutionWithChildResults` reports the
	 * child isn't in the wait's tagged set — a sibling already resumed its wait),
	 * or when the timeout elapses.
	 * Each step is retried up to `MAX_PARENT_RESUME_ATTEMPTS` for transient
	 * failures so a flaky DB write recovers. This never rejects, so callers can
	 * invoke it fire and forget.
	 *
	 * This runs to completion regardless of multi-main leadership: only the
	 * process holding the child's `postExecutePromise` can finish the resume, and
	 * the `expectedStatus: 'waiting'` claim in `startExecution` already prevents
	 * two processes from resuming the same parent. Aborting the loop on stepdown was
	 * tried and dropped: the demoted process is the only one that can still finish
	 * this resume, so cancelling it strands the parent that the claim already
	 * protects, and a nested resume was aborted along with it.
	 */
	async resumeParentExecution(
		parentExecution: RelatedExecution,
		executePromise: Promise<IRun | undefined>,
		childExecution?: RelatedExecution,
		/**
		 * Identity of the child run that owns `executePromise`, captured atomically
		 * with the promise via `getPostExecutePromiseWithRunId`. Required for the DB
		 * fallback finalize so a later replacement's runId is not used by mistake.
		 */
		childRunId?: string,
	): Promise<void> {
		try {
			const subworkflowResults = await this.awaitChildRunOrLoadFromDb(
				childExecution?.executionId,
				executePromise,
				parentExecution.executionId,
				childRunId,
			);
			if (!subworkflowResults) return;
			if (subworkflowResults.status === 'waiting') return; // The child execution is waiting, not completing.

			const deadline = Date.now() + PARENT_RESUME_TIMEOUT_MS;
			let pollAttempt = 0;
			for (;;) {
				// A failed poll read is treated like "parent not parked yet" and retried on
				// the next tick (bounded by the deadline) — a transient DB error here must
				// not abandon the resume, only a successful read may decide to bail.
				let parent: IExecutionBase | undefined;
				try {
					parent = await this.executionPersistence.findSingleExecution(
						parentExecution.executionId,
						{ includeData: false },
					);
					// Parent gone or already finished — nothing left to resume.
					if (!parent || isTerminalExecutionStatus(parent.status)) return;
				} catch (error) {
					this.logger.debug('Failed to poll parent execution status, retrying', {
						parentExecutionId: parentExecution.executionId,
						error: ensureError(error).message,
					});
				}

				if (parent?.status === 'waiting') {
					// Parent parked — patch its stack, then claim and resume it.
					const belongsToThisWait = await this.withRetry(
						async () =>
							await updateParentExecutionWithChildResults(
								parentExecution.executionId,
								subworkflowResults,
								childExecution,
							),
						MAX_PARENT_RESUME_ATTEMPTS,
						isRetryableResumeError,
					);

					// The parent is parked at a LATER wait — a sibling already resumed the one
					// this child belongs to. Stop instead of patching the wrong stack entry
					// and claiming a wait this child never satisfied.
					if (!belongsToThisWait) return;

					try {
						await this.withRetry(
							async () => await this.startExecution(parentExecution.executionId),
							MAX_PARENT_RESUME_ATTEMPTS,
							(error) =>
								!(error instanceof ExecutionAlreadyResumingError) && isRetryableResumeError(error),
						);
					} catch (error) {
						// A sibling already claimed the parent ("run once for each item") — done.
						if (error instanceof ExecutionAlreadyResumingError) {
							this.logger.info('Parent execution already claimed by another process, skipping', {
								parentExecutionId: parentExecution.executionId,
								childExecutionId: childExecution?.executionId,
							});
							return;
						}
						throw error;
					}
					return;
				}

				// Parent still `running` (hasn't parked yet) — wait and re-check.
				if (Date.now() >= deadline) {
					// If the parent parks after this, it strands at WAIT_INDEFINITELY with
					// the child's results dropped — make that visible to operators.
					this.logger.warn('Timed out waiting to resume parent after sub-workflow completed', {
						parentExecutionId: parentExecution.executionId,
						childExecutionId: childExecution?.executionId,
					});
					return;
				}
				await sleep(Math.min(resumePollDelay(++pollAttempt), deadline - Date.now()));
			}
		} catch (error) {
			this.logger.error('Failed to resume parent execution after sub-workflow completed', {
				parentExecutionId: parentExecution.executionId,
				error: ensureError(error).message,
			});
		}
	}

	/**
	 * Wait for the child's in-memory `postExecutePromise`, or load a terminal run
	 * from the DB if that promise never settles (queue-mode completion loss).
	 * On the DB fallback, identity-checks `finalizeExecution` with `childRunId`
	 * (captured with the promise) so the child's capacity is released without
	 * resolving a replacement run that may already own this execution id.
	 * Returns `undefined` when the deadline elapses with no terminal child.
	 */
	private async awaitChildRunOrLoadFromDb(
		childExecutionId: string | undefined,
		executePromise: Promise<IRun | undefined>,
		parentExecutionId: string,
		childRunId?: string,
	): Promise<IRun | undefined> {
		if (!childExecutionId) {
			return await executePromise;
		}

		const deadline = Date.now() + CHILD_RUN_SETTLE_TIMEOUT_MS;
		let lastKnownChildStatus: string | undefined;
		let pollAttempt = 0;

		// Prefer the in-memory promise (fast path). Race it against poll ticks so a
		// settled promise is not delayed by the full interval, while a lost Bull
		// completion can still be recovered from the DB.
		const settled = executePromise.then(
			(run) => ({ kind: 'promise' as const, run }),
			(error: unknown) => ({ kind: 'rejected' as const, error }),
		);

		for (;;) {
			const remaining = deadline - Date.now();
			if (remaining <= 0) {
				this.logger.error(
					'Timed out waiting for child execution to complete before resuming parent',
					{
						parentExecutionId,
						childExecutionId,
						lastKnownChildStatus,
					},
				);
				return undefined;
			}

			const winner = await Promise.race([
				settled,
				sleep(Math.min(resumePollDelay(++pollAttempt), remaining)).then(
					() => ({ kind: 'tick' as const }) as const,
				),
			]);

			if (winner.kind === 'rejected') throw winner.error;
			if (winner.kind === 'promise') return winner.run;

			try {
				// Lightweight status check — avoid loading the full run data every tick.
				// Only refetch with data when the child is terminal, so a 60min wait at
				// 1s intervals does at most one heavy query instead of ~3600.
				const childStatus = await this.executionPersistence.findSingleExecution(childExecutionId, {
					includeData: false,
				});
				lastKnownChildStatus = childStatus?.status;
				if (childStatus && isTerminalExecutionStatus(childStatus.status)) {
					const child = await this.executionPersistence.findSingleExecution(childExecutionId, {
						includeData: true,
						unflattenData: true,
					});
					// Defensive: every write path creates, updates and deletes the row and its
					// data together, so a terminal row always carries a data object. A row
					// without one means data loss outside this code, not a race to handle.
					if (child?.data) {
						const run = executionResponseToRun(child);
						// The in-memory promise never settled, so neither did the capacity-releasing
						// `.finally` on that run. Finalize with the runId captured alongside the
						// promise: a live `getRunId` could return a replacement's identity.
						if (childRunId !== undefined) {
							this.activeExecutions.finalizeExecution(childExecutionId, run, childRunId);
						}
						this.logger.warn(
							'Child execution finished in DB but post-execute promise did not settle; resuming parent from DB',
							{
								parentExecutionId,
								childExecutionId,
								childStatus: child.status,
							},
						);
						return run;
					}
				}
			} catch (error) {
				this.logger.debug('Failed to poll child execution status while waiting to resume parent', {
					parentExecutionId,
					childExecutionId,
					error: ensureError(error).message,
				});
			}
		}
	}

	/**
	 * Run an operation up to `maxAttempts` times with exponential backoff, returning
	 * on the first success and rethrowing the last error if they all fail. Generic
	 * (not specific to parent resume) — the caller passes the attempt count and an
	 * optional `shouldRetry` predicate; an error it rejects is rethrown immediately
	 * instead of being retried.
	 */
	private async withRetry<T>(
		operation: () => Promise<T>,
		maxAttempts: number,
		shouldRetry: (error: unknown) => boolean = () => true,
	): Promise<T> {
		for (let attempt = 1; ; attempt++) {
			try {
				return await operation();
			} catch (error) {
				if (attempt >= maxAttempts || !shouldRetry(error)) throw error;
				await sleep(100 * 2 ** (attempt - 1));
			}
		}
	}

	@OnLeaderStepdown()
	stopTracking() {
		if (!this.mainTimer) return;

		clearInterval(this.mainTimer);
		Object.keys(this.waitingExecutions).forEach((executionId) => {
			clearTimeout(this.waitingExecutions[executionId].timer);
		});

		this.logger.debug('Stopped tracking waiting executions');
	}
}
