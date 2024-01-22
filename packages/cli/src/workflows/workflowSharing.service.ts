import { Service } from 'typedi';
import { In, type FindOptionsWhere } from 'typeorm';

import type { RoleNames } from '@db/entities/Role';
import type { SharedWorkflow } from '@db/entities/SharedWorkflow';
import type { User } from '@db/entities/User';
import { RoleRepository } from '@db/repositories/role.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';

@Service()
export class WorkflowSharingService {
	constructor(
		private readonly roleRepository: RoleRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	/**
	 * Get the IDs of the workflows that have been shared with the user.
	 * Returns all IDs if user has the 'workflow:read' scope.
	 */
	async getSharedWorkflowIds(user: User, roleNames?: RoleNames[]): Promise<string[]> {
		const where: FindOptionsWhere<SharedWorkflow> = {};
		if (!user.hasGlobalScope('workflow:read')) {
			where.userId = user.id;
		}
		if (roleNames?.length) {
			const roleIds = await this.roleRepository.getIdsInScopeWorkflowByNames(roleNames);
			where.roleId = In(roleIds);
		}
		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where,
			select: ['workflowId'],
		});
		return sharedWorkflows.map(({ workflowId }) => workflowId);
	}
}
