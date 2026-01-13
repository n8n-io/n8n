import { CreateRoleDto, UpdateRoleDto } from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import {
	CredentialsEntity,
	SharedCredentials,
	SharedWorkflow,
	User,
	ListQueryDb,
	ScopesField,
	ProjectRelation,
	RoleRepository,
	Role,
	Scope as DBScope,
	ScopeRepository,
	GLOBAL_ADMIN_ROLE,
} from '@n8n/db';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	Scope,
	Role as RoleDTO,
	AssignableProjectRole,
	RoleNamespace,
} from '@n8n/permissions';
import {
	combineScopes,
	getAuthPrincipalScopes,
	getRoleScopes,
	isBuiltInRole,
	PROJECT_ADMIN_ROLE_SLUG,
	PROJECT_EDITOR_ROLE_SLUG,
	PROJECT_VIEWER_ROLE_SLUG,
} from '@n8n/permissions';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { isUniqueConstraintError } from '@/response-helper';

import { RoleCacheService } from './role-cache.service';

@Service()
export class RoleService {
	constructor(
		private readonly license: LicenseState,
		private readonly roleRepository: RoleRepository,
		private readonly scopeRepository: ScopeRepository,
		private readonly roleCacheService: RoleCacheService,
		private readonly logger: Logger,
	) {}

	private dbRoleToRoleDTO(role: Role, usedByUsers?: number): RoleDTO {
		return {
			...role,
			scopes: role.scopes.map((s) => s.slug),
			licensed: this.isRoleLicensed(role.slug),
			usedByUsers,
		};
	}

	async getAllRoles(withCount: boolean = false): Promise<RoleDTO[]> {
		const roles = await this.roleRepository.findAll();

		if (!withCount) {
			return roles.map((r) => this.dbRoleToRoleDTO(r));
		}

		const roleCounts = await this.roleRepository.findAllRoleCounts();

		return roles.map((role) => {
			const usedByUsers = roleCounts[role.slug] ?? 0;
			return this.dbRoleToRoleDTO(role, usedByUsers);
		});
	}

	async getRole(slug: string, withCount: boolean = false): Promise<RoleDTO> {
		const role = await this.roleRepository.findBySlug(slug);
		if (role) {
			const usedByUsers = withCount
				? await this.roleRepository.countUsersWithRole(role)
				: undefined;
			return this.dbRoleToRoleDTO(role, usedByUsers);
		}
		throw new NotFoundError('Role not found');
	}

	async removeCustomRole(slug: string) {
		const role = await this.roleRepository.findBySlug(slug);
		if (!role) {
			throw new NotFoundError('Role not found');
		}
		if (role.systemRole) {
			throw new BadRequestError('Cannot delete system roles');
		}

		// Check if any users is globally or project assigned to the role
		const usersWithRole = await this.roleRepository.countUsersWithRole(role);
		if (usersWithRole > 0) {
			throw new BadRequestError('Cannot delete role assigned to users');
		}

		await this.roleRepository.removeBySlug(slug);

		// Invalidate cache after role deletion
		await this.roleCacheService.invalidateCache();

		return this.dbRoleToRoleDTO(role);
	}

	private async resolveScopes(scopeSlugs: string[] | undefined): Promise<DBScope[] | undefined> {
		if (!scopeSlugs) {
			return undefined;
		}

		if (scopeSlugs.length === 0) {
			return [];
		}

		const scopes = await this.scopeRepository.findByList(scopeSlugs);
		if (scopes.length !== scopeSlugs.length) {
			const invalidScopes = scopeSlugs.filter((slug) => !scopes.some((s) => s.slug === slug));
			throw new Error(`The following scopes are invalid: ${invalidScopes.join(', ')}`);
		}

		return scopes;
	}

	async updateCustomRole(slug: string, newData: UpdateRoleDto) {
		const { displayName, description, scopes: scopeSlugs } = newData;

		try {
			const updatedRole = await this.roleRepository.updateRole(slug, {
				displayName,
				description,
				scopes: await this.resolveScopes(scopeSlugs),
			});

			// Invalidate cache after role update
			await this.roleCacheService.invalidateCache();

			return this.dbRoleToRoleDTO(updatedRole);
		} catch (error) {
			if (error instanceof UserError && error.message === 'Role not found') {
				throw new NotFoundError('Role not found');
			}

			if (error instanceof UserError && error.message === 'Cannot update system roles') {
				throw new BadRequestError('Cannot update system roles');
			}

			if (error instanceof Error && isUniqueConstraintError(error)) {
				throw new BadRequestError(`A role with the name "${displayName}" already exists`);
			}

			throw error;
		}
	}

