import { Service } from 'typedi';
import { In } from '@n8n/typeorm';

import type { User } from '@db/entities/User';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { RoleService } from '@/services/role.service';
import type { Scope } from '@n8n/permissions';

@Service()
export class WorkflowSharingService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly roleService: RoleService,
	) {}

	/**
	 * Get the IDs of the workflows that have been shared with the user.
	 * Returns all IDs if user has the 'workflow:read' scope.
	 */
	async getSharedWorkflowIds(user: User, scope: Scope): Promise<string[]> {
		if (user.hasGlobalScope('workflow:read')) {
			const sharedWorkflows = await this.sharedWorkflowRepository.find({});
			return sharedWorkflows.map(({ workflowId }) => workflowId);
		}

		const projectRoles = this.roleService.rolesWithScope('project', [scope]);
		const workflowRoles = this.roleService.rolesWithScope('workflow', [scope]);

		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where: {
				role: In(workflowRoles),
				project: {
					projectRelations: {
						userId: user.id,
						role: In(projectRoles),
					},
				},
			},
			select: ['workflowId'],
		});

		return sharedWorkflows.map(({ workflowId }) => workflowId);
	}
}
