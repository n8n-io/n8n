import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IWorkflowBase, IWorkflowLoader } from 'n8n-workflow';
import { UserError } from '@n8n/errors';

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
					{ includeActiveVersion: true, publishHistory: 'none' },
				);

				if (!workflow) {
					throw new UserError(`Failed to find workflow with ID "${workflowId}"`);
				}

				return workflow;
			},
		};
	}
}
