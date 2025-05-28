import {
	type CredentialsEntity,
	type Folder,
	type Project,
	ProjectRepository,
	type WorkflowEntity,
	WorkflowRepository,
	type WorkflowTagMapping,
} from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { FindOptionsWhere } from '@n8n/typeorm';

import type { SourceControlContext } from './types/source-control-context';

@Service()
export class SourceControlScopedService {
	constructor(
		private readonly projectRepository: ProjectRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async getAdminProjectsFromContext(context: SourceControlContext): Promise<Project[] | undefined> {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return;
		}

		return await this.projectRepository.find({
			relations: {
				projectRelations: true,
			},
			select: {
				id: true,
				name: true,
			},
			where: this.getAdminProjectsByContextFilter(context),
		});
	}

	async getWorkflowsInAdminProjectsFromContext(
		context: SourceControlContext,
	): Promise<WorkflowEntity[] | undefined> {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return;
		}

		return await this.workflowRepository.find({
			select: {
				id: true,
			},
			where: this.getWorkflowsInAdminProjectsFromContextFilter(context),
		});
	}

	getAdminProjectsByContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<Project> | undefined {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return;
		}

		return {
			type: 'team',
			projectRelations: {
				role: 'project:admin',
				userId: context.user.id,
			},
		};
	}

	getFoldersInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<Folder> | undefined {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return;
		}

		// We build a filter to only select folder, that belong to a team project
		// that the user is an admin off
		return {
			homeProject: this.getAdminProjectsByContextFilter(context),
		};
	}

	getWorkflowsInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<WorkflowEntity> | undefined {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return;
		}

		// We build a filter to only select workflows, that belong to a team project
		// that the user is an admin off
		return {
			shared: {
				role: 'workflow:owner',
				project: this.getAdminProjectsByContextFilter(context),
			},
		};
	}

	getCredentialsInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<CredentialsEntity> | undefined {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return;
		}

		// We build a filter to only select workflows, that belong to a team project
		// that the user is an admin off
		return {
			shared: {
				role: 'credential:owner',
				project: this.getAdminProjectsByContextFilter(context),
			},
		};
	}

	getWorkflowTagMappingInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<WorkflowTagMapping> | undefined {
		if (context.hasAccessToAllProjects()) {
			// In case the user is a global admin or owner, we don't need a filter
			return;
		}

		// We build a filter to only select workflows, that belong to a team project
		// that the user is an admin off
		return {
			workflows: this.getWorkflowsInAdminProjectsFromContextFilter(context),
		};
	}
}
