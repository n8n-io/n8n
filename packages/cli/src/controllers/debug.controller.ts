import { Get, RestController } from '@/decorators';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { OrchestrationService } from '@/services/orchestration.service';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

@RestController('/debug')
export class DebugController {
	constructor(
		private readonly orchestrationService: OrchestrationService,
		private readonly activeWorkflowRunner: ActiveWorkflowRunner,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	@Get('/multi-main-setup', { skipAuth: true })
	async getMultiMainSetupDetails() {
		const leaderKey = await this.orchestrationService.multiMainSetup.fetchLeaderKey();

		const triggersAndPollers = await this.workflowRepository.findIn(
			this.activeWorkflowRunner.allActiveInMemory(),
		);

		const webhooks = await this.workflowRepository.findWebhookBasedActiveWorkflows();

		const activationErrors = await this.activeWorkflowRunner.getAllWorkflowActivationErrors();

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
