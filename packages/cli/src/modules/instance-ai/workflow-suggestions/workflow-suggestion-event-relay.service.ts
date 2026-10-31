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

	private readonly deletedMemberResults = new Map<string, string>();

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

	async beforeWorkflowDeleted(workflowId: string): Promise<void> {
		const resultId = await this.suggestions.getPendingResultId(workflowId);
		if (resultId) this.deletedMemberResults.set(workflowId, resultId);
	}

	async afterWorkflowsDeleted(workflowIds: string[]): Promise<void> {
		for (const workflowId of workflowIds) {
			const resultId = this.deletedMemberResults.get(workflowId);
			this.deletedMemberResults.delete(workflowId);
			if (!resultId) continue;
			try {
				await this.suggestions.closeResultOfDeletedMember(resultId);
			} catch (error) {
				this.logger.warn('Could not close the self-healing result of a deleted workflow', {
					workflowId,
					error,
				});
			}
		}
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
