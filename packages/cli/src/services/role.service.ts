import { RoleRepository, SharedWorkflowRepository } from '@/databases/repositories';
import { Service } from 'typedi';
import { CacheService } from './cache.service';
import type { Role, RoleNames, RoleScopes } from '@/databases/entities/Role';

@Service()
export class RoleService {
	constructor(
		private roleRepository: RoleRepository,
		private sharedWorkflowRepository: SharedWorkflowRepository,
		private cacheService: CacheService,
	) {}

	// @TODO: Prepopulate cache

	private async findRole(
		scope: RoleScopes,
		name: RoleNames,
		options: { orFail: true },
	): Promise<Role>;
	private async findRole(
		scope: RoleScopes,
		name: RoleNames,
		options: { orFail: false },
	): Promise<Role | null>;
	private async findRole(scope: RoleScopes, name: RoleNames, options: { orFail: boolean }) {
		const cacheKey = `cache:role:${scope}:${name}`;

		const cachedRole = await this.cacheService.get<Role>(cacheKey);

		if (cachedRole) return this.roleRepository.create(cachedRole);

		let dbRole: Role | null;

		if (options.orFail) {
			dbRole = await this.roleRepository.findRoleOrFail(scope, name);
		} else {
			dbRole = await this.roleRepository.findRole(scope, name);
		}

		if (dbRole !== null) {
			void this.cacheService.set(cacheKey, dbRole);
		}

		return dbRole;
	}

	async findRoleOrFail(scope: RoleScopes, name: RoleNames): Promise<Role> {
		return this.roleRepository.findOneOrFail({ where: { scope, name } });
	}

	async findGlobalOwnerRole() {
		return this.findRole('global', 'owner', { orFail: false });
	}

	async findGlobalOwnerRoleOrFail() {
		const whoa = await this.findRole('global', 'owner', { orFail: true });

		return whoa;
	}

	async findGlobalMemberRole() {
		return this.findRole('global', 'member', { orFail: false });
	}

	async findGlobalMemberRoleOrFail() {
		return this.findRole('global', 'member', { orFail: true });
	}

	// workflow owner

	async findWorkflowOwnerRole() {
		return this.findRole('workflow', 'owner', { orFail: false });
	}

	async findWorkflowOwnerRoleOrFail() {
		return this.findRole('workflow', 'owner', { orFail: true });
	}

	// workflow editor

	async findWorkflowEditorRole() {
		return this.findRole('workflow', 'editor', { orFail: false });
	}

	async findWorkflowEditorRoleOrFail() {
		return this.findRole('workflow', 'editor', { orFail: true });
	}

	// credential owner

	async findCredentialOwnerRole() {
		return this.findRole('credential', 'owner', { orFail: false });
	}

	async findCredentialOwnerRoleOrFail() {
		return this.findRole('credential', 'owner', { orFail: true });
	}

	// credential user

	async findCredentialUserRole(options = { orFail: false as const }) {
		return this.findRole('credential', 'user', options);
	}

	// utils

	async getUserRoleForWorkflow(userId: string, workflowId: string) {
		const shared = await this.sharedWorkflowRepository.findOne({
			where: { workflowId, userId },
			relations: ['role'],
		});

		return shared?.role;
	}
}
