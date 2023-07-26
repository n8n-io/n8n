import { Service } from 'typedi';
import { CacheService } from './cache.service';
import { RoleRepository, SharedWorkflowRepository, UserRepository } from '@/databases/repositories';
import type { User } from '@/databases/entities/User';

@Service()
export class OwnershipService {
	constructor(
		private cacheService: CacheService,
		private userRepository: UserRepository,
		private roleRepository: RoleRepository,
		private sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	/**
	 * Retrieve the user who owns the workflow. Note that workflow ownership is **immutable**.
	 */
	async getWorkflowOwnerCached(workflowId: string) {
		const cachedValue = await this.cacheService.get<User>(`cache:workflow-owner:${workflowId}`);

		if (cachedValue) return this.userRepository.create(cachedValue);

		const workflowOwnerRole = await this.roleRepository.findWorkflowOwnerRole();

		if (!workflowOwnerRole) throw new Error('Failed to find workflow owner role');

		const sharedWorkflow = await this.sharedWorkflowRepository.findOneOrFail({
			where: { workflowId, roleId: workflowOwnerRole.id },
			relations: ['user', 'user.globalRole'],
		});

		void this.cacheService.set(`cache:workflow-owner:${workflowId}`, sharedWorkflow.user);

		return sharedWorkflow.user;
	}
}
