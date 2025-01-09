import type { ProjectRole } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';

import type { WorkflowSharingRole } from '@/databases/entities/shared-workflow';
import type { User } from '@/databases/entities/user';
import { ProjectRelationRepository } from '@/databases/repositories/project-relation.repository';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { RoleService } from '@/services/role.service';

@Service()
export class WorkflowSharingService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly roleService: RoleService,
		private readonly projectRelationRepository: ProjectRelationRepository,
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
			| { scopes: Scope[]; projectId?: string }
			| { projectRoles: ProjectRole[]; workflowRoles: WorkflowSharingRole[]; projectId?: string },
	): Promise<string[]> {
		const { projectId } = options;

		if (user.hasGlobalScope('workflow:read')) {
			const sharedWorkflows = await this.sharedWorkflowRepository.find({
				select: ['workflowId'],
				...(projectId && { where: { projectId } }),
			});
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

	async getSharedWorkflowScopes(
		workflowIds: string[],
		user: User,
	): Promise<Array<[string, Scope[]]>> {
		const projectRelations = await this.projectRelationRepository.findAllByUser(user.id);
		const sharedWorkflows =
			await this.sharedWorkflowRepository.getRelationsByWorkflowIdsAndProjectIds(
				workflowIds,
				projectRelations.map((p) => p.projectId),
			);

		return workflowIds.map((workflowId) => {
			return [
				workflowId,
				this.roleService.combineResourceScopes(
					'workflow',
					user,
					sharedWorkflows.filter((s) => s.workflowId === workflowId),
					projectRelations,
				),
			];
		});
	}
}
