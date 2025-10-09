import { ProjectRepository, WorkflowRepository } from '@n8n/db';
import {
	type AuthenticatedRequest,
	type CredentialsEntity,
	type Folder,
	type Project,
	type WorkflowEntity,
	type WorkflowTagMapping,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { FindOptionsWhere } from '@n8n/typeorm';

import { SourceControlContext } from './types/source-control-context';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

@Service()
export class SourceControlScopedService {
	constructor(
		private readonly projectRepository: ProjectRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async ensureIsAllowedToPush(req: AuthenticatedRequest) {
		if (hasGlobalScope(req.user, 'sourceControl:push')) {
			return;
		}

		const ctx = new SourceControlContext(req.user);
		const projectsWithAdminAccess = await this.getAuthorizedProjectsFromContext(ctx);

		if (projectsWithAdminAccess?.length === 0) {
			throw new ForbiddenError('You are not allowed to push changes');
		}
	}

	async getAuthorizedProjectsFromContext(context: SourceControlContext): Promise<Project[]> {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return await this.projectRepository.find({
				relations: {
					projectRelations: {
						user: true,
						role: true,
					},
				},
			});
		}

		return await this.projectRepository.find({
			relations: {
				projectRelations: {
					user: true,
					role: true,
				},
			},
			select: {
				id: true,
				name: true,
				type: true,
			},
			where: this.getProjectsWithPushScopeByContextFilter(context),
		});
	}

	async getWorkflowsInAdminProjectsFromContext(
		context: SourceControlContext,
		id?: string,
	): Promise<WorkflowEntity[] | undefined> {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return;
		}

		const where = this.getWorkflowsInAdminProjectsFromContextFilter(context);
		if (id) {
			where.id = id;
		}

		return await this.workflowRepository.find({
			select: {
				id: true,
			},
			where,
		});
	}

	getProjectsWithPushScopeByContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<Project> | undefined {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return;
		}

		return {
			type: 'team',
			projectRelations: {
				role: {
					scopes: {
						slug: 'sourceControl:push',
					},
				},
				userId: context.user.id,
			},
		};
	}

	getFoldersInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<Folder> {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return {};
		}

		// We build a filter to only select folder, that belong to a team project
		// that the user is an admin off
		return {
			homeProject: this.getProjectsWithPushScopeByContextFilter(context),
		};
	}

	getWorkflowsInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<WorkflowEntity> {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return {};
		}

		// We build a filter to only select workflows, that belong to a team project
		// that the user is an admin off
		return {
			shared: {
				role: 'workflow:owner',
				project: this.getProjectsWithPushScopeByContextFilter(context),
			},
		};
	}

	getCredentialsInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<CredentialsEntity> {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return {};
		}

		// We build a filter to only select workflows, that belong to a team project
		// that the user is an admin off
		return {
			shared: {
				role: 'credential:owner',
				project: this.getProjectsWithPushScopeByContextFilter(context),
			},
		};
	}

	getWorkflowTagMappingInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<WorkflowTagMapping> {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return {};
		}

		// We build a filter to only select workflows, that belong to a team project
		// that the user is an admin off
		return {
			workflows: this.getWorkflowsInAdminProjectsFromContextFilter(context),
		};
	}
}
