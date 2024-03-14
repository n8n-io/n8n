import { Service } from 'typedi';
import { CacheService } from '@/services/cache/cache.service';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import type { User } from '@db/entities/User';
import { UserRepository } from '@db/repositories/user.repository';
import type { ListQuery } from '@/requests';
import { ApplicationError } from 'n8n-workflow';

@Service()
export class OwnershipService {
	constructor(
		private cacheService: CacheService,
		private userRepository: UserRepository,
		private sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	/**
	 * Retrieve the user who owns the workflow. Note that workflow ownership is **immutable**.
	 */
	async getWorkflowOwnerCached(workflowId: string) {
		const cachedValue = await this.cacheService.getHashValue<User>(
			'workflow-ownership',
			workflowId,
		);

		if (cachedValue) return this.userRepository.create(cachedValue);

		const sharedWorkflow = await this.sharedWorkflowRepository.findOneOrFail({
			where: {
				workflowId,
				role: 'workflow:owner',
				project: { projectRelations: { role: 'project:personalOwner' } },
			},
			relations: {
				workflow: true,
				project: { projectRelations: { user: true } },
			},
		});

		const ownerRelation = sharedWorkflow.project.projectRelations.find(
			(pr) => pr.role === 'project:personalOwner',
		);

		if (!ownerRelation) {
			throw new ApplicationError(`Workflow ${sharedWorkflow.workflow.display()} has no owner`);
		}

		void this.cacheService.setHash('workflow-ownership', { [workflowId]: ownerRelation.user });

		return ownerRelation.user;
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
		const { shared, ...rest } = rawEntity;

		const entity = rest as
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
					// TODO: confirm name with product
					name: project.name ?? 'My n8n',
				};
			} else {
				entity.sharedWithProjects.push({
					id: project.id,
					type: project.type,
					// TODO: confirm name with product
					name: project.name ?? 'My n8n',
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
