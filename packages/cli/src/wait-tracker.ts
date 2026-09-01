import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sleep } from '@n8n/utils/sleep';
import {
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
 * Parent statuses that mean resuming is no longer useful: the parent already
 * finished (success/error/crashed/canceled) and there is nothing to wake up.
 */
const TERMINAL_PARENT_STATUSES: ExecutionStatus[] = ['success', 'error', 'crashed', 'canceled'];

/**
 * How long `resumeParentExecution` keeps retrying while the parent is still
 * `running` before giving up. A sub-workflow with a human-in-the-loop step can
 * complete while the parent (an in-process Agent v1/v2) is still looping on
 * LLM calls; the parent only parks at `waiting` once its agent node finishes.
 * Generous on purpose: giving up while the parent is still running strands it
 * at `WAIT_INDEFINITELY`, and an agent loop can legitimately run a long time.
 * The poll is a cheap primary-key read, so a long window costs little.
 */
const PARENT_RESUME_TIMEOUT_MS = 60 * 60 * 1000;

/** How often `resumeParentExecution` re-checks the parent's status while waiting for it to park. */
const PARENT_RESUME_POLL_INTERVAL_MS = 1000;

/**
 * Whether a resume parent failure is worth retrying. Only `UserError` and
 * `UnexpectedError` are not. Everything else is retried, including `OperationalError` (which
 * by convention signals a transient issue) and raw database or Redis failures
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
							// duplicate timer) — expected, nothing to do.
							if (error instanceof ExecutionAlreadyResumingError) return;
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
	 * A sub-workflow with a human-in-the-loop step can complete (the human
	 * approves) while the parent is still `running` — an in-process Agent v1/v2
	 * keeps making LLM calls after the tool returns its placeholder, and only
	 * parks at `waiting` once its agent node finishes. Patching/claiming before
	 * the parent parks is a no-op (`updateParentExecutionWithChildResults`
	 * early-returns on a non-`waiting` parent) and the parent then strands at
	 * `WAIT_INDEFINITELY`, which the waiting-executions sweep never picks up.
	 *
	 * So this retries the resume until the parent parks, then patches its stack
	 * and claims it. It bails when the parent is gone/terminal, when a sibling
	 * already claimed it (`ExecutionAlreadyResumingError`, expected in "run once
	 * for each item" mode), or when the timeout elapses. Each step is retried up
	 * to `MAX_PARENT_RESUME_ATTEMPTS` for transient failures so a flaky DB write
	 * recovers. This never rejects, so callers can invoke it fire and forget.
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
			for (;;) {
				// A failed poll read is treated like "parent not parked yet" and retried on
				// the next tick (bounded by the deadline) — a transient DB error here must
				// not abandon the resume, only a successful read may decide to bail.
				let parent;
				try {
					parent = await this.executionPersistence.findSingleExecution(
						parentExecution.executionId,
						{ includeData: false },
					);
					// Parent gone or already finished — nothing left to resume.
					if (!parent || TERMINAL_PARENT_STATUSES.includes(parent.status)) return;
				} catch (error) {
					this.logger.debug('Failed to poll parent execution status, retrying', {
						parentExecutionId: parentExecution.executionId,
						error: ensureError(error).message,
					});
				}

				if (parent?.status === 'waiting') {
					// Parent parked — patch its stack, then claim and resume it.
					await this.withRetry(
						() =>
							updateParentExecutionWithChildResults(
								parentExecution.executionId,
								subworkflowResults,
								childExecution,
							),
						MAX_PARENT_RESUME_ATTEMPTS,
						isRetryableResumeError,
					);

					try {
						await this.withRetry(
							() => this.startExecution(parentExecution.executionId),
							MAX_PARENT_RESUME_ATTEMPTS,
							(error) =>
								!(error instanceof ExecutionAlreadyResumingError) && isRetryableResumeError(error),
						);
					} catch (error) {
						// A sibling already claimed the parent ("run once for each item") — done.
						if (error instanceof ExecutionAlreadyResumingError) return;
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
				await sleep(PARENT_RESUME_POLL_INTERVAL_MS);
			}
		} catch (error) {
			this.logger.error('Failed to resume parent execution after sub-workflow completed', {
				parentExecutionId: parentExecution.executionId,
				error: ensureError(error).message,
			});
		}
	}

	/**
	 * Run an operation up to `maxAttempts` times with exponential backoff, returning
	 * on the first success and rethrowing the last error if they all fail. Generic
	 * (not specific to parent resume) — the caller passes the attempt count and an
	 * optional `shouldRetry` predicate; an error it rejects is rethrown immediately
	 * instead of being retried.
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
