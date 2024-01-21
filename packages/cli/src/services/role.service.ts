import { Service } from 'typedi';
import { RoleRepository } from '@db/repositories/role.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { CacheService } from '@/services/cache/cache.service';
import type { RoleNames, RoleScopes } from '@db/entities/Role';
import { InvalidRoleError } from '@/errors/invalid-role.error';
import { isSharingEnabled } from '@/UserManagement/UserManagementHelper';

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

	async findCached(scope: RoleScopes, name: RoleNames) {
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
		{ scope: 'global', name: 'admin' },
		{ scope: 'workflow', name: 'owner' },
		{ scope: 'credential', name: 'owner' },
		{ scope: 'credential', name: 'user' },
		{ scope: 'workflow', name: 'editor' },
	];

	listRoles() {
		return this.roles;
	}

	private isValid(scope: RoleScopes, name: RoleNames) {
		return this.roles.some((r) => r.scope === scope && r.name === name);
	}

	async findGlobalOwnerRole() {
		return await this.findCached('global', 'owner');
	}

	async findGlobalMemberRole() {
		return await this.findCached('global', 'member');
	}

	async findGlobalAdminRole() {
		return await this.findCached('global', 'admin');
	}

	async findWorkflowOwnerRole() {
		return await this.findCached('workflow', 'owner');
	}

	async findWorkflowEditorRole() {
		return await this.findCached('workflow', 'editor');
	}

	async findCredentialOwnerRole() {
		return await this.findCached('credential', 'owner');
	}

	async findCredentialUserRole() {
		return await this.findCached('credential', 'user');
	}

	async findRoleByUserAndWorkflow(userId: string, workflowId: string) {
		return await this.sharedWorkflowRepository
			.findOne({
				where: { workflowId, userId },
				relations: ['role'],
			})
			.then((shared) => shared?.role);
	}

	async findCredentialOwnerRoleId() {
		return isSharingEnabled() ? undefined : (await this.findCredentialOwnerRole()).id;
	}
}
