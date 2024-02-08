import { Service } from 'typedi';
import { In, type FindOptionsWhere } from '@n8n/typeorm';

import type { SharedWorkflow, WorkflowSharingRole } from '@db/entities/SharedWorkflow';
import type { User } from '@db/entities/User';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';

@Service()
export class WorkflowSharingService {
	constructor(private readonly sharedWorkflowRepository: SharedWorkflowRepository) {}

	/**
	 * Get the IDs of the workflows that have been shared with the user.
	 * Returns all IDs if user has the 'workflow:read' scope.
	 */
	async getSharedWorkflowIds(user: User, roles?: WorkflowSharingRole[]): Promise<string[]> {
		const where: FindOptionsWhere<SharedWorkflow> = {};
		if (!user.hasGlobalScope('workflow:read')) {
			where.userId = user.id;
		}
		if (roles?.length) {
			where.role = In(roles);
		}
		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where,
			select: ['workflowId'],
		});
		return sharedWorkflows.map(({ workflowId }) => workflowId);
	}
}
