import { Service } from 'typedi';
import { CacheService } from './cache.service';
import { SharedWorkflowRepository } from '@/databases/repositories';
import type { User } from '@/databases/entities/User';
import { RoleService } from './role.service';
import { UserService } from './user.service';
import type { ListQuery } from '@/requests';
import type { Role } from '@/databases/entities/Role';

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

		if (!workflowOwnerRole) throw new Error('Failed to find workflow owner role');

		const sharedWorkflow = await this.sharedWorkflowRepository.findOneOrFail({
			where: { workflowId, roleId: workflowOwnerRole.id },
			relations: ['user', 'user.globalRole'],
		});

		void this.cacheService.set(`cache:workflow-owner:${workflowId}`, sharedWorkflow.user);

		return sharedWorkflow.user;
	}

	addOwnedBy(
		workflow: ListQuery.Workflow.WithSharing,
		workflowOwnerRole: Role,
	): ListQuery.Workflow.WithOwnership {
		const { shared, ...rest } = workflow;

		const ownerId = shared?.find((s) => s.roleId.toString() === workflowOwnerRole.id)?.userId;

		return Object.assign(rest, {
			ownedBy: ownerId ? { id: ownerId } : null,
		});
	}
}
