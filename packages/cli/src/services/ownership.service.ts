import Container, { Service } from 'typedi';
import * as Db from '@/Db';
import { CacheService } from './cache.service';
import { RoleRepository } from '@/databases/repositories';
import type { User } from '@/databases/entities/User';

@Service()
export class OwnershipService {
	private cacheService = Container.get(CacheService);

	private roleRepository = Container.get(RoleRepository);

	/**
	 * Retrieve the user who owns the workflow. Note that workflow ownership **cannot** be changed.
	 *
	 * @caching
	 */
	async getWorkflowOwner(workflowId: string) {
		const cachedOwner = await this.cacheService.get<User>(`workflow-owner:${workflowId}`);

		if (cachedOwner) return cachedOwner;

		const workflowOwnerRole = await this.roleRepository.findWorkflowOwnerRole();

		if (!workflowOwnerRole) throw new Error('Failed to find workflow owner role');

		const sharedWorkflow = await Db.collections.SharedWorkflow.findOneOrFail({
			where: { workflowId, roleId: workflowOwnerRole.id },
			relations: ['user', 'user.globalRole'],
		});

		void this.cacheService.set(`workflow-owner:${workflowId}`, sharedWorkflow.user);

		return sharedWorkflow.user;
	}
}
