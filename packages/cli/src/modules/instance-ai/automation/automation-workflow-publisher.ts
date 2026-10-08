import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

import { CollaborationService } from '@/collaboration/collaboration.service';
import type { WorkflowActionSource } from '@/events/maps/relay.event-map';
import { WorkflowService } from '@/workflows/workflow.service';

export type PublishOptions = {
	source: WorkflowActionSource;
	/** The saved version to publish. The user agreed to this version, not to later changes. */
	versionId: string;
};

/** Turns on a workflow that the user agreed to automate. */
@Service()
export class AutomationWorkflowPublisher {
	constructor(
		private readonly workflowService: WorkflowService,
		private readonly collaborationService: CollaborationService,
		private readonly logger: Logger,
	) {}

	/**
	 * Fails while a user edits the workflow in the editor. Callers check this before they change
	 * the workflow, so that a refused publish changes nothing.
	 *
	 * @throws LockedError when someone holds the editor write lock
	 */
	async assertEditable(workflowId: string): Promise<void> {
		await this.collaborationService.ensureWorkflowEditable(workflowId);
	}

	/**
	 * Publishes one version of the workflow as the user. Honours the editor write lock like the
	 * REST API, and tells open editors to reload. Returns true when a version is live.
	 */
	async activate(user: User, workflowId: string, options: PublishOptions): Promise<boolean> {
		// The lock can appear after the check that ran before the first change.
		await this.assertEditable(workflowId);
		const workflow = await this.workflowService.activateWorkflow(user, workflowId, options);
		await this.notifyEditors(workflowId, user);
		return workflow.activeVersionId !== null;
	}

	/** The workflow is live already, so a failed notification is only logged. */
	private async notifyEditors(workflowId: string, user: User): Promise<void> {
		try {
			await this.collaborationService.broadcastWorkflowUpdate(workflowId, user.id);
		} catch (error) {
			this.logger.warn('Failed to tell open editors that an automation was turned on', {
				workflowId,
				error: getErrorMessage(error),
			});
		}
	}
}
