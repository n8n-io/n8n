import { type WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

export interface WorkflowToolWorkflowReference {
	workflowId?: string;
	workflowName: string;
}

@Service()
export class WorkflowToolWorkflowLoader {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	async loadWorkflow(
		projectId: string,
		reference: WorkflowToolWorkflowReference,
	): Promise<WorkflowEntity | null> {
		const workflow = await this.workflowRepository.findOneByAgentToolReference(
			projectId,
			reference,
		);
		if (!workflow || workflow.isArchived) return null;

		return Object.assign(workflow, { pinData: undefined });
	}
}
