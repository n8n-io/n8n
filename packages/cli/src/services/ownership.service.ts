import { Service } from '@n8n/di';

import type { Project } from '@/databases/entities/project';
import type { User } from '@/databases/entities/user';
import { ProjectRelationRepository } from '@/databases/repositories/project-relation.repository';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import type { ListQuery } from '@/requests';
import { CacheService } from '@/services/cache/cache.service';

@Service()
export class OwnershipService {
	constructor(
		private cacheService: CacheService,
		private userRepository: UserRepository,
		private projectRepository: ProjectRepository,
		private projectRelationRepository: ProjectRelationRepository,
		private sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	/**
	 * Retrieve the project that owns the workflow. Note that workflow ownership is **immutable**.
	 */
	async getWorkflowProjectCached(workflowId: string): Promise<Project> {
		const cachedValue = await this.cacheService.getHashValue<Project>(
			'workflow-project',
			workflowId,
		);

		if (cachedValue) return this.projectRepository.create(cachedValue);

		const sharedWorkflow = await this.sharedWorkflowRepository.findOneOrFail({
			where: { workflowId, role: 'workflow:owner' },
			relations: ['project'],
		});

		void this.cacheService.setHash('workflow-project', { [workflowId]: sharedWorkflow.project });

		return sharedWorkflow.project;
	}

	/**
	 * Retrieve the user who owns the personal project, or `null` if non-personal project.
	 * Personal project ownership is **immutable**.
	 */
	async getPersonalProjectOwnerCached(projectId: string): Promise<User | null> {
		const cachedValue = await this.cacheService.getHashValue<User>('project-owner', projectId);

		if (cachedValue) return this.userRepository.create(cachedValue);

		const ownerRel = await this.projectRelationRepository.getPersonalProjectOwners([projectId]);
		const owner = ownerRel[0]?.user ?? null;
		void this.cacheService.setHash('project-owner', { [projectId]: owner });

		return owner;
	}

	addOwnedByAndSharedWith(
		rawWorkflow: ListQuery.Workflow.WithSharing,
	): ListQuery.Workflow.WithOwnedByAndSharedWith;
	addOwnedByAndSharedWith(
		rawCredential: ListQuery.Credentials.WithSharing,
	): ListQuery.Credentials.WithOwnedByAndSharedWith;
	addOwnedByAndSharedWith(
		rawEntity: ListQuery.Workflow.WithSharing | ListQuery.Credentials.WithSharing,
	): ListQuery.Workflow.WithOwnedByAndSharedWith | ListQuery.Credentials.WithOwnedByAndSharedWith {
		const shared = rawEntity.shared;
		const entity = rawEntity as
			| ListQuery.Workflow.WithOwnedByAndSharedWith
			| ListQuery.Credentials.WithOwnedByAndSharedWith;

		Object.assign(entity, {
			homeProject: null,
			sharedWithProjects: [],
		});

		if (shared === undefined) {
			return entity;
		}

		for (const sharedEntity of shared) {
			const { project, role } = sharedEntity;

			if (role === 'credential:owner' || role === 'workflow:owner') {
				entity.homeProject = {
					id: project.id,
					type: project.type,
					name: project.name,
					icon: project.icon,
				};
			} else {
				entity.sharedWithProjects.push({
					id: project.id,
					type: project.type,
					name: project.name,
					icon: project.icon,
				});
			}
		}

		return entity;
	}

	async getInstanceOwner() {
		return await this.userRepository.findOneOrFail({
			where: { role: 'global:owner' },
		});
	}
}
