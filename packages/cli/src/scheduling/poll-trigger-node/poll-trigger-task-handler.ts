import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ClaimedTask, DispatchDecision, DispatchReporter, TaskHandler } from '@n8n/scheduler';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import {
	commitStagedCursor,
	ErrorReporter,
	runPollInStagingScope,
	TriggersAndPollers,
} from 'n8n-core';
import type { Failure, INode, IWorkflowBase } from 'n8n-workflow';
import { OperationalError, UnexpectedError } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { PollBackoffService } from '@/workflows/triggers/poll-backoff.service';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

import {
	isPollTriggerTaskPayload,
	POLL_TRIGGER_TASK_TYPE,
	type PollTriggerTaskPayload,
} from './poll-trigger-task';

/** Race sentinel: `poll()` can resolve to anything, so the deadline resolves to a symbol it cannot produce. */
const TIMED_OUT = Symbol('poll timed out');

/** Stands in for the error a hanging poll never threw, so backoff classifies the timeout as transient. */
class PollTimeoutError extends OperationalError {
	readonly failure: Failure = { cause: 'temporarily-unavailable' };

	constructor() {
		super('Poll exceeded its timeout and was abandoned');
	}
}

/** An unref'd, cancellable deadline that resolves to {@link TIMED_OUT} after `ms`. */
function timeoutAfter(ms: number): { timedOut: Promise<typeof TIMED_OUT>; cancel: () => void } {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timedOut = new Promise<typeof TIMED_OUT>((resolve) => {
		timer = setTimeout(() => resolve(TIMED_OUT), ms);
		timer.unref();
	});
	return { timedOut, cancel: () => clearTimeout(timer) };
}

/**
 * Runs a due poll occurrence's `poll()` once and dispatches only when it returns new data.
 * Carries no `deduplicationKey`: under the at-least-once scheduler contract an occurrence
 * can run twice, later cursor write wins; tolerable since two polls can legitimately differ anyway.
 */
@Service()
export class PollTriggerTaskHandler implements TaskHandler {
	readonly taskType = POLL_TRIGGER_TASK_TYPE;

	private readonly pollTimeoutMs: number;

	constructor(
		private logger: Logger,
		private readonly triggerExecutionContextFactory: TriggerExecutionContextFactory,
		private readonly triggersAndPollers: TriggersAndPollers,
		private readonly workflowRepository: WorkflowRepository,
		private readonly errorReporter: ErrorReporter,
		private readonly pollBackoffService: PollBackoffService,
		private readonly eventService: EventService,
		globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped('scheduler');
		this.pollTimeoutMs = globalConfig.scheduler.pollTimeoutSeconds * Time.seconds.toMilliseconds;
	}

