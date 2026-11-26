import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError, type IWorkflowBase, type IWorkflowLoader } from 'n8n-workflow';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

@Service()
export class WorkflowLoaderService {
	constructor(private readonly workflowFinderService: WorkflowFinderService) {}

	/**
	 * Returns a loader that only resolves workflows the user can read.
	 * A workflow the user cannot read gives the same error as a missing one.
	 */
	forUser(user: User): IWorkflowLoader {
		return {
			get: async (workflowId: string): Promise<IWorkflowBase> => {
				const workflow = await this.workflowFinderService.findWorkflowForUser(
					workflowId,
					user,
					['workflow:read'],
					{ includeActiveVersion: true },
				);

				if (!workflow) {
					throw new UserError(`Failed to find workflow with ID "${workflowId}"`);
				}

				return workflow;
			},
		};
	}
}
