import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';

import { WorkflowSuggestionService } from './workflow-suggestion.service';

@Service()
export class WorkflowSuggestionEventRelay {
	constructor(events: EventService, suggestions: WorkflowSuggestionService, logger: Logger) {
		const reconcile = async (workflowId: string) => {
			try {
				await suggestions.reconcileWorkflow(workflowId);
			} catch (error) {
				// Reads and actions repeat this check if delivery is interrupted.
				logger.warn('Could not reconcile workflow suggestions', { workflowId, error });
			}
		};
		events.on('workflow-saved', async ({ workflow }) => await reconcile(workflow.id));
		events.on('workflow-activated', async ({ workflowId }) => await reconcile(workflowId));
		events.on('workflow-deactivated', async ({ workflowId }) => await reconcile(workflowId));
		events.on('workflow-archived', async ({ workflowId }) => await reconcile(workflowId));
	}
}
