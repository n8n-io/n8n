import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ClaimedTask, TaskHandler } from '@n8n/scheduler';
import { ErrorReporter } from 'n8n-core';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import { EventService } from '@/events/event.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import {
	buildScheduleTriggerItem,
	isScheduleTriggerTaskPayload,
	SCHEDULE_TRIGGER_TASK_TYPE,
	scheduleTriggerDeduplicationKey,
	type ScheduleTriggerTaskPayload,
} from './schedule-trigger-task';

/**
 * Turns a due schedule-trigger occurrence into a real workflow execution.
 *
 * The handoff is the whole job: build the trigger item, create the execution
 * with the occurrence-derived dedup key, and return.
 */
@Service()
export class ScheduleTriggerTaskHandler implements TaskHandler {
	readonly taskType = SCHEDULE_TRIGGER_TASK_TYPE;

	constructor(
		private logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly globalConfig: GlobalConfig,
		private readonly executionRepository: ExecutionRepository,
		private readonly eventService: EventService,
		private readonly triggerExecutionContextFactory: TriggerExecutionContextFactory,
		private readonly workflowExecutionService: WorkflowExecutionService,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	async execute(task: ClaimedTask): Promise<void> {
		const { workflowId, nodeId } = this.parsePayload(task);
		const workflowData =
			await this.triggerExecutionContextFactory.loadPublishedWorkflowData(workflowId);
		const node = this.resolveTriggerNode(workflowData, nodeId, task);

		const deduplicationKey = scheduleTriggerDeduplicationKey(task);
		const timezone = workflowData.settings?.timezone ?? this.globalConfig.generic.timezone;
		const item = buildScheduleTriggerItem(task.scheduledFor, timezone);

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId,
			workflowSettings: workflowData.settings,
		});

		let executionId: string;
		try {
			executionId = await this.workflowExecutionService.runWorkflow(
				workflowData,
				node,
				[[item]],
				additionalData,
				'trigger',
				/* responsePromise= */ undefined,
				deduplicationKey,
			);

			this.eventService.emit('workflow-executed', {
				workflowId,
				workflowName: workflowData.name,
				executionId,
				source: 'trigger',
			});

			this.logger.debug('Handed off scheduled occurrence to a new execution', {
				taskId: task.id,
				jobId: task.jobId,
				workflowId,
				executionId,
				deduplicationKey,
			});
		} catch (error) {
			if (!(error instanceof DuplicateExecutionError)) {
				throw error;
			}
			await this.recordExistingHandoff(task, error);
		}
	}

	private parsePayload(task: ClaimedTask): ScheduleTriggerTaskPayload {
		if (!isScheduleTriggerTaskPayload(task.payload)) {
			throw new UnexpectedError('Schedule-trigger task payload is missing workflowId or nodeId', {
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
				'Schedule-trigger task points to a node that is missing or disabled in the published workflow',
				{ extra: { taskId: task.id, jobId: task.jobId, workflowId: workflowData.id, nodeId } },
			);
		}
		return node;
	}

	/**
	 * The redelivery backstop: an execution already exists under this key, so
	 * find it, record the pre-existing handoff, and let the task complete. The
	 * logged status makes the rare stuck row (inserted as `new`, never started
	 * because the instance died mid-handoff) observable.
	 */
	private async recordExistingHandoff(
		task: ClaimedTask,
		error: DuplicateExecutionError,
	): Promise<void> {
		const { deduplicationKey } = error;
		const existing = await this.executionRepository.findOne({
			where: { deduplicationKey },
			select: ['id', 'status'],
		});

		const context = {
			taskId: task.id,
			jobId: task.jobId,
			attempts: task.attempts,
			deduplicationKey,
			executionId: existing?.id,
			executionStatus: existing?.status,
		};
		this.logger.warn(
			'Occurrence redelivered after a previously recorded execution; skipping',
			context,
		);
		this.errorReporter.warn(error, { extra: context, shouldBeLogged: false });
	}
}
