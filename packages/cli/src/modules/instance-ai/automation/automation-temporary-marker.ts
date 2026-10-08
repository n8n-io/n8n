import { Logger } from '@n8n/backend-common';
import { AiBuilderTemporaryWorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowProvenanceService } from '../provenance/workflow-provenance.service';

/**
 * The AI-temporary marker of a workflow that the n8n Assistant built. The run-end cleanup
 * archives a marked workflow, so a workflow that the user keeps must lose its marker.
 */
@Service()
export class AutomationTemporaryMarker {
	constructor(
		private readonly temporaryWorkflowRepository: AiBuilderTemporaryWorkflowRepository,
		private readonly provenanceService: WorkflowProvenanceService,
		private readonly logger: Logger,
	) {}

	async isMarked(workflowId: string): Promise<boolean> {
		return await this.temporaryWorkflowRepository.existsForWorkflow(workflowId);
	}

	/**
	 * Records the chat that built the workflow, then removes the marker. The record is best
	 * effort, as when the Assistant keeps a workflow itself: a kept workflow that keeps its
	 * marker goes back to the archive at the end of the run.
	 */
	async clear(user: User, workflowId: string): Promise<void> {
		await this.recordChat(user, workflowId);
		await this.temporaryWorkflowRepository.unmark(workflowId);
	}

	/** Reads the chat before the marker goes, because the marker names the chat. */
	private async recordChat(user: User, workflowId: string): Promise<void> {
		try {
			const threadId = await this.temporaryWorkflowRepository.findThreadIdForWorkflow(workflowId);
			if (threadId) await this.provenanceService.record(workflowId, threadId, user.id);
		} catch (error) {
			this.logger.warn('Failed to record the Assistant chat of a kept workflow', {
				workflowId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
