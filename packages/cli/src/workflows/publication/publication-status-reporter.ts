import type { WorkflowPublicationStatusMessage } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatusRepository,
	type TriggerStatusRow,
} from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';

import { ActivationErrorsService } from '@/activation-errors.service';
import { isPolicyRefusal } from '@/policy/policy-violation.error';
import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import type {
	FailedTriggerPublicationStatus,
	PublicationResult,
	PublicationSkipReason,
	TriggerPublicationStatus,
} from '@/workflows/publication/publication-result';
import type { TriggerTeardownFailure } from '@/workflows/triggers/workflow-trigger-activator';

/**
 * Turns a {@link PublicationResult} into terminal state. This is the only place
 * that writes terminal outbox statuses and the only place that maps a result to
 * its side effects: persisting per-trigger status rows, clearing legacy activation
 * errors on success, and pushing publication status to the UI.
 */
const SKIP_LOG_MESSAGE: Record<PublicationSkipReason, string> = {
	'workflow-not-found': 'Workflow not found',
	'node-ids-healed': 'Version was healed and republished; its own record applies it',
	superseded: 'Version was superseded by a concurrent publication',
};

@Service()
export class PublicationStatusReporter {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly activationErrorsService: ActivationErrorsService,
		private readonly push: Push,
		private readonly publisher: Publisher,
		private readonly triggerStatusRepository: WorkflowPublicationTriggerStatusRepository,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	async report(record: WorkflowPublicationOutbox, result: PublicationResult): Promise<void> {
		switch (result.type) {
			case 'completed': {
				const warningMessage = this.surfaceTeardownFailures(result.teardownFailures);
				await this.complete(record, this.toRows(record, result.triggerStatuses), warningMessage);
				this.pushStatus({
					type: 'workflowActivated',
					data: { workflowId: record.workflowId, activeVersionId: record.publishedVersionId },
				});
				return;
			}

			case 'unpublished': {
				const warningMessage = this.surfaceTeardownFailures(result.teardownFailures);
				await this.complete(record, /*triggerStatuses=*/ [], warningMessage);
				this.pushStatus({
					type: 'workflowDeactivated',
					data: { workflowId: record.workflowId },
				});
				return;
			}

			case 'skipped': {
				this.logSkip(record, result.reason);
				await this.complete(record);
				return;
			}

			case 'version-missing': {
				const errorMessage = 'Published version not found';
				this.logger.warn('Published version not found, marking outbox record as failed', {
					workflowId: record.workflowId,
					publishedVersionId: record.publishedVersionId,
					outboxId: record.id,
				});
				await this.outboxRepository.markFailed(record.id, errorMessage);
				this.pushFailedToActivate(record.workflowId, errorMessage);
				return;
			}

			case 'failed': {
				// The record's failure stays the activation error; the abandoned
				// deregistrations (whose teardown already ran) get their own report.
				this.surfaceTeardownFailures(result.teardownFailures);
				const { triggerStatuses } = result;
				await this.outboxRepository.manager.transaction(async (trx) => {
					if (triggerStatuses) {
						await this.triggerStatusRepository.replaceForWorkflow(
							record.workflowId,
							this.toRows(record, triggerStatuses),
							trx,
						);
					}
					await this.outboxRepository.markFailed(record.id, result.error.message, trx);
				});
				// An expected denial, already logged as a warning by the applier — the
				// terminal state and the UI push stand, the fault report does not.
				if (!isPolicyRefusal(result.error)) {
					this.errorReporter.error(result.error, { shouldBeLogged: true });
				}
				this.pushFailedToActivate(record.workflowId, result.error.message);
				return;
			}

			case 'partial': {
				// As on 'failed': the stored/pushed message stays about activation.
				this.surfaceTeardownFailures(result.teardownFailures);
				await this.reportPartial(record, result.triggerStatuses);
				return;
			}
		}
	}

	/**
	 * Reports a partial publication: the new version stays published with the
	 * surviving triggers running. Marks the outbox record `partial_success`,
	 * full-replaces the workflow's per-trigger status rows, and pushes the
	 * per-node failure detail to connected clients. The workflow is not unpublished.
	 */
	private async reportPartial(
		record: WorkflowPublicationOutbox,
		triggerStatuses: TriggerPublicationStatus[],
	): Promise<void> {
		const failures = triggerStatuses.filter(
			(s): s is FailedTriggerPublicationStatus => s.status === 'failed',
		);
		const errorMessage = this.formatActivationError(failures);

		this.logger.warn('Workflow partially published; some triggers failed to activate', {
			workflowId: record.workflowId,
			outboxId: record.id,
			failedNodeIds: failures.map((s) => s.nodeId),
		});

		await this.outboxRepository.manager.transaction(async (trx) => {
			await this.triggerStatusRepository.replaceForWorkflow(
				record.workflowId,
				this.toRows(record, triggerStatuses),
				trx,
			);
			await this.outboxRepository.markPartialSuccess(record.id, errorMessage, trx);
		});

		this.pushStatus({
			type: 'workflowPartiallyActivated',
			data: {
				workflowId: record.workflowId,
				activeVersionId: record.publishedVersionId,
				errorMessage,
				failedNodes: failures.map((triggerStatus) => ({
					nodeId: triggerStatus.nodeId,
					nodeName: triggerStatus.nodeName,
					errorMessage: triggerStatus.errorMessage,
				})),
			},
		});
	}

