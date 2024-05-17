import { Service } from 'typedi';
import { In } from '@n8n/typeorm';

import type { User } from '@db/entities/User';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { RoleService } from '@/services/role.service';
import type { Scope } from '@n8n/permissions';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';
import type { WorkflowSharingRole } from '@/databases/entities/SharedWorkflow';

@Service()
export class WorkflowSharingService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly roleService: RoleService,
	) {}

	/**
	 * Get the IDs of the workflows that have been shared with the user based on
	 * scope or roles.
	 * If `scopes` is passed the roles are inferred. Alternatively `projectRoles`
	 * and `workflowRoles` can be passed specifically.
	 *
	 * Returns all IDs if user has the 'workflow:read' global scope.
	 */
	async getSharedWorkflowIds(
		user: User,
		options:
			| { scopes: Scope[] }
			| { projectRoles: ProjectRole[]; workflowRoles: WorkflowSharingRole[] },
	): Promise<string[]> {
		if (user.hasGlobalScope('workflow:read')) {
			const sharedWorkflows = await this.sharedWorkflowRepository.find({ select: ['workflowId'] });
			return sharedWorkflows.map(({ workflowId }) => workflowId);
		}

		const projectRoles =
			'scopes' in options
				? this.roleService.rolesWithScope('project', options.scopes)
				: options.projectRoles;
		const workflowRoles =
			'scopes' in options
				? this.roleService.rolesWithScope('workflow', options.scopes)
				: options.workflowRoles;

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
