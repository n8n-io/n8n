import { ProjectRepository, WorkflowRepository } from '@n8n/db';
import {
	type AuthenticatedRequest,
	type CredentialsEntity,
	type Folder,
	type Project,
	type WorkflowEntity,
	type WorkflowTagMapping,
} from '@n8n/db';
import type { DataTable } from '@/modules/data-table/data-table.entity';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, type FindOptionsWhere } from '@n8n/typeorm';

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
		return context.getOrFetchAuthorizedProjects(async () => {
			if (context.hasAccessToAllProjects()) {
				// Load projects with only the minimal relations needed:
				// - For team projects: just id/name/type (no relations needed)
				// - For personal projects: need the owner's email via projectRelations
				// Instead of loading ALL projectRelations (every member of every project),
				// load projects first, then selectively load only personalOwner relations.
				const projects = await this.projectRepository.find();

				const personalProjects = projects.filter((p) => p.type === 'personal');
				if (personalProjects.length > 0) {
					const personalProjectIds = personalProjects.map((p) => p.id);
					const ownerRelations = await this.projectRepository
						.createQueryBuilder('project')
						.leftJoinAndSelect('project.projectRelations', 'pr', 'pr.role = :ownerRole', {
							ownerRole: 'project:personalOwner',
						})
						.leftJoinAndSelect('pr.role', 'role')
						.leftJoinAndSelect('pr.user', 'user')
						.where('project.id IN (:...ids)', { ids: personalProjectIds })
						.select(['project.id', 'pr.userId', 'pr.projectId', 'role.slug', 'user.email'])
						.getMany();

					const relationsById = new Map(ownerRelations.map((p) => [p.id, p.projectRelations]));
					for (const project of personalProjects) {
						project.projectRelations = relationsById.get(project.id) ?? [];
					}
				}

				// Team projects don't need projectRelations for source control
				for (const project of projects) {
					if (project.type === 'team') {
						project.projectRelations = [];
					}
				}

				return projects;
			}

			// Non-admin: find team project IDs where user has sourceControl:push scope
			// using a single efficient subquery, then load only those projects.
			const projectEntities = await this.projectRepository
				.createQueryBuilder('project')
				.innerJoin('project.projectRelations', 'pr', 'pr.userId = :userId', {
					userId: context.user.id,
				})
				.innerJoin('pr.role', 'role')
				.innerJoin('role.scopes', 'scope', 'scope.slug = :scope', {
					scope: 'sourceControl:push',
				})
				.where('project.type = :type', { type: 'team' })
				.select(['project.id'])
				.getMany();

			if (projectEntities.length === 0) return [];

			const ids = projectEntities.map((p) => p.id);
			const projects = await this.projectRepository.find({
				select: { id: true, name: true, type: true },
				where: { id: In(ids) },
			});

			for (const project of projects) {
				project.projectRelations = [];
			}

			return projects;
		});
	}

	async getWorkflowsInAdminProjectsFromContext(
		context: SourceControlContext,
		id?: string,
	): Promise<WorkflowEntity[] | undefined> {
		if (context.hasAccessToAllProjects()) {
			return;
		}

		// For single-id lookups, skip cache and query directly
		if (id) {
			const where = this.getWorkflowsInAdminProjectsFromContextFilter(context);
			where.id = id;
			return await this.workflowRepository.find({ select: { id: true }, where });
		}

		const ids = await context.getOrFetchAccessibleWorkflowIds(async () => {
			const where = this.getWorkflowsInAdminProjectsFromContextFilter(context);
			const workflows = await this.workflowRepository.find({ select: { id: true }, where });
			return workflows.map((w) => w.id);
		});

		return ids.map((wfId) => ({ id: wfId }) as WorkflowEntity);
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

	getDataTablesInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<DataTable> {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return {};
		}

		// We build a filter to only select data tables that belong to a team project
		// that the user is an admin of
		return {
			project: this.getProjectsWithPushScopeByContextFilter(context),
		};
	}
}
