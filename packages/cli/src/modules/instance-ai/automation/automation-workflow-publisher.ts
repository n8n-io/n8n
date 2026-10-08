import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

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
	) {}

	/**
	 * Publishes one version of the workflow as the user. Honours the editor write lock like the
	 * REST API, and tells open editors to reload. Returns true when a version is live.
	 */
	async activate(user: User, workflowId: string, options: PublishOptions): Promise<boolean> {
		await this.collaborationService.ensureWorkflowEditable(workflowId);
		const workflow = await this.workflowService.activateWorkflow(user, workflowId, options);
		// The workflow is live already, so a failed notification must not report a failure.
		await this.collaborationService
			.broadcastWorkflowUpdate(workflowId, user.id)
			.catch(() => undefined);
		return workflow.activeVersionId !== null;
	}
}
