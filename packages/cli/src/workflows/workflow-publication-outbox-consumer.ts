import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationOutboxStatus,
	WorkflowPublishedVersion,
	WorkflowRepository,
} from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';

import { ActivationErrorsService } from '@/activation-errors.service';
import { ActiveWorkflowManager } from '@/active-workflow-manager';

const POLL_INTERVAL_MS = 1 * Time.minutes.toMilliseconds;

@Service()
export class WorkflowPublicationOutboxConsumer {
	private pollTimeout: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly activationErrorsService: ActivationErrorsService,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	@OnLeaderTakeover()
	startPolling() {
		if (!this.globalConfig.workflows.useWorkflowPublicationService || this.isShuttingDown) return;

		this.schedulePollCycle();
		this.logger.debug('Started outbox polling');
	}

	@OnLeaderStepdown()
	stopPolling() {
		if (this.pollTimeout) {
			clearTimeout(this.pollTimeout);
			this.pollTimeout = undefined;
			this.logger.debug('Stopped outbox polling');
		}
	}

	@OnShutdown()
	shutdown() {
		this.isShuttingDown = true;
		this.stopPolling();
	}

	private schedulePollCycle() {
		this.pollTimeout = setTimeout(async () => {
			await this.pollCycle();
			if (!this.isShuttingDown) this.schedulePollCycle();
		}, POLL_INTERVAL_MS);
	}

	private async pollCycle() {
		while (!this.isShuttingDown) {
			const record = await this.outboxRepository.claimNextPendingRecord();
			if (!record) break;

			try {
				await this.processRecord(record);
			} catch (error) {
				this.logger.error('Unexpected error processing outbox record', {
					outboxId: record.id,
					workflowId: record.workflowId,
					error: ensureError(error).message,
				});
				try {
					await this.outboxRepository.markFailed(
						record.id,
						`Unexpected: ${ensureError(error).message}`,
					);
				} catch (markError) {
					this.logger.error('Failed to mark outbox record as failed', {
						outboxId: record.id,
						error: ensureError(markError).message,
					});
				}
			}
		}
	}

	async processRecord(record: WorkflowPublicationOutbox) {
		const { workflowId, publishedVersionId } = record;

		const workflow = await this.workflowRepository.findById(workflowId);

		if (!workflow) {
			this.logger.warn('Workflow not found, marking outbox record as completed', {
				workflowId,
				outboxId: record.id,
			});
			await this.outboxRepository.markCompleted(record.id);
			return;
		}

		if (!workflow.active || workflow.activeVersionId === null) {
			this.logger.debug('Workflow is no longer active, marking outbox record as completed', {
				workflowId,
				outboxId: record.id,
			});
			await this.outboxRepository.markCompleted(record.id);
			return;
		}

		if (workflow.activeVersionId === publishedVersionId) {
			await this.finalizePublication(record);
			return;
		}

		try {
			// Must happen BEFORE updating activeVersionId because
			// clearWebhooks() reads activeVersion from DB.
			await this.tearDownOldTriggers(record);

			await this.workflowRepository.update(workflowId, {
				activeVersionId: publishedVersionId,
			});

			await this.registerNewTriggers(record);
		} catch (error) {
			await this.outboxRepository.markFailed(record.id, ensureError(error).message);
			return;
		}

		await this.finalizePublication(record);

		this.logger.debug('Successfully processed outbox record', {
			workflowId,
			publishedVersionId,
			outboxId: record.id,
		});
	}

	private async tearDownOldTriggers(record: WorkflowPublicationOutbox) {
		await this.activeWorkflowManager.remove(record.workflowId);
	}

	private async registerNewTriggers(record: WorkflowPublicationOutbox) {
		try {
			await this.activeWorkflowManager.add(record.workflowId, 'update', undefined, {
				shouldPublish: false,
			});
		} catch (error) {
			await this.workflowRepository.update(record.workflowId, {
				active: false,
				activeVersionId: null,
			});
			await this.activationErrorsService.register(record.workflowId, ensureError(error).message);
			throw error;
		}
	}

	private async finalizePublication(record: WorkflowPublicationOutbox) {
		await this.outboxRepository.manager.transaction(async (trx) => {
			await trx.upsert(
				WorkflowPublishedVersion,
				{ workflowId: record.workflowId, publishedVersionId: record.publishedVersionId },
				['workflowId'],
			);
			await trx.update(
				WorkflowPublicationOutbox,
				{ id: record.id, status: WorkflowPublicationOutboxStatus.InProgress },
				{ status: WorkflowPublicationOutboxStatus.Completed, errorMessage: null },
			);
		});
		await this.activationErrorsService.deregister(record.workflowId);
	}
}
