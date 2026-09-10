import { Logger, LicenseState } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { ProjectRelationRepository, SharedWorkflowRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	hasGlobalScope,
	type ProjectRole,
	type WorkflowSharingRole,
	type Scope,
	PROJECT_OWNER_ROLE_SLUG,
} from '@n8n/permissions';
import { In } from '@n8n/typeorm';

import { RoleService } from '@/services/role.service';

export type ShareWorkflowOptions =
	| { scopes: Scope[]; projectId?: string }
	| { projectRoles: ProjectRole[]; workflowRoles: WorkflowSharingRole[]; projectId?: string };

@Service()
export class WorkflowSharingService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly roleService: RoleService,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly licenseState: LicenseState,
		private readonly userRepository: UserRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * Get the IDs of the workflows that have been shared with the user based on
	 * scope or roles.
	 * If `scopes` is passed the roles are inferred. Alternatively `projectRoles`
	 * and `workflowRoles` can be passed specifically.
	 *
	 * Returns all IDs if user has the 'workflow:read' global scope.
	 */
	async getSharedWorkflowIds(user: User, options: ShareWorkflowOptions): Promise<string[]> {
		const { projectId } = options;

		if (hasGlobalScope(user, 'workflow:read')) {
			const sharedWorkflows = await this.sharedWorkflowRepository.find({
				select: ['workflowId'],
				...(projectId && { where: { projectId } }),
			});
			return sharedWorkflows.map(({ workflowId }) => workflowId);
		}

		const projectRoles =
			'scopes' in options
				? await this.roleService.rolesWithScope('project', options.scopes)
				: options.projectRoles;
		const workflowRoles =
			'scopes' in options
				? await this.roleService.rolesWithScope('workflow', options.scopes)
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

	/**
	 * IDs of users who can read the workflow: those holding a global role that
	 * grants `workflow:read`, plus those holding a project role granting it in
	 * a project the workflow is shared into with a sharing role granting it.
	 */
	async getUserIdsWithAccessToWorkflow(workflowId: string): Promise<string[]> {
		const [workflowRoles, globalRoles, projectRoles] = await Promise.all([
			this.roleService.rolesWithScope('workflow', ['workflow:read']),
			this.roleService.rolesWithScope('global', ['workflow:read']),
			this.roleService.rolesWithScope('project', ['workflow:read']),
		]);

		const projectIds = await this.sharedWorkflowRepository.findProjectIdsByRole(
			workflowId,
			workflowRoles,
		);

		return await this.userRepository.findIdsWithGlobalOrProjectRoles({
			projectIds,
			projectRoleSlugs: projectRoles,
			globalRoleSlugs: globalRoles,
		});
	}

	/**
	 * Same as {@link getUserIdsWithAccessToWorkflow}, but never throws — logs
	 * and resolves to no users on failure. Use where losing a push is
	 * acceptable but failing the caller's own operation is not.
	 */
	async getUserIdsWithAccessToWorkflowSafe(workflowId: string): Promise<string[]> {
		try {
			return await this.getUserIdsWithAccessToWorkflow(workflowId);
		} catch (error) {
			this.logger.error(`Failed to resolve who can access workflow "${workflowId}"`, {
				workflowId,
				error: error instanceof Error ? error : new Error(String(error)),
			});
			return [];
		}
	}

	/**
	 * Scope-based access list that respects whether sharing is licensed.
	 * Without sharing, only owner-role workflows in projects the user owns.
	 */
	async getSharedWorkflowIdsForScopes(
		user: User,
		scopes: Scope[],
		projectId?: string,
	): Promise<string[]> {
		if (this.licenseState.isSharingLicensed()) {
			return await this.getSharedWorkflowIds(user, { scopes, projectId });
		}

		return await this.getSharedWorkflowIds(user, {
			workflowRoles: ['workflow:owner'],
			projectRoles: [PROJECT_OWNER_ROLE_SLUG],
			projectId,
		});
	}

	async getSharedWithMeIds(user: User) {
		const sharedWithMeWorkflows = await this.sharedWorkflowRepository.find({
			select: ['workflowId'],
			where: {
				role: 'workflow:editor',
				project: {
					projectRelations: {
						userId: user.id,
						role: { slug: PROJECT_OWNER_ROLE_SLUG },
					},
				},
			},
		});

		return sharedWithMeWorkflows.map(({ workflowId }) => workflowId);
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

	async getOwnedWorkflowsInPersonalProject(userId: string): Promise<string[]> {
		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			select: ['workflowId'],
			where: {
				role: 'workflow:owner',
				project: {
					projectRelations: {
						userId,
						role: { slug: PROJECT_OWNER_ROLE_SLUG },
					},
				},
			},
		});
		return sharedWorkflows.map(({ workflowId }) => workflowId);
	}

	/**
	 * Resolve the roles granting `scope`. Returns `undefined` when the user's
	 * global role already grants the scope, meaning no filtering is needed.
	 */
	async rolesGrantingScope(
		user: User,
		scope: Scope,
	): Promise<{ projectRoles: string[]; workflowRoles: string[] } | undefined> {
		if (hasGlobalScope(user, scope)) {
			return undefined;
		}

		const [projectRoles, workflowRoles] = await Promise.all([
			this.roleService.rolesWithScope('project', [scope]),
			this.roleService.rolesWithScope('workflow', [scope]),
		]);

		return {
			projectRoles,
			workflowRoles,
		};
	}
}
