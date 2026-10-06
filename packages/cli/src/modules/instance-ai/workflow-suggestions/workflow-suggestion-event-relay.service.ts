import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import debounce from 'lodash/debounce';

import { WorkflowSuggestionService } from './workflow-suggestion.service';

const SAVE_DEBOUNCE_MS = 2_000;
const MAX_SAVE_WAIT_MS = 5_000;

@Service()
export class WorkflowSuggestionEventRelay {
	constructor(events: EventService, suggestions: WorkflowSuggestionService, logger: Logger) {
		const pendingSaves = new Map<string, ReturnType<typeof debounce>>();
		const reconcile = async (workflowId: string) => {
			pendingSaves.get(workflowId)?.cancel();
			pendingSaves.delete(workflowId);
			try {
				await suggestions.reconcileWorkflow(workflowId);
			} catch (error) {
				// Review refreshes and actions repeat this check if delivery is interrupted.
				logger.warn('Could not reconcile workflow suggestions', { workflowId, error });
			}
		};
		events.on('workflow-saved', ({ workflow }) => {
			const workflowId = workflow.id;
			let pending = pendingSaves.get(workflowId);
			if (!pending) {
				pending = debounce(async () => await reconcile(workflowId), SAVE_DEBOUNCE_MS, {
					maxWait: MAX_SAVE_WAIT_MS,
				});
				pendingSaves.set(workflowId, pending);
			}
			void pending();
		});
		events.on('workflow-activated', async ({ workflowId }) => await reconcile(workflowId));
		events.on('workflow-deactivated', async ({ workflowId }) => await reconcile(workflowId));
		events.on('workflow-archived', async ({ workflowId }) => await reconcile(workflowId));
	}
}
