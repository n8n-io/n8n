import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import debounce from 'lodash/debounce';

import { WorkflowSuggestionService } from './workflow-suggestion.service';

const SAVE_DEBOUNCE_MS = 30_000;
const MAX_SAVE_WAIT_MS = 60_000;

@Service()
export class WorkflowSuggestionEventRelay {
	private readonly pendingSaves = new Map<string, ReturnType<typeof debounce>>();

	constructor(
		events: EventService,
		private readonly suggestions: WorkflowSuggestionService,
		private readonly logger: Logger,
	) {
		events.on('workflow-saved', ({ workflow }) => {
			const workflowId = workflow.id;
			let pending = this.pendingSaves.get(workflowId);
			if (!pending) {
				pending = debounce(async () => await this.reconcile(workflowId), SAVE_DEBOUNCE_MS, {
					maxWait: MAX_SAVE_WAIT_MS,
				});
				this.pendingSaves.set(workflowId, pending);
			}
			void pending();
		});
		events.on('workflow-deactivated', async ({ workflowId }) => await this.reconcile(workflowId));
	}

	async afterWorkflowPublished({ workflowId }: { workflowId: string }): Promise<void> {
		await this.reconcile(workflowId);
	}

	async afterWorkflowArchived(workflowId: string): Promise<void> {
		await this.reconcile(workflowId);
	}

	private async reconcile(workflowId: string): Promise<void> {
		this.pendingSaves.get(workflowId)?.cancel();
		this.pendingSaves.delete(workflowId);

		try {
			await this.suggestions.reconcileWorkflow(workflowId);
		} catch (error) {
			// Actions repeat this check if delivery is interrupted.
			this.logger.warn('Could not reconcile workflow suggestions', { workflowId, error });
		}
	}
}
