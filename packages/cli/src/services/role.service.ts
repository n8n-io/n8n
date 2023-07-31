import { RoleRepository } from '@/databases/repositories';
import { Service } from 'typedi';
import { CacheService } from './cache.service';
import type { Role, RoleNames, RoleScopes } from '@/databases/entities/Role';

@Service()
export class RoleService {
	constructor(
		private roleRepository: RoleRepository,
		private cacheService: CacheService,
	) {}

	private async findRole(scope: RoleScopes, name: RoleNames, { orFail } = { orFail: false }) {
		const cacheKey = `cache:role:${scope}:${name}`;

		const cachedRole = await this.cacheService.get<Role>(cacheKey, (value: Role) =>
			this.roleRepository.create(value),
		);

		if (cachedRole) return cachedRole;

		let dbRole: Role | null;

		if (orFail) {
			dbRole = await this.roleRepository.findRoleOrFail(scope, name);
		} else {
			dbRole = await this.roleRepository.findRole(scope, name);
		}

		if (dbRole !== null) {
			void this.cacheService.set(cacheKey, dbRole);
		}

		return dbRole;
	}

	async findGlobalOwnerRole(options = { orFail: false }) {
		return this.findRole('global', 'owner', options);
	}

	async findGlobalMemberRole(options = { orFail: false }) {
		return this.findRole('global', 'member', options);
	}

	async findWorkflowOwnerRole(options = { orFail: false }) {
		return this.findRole('workflow', 'owner', options);
	}

	async findWorkflowEditorRole(options = { orFail: false }) {
		return this.findRole('workflow', 'editor', options);
	}

	async findCredentialOwnerRole(options = { orFail: false }) {
		return this.findRole('credential', 'owner', options);
	}

	async findCredentialUserRole(options = { orFail: false }) {
		return this.findRole('credential', 'user', options);
	}
}
