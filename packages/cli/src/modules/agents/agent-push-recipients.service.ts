import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { RoleService } from '@n8n/backend-services';

type RecipientScope = 'agent:read' | 'agent:execute';

/**
 * A running turn pushes many updates per second to the same project. Reuse the
 * recipient list for a short time so each update does not query users and roles.
 * Keep the window short: a role change reaches push updates within this time.
 */
const RECIPIENTS_CACHE_TTL_MS = 2_000;

@Service()
export class AgentPushRecipientsService {
	private readonly cache = new Map<string, { expiresAt: number; userIds: Promise<string[]> }>();

	constructor(
		private readonly userRepository: UserRepository,
		private readonly roleService: RoleService,
	) {}

	async getProjectReaders(projectId: string): Promise<string[]> {
		return await this.getProjectUsersWithScope(projectId, 'agent:read');
	}

	async getProjectUsersWithScope(projectId: string, scope: RecipientScope): Promise<string[]> {
		const key = `${projectId}:${scope}`;
		const now = Date.now();
		const cached = this.cache.get(key);
		if (cached && cached.expiresAt > now) return await cached.userIds;

		this.pruneExpired(now);
		const userIds = this.queryProjectUsersWithScope(projectId, scope);
		this.cache.set(key, { expiresAt: now + RECIPIENTS_CACHE_TTL_MS, userIds });
		// A failed query must not stay cached.
		userIds.catch(() => {
			if (this.cache.get(key)?.userIds === userIds) this.cache.delete(key);
		});
		return await userIds;
	}

	private async queryProjectUsersWithScope(
		projectId: string,
		scope: RecipientScope,
	): Promise<string[]> {
		const [globalRoleSlugs, projectRoleSlugs] = await Promise.all([
			this.roleService.rolesWithScope('global', [scope]),
			this.roleService.rolesWithScope('project', [scope]),
		]);
		return await this.userRepository.findIdsWithGlobalOrProjectRoles({
			projectIds: [projectId],
			projectRoleSlugs,
			globalRoleSlugs,
		});
	}

	private pruneExpired(now: number) {
		for (const [key, entry] of this.cache) {
			if (entry.expiresAt <= now) this.cache.delete(key);
		}
	}
}
