import { Logger } from '@n8n/backend-common';
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
 * Runs a due poll occurrence's `poll()` once and hands off only when it returns
 * new data.
 *
 * Unlike the schedule handler, which hands off a fixed item every time, a poll
 * trigger executes against its source: it reuses the poll execution context the
 * activation path builds, so the cursor and `__emit` run path match the legacy
 * in-memory poller. A null result means no new data, so nothing is dispatched.
 * No dedup key: two polls at the same instant can legitimately differ.
 */
@Service()
export class PollTriggerTaskHandler implements TaskHandler {
	readonly taskType = POLL_TRIGGER_TASK_TYPE;

	constructor(
		private logger: Logger,
		private readonly triggerExecutionContextFactory: TriggerExecutionContextFactory,
		private readonly triggersAndPollers: TriggersAndPollers,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	async execute(task: ClaimedTask, report: DispatchReporter): Promise<DispatchDecision> {
		const { workflowId, nodeId } = this.parsePayload(task);
		// bypassCache: the poll cursor in staticData must be read live, not from the
		// publish-time cache (see loadPublishedWorkflowData).
		const workflowData = await this.triggerExecutionContextFactory.loadPublishedWorkflowData(
			workflowId,
			{ bypassCache: true },
		);
		const node = this.resolveTriggerNode(workflowData, nodeId, task);

		// The factory assembles the poll context so it stays identical to the activation path.
		const { workflow, pollFunctions } =
			await this.triggerExecutionContextFactory.createPollExecutionContext(workflowData, node);

		// Scheduled polls fire outside the activation path's isolate window, so acquire
		// and release per tick (see PollTriggerExecutor); the finally releases even when
		// poll() throws, so the isolate is not leaked to the next occurrence.
		await workflow.expression.acquireIsolate();
		try {
			const pollResponse = await this.triggersAndPollers.runPollFunction(
				workflow,
				node,
				pollFunctions,
			);

			if (pollResponse !== null) {
				// Fire-and-forget, exactly as the legacy poll path does: __emit saves the
				// poll cursor and kicks off the run without us awaiting it.
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
			// Runtime poll() failures (e.g. source API down) go to the error workflow via
			// __emitError, like the legacy poller (PollTriggerExecutor). We don't rethrow:
			// that would let the executor retry to N8N_SCHEDULER_MAX_ATTEMPTS and dead-letter,
			// turning an outage into a re-poll storm that skips the error workflow. __emitError
			// skips saveStaticData, so the cursor holds and the next tick re-fetches the same
			// window once the source recovers.
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
			// The job outlived its trigger node: deactivation should have removed it.
			throw new UnexpectedError(
				'Poll-trigger task points to a node that is missing or disabled in the published workflow',
				{ extra: { taskId: task.id, jobId: task.jobId, workflowId: workflowData.id, nodeId } },
			);
		}
		return node;
	}
}
