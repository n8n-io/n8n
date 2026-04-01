import { Service } from '@n8n/di';

import type { ResolvedTrustedKey } from '../token-exchange.schemas';

/**
 * Retrieves trusted public keys by Key ID (kid) from the JWT header.
 *
 * Returns keys in their resolved, in-memory form with key material
 * already parsed and ready for `jwt.verify()`.
 *
 * This is a skeleton service — the real implementation will be provided
 * when the trusted-key persistence layer is introduced.
 */
@Service()
export class TrustedKeyService {
	/**
	 * Look up a resolved trusted key by its `kid`.
	 * @returns the resolved key, or `undefined` if the kid is unknown.
	 */
	async getByKid(_kid: string): Promise<ResolvedTrustedKey | undefined> {
		return undefined;
	}
}
