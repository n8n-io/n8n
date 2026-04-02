import { Logger } from '@n8n/backend-common';
import { RoleRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { TokenExchangeConfig } from '../token-exchange.config';

export interface DelegationCheckResult {
	allowed: boolean;
	missingScopes: string[];
}

@Service()
export class DelegationAuthorizationService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly roleRepository: RoleRepository,
		private readonly config: TokenExchangeConfig,
	) {
		this.logger = logger.scoped('delegation-authorization');
	}

	/**
	 * Determine whether an actor holding `actorRoleSlug` may delegate
	 * `requestedRoleSlug` to a subject on the given resource.
	 *
	 * Allow iff: requestedRole.scopes ⊆ actorRole.scopes
	 *
	 * A structured warning is always emitted when the check would fail,
	 * regardless of the enforceDelegation setting.
	 */
	async canDelegate(
		actorRoleSlug: string,
		requestedRoleSlug: string,
		resourceId?: string,
	): Promise<DelegationCheckResult> {
		const [actorRole, requestedRole] = await Promise.all([
			this.roleRepository.findOne({ where: { slug: actorRoleSlug } }),
			this.roleRepository.findOne({ where: { slug: requestedRoleSlug } }),
		]);

		const actorScopes = new Set((actorRole?.scopes ?? []).map((s) => s.slug));
		const requestedScopes = (requestedRole?.scopes ?? []).map((s) => s.slug);
		const missingScopes = requestedScopes.filter((s) => !actorScopes.has(s));

		if (missingScopes.length > 0) {
			this.logger.warn('Delegation would fail: actor lacks required scopes', {
				actorRoleSlug,
				requestedRoleSlug,
				resourceId,
				missingScopes,
				enforced: this.config.enforceDelegation,
			});

			return {
				allowed: !this.config.enforceDelegation,
				missingScopes,
			};
		}

		return { allowed: true, missingScopes: [] };
	}
}