	async createCustomRole(newRole: CreateRoleDto) {
		const role = new Role();
		role.displayName = newRole.displayName;
		if (newRole.description) {
			role.description = newRole.description;
		}
		const scopes = await this.resolveScopes(newRole.scopes);
		if (scopes === undefined) throw new BadRequestError('Scopes are required');
		role.scopes = scopes;
		role.systemRole = false;
		role.roleType = newRole.roleType;
		role.slug = `${newRole.roleType}:${newRole.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 8)}`;

		try {
			const createdRole = await this.roleRepository.save(role);

			// Invalidate cache after role creation
			await this.roleCacheService.invalidateCache();

			return this.dbRoleToRoleDTO(createdRole);
		} catch (error) {
			if (error instanceof Error && isUniqueConstraintError(error)) {
				throw new BadRequestError(`A role with the name "${newRole.displayName}" already exists`);
			}
			throw error;
		}
	}

	async checkRolesExist(
		roleSlugs: string[],
		roleType: 'global' | 'project' | 'workflow' | 'credential',
	) {
		const uniqueRoleSlugs = new Set(roleSlugs);
		const roles = await this.roleRepository.findBySlugs(Array.from(uniqueRoleSlugs), roleType);

		if (roles.length < uniqueRoleSlugs.size) {
			const nonExistentRoles = Array.from(uniqueRoleSlugs).filter(
				(slug) => !roles.find((role) => role.slug === slug),
			);
			throw new BadRequestError(
				nonExistentRoles.length === 1
					? `Role ${nonExistentRoles[0]} does not exist`
					: `Roles ${nonExistentRoles.join(', ')} do not exist`,
			);
		}
	}

	addScopes(
		rawWorkflow: ListQueryDb.Workflow.WithSharing | ListQueryDb.Workflow.WithOwnedByAndSharedWith,
		user: User,
		userProjectRelations: ProjectRelation[],
	): ListQueryDb.Workflow.WithScopes;
	addScopes(
		rawCredential: CredentialsEntity,
		user: User,
		userProjectRelations: ProjectRelation[],
	): CredentialsEntity & ScopesField;
	addScopes(
		rawCredential:
			| ListQueryDb.Credentials.WithSharing
			| ListQueryDb.Credentials.WithOwnedByAndSharedWith,
		user: User,
		userProjectRelations: ProjectRelation[],
	): ListQueryDb.Credentials.WithScopes;
	addScopes(
		rawEntity:
			| CredentialsEntity
			| ListQueryDb.Workflow.WithSharing
			| ListQueryDb.Credentials.WithOwnedByAndSharedWith
			| ListQueryDb.Credentials.WithSharing
			| ListQueryDb.Workflow.WithOwnedByAndSharedWith,
		user: User,
		userProjectRelations: ProjectRelation[],
	):
		| (CredentialsEntity & ScopesField)
		| ListQueryDb.Workflow.WithScopes
		| ListQueryDb.Credentials.WithScopes {
		const shared = rawEntity.shared;
		const entity = rawEntity as
			| (CredentialsEntity & ScopesField)
			| ListQueryDb.Workflow.WithScopes
			| ListQueryDb.Credentials.WithScopes;

		entity.scopes = [];

		if (shared === undefined) {
			return entity;
		}

		if (!('active' in entity) && !('type' in entity)) {
			throw new UnexpectedError('Cannot detect if entity is a workflow or credential.');
		}

		const entityType = 'active' in entity ? 'workflow' : 'credential';
		entity.scopes = this.combineResourceScopes(entityType, user, shared, userProjectRelations);

		if (
			entityType === 'credential' &&
			'isGlobal' in entity &&
			entity.isGlobal &&
			!entity.scopes.includes('credential:read')
		) {
			entity.scopes.push('credential:read');
		}

		return entity;
	}

