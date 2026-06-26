import { Logger } from '@n8n/backend-common';
import { ScheduledTaskRepository, WorkflowRepository } from '@n8n/db';
import type { ScheduledTask } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import {
	buildScheduleDeduplicationKey,
	buildScheduleTriggerData,
} from 'n8n-nodes-base/dist/nodes/Schedule/ScheduleTriggerHelpers';
import type { IWorkflowBase } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import { EventService } from '@/events/event.service';
import { PrometheusDistributedSchedulerMetricsService } from '@/metrics/prometheus/distributed-scheduler-metrics.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { InstanceSettings } from 'n8n-core';

import { DistributedScheduleTriggerService } from './distributed-schedule-trigger.service';

const claimIntervalMs = 5_000;
const claimLookaheadMs = claimIntervalMs * 2;
const claimBatchSize = 1_000;
const leaseMs = 60_000;

@Service()
export class DistributedScheduleExecutorService {
	private timeout: NodeJS.Timeout | undefined;

	private taskTimeouts = new Set<NodeJS.Timeout>();

	private running = false;

	private shuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly scheduledTaskRepository: ScheduledTaskRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly eventService: EventService,
		private readonly instanceSettings: InstanceSettings,
		private readonly distributedScheduleTriggerService: DistributedScheduleTriggerService,
		private readonly metrics: PrometheusDistributedSchedulerMetricsService,
	) {
		this.logger = this.logger.scoped(['workflow-activation']);
	}

	init() {
		if (!this.distributedScheduleTriggerService.enabled || this.shuttingDown) return;
		if (this.running) return;

		this.running = true;
		this.scheduleNextClaim(0);
		this.logger.info('Started distributed schedule executor loop');
	}

	@OnShutdown()
	shutdown() {
		this.shuttingDown = true;
		this.running = false;
		clearTimeout(this.timeout);
		this.timeout = undefined;
		for (const timeout of this.taskTimeouts) {
			clearTimeout(timeout);
		}
		this.taskTimeouts.clear();
	}

	private scheduleNextClaim(delayMs = claimIntervalMs) {
		clearTimeout(this.timeout);
		if (!this.running || this.shuttingDown) return;

		this.timeout = setTimeout(async () => {
			try {
				await this.claimAndExecute();
			} catch (error) {
				this.logger.error('Distributed schedule task claim failed', { error });
			}

			this.scheduleNextClaim();
		}, delayMs);
	}

	async claimAndExecute() {
		const claimedBy = this.instanceSettings.hostId;
		const tasks = await this.scheduledTaskRepository.claimDueTasks(
			claimBatchSize,
			claimedBy,
			leaseMs,
			claimLookaheadMs,
		);
		this.metrics.observeClaimed(tasks.length);
		for (const task of tasks) this.scheduleTaskExecution(task);
	}

	private scheduleTaskExecution(task: ScheduledTask) {
		const delayMs = Math.max(0, task.scheduledFor.getTime() - Date.now());
		const timeout = setTimeout(async () => {
			this.taskTimeouts.delete(timeout);
			if (this.shuttingDown) return;

			try {
				this.metrics.observeSchedulingLag(task.scheduledFor, new Date());
				await this.executeTask(task.id);
			} catch (error) {
				this.logger.error('Distributed schedule task execution failed', { error, taskId: task.id });
			}
		}, delayMs);

		this.taskTimeouts.add(timeout);
	}

	async executeTask(taskId: number) {
		const task = await this.scheduledTaskRepository.findOne({
			where: { id: taskId },
			relations: { job: true },
		});
		if (!task?.claimedBy) return;

		try {
			const workflowData = await this.loadWorkflowData(task.workflowId);
			const node = workflowData.nodes.find((candidate) => candidate.id === task.nodeId);
			if (!node) {
				throw new UnexpectedError('Schedule Trigger node not found for scheduled task', {
					extra: { workflowId: task.workflowId, nodeId: task.nodeId, taskId },
				});
			}

			const additionalData = await WorkflowExecuteAdditionalData.getBase({
				workflowId: workflowData.id,
				workflowSettings: workflowData.settings,
			});
			const deduplicationKey = buildScheduleDeduplicationKey({
				workflowId: task.workflowId,
				nodeId: task.nodeId,
				scheduledTime: task.scheduledFor,
			});

			const executionId = await this.workflowExecutionService.runWorkflow(
				workflowData,
				node,
				buildScheduleTriggerData(
					task.job.timezone,
					(items) => items.map((json) => ({ json })),
					task.scheduledFor,
				),
				additionalData,
				'trigger',
				undefined,
				deduplicationKey,
			);

			await this.scheduledTaskRepository.recordExecution(task.id, task.claimedBy, executionId);
			this.metrics.observeHandoffLag(task.scheduledFor, new Date());
			await this.scheduledTaskRepository.markSucceeded(task.id, task.claimedBy);
			this.metrics.observeCompleted('succeeded');
			this.eventService.emit('workflow-executed', {
				workflowId: workflowData.id,
				workflowName: workflowData.name,
				executionId,
				source: 'trigger',
			});
		} catch (error) {
			if (error instanceof DuplicateExecutionError) {
				await this.scheduledTaskRepository.markSucceeded(task.id, task.claimedBy);
				this.metrics.observeDuplicate();
				this.metrics.observeCompleted('succeeded');
				return;
			}

			await this.scheduledTaskRepository.markFailed(
				task.id,
				task.claimedBy,
				error instanceof Error ? error.message : String(error),
			);
			this.metrics.observeCompleted('failed');
		}
	}

	private async loadWorkflowData(workflowId: string): Promise<IWorkflowBase> {
		const workflow = await this.workflowRepository.findById(workflowId);
		if (!workflow?.activeVersion) {
			throw new UnexpectedError('Active workflow version not found for scheduled task', {
				extra: { workflowId },
			});
		}

		return {
			...workflow,
			nodes: workflow.activeVersion.nodes,
			connections: workflow.activeVersion.connections,
		};
	}
}
