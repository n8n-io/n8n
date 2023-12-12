import { Service } from 'typedi';
import { Get, RestController } from '@/decorators';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { MultiMainSetup } from '@/services/orchestration/main/MultiMainSetup.ee';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { In } from 'typeorm';

@RestController('/debug')
@Service()
export class DebugController {
	constructor(
		private readonly multiMainSetup: MultiMainSetup,
		private readonly activeWorkflowRunner: ActiveWorkflowRunner,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	@Get('/multi-main-setup')
	async getMultiMainSetupDetails() {
		const leaderKey = await this.multiMainSetup.fetchLeaderKey();

		const activeWorkflows = await this.workflowRepository.find({
			select: ['id', 'name'],
			where: { id: In(this.activeWorkflowRunner.allActiveInMemory()) },
		});

		const activationErrors = await this.activeWorkflowRunner.getAllWorkflowActivationErrors();

		return {
			instanceId: this.multiMainSetup.instanceId,
			leaderKey,
			activeWorkflows,
			activationErrors,
		};
	}
}
