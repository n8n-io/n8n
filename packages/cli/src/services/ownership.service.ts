import { Service } from 'typedi';
import { CacheService } from '@/services/cache/cache.service';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import type { User } from '@db/entities/User';
import { UserRepository } from '@db/repositories/user.repository';
import type { ListQuery } from '@/requests';

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
			where: { workflowId, role: 'workflow:owner' },
			relations: ['user'],
		});

		void this.cacheService.setHash('workflow-ownership', { [workflowId]: sharedWorkflow.user });

		return sharedWorkflow.user;
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

		Object.assign(entity, { ownedBy: null, sharedWith: [] });

		if (shared === undefined) {
			return entity;
		}

		for (const sharedEntity of shared) {
			for (const projectRelation of sharedEntity.project.projectRelations) {
				const role = projectRelation.role;

				const { id, email, firstName, lastName } = projectRelation.user;

				if (
					role === 'project:personalOwner' &&
					(sharedEntity.role === 'credential:owner' || sharedEntity.role === 'workflow:owner')
				) {
					// FIXME: redefine what ownedBy means for team projects
					entity.ownedBy = { id, email, firstName, lastName };
				} else {
					entity.sharedWith.push({ id, email, firstName, lastName });
				}
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
