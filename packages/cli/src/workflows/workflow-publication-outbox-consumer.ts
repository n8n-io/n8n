import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import {
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxRepository,
	WorkflowPublishedVersion,
	WorkflowRepository,
} from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { ensureError } from 'n8n-workflow';

import { ActivationErrorsService } from '@/activation-errors.service';
import { ActiveWorkflowManager } from '@/active-workflow-manager';

/**
 * Consumes the workflow publication outbox on the leader instance. It polls for
 * pending records and, for each one, reapplies the workflow's triggers to match
 * the published version: tearing down the old triggers, advancing
 * `activeVersionId`, and registering the new triggers. Records for deleted or
 * no-longer-active workflows are short-circuited to completed, and activation
 * failures are recorded against the workflow and marked failed without halting
 * the poll loop.
 */
@Service()
export class WorkflowPublicationOutboxConsumer {
	private pollTimeout: NodeJS.Timeout | undefined;

	private isPolling = false;

	private isShuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly errorReporter: ErrorReporter,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly activationErrorsService: ActivationErrorsService,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	@OnLeaderTakeover()
	startPolling() {
		if (!this.workflowsConfig.useWorkflowPublicationService || this.isShuttingDown) return;
		if (this.isPolling) return;

		this.isPolling = true;
		this.schedulePollCycle();
		this.logger.debug('Started outbox polling');
	}

	@OnLeaderStepdown()
	stopPolling() {
		this.isPolling = false;

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

	// We will rely on the `workflow-publish-wake-up` event in the future, but
	// will keep the poller as a fallback since pubsub delivery is not ensured.
	private schedulePollCycle() {
		clearTimeout(this.pollTimeout);
		if (!this.shouldKeepPolling()) return;

		this.pollTimeout = setTimeout(async () => {
			try {
				await this.pollCycle();
			} catch (error) {
				this.errorReporter.error(error, { shouldBeLogged: true });
			}

			if (this.shouldKeepPolling()) this.schedulePollCycle();
		}, this.workflowsConfig.publicationOutboxPollIntervalMs);
	}

	private async pollCycle() {
		let processed = 0;

		while (this.shouldKeepPolling()) {
			const record = await this.outboxRepository.claimNextPendingRecord();
			if (!record) break;

			await this.tryProcessRecord(record);
			processed++;
		}

		if (processed > 0) {
			this.logger.debug(`Processed ${processed} workflow publication outbox record(s)`);
		}
	}

	private shouldKeepPolling() {
		return this.isPolling && !this.isShuttingDown;
	}

	private async tryProcessRecord(record: WorkflowPublicationOutbox) {
		try {
			await this.processRecord(record);
		} catch (error) {
			this.errorReporter.error(error, { shouldBeLogged: true });
			try {
				await this.outboxRepository.markFailed(
					record.id,
					`Unexpected: ${ensureError(error).message}`,
				);
			} catch (markError) {
				this.errorReporter.error(markError, { shouldBeLogged: true });
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
			await this.advancePublishedVersion(record);
			await this.finalizePublication(record);
			return;
		}

		try {
			// Must happen BEFORE advancing the version because clearWebhooks()
			// reads activeVersion from DB.
			await this.tearDownOldTriggers(record);

			await this.advancePublishedVersion(record);

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
		// This try-catch reflects the old behaviour in the ActiveWorkflowManager.
		// We probably want to revisit this.
		try {
			await this.activeWorkflowManager.clearWebhooks(record.workflowId);
		} catch (error) {
			this.errorReporter.error(error, {
				shouldBeLogged: true,
				tags: {
					workflowId: record.workflowId,
					outboxId: record.id,
				},
			});
		}

		await this.activeWorkflowManager.removeActivationError(record.workflowId);
		await this.activeWorkflowManager.removeNonWebhookTriggers(record.workflowId);
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

	/**
	 * Advances the canonical version read by triggers. Runs before registering
	 * the new triggers so they execute the newly published version rather than
	 * the previous one.
	 */
	private async advancePublishedVersion(record: WorkflowPublicationOutbox) {
		await this.outboxRepository.manager.upsert(
			WorkflowPublishedVersion,
			{ workflowId: record.workflowId, publishedVersionId: record.publishedVersionId },
			['workflowId'],
		);
	}

	/**
	 * Marks the outbox record as completed and clears any activation errors for
	 * the workflow.
	 */
	private async finalizePublication(record: WorkflowPublicationOutbox) {
		await this.outboxRepository.markCompleted(record.id);
		await this.activationErrorsService.deregister(record.workflowId);
	}
}
