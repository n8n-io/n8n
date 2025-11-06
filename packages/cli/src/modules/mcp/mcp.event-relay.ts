import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { EventService } from '@/events/event.service';
import { EventRelay } from '@/events/relays/event-relay';
import type { RelayEventMap } from '@/events/maps/relay.event-map';

/**
 * Event relay for MCP module to handle workflow events
 */
@Service()
export class McpEventRelay extends EventRelay {
	constructor(
		eventService: EventService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly logger: Logger,
	) {
		super(eventService);
	}

	init() {
		this.setupListeners({
			'workflow-deactivated': async (event) => await this.onWorkflowDeactivated(event),
		});
	}

	/**
	 * Handles workflow deactivated events.
	 * When a workflow is deactivated, automatically disables MCP access.
	 */
	private async onWorkflowDeactivated(event: RelayEventMap['workflow-deactivated']) {
		const { workflow, workflowId } = event;

		// Only process if workflow has MCP access enabled
		if (workflow.settings?.availableInMCP === true) {
			try {
				// Update the workflow settings to disable MCP access
				const updatedSettings = {
					...workflow.settings,
					availableInMCP: false,
				};

				await this.workflowRepository.update(workflowId, {
					settings: updatedSettings,
				});

				this.logger.info('Disabled MCP access for deactivated workflow', {
					workflowId,
					workflowName: workflow.name,
				});
			} catch (error) {
				this.logger.error('Failed to disable MCP access for deactivated workflow', {
					workflowId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}
}
