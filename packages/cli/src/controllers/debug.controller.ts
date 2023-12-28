import { Get, RestController } from '@/decorators';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { MultiMainSetup } from '@/services/orchestration/main/MultiMainSetup.ee';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

@RestController('/debug')
export class DebugController {
	constructor(
		private readonly multiMainSetup: MultiMainSetup,
		private readonly activeWorkflowRunner: ActiveWorkflowRunner,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	@Get('/multi-main-setup')
	async getMultiMainSetupDetails() {
		const leaderKey = await this.multiMainSetup.fetchLeaderKey();

		const triggersAndPollers = await this.workflowRepository.findIn(
			this.activeWorkflowRunner.allActiveInMemory(),
		);

		const webhooks = await this.workflowRepository.findWebhookBasedActiveWorkflows();

		const activationErrors = await this.activeWorkflowRunner.getAllWorkflowActivationErrors();

		return {
			instanceId: this.multiMainSetup.instanceId,
			leaderKey,
			isLeader: this.multiMainSetup.isLeader,
			activeWorkflows: {
				webhooks, // webhook-based active workflows
				triggersAndPollers, // poller- and trigger-based active workflows
			},
			activationErrors,
		};
	}
}
