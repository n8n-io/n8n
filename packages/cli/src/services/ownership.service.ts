import { Service } from 'typedi';
import { CacheService } from './cache.service';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import type { User } from '@db/entities/User';
import { RoleService } from './role.service';
import { UserService } from './user.service';
import type { Credentials, ListQuery } from '@/requests';
import type { Role } from '@db/entities/Role';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
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

	addOwnedByAndSharedWith(_credential: CredentialsEntity): Credentials.WithOwnedByAndSharedWith {
		const { shared, ...rest } = _credential;

		const credential = rest as Credentials.WithOwnedByAndSharedWith;

		credential.ownedBy = null;
		credential.sharedWith = [];

		shared?.forEach(({ user, role }) => {
			const { id, email, firstName, lastName } = user;

			if (role.name === 'owner') {
				credential.ownedBy = { id, email, firstName, lastName };
			} else {
				credential.sharedWith.push({ id, email, firstName, lastName });
			}
		});

		return credential;
	}
}
