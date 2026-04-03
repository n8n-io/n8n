import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { UserError } from 'n8n-workflow';

import type { ExternalTokenClaims } from '../token-exchange.schemas';

/**
 * Resolves validated external token claims to an n8n User.
 *
 * This is a skeleton service — the real implementation with user
 * lookup/creation logic will be provided in a follow-up ticket.
 */
@Service()
export class IdentityResolutionService {
	/**
	 * Map external identity claims to a local n8n user, creating one if necessary.
	 */
	async resolve(_claims: ExternalTokenClaims): Promise<User> {
		throw new UserError('Identity resolution is not yet implemented');
	}
}
