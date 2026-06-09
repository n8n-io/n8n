import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import {
	WorkflowEntity,
	WorkflowHistory,
	WorkflowHistoryRepository,
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxRepository,
	WorkflowPublishedVersion,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
} from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { ensureError } from 'n8n-workflow';

import { ActivationErrorsService } from '@/activation-errors.service';
import { computeTriggerDiff } from '@/workflows/trigger-diff';
import { WorkflowTriggerActivationService } from '@/workflows/workflow-trigger-activation.service';

/**
 * Consumes the workflow publication outbox on the leader instance. It polls for
 * pending records and, for each one, reconciles the workflow's triggers to match
 * the version being published. It computes a trigger-level diff between the
 * currently published version and the new version, then applies only the
 * necessary operations: removing deleted triggers, adding new ones, and
 * re-applying modified ones (remove-then-add) while leaving unchanged triggers
 * running. Records for deleted or no-longer-active workflows are short-circuited
 * to completed, and activation failures are recorded against the workflow and
 * marked failed without halting the poll loop.
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
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly triggerActivationService: WorkflowTriggerActivationService,
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
		const { workflow, oldVersion, newVersion } = await this.resolveVersions(record);
		if (!workflow) {
			this.logger.warn('Workflow not found, marking outbox record as completed', {
				workflowId,
				outboxId: record.id,
			});
			await this.finalizePublication(record);
			return;
		}

		if (!newVersion) {
			this.logger.warn('Published version not found, marking outbox record as completed', {
				workflowId,
				publishedVersionId,
				outboxId: record.id,
			});
			await this.outboxRepository.markFailed(record.id, 'Published version not found');
			return;
		}

		const { toAdd, toRemove } = computeTriggerDiff(
			this.triggerActivationService.getEnabledTriggerNodes(oldVersion),
			this.triggerActivationService.getEnabledTriggerNodes(newVersion),
		);

		// No trigger changed: advance the published version and finish. Unchanged
		// triggers keep running and re-read the new version on their next fire.
		if (toAdd.size === 0 && toRemove.size === 0) {
			await this.advancePublishedVersion(record);
			await this.finalizePublication(record);
			return;
		}

		// Must happen BEFORE advancing the version, using the currently
		// published version so the right webhooks are deregistered.
		if (toRemove.size > 0 && oldVersion) {
			await this.triggerActivationService.removeTriggerNodes(workflow, oldVersion, toRemove);
		}

		await this.advancePublishedVersion(record);

		try {
			if (toAdd.size > 0) {
				await this.triggerActivationService.addTriggerNodes(workflow, newVersion, toAdd);
			}
		} catch (e) {
			const error = ensureError(e);

			await this.handleTriggerActivationFailure(error, workflowId, record.id);
			return;
		}

		await this.finalizePublication(record);

		this.logger.debug('Successfully processed outbox record', {
			workflowId,
			publishedVersionId,
			outboxId: record.id,
		});
	}

	/**
	 * Loads the workflow and the two versions whose triggers are diffed: the
	 * version being published (`newVersion`, null if its history row no longer
	 * exists) and the currently published version (`oldVersion`, null on a first
	 * publication). The workflow is loaded independently of the published-version
	 * mapping so a first publication (no mapping row yet) still resolves it.
	 */
	private async resolveVersions(record: WorkflowPublicationOutbox): Promise<{
		workflow: WorkflowEntity | null;
		oldVersion: WorkflowHistory | null;
		newVersion: WorkflowHistory | null;
	}> {
		const [workflow, currentlyPublishedVersion, newVersion] = await Promise.all([
			this.workflowRepository.findOneBy({ id: record.workflowId }),
			this.workflowPublishedVersionRepository.findOne({
				where: { workflowId: record.workflowId },
				relations: { publishedVersion: true },
				loadEagerRelations: false,
			}),
			this.workflowHistoryRepository.findOneBy({ versionId: record.publishedVersionId }),
		]);

		const oldVersion = currentlyPublishedVersion?.publishedVersion ?? null;

		return { workflow, oldVersion, newVersion };
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

	/**
	 * Handles failures during trigger activation by marking the workflow as inactive,
	 * recording the error against the workflow, and marking the outbox record as
	 * failed with the error message.
	 */
	private async handleTriggerActivationFailure(error: Error, workflowId: string, recordId: number) {
		await this.workflowRepository.update(workflowId, {
			active: false,
			activeVersionId: null,
		});
		await this.activationErrorsService.register(workflowId, error.message);
		await this.outboxRepository.markFailed(recordId, error.message);

		this.errorReporter.error(error, {
			shouldBeLogged: true,
			extra: { workflowId, outboxId: recordId },
		});
	}
}
