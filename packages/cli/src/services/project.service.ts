import { Service } from 'typedi';
import { SharedWorkflowRepository } from '@/databases/repositories/sharedWorkflow.repository';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';

@Service()
export class ProjectService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	/**
	 * Find all the projects where a workflow is accessible,
	 * along with the roles of a user in those projects.
	 */
	async findRolesAndProjects(userId: string, resourceId: string) {
		const projectIds = await this.sharedWorkflowRepository.findProjectIds(resourceId);

		if (projectIds.length === 0) return { roles: new Set<ProjectRole>(), projectIds: [] };

		const roles = await this.projectRelationRepository.findRoles(userId, projectIds);

		return { roles, projectIds };
	}
}
