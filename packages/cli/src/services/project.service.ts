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
	 * Find the distinct roles of a user in all the projects where a workflow is accessible.
	 */
	async findRolesInProjects(userId: string, workflowId: string) {
		const projectIds = await this.sharedWorkflowRepository.findProjectIds(workflowId);

		if (projectIds.length === 0) return new Set<ProjectRole>();

		const roles = await this.projectRelationRepository.findRoles(userId, projectIds);

		return new Set(roles);
	}
}
