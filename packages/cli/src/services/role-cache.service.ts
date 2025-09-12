import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { RoleRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { staticRolesWithScope, type Scope } from '@n8n/permissions';

import { CacheService } from './cache/cache.service';

interface RoleScopeMap {
	[roleSlug: string]: {
		roleType: 'global' | 'project' | 'credential' | 'workflow';
		scopes: Scope[];
	}; // roleSlug -> array of scope slugs
}

@Service()
export class RoleCacheService {
	private static readonly CACHE_KEY = 'roles:scope-map';
	private static readonly CACHE_TTL = 5 * Time.minutes.toMilliseconds; // 5 minutes TTL

	constructor(
		private readonly cacheService: CacheService,
		private readonly logger: Logger,
	) {}

	/**
	 * Get all roles from database and build scope map
	 */
	private async buildRoleScopeMap(): Promise<RoleScopeMap> {
		try {
			const roleRepository = Container.get(RoleRepository);
			const roles = await roleRepository.findAll();

			const roleScopeMap: RoleScopeMap = {};
			for (const role of roles) {
				roleScopeMap[role.slug] = {
					roleType: role.roleType,
					scopes: role.scopes.map((s) => s.slug),
				};
			}

			return roleScopeMap;
		} catch (error) {
			this.logger.error('Failed to build role scope from database', { error });
			throw error;
		}
	}

	/**
	 * Get roles with all specified scopes (with caching)
	 */
	async getRolesWithAllScopes(
		namespace: 'global' | 'project' | 'credential' | 'workflow',
		requiredScopes: Scope[],
	): Promise<string[]> {
		if (requiredScopes.length === 0) return [];

		// Get cached role map with refresh function
		const roleScopeMap = await this.cacheService.get<RoleScopeMap>(RoleCacheService.CACHE_KEY, {
			refreshFn: async () => await this.buildRoleScopeMap(),
			fallbackValue: undefined,
		});

		if (roleScopeMap === undefined) {
			this.logger.error('Role scope map is undefined, falling back to static roles');
			// Fallback to static roles if dynamic data is not available
			return staticRolesWithScope(namespace, requiredScopes);
		}

		// Filter roles by namespace and scopes
		const matchingRoles: string[] = [];

		for (const [roleSlug, roleInfo] of Object.entries(roleScopeMap)) {
			// Check namespace
			if (roleInfo.roleType !== namespace) continue;

			// Check if role has ALL required scopes
			const hasAllScopes = requiredScopes.every((scope) => roleInfo.scopes.includes(scope));
			if (hasAllScopes) {
				matchingRoles.push(roleSlug);
			}
		}

		return matchingRoles;
	}

	/**
	 * Invalidate the role cache (call after role changes)
	 */
	async invalidateCache(): Promise<void> {
		await this.cacheService.delete(RoleCacheService.CACHE_KEY);
	}

	/**
	 * Force refresh the cache
	 */
	async refreshCache(): Promise<void> {
		const roleScopeMap = await this.buildRoleScopeMap();
		await this.cacheService.set(
			RoleCacheService.CACHE_KEY,
			roleScopeMap,
			RoleCacheService.CACHE_TTL,
		);
	}
}
