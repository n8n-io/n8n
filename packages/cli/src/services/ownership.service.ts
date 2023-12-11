import { Service } from 'typedi';
import { CacheService } from './cache.service';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import type { User } from '@db/entities/User';
import { RoleService } from './role.service';
import { UserService } from './user.service';
import type { ListQuery } from '@/requests';
import { ApplicationError } from 'n8n-workflow';

@Service()
export class OwnershipService {
	constructor(
		private cacheService: CacheService,
		private userService: UserService,
		private roleService: RoleService,
		private sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	/**
	 * Retrieve the user who owns the workflow. Note that workflow ownership is **immutable**.
	 */
	async getWorkflowOwnerCached(workflowId: string) {
		const cachedValue = (await this.cacheService.get(`cache:workflow-owner:${workflowId}`)) as User;

		if (cachedValue) return this.userService.create(cachedValue);

		const workflowOwnerRole = await this.roleService.findWorkflowOwnerRole();

		if (!workflowOwnerRole) throw new ApplicationError('Failed to find workflow owner role');

		const sharedWorkflow = await this.sharedWorkflowRepository.findOneOrFail({
			where: { workflowId, roleId: workflowOwnerRole.id },
			relations: ['user', 'user.globalRole'],
		});

		void this.cacheService.set(`cache:workflow-owner:${workflowId}`, sharedWorkflow.user);

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

		shared?.forEach(({ user, role }) => {
			const { id, email, firstName, lastName } = user;

			if (role.name === 'owner') {
				entity.ownedBy = { id, email, firstName, lastName };
			} else {
				entity.sharedWith.push({ id, email, firstName, lastName });
			}
		});

		return entity;
	}
}
