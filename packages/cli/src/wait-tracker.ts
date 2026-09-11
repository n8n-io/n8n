import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
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
	type ExecutionStatus,
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
 * How long to keep waiting for the parent to park. Long enough for a parent that is still
 * running an agent loop, short enough that a resumer which lost the claim to a sibling does
 * not stay alive long enough to meet a later, unrelated park of the same parent and patch
 * that one instead.
 */
const PARENT_RESUME_TIMEOUT_MS = 15 * Time.minutes.toMilliseconds;

const RESUME_POLL_INTERVAL_MS = 1000;

/**
 * Ceiling for the poll delay. Kept short on purpose: the parent sits at `waiting` only
 * briefly before whichever resumer sees it first claims it, so a resumer that polls slowly
 * misses that window, fails to lose the claim, and keeps running with stale results.
 */
const MAX_RESUME_POLL_INTERVAL_MS = 2 * Time.seconds.toMilliseconds;

const RESUME_POLL_JITTER = 0.2;

/**
 * Delay before poll number `attempt` (1-based). Doubles up to the ceiling, then jitters so
 * waits that start together do not poll in lockstep.
 */
function resumePollDelay(attempt: number): number {
	const backoff = RESUME_POLL_INTERVAL_MS * 2 ** (attempt - 1);
	if (backoff < MAX_RESUME_POLL_INTERVAL_MS) return backoff;
	const spread = MAX_RESUME_POLL_INTERVAL_MS * RESUME_POLL_JITTER;
	return Math.round(MAX_RESUME_POLL_INTERVAL_MS - spread + Math.random() * 2 * spread);
}

/**
 * Whether a resume failure is worth retrying. `UserError` and `UnexpectedError` are not;
 * everything else is, including `OperationalError` and raw database or Redis failures.
 */
function isRetryableResumeError(error: unknown): boolean {
	return !(error instanceof UserError || error instanceof UnexpectedError);
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
							// duplicate timer): expected, nothing to do.
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
			void this.resumeParentExecution(
				parentExecution,
				this.activeExecutions.getPostExecutePromise(executionId),
				{ executionId, workflowId },
			);
		}
	}

	/**
	 * Resume a parent execution once its child execution has completed.
	 *
	 * A child can finish before the parent's row reaches `waiting`, because the parent
	 * only parks once the node that started the child returns. Patching a parent that is
	 * still `running` is a no-op and leaves it stranded at `WAIT_INDEFINITELY`, which the
	 * waiting-executions sweep never picks up. So wait for the parent to park, then patch
	 * its stack and claim it. Bails when the parent is gone or terminal, when a sibling
	 * already claimed it, or at the deadline. Never rejects: callers fire and forget.
	 *
	 * Runs to completion regardless of leadership. Only the process holding the child's
	 * `postExecutePromise` can finish the resume, and the `expectedStatus: 'waiting'`
	 * claim already stops two processes resuming the same parent, so aborting on stepdown
	 * would strand the parent instead of protecting it.
	 */
	async resumeParentExecution(
		parentExecution: RelatedExecution,
		executePromise: Promise<IRun | undefined>,
		childExecution?: RelatedExecution,
	): Promise<void> {
		try {
			const subworkflowResults = await executePromise;
			if (!subworkflowResults) return;
			if (subworkflowResults.status === 'waiting') return; // The child execution is waiting, not completing.

			const deadline = Date.now() + PARENT_RESUME_TIMEOUT_MS;
			let pollAttempt = 0;
			for (;;) {
				// A failed read counts as "not parked yet" and retries; only a successful
				// read may decide to bail.
				let parentStatus: ExecutionStatus | undefined;
				try {
					parentStatus = await this.executionRepository.findStatusById(parentExecution.executionId);
					// Parent gone or already finished: nothing left to resume.
					if (!parentStatus || isTerminalExecutionStatus(parentStatus)) return;
				} catch (error) {
					this.logger.debug('Failed to poll parent execution status, retrying', {
						parentExecutionId: parentExecution.executionId,
						error: ensureError(error).message,
					});
				}

				if (parentStatus === 'waiting') {
					await this.withRetry(
						async () =>
							await updateParentExecutionWithChildResults(
								parentExecution.executionId,
								subworkflowResults,
								childExecution,
							),
						MAX_PARENT_RESUME_ATTEMPTS,
						isRetryableResumeError,
					);

					try {
						await this.withRetry(
							async () => await this.startExecution(parentExecution.executionId),
							MAX_PARENT_RESUME_ATTEMPTS,
							(error) =>
								!(error instanceof ExecutionAlreadyResumingError) && isRetryableResumeError(error),
						);
					} catch (error) {
						// A sibling already claimed the parent ("run once for each item"), so stop here.
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

				if (Date.now() >= deadline) {
					// A parent that parks after this strands with the child's results dropped.
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
	 * Run an operation up to `maxAttempts` times with exponential backoff, rethrowing the
	 * last error if they all fail. An error rejected by `shouldRetry` is rethrown at once.
	 */
	private async withRetry(
		operation: () => Promise<void>,
		maxAttempts: number,
		shouldRetry: (error: unknown) => boolean = () => true,
	): Promise<void> {
		for (let attempt = 1; ; attempt++) {
			try {
				await operation();
				return;
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
