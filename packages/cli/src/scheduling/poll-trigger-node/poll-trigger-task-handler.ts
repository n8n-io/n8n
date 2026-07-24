import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ClaimedTask, DispatchDecision, DispatchReporter, TaskHandler } from '@n8n/scheduler';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { TriggersAndPollers } from 'n8n-core';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

import {
	isPollTriggerTaskPayload,
	POLL_TRIGGER_TASK_TYPE,
	type PollTriggerTaskPayload,
} from './poll-trigger-task';

/**
 * Runs a due poll occurrence's `poll()` once and dispatches only when it
 * returns new data.
 *
 * Carries no `deduplicationKey`, so it forgoes the execution-level duplicate
 * backstop: under the scheduler's at-least-once contract, a poll occurrence
 * can run twice and race the fire-and-forget cursor save. Accepted: two polls
 * at the same instant can legitimately return different data anyway, so a
 * repeated poll is tolerable.
 */
@Service()
export class PollTriggerTaskHandler implements TaskHandler {
	readonly taskType = POLL_TRIGGER_TASK_TYPE;

	constructor(
		private logger: Logger,
		private readonly triggerExecutionContextFactory: TriggerExecutionContextFactory,
		private readonly triggersAndPollers: TriggersAndPollers,
		private readonly workflowRepository: WorkflowRepository,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	async execute(task: ClaimedTask, report: DispatchReporter): Promise<DispatchDecision> {
		// A setup failure here retries to N8N_SCHEDULER_MAX_ATTEMPTS then dead-letters,
		// unlike a `poll()` runtime failure below, which routes to the error workflow instead.
		const { workflowId, nodeId } = this.parsePayload(task);
		// bypassCache: the poll cursor in staticData must be read live, not from the publish-time cache.
		const workflowData = await this.triggerExecutionContextFactory.loadPublishedWorkflowData(
			workflowId,
			{ bypassCache: true },
		);
		const node = this.resolveTriggerNode(workflowData, nodeId, task);

		const { workflow, pollFunctions } =
			await this.triggerExecutionContextFactory.createPollExecutionContext(workflowData, node);

		// Scheduled polls run outside any activation isolate window, so acquire and
		// release one per tick; the finally releases even when poll() throws.
		await workflow.expression.acquireIsolate();
		try {
			const pollResponse = await this.triggersAndPollers.runPollFunction(
				workflow,
				node,
				pollFunctions,
			);

			if (pollResponse !== null) {
				// poll() can run for a while (network I/O against the polled source), so
				// the workflow may have been deactivated while it was in flight. The
				// legacy path guards this with `isCurrent()`; the durable path has no
				// in-memory registration to check, so re-read the stored active state.
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

			this.logger.debug('Poll returned no new data; nothing to hand off', {
				taskId: task.id,
				jobId: task.jobId,
				workflowId,
				nodeId,
			});
			return report.notDispatched();
		} catch (error) {
			// Routed to the error workflow instead of rethrown, which would retry and
			// dead-letter without ever running it. __emitError skips saveStaticData, so
			// the cursor holds and the next tick retries the same window.
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
