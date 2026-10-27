import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { CollaborationService } from '@/collaboration/collaboration.service';

@Service()
export class WorkflowReviewStateNotifier {
	constructor(
		private readonly logger: Logger,
		private readonly collaborationService: CollaborationService,
	) {}

	/** Sends an update after commit without failing the request if delivery fails. */
	notify(workflowId: string): void {
		this.collaborationService
			.broadcastWorkflowReviewStateChanged(workflowId)
			.catch((error) =>
				this.logger.warn('Failed to broadcast review state change', { workflowId, error }),
			);
	}

	notifyMany(workflowIds: string[]): void {
		for (const workflowId of workflowIds) {
			this.notify(workflowId);
		}
	}
}
