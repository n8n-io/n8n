import { Service } from '@n8n/di';

/**
 * Contract for contributing reasons a custom role cannot be deleted. Optional
 * modules that reference roles (e.g. SSO provisioning mapping rules) implement
 * this so the core role service can block deletion without importing them.
 */
export interface RoleDeletionChecker {
	/**
	 * Returns human-readable blockers preventing deletion of the role. An empty
	 * array means the contributor has no objection.
	 */
	findRoleDeletionBlockers(roleSlug: string): Promise<string[]>;
}

/**
 * Proxy through which the core `RoleService` collects role-deletion blockers
 * from optional modules without importing them directly.
 *
 * A module registers its provider on init — same pattern as
 * `OAuthTokenVerifierProxy`. Until a provider is registered (e.g. the module
 * is disabled via license/env), there are no external blockers and deletion
 * proceeds.
 */
@Service()
export class RoleDeletionCheckProxy implements RoleDeletionChecker {
	private provider: RoleDeletionChecker | null = null;

	registerProvider(provider: RoleDeletionChecker): void {
		this.provider = provider;
	}

	async findRoleDeletionBlockers(roleSlug: string): Promise<string[]> {
		if (!this.provider) return [];
		return await this.provider.findRoleDeletionBlockers(roleSlug);
	}
}
