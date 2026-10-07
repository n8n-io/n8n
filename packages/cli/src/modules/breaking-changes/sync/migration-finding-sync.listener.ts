import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import { MigrationFindingSyncService } from './migration-finding-sync.service';

/**
 * Keeps the `migration_finding` table current between full scans: each time a
 * workflow is created, saved, published, or pulled from source control, its
 * findings are re-checked.
 * The module registers it only when there is a report target version.
 */
@Service()
export class MigrationFindingSyncListener {
	constructor(
		private readonly eventService: EventService,
		private readonly syncService: MigrationFindingSyncService,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = logger.scoped('breaking-changes');
	}

	init(): void {
		this.eventService.on('workflow-created', async ({ workflow }) => {
			await this.syncWorkflow(workflow.id);
		});
		this.eventService.on('workflow-saved', async ({ workflow }) => {
			await this.syncWorkflow(workflow.id);
		});
		this.eventService.on('workflow-activated', async ({ workflowId }) => {
			await this.syncWorkflow(workflowId);
		});
		this.eventService.on('workflow-imported', async ({ workflowId }) => {
			await this.syncWorkflow(workflowId);
		});
	}

	// The sync service reports its own failures. This guard covers anything
	// else, so an event handler never rejects into the save path.
	private async syncWorkflow(workflowId: string): Promise<void> {
		try {
			await this.syncService.syncWorkflow(workflowId);
		} catch (error) {
			this.logger.warn('Re-detecting migration findings for a workflow failed', { workflowId });
			this.errorReporter.error(error, { extra: { workflowId } });
		}
	}
}
