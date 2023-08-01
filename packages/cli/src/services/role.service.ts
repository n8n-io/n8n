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
	) {
		void this.primeCache();
	}

	async primeCache() {
		const allRoles = await this.roleRepository.find({});

		if (!allRoles) return;

		void this.cacheService.setMany<Role>(
			allRoles.map((role) => [`cache:role:${role.scope}:${role.name}`, role]),
		);
	}

	private async findCached(scope: RoleScopes, name: RoleNames) {
		const cacheKey = `cache:role:${scope}:${name}`;

		const cachedRole = await this.cacheService.get<Role>(cacheKey);

		if (cachedRole) return this.roleRepository.create(cachedRole);

		let dbRole = await this.roleRepository.findRole(scope, name);

		if (dbRole === null) {
			const toSave = this.roleRepository.create({ scope, name });
			dbRole = await this.roleRepository.save(toSave);
		}

		void this.cacheService.set(cacheKey, dbRole);

		return dbRole;
	}

	async findGlobalOwnerRole() {
		return this.findCached('global', 'owner');
	}

	async findGlobalMemberRole() {
		return this.findCached('global', 'member');
	}

	async findWorkflowOwnerRole() {
		return this.findCached('workflow', 'owner');
	}

	async findWorkflowEditorRole() {
		return this.findCached('workflow', 'editor');
	}

	async findCredentialOwnerRole() {
		return this.findCached('credential', 'owner');
	}

	async findCredentialUserRole() {
		return this.findCached('credential', 'user');
	}

	async findRoleByUserAndWorkflow(userId: string, workflowId: string) {
		return this.sharedWorkflowRepository
			.findOne({
				where: { workflowId, userId },
				relations: ['role'],
			})
			.then((shared) => shared?.role);
	}
}
