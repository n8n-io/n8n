import { WorkflowRepository } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';
import { InstanceSettings } from 'n8n-core';

import { TriggerServiceClient } from '@/stubs/trigger-service-client.stub';
import { MultiMainSetup } from '@/scaling/multi-main-setup.ee';

@RestController('/debug')
export class DebugController {
	constructor(
		private readonly multiMainSetup: MultiMainSetup,
		private readonly triggerService: TriggerServiceClient,
		private readonly workflowRepository: WorkflowRepository,
		private readonly instanceSettings: InstanceSettings,
	) {}

	@Get('/multi-main-setup', { skipAuth: true })
	async getMultiMainSetupDetails() {
		const leaderKey = await this.multiMainSetup.fetchLeaderKey();

		const triggersAndPollers = await this.workflowRepository.findIn(
			await this.triggerService.getActiveWorkflowsInMemory(),
		);

		const webhooks = await this.workflowRepository.findWebhookBasedActiveWorkflows();

		const activationErrors = await this.triggerService.getAllActivationErrors();

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