	combineResourceScopes(
		type: 'workflow' | 'credential',
		user: User,
		shared: SharedCredentials[] | SharedWorkflow[],
		userProjectRelations: ProjectRelation[],
	): Scope[] {
		const globalScopes = getAuthPrincipalScopes(user, [type]);
		const scopesSet: Set<Scope> = new Set(globalScopes);
		for (const sharedEntity of shared) {
			const pr = userProjectRelations.find(
				(p) => p.projectId === (sharedEntity.projectId ?? sharedEntity.project.id),
			);
			let projectScopes: Scope[] = [];
			if (pr) {
				projectScopes = pr.role.scopes.map((s) => s.slug);
			}
			const resourceMask = getRoleScopes(sharedEntity.role);
			const mergedScopes = combineScopes(
				{
					global: globalScopes,
					project: projectScopes,
				},
				{ sharing: resourceMask },
			);
			mergedScopes.forEach((s) => scopesSet.add(s));
		}
		return [...scopesSet].sort();
	}

	/**
	 * Enhanced rolesWithScope function that combines static roles with database roles
	 * This replaces the original rolesWithScope function from @n8n/permissions
	 */
	async rolesWithScope(
		namespace: RoleNamespace,
		scopes: Scope | Scope[],
		trx?: EntityManager,
	): Promise<string[]> {
		if (!Array.isArray(scopes)) {
			scopes = [scopes];
		}
		// Get database roles from cache
		return await this.roleCacheService.getRolesWithAllScopes(namespace, scopes, trx);
	}

	isRoleLicensed(role: AssignableProjectRole) {
		// TODO: move this info into FrontendSettings

		if (!isBuiltInRole(role)) {
			// This is a custom role, there for we need to check if
			// custom roles are licensed
			return this.license.isCustomRolesLicensed();
		}

		switch (role) {
			case PROJECT_ADMIN_ROLE_SLUG:
				return this.license.isProjectRoleAdminLicensed();
			case PROJECT_EDITOR_ROLE_SLUG:
				return this.license.isProjectRoleEditorLicensed();
			case PROJECT_VIEWER_ROLE_SLUG:
				return this.license.isProjectRoleViewerLicensed();
			case GLOBAL_ADMIN_ROLE.slug:
				return this.license.isAdvancedPermissionsLicensed();
			default:
				// TODO: handle custom roles licensing
				return true;
		}
	}

	async addScopeToRole(roleSlug: Role['slug'], scopeSlug: Scope): Promise<void> {
		const role = await this.roleRepository.findBySlug(roleSlug);
		if (!role) {
			this.logger.error(`Role ${roleSlug} not found - unable to add scope ${scopeSlug}`);
			throw new NotFoundError(`Role ${roleSlug} not found`);
		}

		const scope = await this.scopeRepository.findOne({ where: { slug: scopeSlug } });

		if (!scope) {
			this.logger.error(
				`Scope ${scopeSlug} not found - unable to add this scope to role ${roleSlug}`,
			);
			throw new NotFoundError(`Scope ${scopeSlug} not found`);
		}

		if (role.scopes.find((s) => s.slug === scopeSlug)) {
			this.logger.debug(`Scope ${scopeSlug} is already assigned on role ${roleSlug}`);
			return;
		}

		this.logger.debug(`Adding scope ${scopeSlug} to role ${roleSlug}`);
		role.scopes.push(scope);
		await this.roleRepository.save(role);
		await this.roleCacheService.refreshCache();
		this.logger.debug(`Added scope ${scopeSlug} to role ${roleSlug}`);
	}

	async removeScopeFromRole(roleSlug: string, scopeSlug: string): Promise<void> {
		const role = await this.roleRepository.findBySlug(roleSlug);
		if (!role) {
			this.logger.error(`Role ${roleSlug} not found - unable to add scope ${scopeSlug}`);
			throw new NotFoundError(`Role ${roleSlug} not found`);
		}

		this.logger.debug(`Removing scope ${scopeSlug} from role ${roleSlug}`);
		role.scopes = role.scopes.filter((s) => s.slug !== scopeSlug);
		await this.roleRepository.save(role);
		await this.roleCacheService.refreshCache();
		this.logger.debug(`Removed scope ${scopeSlug} from role ${roleSlug}`);
	}
}
