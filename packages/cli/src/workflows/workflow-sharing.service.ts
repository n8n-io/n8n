import type { User } from '@n8n/db';
import { ProjectRelationRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	hasGlobalScope,
	type ProjectRole,
	type Scope,
	PROJECT_OWNER_ROLE_SLUG,
} from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';

import { RoleService } from '@/services/role.service';

export type ShareWorkflowOptions =
	| { scopes: Scope[]; projectId?: string }
	| { projectRoles: ProjectRole[]; projectId?: string };

@Service()
export class WorkflowSharingService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly roleService: RoleService,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	/**
	 * Get the IDs of the workflows that the user has access to based on
	 * scope or roles.
	 * If `scopes` is passed the roles are inferred. Alternatively `projectRoles`
	 * can be passed specifically.
	 *
	 * Returns all IDs if user has the 'workflow:read' global scope.
	 */

	async getSharedWorkflowIds(user: User, options: ShareWorkflowOptions): Promise<string[]> {
		const { projectId } = options;

		if (hasGlobalScope(user, 'workflow:read')) {
			const workflows = await this.workflowRepository.find({
				select: ['id'],
				...(projectId && { where: { projectId } }),
			});
			return workflows.map((workflow) => workflow.id);
		}

		const projectRoles =
			'scopes' in options
				? await this.roleService.rolesWithScope('project', options.scopes)
				: options.projectRoles;

		const workflows = await this.workflowRepository.find({
			where: {
				...(projectId && { projectId }),
				project: {
					projectRelations: {
						userId: user.id,
						role: In(projectRoles),
					},
				},
			},
			select: ['id'],
		});

		return workflows.map((workflow) => workflow.id);
	}

	/**
	 * Get workflows that are shared with the user (in team projects where the user is a member).
	 * In the new architecture, "shared with me" means workflows in team projects.
	 */
	async getSharedWithMeIds(user: User) {
		// Get all projects where user is a member
		const userProjects = await this.projectRelationRepository.find({
			where: {
				userId: user.id,
				role: { slug: PROJECT_OWNER_ROLE_SLUG },
			},
			relations: ['project'],
		});

		// Filter to team projects only (personal projects are "owned", not "shared")
		const teamProjectIds = userProjects
			.filter((pr) => pr.project.type === 'team')
			.map((pr) => pr.projectId);

		if (teamProjectIds.length === 0) {
			return [];
		}

		// Get all workflows in those team projects
		const workflows = await this.workflowRepository.find({
			select: ['id'],
			where: {
				projectId: In(teamProjectIds),
			},
		});

		return workflows.map((workflow) => workflow.id);
	}

	async getSharedWorkflowScopes(
		workflowIds: string[],
		user: User,
	): Promise<Array<[string, Scope[]]>> {
		const projectRelations = await this.projectRelationRepository.findAllByUser(user.id);

		// Get workflows with their project relations
		const workflows = await this.workflowRepository.find({
			where: {
				id: In(workflowIds),
				projectId: In(projectRelations.map((p) => p.projectId)),
			},
			relations: ['project'],
			select: ['id', 'projectId'],
		});

		// Map workflows to their scopes based on project relations
		return workflowIds.map((workflowId) => {
			const workflow = workflows.find((w) => w.id === workflowId);
			if (!workflow) {
				return [workflowId, []];
			}

			// Find the user's relation to this workflow's project
			const projectRelation = projectRelations.find((pr) => pr.projectId === workflow.projectId);
			if (!projectRelation) {
				return [workflowId, []];
			}

			// Create a mock shared workflow object for combineResourceScopes
			const mockSharedWorkflow = {
				workflowId: workflow.id,
				projectId: workflow.projectId,
				role: 'workflow:owner', // In new architecture, all workflows in a project have same access level
			};

			return [
				workflowId,
				this.roleService.combineResourceScopes(
					'workflow',
					user,
					[mockSharedWorkflow],
					projectRelations,
				),
			];
		});
	}

	/**
	 * Get all workflows owned by the user in their personal project.
	 * In the new architecture, this means all workflows in the user's personal project(s).
	 */
	async getOwnedWorkflowsInPersonalProject(user: User): Promise<string[]> {
		// Get user's personal projects
		const userProjectRelations = await this.projectRelationRepository.find({
			where: {
				userId: user.id,
				role: { slug: PROJECT_OWNER_ROLE_SLUG },
			},
			relations: ['project'],
		});

		const personalProjectIds = userProjectRelations
			.filter((pr) => pr.project.type === 'personal')
			.map((pr) => pr.projectId);

		if (personalProjectIds.length === 0) {
			return [];
		}

		// Get all workflows in personal projects
		const workflows = await this.workflowRepository.find({
			select: ['id'],
			where: {
				projectId: In(personalProjectIds),
			},
		});

		return workflows.map((workflow) => workflow.id);
	}
}
