import { Service } from '@n8n/di';
import { ApplicationError, type IWorkflowBase, type IWorkflowLoader } from 'n8n-workflow';

import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

@Service()
export class WorkflowLoaderService implements IWorkflowLoader {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	async get(workflowId: string): Promise<IWorkflowBase> {
		const workflow = await this.workflowRepository.findById(workflowId);

		if (!workflow) {
			throw new ApplicationError(`Failed to find workflow with ID "${workflowId}"`);
		}

		return workflow;
	}
}
