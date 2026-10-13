import { WorkflowsConfig } from '@n8n/config';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { WorkflowPublicationOutboxCleanupService } from './workflow-publication-outbox-cleanup.service';

/**
 * Deletes terminal workflow publication outbox records, so the outbox table
 * only holds the short-lived diagnostic trail it exists for.
 */
@SystemTask()
export class WorkflowPublicationOutboxCleanupTask implements SystemTask {
	readonly name = 'publication-outbox-cleanup';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(
		this.workflowsConfig.publicationOutboxCleanupIntervalSeconds,
	);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: true,
		/** A new leader enqueues one terminal row per active workflow, so a backlog is waiting. */
		runOnTakeover: true,
	};

	/** Only the in-memory timer, which runs whenever the task does not run durably, honors this. */
	readonly retryDelaySeconds = 30;

	constructor(
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly cleanupService: WorkflowPublicationOutboxCleanupService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.cleanupService.cleanup(signal);
	}
}
