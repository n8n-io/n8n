import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IWorkflowBase, IWorkflowLoader } from 'n8n-workflow';
import { UserError } from '@n8n/errors';

@Service()
export class WorkflowLoaderService implements IWorkflowLoader {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	async get(workflowId: string): Promise<IWorkflowBase> {
		const workflow = await this.workflowRepository.findById(workflowId);

		if (!workflow) {
			throw new UserError(`Failed to find workflow with ID "${workflowId}"`);
		}

		return workflow;
	}
}
