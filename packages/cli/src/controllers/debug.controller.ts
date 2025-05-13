import { WorkflowRepository } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';
import { InstanceSettings } from 'n8n-core';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { MultiMainSetup } from '@/scaling/multi-main-setup.ee';

@RestController('/debug')
export class DebugController {
	constructor(
		private readonly multiMainSetup: MultiMainSetup,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly workflowRepository: WorkflowRepository,
		private readonly instanceSettings: InstanceSettings,
	) {}

	@Get('/multi-main-setup', { skipAuth: true })
	async getMultiMainSetupDetails() {
		const leaderKey = await this.multiMainSetup.fetchLeaderKey();

		const triggersAndPollers = await this.workflowRepository.findIn(
			this.activeWorkflowManager.allActiveInMemory(),
		);

		const webhooks = await this.workflowRepository.findWebhookBasedActiveWorkflows();

		const activationErrors = await this.activeWorkflowManager.getAllWorkflowActivationErrors();

		return {
			instanceId: this.instanceSettings.instanceId,
			leaderKey,
			isLeader: this.instanceSettings.isLeader,
			activeWorkflows: {
				webhooks, // webhook-based active workflows
				triggersAndPollers, // poller- and trigger-based active workflows
			},
			activationErrors,
		};
	}
}