	/** Maps trigger publication statuses to repository row objects, stamping the published version. */
	private toRows(
		record: WorkflowPublicationOutbox,
		statuses: TriggerPublicationStatus[],
	): TriggerStatusRow[] {
		return statuses.map((triggerStatus) => ({
			nodeId: triggerStatus.nodeId,
			versionId: record.publishedVersionId,
			status: triggerStatus.status,
			triggerKind: triggerStatus.triggerKind,
			errorMessage: triggerStatus.status === 'failed' ? triggerStatus.errorMessage : null,
		}));
	}

	/** Builds a human-readable message naming each failed node and its error. */
	private formatActivationError(failures: FailedTriggerPublicationStatus[]): string {
		const detail = failures
			.map((status) => `"${status.nodeName}": ${status.errorMessage}`)
			.join('; ');

		return `Some triggers failed to activate: ${detail}`;
	}

	/** Pushes a failed-to-activate status to clients connected to any main. */
	private pushFailedToActivate(workflowId: string, errorMessage: string): void {
		this.pushStatus({
			type: 'workflowFailedToActivate',
			data: { workflowId, errorMessage },
		});
	}

	/**
	 * Pushes a publication status to locally connected clients and relays it to
	 * the other main instances, whose clients would otherwise only learn of the
	 * status from polling: the reporter runs on the leader (the outbox consumer
	 * is leader-only), but clients may be connected to a follower. The relay is
	 * fire-and-forget so a pubsub failure never fails the terminal-status report.
	 */
	private pushStatus(pushMsg: WorkflowPublicationStatusMessage): void {
		this.push.broadcast(pushMsg);
		void this.publisher
			.publishCommand({ command: 'display-workflow-publication-status', payload: pushMsg })
			.catch((error) => this.errorReporter.error(error, { shouldBeLogged: true }));
	}

	/** Displays a publication status relayed by the leader (see {@link pushStatus}). */
	@OnPubSubEvent('display-workflow-publication-status', { instanceType: 'main' })
	handleDisplayWorkflowPublicationStatus(pushMsg: WorkflowPublicationStatusMessage): void {
		this.push.broadcast(pushMsg);
	}

	/**
	 * Surfaces abandoned external webhook deregistrations carried on a
	 * successful result: the publication itself succeeded (local routing has
	 * stopped), but a third-party subscription may remain. Reports once at
	 * error level — explicit, since `OperationalError` defaults to `warning`,
	 * which the error reporter filters from Sentry — and returns the message
	 * to store on the completed record for diagnostics.
	 */
	private surfaceTeardownFailures(
		teardownFailures: TriggerTeardownFailure[] | undefined,
	): string | undefined {
		if (!teardownFailures?.length) return undefined;

		const detail = teardownFailures
			.map((failure) => `"${failure.nodeName}": ${failure.error.message}`)
			.join('; ');
		const message = `External webhook deregistration failed for: ${detail}`;

		this.errorReporter.error(
			new OperationalError(message, { level: 'error', cause: teardownFailures[0].error }),
			{ shouldBeLogged: true },
		);

		return message;
	}

	/**
	 * Marks the record completed and clears any activation errors for the workflow.
	 * If there are any per-trigger statuses passed in, they are persisted in the same transaction.
	 */
	private async complete(
		record: WorkflowPublicationOutbox,
		triggerStatuses?: TriggerStatusRow[],
		warningMessage?: string,
	): Promise<void> {
		await this.outboxRepository.manager.transaction(async (trx) => {
			if (triggerStatuses !== undefined) {
				await this.triggerStatusRepository.replaceForWorkflow(
					record.workflowId,
					triggerStatuses,
					trx,
				);
			}
			await this.outboxRepository.markCompleted(record.id, trx, warningMessage);
		});
		await this.activationErrorsService.deregister(record.workflowId);
	}

	private logSkip(record: WorkflowPublicationOutbox, reason: PublicationSkipReason): void {
		const context = { workflowId: record.workflowId, outboxId: record.id };

		this.logger.warn(`${SKIP_LOG_MESSAGE[reason]}, marking outbox record as completed`, context);
	}
}
