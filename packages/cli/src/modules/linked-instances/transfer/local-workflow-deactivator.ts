import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

import { CollaborationService } from '@/collaboration/collaboration.service';
import type { WorkflowActionSource } from '@/events/maps/relay.event-map';
import { WorkflowService } from '@/workflows/workflow.service';

export type TurnOffOptions = {
	/** The editor tab of the request (`push-ref`). Without it, the editor lock is not checked, as in the REST API. */
	clientId?: string;
	source?: WorkflowActionSource;
};

/** Turns off a workflow in this instance after it moved to a linked instance. */
@Service()
export class LocalWorkflowDeactivator {
	constructor(
		private readonly workflowService: WorkflowService,
		private readonly collaborationService: CollaborationService,
		private readonly logger: Logger,
	) {}

	/**
	 * Turns off the workflow as the user, like the REST route: the editor tab of the request can
	 * hold the write lock, another tab or user cannot. Tells open editors to reload.
	 * @returns true when no version of the workflow is live afterwards
	 * @throws {ConflictError | LockedError} when another tab or user edits the workflow
	 */
	async turnOff(user: User, workflowId: string, options: TurnOffOptions = {}): Promise<boolean> {
		const { clientId, source = 'ui' } = options;
		await this.collaborationService.validateWriteLock(user.id, clientId, workflowId, 'deactivate');
		const workflow = await this.workflowService.deactivateWorkflow(user, workflowId, { source });
		// The workflow is off already, so a failed notification is only logged.
		await this.collaborationService
			.broadcastWorkflowUpdate(workflowId, user.id)
			.catch((error: unknown) => {
				this.logger.warn('Failed to tell open editors that a moved workflow was turned off', {
					workflowId,
					error: getErrorMessage(error),
				});
			});
		return workflow.activeVersionId === null;
	}
}
