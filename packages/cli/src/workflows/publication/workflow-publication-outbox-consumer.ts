import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { WorkflowPublicationOutbox, WorkflowPublicationOutboxRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import { UnexpectedError, ensureError } from 'n8n-workflow';

import type { PublicationResult } from '@/workflows/publication/publication-result';
import { PublicationStatusReporter } from '@/workflows/publication/publication-status-reporter';
import { WorkflowPublicationApplier } from '@/workflows/publication/workflow-publication-applier';

/**
 * Consumes the workflow publication outbox on the leader instance. It owns the
 * queue mechanics only: the poll loop, leader lifecycle, and claiming the next
 * pending record. For each claimed record it delegates to the applier (which
 * reconciles triggers and returns a result) and then to the reporter (which
 * writes the terminal status and side effects). Any unexpected error from the
 * applier is turned into a failed result so the reporter remains the single
 * writer of terminal outbox statuses.
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
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	init() {
		if (this.instanceSettings.isLeader) {
			this.startPolling();
		}
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

			await this.processRecord(record);
			processed++;
		}

		if (processed > 0) {
			this.logger.debug(`Processed ${processed} workflow publication outbox record(s)`);
		}
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
	 */
	async processRecord(record: WorkflowPublicationOutbox): Promise<void> {
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
	}
}
