import { Get, RestController } from '@/decorators';
import { ActiveWorkflowManager } from '@/ActiveWorkflowManager';
import { OrchestrationService } from '@/services/orchestration.service';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

@RestController('/debug')
export class DebugController {
	constructor(
		private readonly orchestrationService: OrchestrationService,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly workflowRepository: WorkflowRepository,
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
			instanceId: this.orchestrationService.instanceId,
			leaderKey,
			isLeader: this.orchestrationService.isLeader,
			activeWorkflows: {
				webhooks, // webhook-based active workflows
				triggersAndPollers, // poller- and trigger-based active workflows
			},
			activationErrors,
		};
	}
}
