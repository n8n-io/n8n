import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
// eslint-disable-next-line import-x/order
import {
	ALL_SCOPES,
	ALL_ROLES,
	scopeInformation,
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PROJECT_OWNER_ROLE_SLUG,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';

// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';

import { Role, Scope, Settings } from '../entities';
import { DbLock, DbLockService } from './db-lock.service';

@Service()
export class AuthRolesService {
	constructor(
		private readonly logger: Logger,
		private readonly dbLockService: DbLockService,
	) {}

	private async syncScopes(tx: EntityManager) {
		const scopeRepo = tx.getRepository(Scope);
		const roleRepo = tx.getRepository(Role);

		const availableScopes = await scopeRepo.find({
			select: {
				slug: true,
				displayName: true,
				description: true,
			},
		});

		const availableScopesMap = new Map(availableScopes.map((scope) => [scope.slug, scope]));

		const scopesToUpdate = ALL_SCOPES.map((slug) => {
			const info = scopeInformation[slug] ?? {
				displayName: slug,
				description: null,
			};

			const existingScope = availableScopesMap.get(slug);
			if (!existingScope) {
				const newScope = new Scope();
				newScope.slug = slug;
				newScope.displayName = info.displayName;
				newScope.description = info.description ?? null;
				return newScope;
			}

			const needsUpdate =
				existingScope.displayName !== info.displayName ||
				existingScope.description !== info.description;

			if (needsUpdate) {
				existingScope.displayName = info.displayName;
				existingScope.description = info.description ?? null;
				return existingScope;
			}
			return null;
		}).filter((scope) => scope !== null);

		if (scopesToUpdate.length > 0) {
			this.logger.debug(`Updating ${scopesToUpdate.length} scopes...`);
			await scopeRepo.save(scopesToUpdate);
			this.logger.debug('Scopes updated successfully.');
		} else {
			this.logger.debug('No scopes to update.');
		}

		// Find and delete scopes that are no longer in ALL_SCOPES
		const scopesToDelete = availableScopes.filter((scope) => !ALL_SCOPES.includes(scope.slug));

		if (scopesToDelete.length > 0) {
			this.logger.debug(
				`Deleting ${scopesToDelete.length} obsolete scopes: ${scopesToDelete.map((s) => s.slug).join(', ')}`,
			);

			// First, remove these scopes from any roles that reference them
			const obsoleteScopeSlugs = scopesToDelete.map((s) => s.slug);
			const rolesWithObsoleteScopes = await roleRepo.find({
				relations: ['scopes'],
				where: { scopes: { slug: In(obsoleteScopeSlugs) } },
			});

			const rolesToUpdate = rolesWithObsoleteScopes.map((role) => {
				role.scopes = role.scopes.filter((scope) => !obsoleteScopeSlugs.includes(scope.slug));
				return role;
			});

			if (rolesToUpdate.length > 0) {
				this.logger.debug(`Removing obsolete scopes from ${rolesToUpdate.length} roles...`);
				await roleRepo.save(rolesToUpdate);
			}

			// Now delete the scopes themselves
			await scopeRepo.remove(scopesToDelete);
			this.logger.debug('Obsolete scopes deleted successfully.');
		} else {
			this.logger.debug('No obsolete scopes to delete.');
		}
	}

	private async getPersonalOwnerSettingsScopes(tx: EntityManager) {
		const settingKeys = [PERSONAL_SPACE_PUBLISHING_SETTING.key, PERSONAL_SPACE_SHARING_SETTING.key];
		const rows = await tx.findBy(Settings, { key: In(settingKeys) });
		const personalSpacePublishingValue = rows.find(
			(r) => r.key === PERSONAL_SPACE_PUBLISHING_SETTING.key,
		)?.value;
		const personalSpaceSharingValue = rows.find(
			(r) => r.key === PERSONAL_SPACE_SHARING_SETTING.key,
		)?.value;

		const scopes = [];

		// Default to true when setting is missing for backward compatibility (existing instances without these settings)
		if (personalSpacePublishingValue === 'true' || personalSpacePublishingValue === undefined) {
			scopes.push(...PERSONAL_SPACE_PUBLISHING_SETTING.scopes);
			this.logger.debug(
				`${PERSONAL_SPACE_PUBLISHING_SETTING.key} is enabled - allowing ${PERSONAL_SPACE_PUBLISHING_SETTING.scopes.join(', ')} scopes to ${PROJECT_OWNER_ROLE_SLUG} role`,
			);
		}
		if (personalSpaceSharingValue === 'true' || personalSpaceSharingValue === undefined) {
			scopes.push(...PERSONAL_SPACE_SHARING_SETTING.scopes);
			this.logger.debug(
				`${PERSONAL_SPACE_SHARING_SETTING.key} is enabled - allowing ${PERSONAL_SPACE_SHARING_SETTING.scopes.join(', ')} scopes to ${PROJECT_OWNER_ROLE_SLUG} role`,
			);
		}
		return scopes;
	}

	/**
	 * Modifies the expected scopes for a role based on settings.
	 * Currently only applies to project:personalOwner role.
	 * Uses a "closed first" approach: workflow:publish is not in the base definition
	 * and is added when the setting is enabled.
	 */
	private async updateScopesBasedOnSettings(
		roleSlug: string,
		defaultScopes: string[],
		tx: EntityManager,
	): Promise<string[]> {
		const scopes = [...defaultScopes];
		// Special handling for project:personalOwner role
		if (roleSlug === PROJECT_OWNER_ROLE_SLUG) {
			scopes.push(...(await this.getPersonalOwnerSettingsScopes(tx)));
		}
		return scopes;
	}

	private async syncRoles(tx: EntityManager) {
		const roleRepo = tx.getRepository(Role);
		const scopeRepo = tx.getRepository(Scope);

		const existingRoles = await roleRepo.find({
			select: {
				slug: true,
				displayName: true,
				description: true,
				systemRole: true,
				roleType: true,
			},
			where: {
				systemRole: true,
			},
		});

		const allScopes = await scopeRepo.find({
			select: {
				slug: true,
			},
		});

		const existingRolesMap = new Map(existingRoles.map((role) => [role.slug, role]));

		for (const roleNamespace of Object.keys(ALL_ROLES) as Array<keyof typeof ALL_ROLES>) {
			const rolesToUpdate = await Promise.all(
				ALL_ROLES[roleNamespace].map(async (role) => {
					const existingRole = existingRolesMap.get(role.slug);

					const expectedScopes = await this.updateScopesBasedOnSettings(role.slug, role.scopes, tx);

					if (!existingRole) {
						const newRole = roleRepo.create({
							slug: role.slug,
							displayName: role.displayName,
							description: role.description ?? null,
							roleType: roleNamespace,
							systemRole: true,
							scopes: allScopes.filter((scope) => expectedScopes.includes(scope.slug)),
						});
						return newRole;
					}

					const needsUpdate =
						existingRole.displayName !== role.displayName ||
						existingRole.description !== role.description ||
						existingRole.roleType !== roleNamespace ||
						existingRole.scopes.some((scope) => !expectedScopes.includes(scope.slug)) || // DB role has scope that it should not have
						expectedScopes.some((scope) => !existingRole.scopes.some((s) => s.slug === scope)); // Role definition requires scopes not in the DB

					if (needsUpdate) {
						existingRole.displayName = role.displayName;
						existingRole.description = role.description ?? null;
						existingRole.roleType = roleNamespace;
						existingRole.scopes = allScopes.filter((scope) => expectedScopes.includes(scope.slug));
						return existingRole;
					}

					return null;
				}),
			);
			const filteredRolesToUpdate = rolesToUpdate.filter((role) => role !== null);
			if (filteredRolesToUpdate.length > 0) {
				this.logger.debug(`Updating ${filteredRolesToUpdate.length} ${roleNamespace} roles...`);
				await roleRepo.save(filteredRolesToUpdate);
				this.logger.debug(`${roleNamespace} roles updated successfully.`);
			} else {
				this.logger.debug(`No ${roleNamespace} roles to update.`);
			}
		}
	}

	async init() {
		this.logger.debug('Initializing AuthRolesService...');
		await this.dbLockService.withLock(DbLock.AUTH_ROLES_SYNC, async (tx) => {
			await this.syncScopes(tx);
			await this.syncRoles(tx);
		});
		this.logger.debug('AuthRolesService initialized successfully.');
	}
}
