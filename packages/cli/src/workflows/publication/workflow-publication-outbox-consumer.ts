import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { WorkflowPublicationOutbox, WorkflowPublicationOutboxRepository } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import { UnexpectedError, ensureError } from 'n8n-workflow';

import type { PublicationResult } from '@/workflows/publication/publication-result';
import { PublicationStatusReporter } from '@/workflows/publication/publication-status-reporter';
import { WorkflowPublicationLifecycleLock } from '@/workflows/publication/workflow-publication-lifecycle-lock';
import { WorkflowPublicationApplier } from '@/workflows/publication/workflow-publication-applier';

/**
 * Consumes the workflow publication outbox on the leader instance. It owns the
 * queue mechanics only: the poll loop and claiming the next pending record. For
 * each claimed record it delegates to the applier (which reconciles triggers
 * and returns a result) and then to the reporter (which writes the terminal
 * status and side effects). Any unexpected error from the applier is turned
 * into a failed result so the reporter remains the single writer of terminal
 * outbox statuses.
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
		private readonly applier: WorkflowPublicationApplier,
		private readonly reporter: PublicationStatusReporter,
		private readonly instanceSettings: InstanceSettings,
		private readonly lifecycleLock: WorkflowPublicationLifecycleLock,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	async init() {
		if (!this.instanceSettings.isLeader) return;

		this.startPolling();
		// Drain immediately so triggers get activated ASAP
		await this.drainPending();
	}

	startPolling() {
		if (!this.workflowsConfig.useWorkflowPublicationService || this.isShuttingDown) return;
		if (this.isPolling) return;

		this.isPolling = true;
		this.schedulePollCycle();
		this.logger.debug('Started outbox polling');
	}

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
		const processed = await this.drainPending();

		// Only log if we processed more than 1 since we log each individual record
		if (processed > 1) {
			this.logger.debug(`Processed ${processed} workflow publication outbox records in this cycle`);
		}
	}

	/**
	 * Claim and process every currently pending record in a single pass, returning
	 * the number processed. Used both by the scheduled poll cycle and at leader
	 * startup for an immediate drain. The loop stops if the instance steps down or
	 * shuts down mid-drain. Claiming is atomic, so an extra concurrent drain never
	 * double-processes a record.
	 */
	async drainPending(): Promise<number> {
		let processed = 0;
		while (this.shouldKeepPolling()) {
			const record = await this.outboxRepository.claimNextPendingRecord();
			if (!record) break;

			await this.processRecord(record);
			processed++;
		}

		return processed;
	}

	private shouldKeepPolling() {
		return this.isPolling && !this.isShuttingDown;
	}

	/**
	 * Applies a single claimed record and reports the outcome. The applier returns
	 * a `failed` result for expected failures; an unexpected throw is wrapped into
	 * a `failed` result so the reporter still writes a terminal status. A failure
	 * in the reporter itself can only be logged: the record is left in progress
	 * for a later poll cycle to retry.
	 *
	 * Both the apply and the report run under the workflow's {@link WorkflowPublicationLifecycleLock}
	 * so leader stepdown cannot tear this workflow's triggers down mid-record, and the
	 * terminal-status write always lands before teardown proceeds. If leadership was lost
	 * between claiming the record and entering the critical section, the record is returned
	 * to the queue (so the new leader reprocesses it) and nothing is applied here.
	 */
	async processRecord(record: WorkflowPublicationOutbox): Promise<void> {
		await this.lifecycleLock.runExclusive(record.workflowId, async () => {
			// A record claimed while leader can reach here after stepdown (e.g. while
			// waiting on the lock during teardown). Activating triggers now would leave
			// them running on a demoted instance, so hand the record back to the queue.
			if (!this.instanceSettings.isLeader) {
				await this.outboxRepository.returnToPending(record.id);
				this.logger.debug('Returned publication outbox record to queue: no longer leader', {
					outboxId: record.id,
					workflowId: record.workflowId,
				});
				return;
			}

			this.logger.debug('Started processing workflow publication outbox record', {
				outboxId: record.id,
				workflowId: record.workflowId,
				publishedVersionId: record.publishedVersionId,
			});

			let result: PublicationResult;

			try {
				result = await this.applier.apply(record);
			} catch (error) {
				const cause = ensureError(error);
				result = {
					type: 'failed',
					error: new UnexpectedError(`Unexpected: ${cause.message}`, { cause }),
				};
			}

			try {
				await this.reporter.report(record, result);
			} catch (reportError) {
				this.errorReporter.error(reportError, { shouldBeLogged: true });
			}

			this.logger.debug('Finished processing workflow publication outbox record', {
				outboxId: record.id,
				workflowId: record.workflowId,
				result: result.type,
			});
		});
	}
}
