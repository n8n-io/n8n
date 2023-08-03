import { RoleRepository, SharedWorkflowRepository } from '@/databases/repositories';
import { Service } from 'typedi';
import { CacheService } from './cache.service';
import type { RoleNames, RoleScopes } from '@/databases/entities/Role';

class InvalidRoleError extends Error {}

@Service()
export class RoleService {
	constructor(
		private roleRepository: RoleRepository,
		private sharedWorkflowRepository: SharedWorkflowRepository,
		private cacheService: CacheService,
	) {
		void this.populateCache();
	}

	async populateCache() {
		const allRoles = await this.roleRepository.find({});

		if (!allRoles) return;

		void this.cacheService.setMany(allRoles.map((r) => [r.cacheKey, r]));
	}

	private async findCached(scope: RoleScopes, name: RoleNames) {
		const cacheKey = `role:${scope}:${name}`;

		const cachedRole = await this.cacheService.get(cacheKey);

		if (cachedRole) return this.roleRepository.create(cachedRole);

		let dbRole = await this.roleRepository.findRole(scope, name);

		if (dbRole === null) {
			if (!this.isValid(scope, name)) {
				throw new InvalidRoleError(`${scope}:${name} is not a valid role`);
			}

			const toSave = this.roleRepository.create({ scope, name });
			dbRole = await this.roleRepository.save(toSave);
		}

		void this.cacheService.set(cacheKey, dbRole);

		return dbRole;
	}

	private roles: Array<{ name: RoleNames; scope: RoleScopes }> = [
		{ scope: 'global', name: 'owner' },
		{ scope: 'global', name: 'member' },
		{ scope: 'workflow', name: 'owner' },
		{ scope: 'credential', name: 'owner' },
		{ scope: 'credential', name: 'user' },
		{ scope: 'workflow', name: 'editor' },
	];

	private isValid(scope: RoleScopes, name: RoleNames) {
		return this.roles.some((r) => r.scope === scope && r.name === name);
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