	async execute(task: ClaimedTask, report: DispatchReporter): Promise<DispatchDecision> {
		// A setup failure here retries to N8N_SCHEDULER_MAX_ATTEMPTS then dead-letters,
		// unlike a `poll()` runtime failure below, which routes to the error workflow instead.
		const { workflowId, nodeId } = this.parsePayload(task);

		const now = new Date();
		const state = await this.pollBackoffService
			.getFailureState(workflowId, nodeId)
			.catch(() => null);
		if (this.pollBackoffService.isBackingOff(state, now)) {
			this.logger.debug('Poll is backing off; skipping this occurrence', {
				taskId: task.id,
				jobId: task.jobId,
				workflowId,
				nodeId,
				backoffUntil: state?.backoffUntil,
			});
			return report.notDispatched();
		}

		// bypassCache: the poll cursor in staticData must be read live, not from the publish-time cache.
		const workflowData = await this.triggerExecutionContextFactory.loadPublishedWorkflowData(
			workflowId,
			{ bypassCache: true },
		);

		// A due task persisted for a version with duplicate or missing node ids can
		// fire before the healed version's outbox record replaces the jobs.
		// Resolving a duplicated id would poll the wrong node and write shared
		// cursor state. Skipped, not thrown — a throw would retry to the max
		// attempt count and dead-letter every occurrence.
		if (!this.hasHealthyNodeIds(workflowData)) {
			this.logger.debug(
				'Published version has duplicate or missing node ids; skipping the occurrence until it is healed',
				{ taskId: task.id, jobId: task.jobId, workflowId, nodeId },
			);
			return report.notDispatched();
		}

		const node = this.resolveTriggerNode(workflowData, nodeId, task);

		const { workflow, pollFunctions } =
			await this.triggerExecutionContextFactory.createPollExecutionContext(workflowData, node, {
				taskId: task.id,
				leaseEpoch: task.leaseEpoch,
			});

		// Poll and hand-off share one staging scope, so a cursor staged here can only
		// be committed by this poll and never by a later occurrence.
		return await runPollInStagingScope(pollFunctions, async () => {
			// Scheduled polls run outside any activation isolate window, so acquire and
			// release one per tick; the finally releases even when poll() throws, and
			// even while an abandoned poll is still running. A late expression
			// evaluation then fails and is discarded with the rest of that poll,
			// whereas holding the isolate for a poll that may never settle would pin a
			// pooled bridge for good.
			await workflow.expression.acquireIsolate();
			// Nothing past a returning poll is the source failing, so a hand-off or
			// database error after it must not back the node off. A setup error before
			// poll() does count: it repeats every tick just like a failing source.
			let polled = false;
			try {
				// `poll()` takes no abort signal, so the deadline abandons it rather than
				// cancelling it: the call keeps running until it settles on its own, and its
				// outcome is discarded. The cursor never moves on that path (it only moves
				// through the staged commit or __emit below), so an abandoned tick leaves
				// the poll window untouched for the next occurrence to cover.
				const deadline = timeoutAfter(this.pollTimeoutMs);
				const poll = this.triggersAndPollers.runPollFunction(workflow, node, pollFunctions);
				// Deliberately not chained: keeps an abandoned poll's eventual rejection from
				// surfacing as an unhandled rejection once the race has moved on.
				poll.catch(() => {});

				let pollResponse: Awaited<typeof poll>;
				try {
					const outcome = await Promise.race([poll, deadline.timedOut]);
					if (outcome === TIMED_OUT) {
						this.eventService.emit('poll-tick-timed-out', { nodeType: node.type });
						this.logger.warn('Poll exceeded its timeout and was abandoned', {
							taskId: task.id,
							jobId: task.jobId,
							workflowId,
							nodeId,
							pollTimeoutMs: this.pollTimeoutMs,
						});
						// Not routed to the error workflow: an abandoned poll produces no run, and
						// an error run is one. It does count as a poll failure, so a source that
						// keeps hanging is re-polled at a widening interval like any failing source.
						const isActive = await this.workflowRepository.isActive(workflowId).catch(() => true);
						if (isActive) {
							await this.pollBackoffService.recordFailure({
								workflowId,
								nodeId,
								error: new PollTimeoutError(),
								state,
								now: new Date(), // Fresh clock, not the tick's
							});
						}
						return report.notDispatched();
					}
					pollResponse = outcome;
				} finally {
					deadline.cancel();
				}
				polled = true;

				await this.pollBackoffService.recordSuccess({ workflowId, nodeId, state });

				if (pollResponse !== null) {
					// poll() can run for a while (network I/O against the polled source), so
					// the workflow may have been deactivated while it was in flight. There is
					// no in-memory registration to check here, so re-read the stored active state.
					if (!(await this.workflowRepository.isActive(workflowId))) {
						this.logger.debug('Workflow deactivated during poll; discarding the result', {
							taskId: task.id,
							jobId: task.jobId,
							workflowId,
							nodeId,
						});
						return report.notDispatched();
					}

					// __emit saves the cursor and starts the run without waiting on it.
					pollFunctions.__emit(pollResponse);
					this.logger.debug('Poll returned new data; handed off to a new execution', {
						taskId: task.id,
						jobId: task.jobId,
						workflowId,
						nodeId,
					});
					return report.dispatched();
				}

				// A poll with no items may still have moved its cursor, committed here on
				// its own. Active state is re-read first so a workflow deactivated mid-poll
				// doesn't get its cursor moved.
				try {
					if (await this.workflowRepository.isActive(workflowId))
						await commitStagedCursor(pollFunctions);
				} catch (error) {
					// The poll itself succeeded, so a failed cursor write is logged rather
					// than routed to the error workflow.
					this.errorReporter.error(error, {
						extra: { taskId: task.id, jobId: task.jobId, workflowId, nodeId },
					});
					this.logger.error(
						'Failed to commit the poll cursor; the next poll repeats the same window',
						{ taskId: task.id, jobId: task.jobId, workflowId, nodeId, error },
					);
				}

				this.logger.debug('Poll returned no new data; nothing to hand off', {
					taskId: task.id,
					jobId: task.jobId,
					workflowId,
					nodeId,
				});
				return report.notDispatched();
			} catch (error) {
				// Routed to the error workflow instead of rethrown, which would retry and
				// dead-letter without ever running it. __emitError commits no cursor, so
				// the cursor holds and the next tick retries the same window.
				if (!polled) {
					const isActive = await this.workflowRepository.isActive(workflowId).catch(() => true);
					if (isActive) {
						await this.pollBackoffService.recordFailure({
							workflowId,
							nodeId,
							error,
							state,
							now: new Date(), // Fresh clock, not the tick's
						});
					}
				}
				pollFunctions.__emitError(ensureError(error));
				this.logger.debug('Poll failed at runtime; routed to the error workflow', {
					taskId: task.id,
					jobId: task.jobId,
					workflowId,
					nodeId,
				});
				// The error was handed off, so this occurrence is handled and must not retry.
				return report.dispatched();
			} finally {
				await workflow.expression.releaseIsolate();
			}
		});
	}

	/** The invariant the activation-time healer guarantees: every node id unique and non-empty. */
	private hasHealthyNodeIds(workflowData: IWorkflowBase): boolean {
		const ids = workflowData.nodes.map((node) => node.id);
		return ids.every(Boolean) && new Set(ids).size === ids.length;
	}

	private parsePayload(task: ClaimedTask): PollTriggerTaskPayload {
		if (!isPollTriggerTaskPayload(task.payload)) {
			throw new UnexpectedError('Poll-trigger task payload is missing workflowId or nodeId', {
				extra: { taskId: task.id, jobId: task.jobId },
			});
		}
		return task.payload;
	}

	private resolveTriggerNode(
		workflowData: IWorkflowBase,
		nodeId: string,
		task: ClaimedTask,
	): INode {
		const node = workflowData.nodes.find((candidate) => candidate.id === nodeId);
		if (!node || node.disabled) {
			throw new UnexpectedError(
				'Poll-trigger task points to a node that is missing or disabled in the published workflow',
				{ extra: { taskId: task.id, jobId: task.jobId, workflowId: workflowData.id, nodeId } },
			);
		}
		return node;
	}
}
