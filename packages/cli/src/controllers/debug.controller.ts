import { InstanceSettings } from 'n8n-core';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { Get, RestController } from '@/decorators';
import { OrchestrationService } from '@/services/orchestration.service';

@RestController('/debug')
export class DebugController {
	constructor(
		private readonly orchestrationService: OrchestrationService,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly workflowRepository: WorkflowRepository,
		private readonly instanceSettings: InstanceSettings,
	) {}

	@Get('/multi-main-setup', { skipAuth: true })
	async getMultiMainSetupDetails() {
		const leaderKey = await this.orchestrationService.multiMainSetup.fetchLeaderKey();

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
