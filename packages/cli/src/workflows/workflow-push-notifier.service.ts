import type { PushMessage } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { Push } from '@/push';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

/** Sends a push message only to users who can currently read the workflow it concerns. */
@Service()
export class WorkflowPushNotifier {
	constructor(
		private readonly push: Push,
		private readonly workflowSharingService: WorkflowSharingService,
	) {}

	async notify(workflowId: string, pushMsg: PushMessage) {
		const userIds =
			await this.workflowSharingService.getUserIdsWithAccessToWorkflowSafe(workflowId);
		this.push.sendToUsers(pushMsg, userIds);
	}
}
