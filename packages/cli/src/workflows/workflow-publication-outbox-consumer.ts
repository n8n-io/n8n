import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	WorkflowPublicationOutboxRepository,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { WorkflowPublicationOutbox } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';

import { ActivationErrorsService } from '@/activation-errors.service';
import { ActiveWorkflowManager } from '@/active-workflow-manager';

const POLL_INTERVAL_MS = 1 * Time.minutes.toMilliseconds;

@Service()
export class WorkflowPublicationOutboxConsumer {
	private pollInterval: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	private isProcessing = false;

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly activationErrorsService: ActivationErrorsService,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	@OnLeaderTakeover()
	startPolling() {
		if (!this.globalConfig.workflows.useWorkflowPublicationService || this.isShuttingDown) return;

		this.pollInterval = setInterval(async () => await this.pollCycle(), POLL_INTERVAL_MS);
		this.logger.debug('Started outbox polling');
	}

	@OnLeaderStepdown()
	stopPolling() {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = undefined;
			this.logger.debug('Stopped outbox polling');
		}
	}

	@OnShutdown()
	shutdown() {
		this.isShuttingDown = true;
		this.stopPolling();
	}

	private async pollCycle() {
		if (this.isProcessing) return;

		this.isProcessing = true;
		try {
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
		} finally {
			this.isProcessing = false;
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
			await this.workflowPublishedVersionRepository.setPublishedVersion(
				workflowId,
				publishedVersionId,
			);
			await this.outboxRepository.markCompleted(record.id);
			return;
		}

		// Step 1: Tear down old triggers. Must happen BEFORE updating
		// activeVersionId because clearWebhooks() reads activeVersion from DB.
		try {
			await this.activeWorkflowManager.remove(workflowId);
		} catch (error) {
			await this.outboxRepository.markFailed(
				record.id,
				`Failed to remove old triggers: ${ensureError(error).message}`,
			);
			return;
		}

		// Step 2: Swing activeVersionId to the new version.
		await this.workflowRepository.update(workflowId, {
			activeVersionId: publishedVersionId,
		});

		// Step 3: Register all triggers from the new version.
		try {
			await this.activeWorkflowManager.add(workflowId, 'update', undefined, {
				shouldPublish: false,
			});
		} catch (error) {
			await this.workflowRepository.update(workflowId, {
				active: false,
				activeVersionId: null,
			});
			await this.activationErrorsService.register(workflowId, ensureError(error).message);
			await this.outboxRepository.markFailed(
				record.id,
				`Failed to register new triggers: ${ensureError(error).message}`,
			);
			return;
		}

		// Step 4: Update published version mapping and finalize.
		await this.workflowPublishedVersionRepository.setPublishedVersion(
			workflowId,
			publishedVersionId,
		);
		await this.activationErrorsService.deregister(workflowId);
		await this.outboxRepository.markCompleted(record.id);

		this.logger.debug('Successfully processed outbox record', {
			workflowId,
			publishedVersionId,
			outboxId: record.id,
		});
	}
}
