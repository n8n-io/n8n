import { Logger } from '@n8n/backend-common';
import { DataTableConfig } from '@n8n/config';
import {
	DataTableMutationEventRepository,
	DataTableRowAutomationRepository,
	DataTableTriggerDeliveryRepository,
	ExecutionRepository,
	type DataTableMutationEvent,
	type DataTableTriggerDelivery,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import {
	DATA_TABLE_TRIGGER_NODE_TYPE,
	OperationalError,
	UserError,
	type DataTableAutomationStatus,
	type ExecutionStatus,
} from 'n8n-workflow';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import { EventService } from '@/events/event.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import { DataTableTriggerSubscriptionReconciler } from '@/workflows/publication/data-table-trigger-subscription-reconciler';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

@Service()
export class DataTableTriggerDeliveryConsumer {
	private pollTimeout: NodeJS.Timeout | undefined;

	private isRunning = false;

	private isShuttingDown = false;

	private lastCleanupAt = 0;

	constructor(
		private readonly logger: Logger,
		private readonly config: DataTableConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly errorReporter: ErrorReporter,
		private readonly deliveryRepository: DataTableTriggerDeliveryRepository,
		private readonly eventRepository: DataTableMutationEventRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly triggerExecutionContextFactory: TriggerExecutionContextFactory,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly subscriptionReconciler: DataTableTriggerSubscriptionReconciler,
		private readonly rowAutomationRepository: DataTableRowAutomationRepository,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('data-table');
	}

	async start(): Promise<void> {
		// Executions finish on workers in queue mode, so this listener is not main-only.
		this.eventService.on('workflow-post-execute', async ({ executionId, runData }) => {
			const status = finalAutomationStatus(runData?.status);
			if (!status) return;
			const error =
				status === 'failed' ? (runData?.data.resultData.error?.message ?? 'failed') : null;
			await this.rowAutomationRepository.finishExecution(executionId, status, error);
		});
		if (this.instanceSettings.instanceType !== 'main') return;
		if (this.instanceSettings.isLeader) await this.subscriptionReconciler.reconcileAll();
		this.isRunning = true;
		this.schedule();
		await this.drain();
	}

	async shutdown(): Promise<void> {
		this.isShuttingDown = true;
		this.isRunning = false;
		if (this.pollTimeout) clearTimeout(this.pollTimeout);
	}

	private schedule(): void {
		if (!this.isRunning || this.isShuttingDown) return;
		this.pollTimeout = setTimeout(() => {
			void this.drain()
				.catch((error) => this.errorReporter.error(error))
				.finally(() => this.schedule());
		}, this.config.triggerPollIntervalMs);
	}

	private async drain(): Promise<void> {
		await Promise.all(
			Array.from(
				{ length: this.config.triggerConcurrency },
				async () => await this.runWorkerPass(),
			),
		);
		await this.cleanupIfDue();
	}

	private async cleanupIfDue(): Promise<void> {
		const now = Date.now();
		if (now - this.lastCleanupAt < 60 * 60 * 1000) return;
		this.lastCleanupAt = now;

		const batchSize = 1000;
		await this.deliveryRepository.deleteExpired(
			new Date(now - this.config.triggerCompletedRetentionMs),
			new Date(now - this.config.triggerFailedRetentionMs),
			batchSize,
		);
		await this.eventRepository.deleteOrphansOlderThan(
			new Date(now - this.config.triggerCompletedRetentionMs),
			batchSize,
		);
	}

	private async runWorkerPass(): Promise<void> {
		while (this.isRunning && !this.isShuttingDown) {
			const delivery = await this.deliveryRepository.claimNext(
				this.instanceSettings.instanceId,
				this.config.triggerLeaseMs,
			);
			if (!delivery) return;
			await this.process(delivery);
		}
	}

	private async process(delivery: DataTableTriggerDelivery): Promise<void> {
		if (!delivery.claimedBy) {
			throw new OperationalError('Claimed Data Table trigger delivery has no owner');
		}
		const fence = {
			id: delivery.id,
			claimedBy: delivery.claimedBy,
			leaseEpoch: delivery.leaseEpoch,
		};
		const event = await this.eventRepository.findOneBy({ id: delivery.eventId });
		if (!event) {
			await this.deliveryRepository.markFailed(fence, 'Mutation event no longer exists');
			return;
		}

		const workflowData = await this.triggerExecutionContextFactory.findPublishedWorkflowData(
			delivery.workflowId,
		);
		const node = workflowData?.nodes.find(
			(candidate) =>
				candidate.id === delivery.nodeId &&
				candidate.type === DATA_TABLE_TRIGGER_NODE_TYPE &&
				candidate.disabled !== true,
		);
		if (!workflowData || !node) {
			await this.deliveryRepository.markCancelled(
				fence,
				'The latest published workflow no longer contains this Data Table Trigger',
			);
			return;
		}

		const deduplicationKey = `data-table-event:${event.id}:${delivery.workflowId}:${delivery.nodeId}`;
		try {
			const additionalData = await WorkflowExecuteAdditionalData.getBase({
				workflowId: workflowData.id,
				workflowSettings: workflowData.settings,
			});
			const executionId = await this.workflowExecutionService.runWorkflow(
				workflowData,
				node,
				[[{ json: event.payload }]],
				additionalData,
				'trigger',
				undefined,
				deduplicationKey,
			);
			if (!executionId) {
				throw new OperationalError('Data Table trigger execution handoff returned no execution ID');
			}
			await this.deliveryRepository.markCompleted(fence, executionId);
			await this.trackRow(event, delivery, { status: 'running', executionId });
		} catch (error) {
			if (error instanceof DuplicateExecutionError) {
				const existing = await this.executionRepository.findOne({
					select: ['id'],
					where: { deduplicationKey },
				});
				if (existing) {
					await this.deliveryRepository.markCompleted(fence, existing.id);
					await this.trackRow(event, delivery, { status: 'running', executionId: existing.id });
					return;
				}
			}

			const message = error instanceof Error ? error.message : String(error);
			if (error instanceof UserError || delivery.attempts >= this.config.triggerMaxAttempts) {
				await this.deliveryRepository.markFailed(fence, message);
				await this.trackRow(event, delivery, {
					status: 'failed',
					executionId: null,
					error: message,
				});
				return;
			}

			const backoffMs = Math.min(
				this.config.triggerPollIntervalMs * 2 ** Math.max(0, delivery.attempts - 1),
				60_000,
			);
			await this.deliveryRepository.scheduleRetry(fence, message, new Date(Date.now() + backoffMs));
			this.logger.warn('Data Table trigger delivery will retry', {
				deliveryId: delivery.id,
				attempts: delivery.attempts,
				error: message,
			});
		}
	}

	private async trackRow(
		event: DataTableMutationEvent,
		delivery: DataTableTriggerDelivery,
		state: { status: 'running' | 'failed'; executionId: string | null; error?: string },
	): Promise<void> {
		if (event.event === 'rowDeleted') return;
		const key = {
			dataTableId: event.dataTableId,
			rowId: event.rowId,
			workflowId: delivery.workflowId,
			nodeId: delivery.nodeId,
		};
		await this.rowAutomationRepository.setStatus([{ ...key, error: null, ...state }]);

		// A short execution can finish before its id is stored here, so the
		// post-execute listener found nothing to update. Catch up from the execution.
		if (state.status !== 'running' || !state.executionId) return;
		const execution = await this.executionRepository.findOne({
			select: ['id', 'status'],
			where: { id: state.executionId },
		});
		const status = finalAutomationStatus(execution?.status);
		if (status) {
			await this.rowAutomationRepository.setStatus([
				{
					...key,
					...state,
					status,
					error: status === 'failed' ? (execution?.status ?? null) : null,
				},
			]);
		}
	}
}

function finalAutomationStatus(
	status: ExecutionStatus | undefined,
): Extract<DataTableAutomationStatus, 'finished' | 'failed'> | undefined {
	if (status === 'success') return 'finished';
	if (status === 'error' || status === 'crashed' || status === 'canceled') return 'failed';
	return undefined;
}
