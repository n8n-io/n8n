import { Service } from '@n8n/di';

import { TokenExchangeJtiRepository } from '../database/repositories/token-exchange-jti.repository';

const GRACE_PERIOD_MS = 60_000;

/**
 * Tracks consumed JTI (JWT ID) values to prevent token replay attacks.
 *
 * JTI consumption is deliberately performed as an independent atomic operation,
 * not wrapped in a broader transaction with subsequent steps (identity resolution,
 * JWT generation). Rationale:
 *
 * 1. Replay protection must never be compromised by uncommitted state. If consume
 *    were inside a transaction, the insert would be invisible to concurrent requests
 *    until commit. A transaction rollback would re-open the JTI for replay.
 * 2. Because consume is auto-committed, there are no competing transactions that
 *    could observe inconsistent state.
 * 3. If steps after consumption fail, the JTI is burned (consumed but unused).
 *    The external system must mint a new token with a fresh JTI — this is the
 *    expected and more secure behavior.
 */
@Service()
export class JtiStoreService {
	constructor(private readonly jtiRepository: TokenExchangeJtiRepository) {}

	/**
	 * Attempt to consume a JTI. Returns `true` if consumed successfully
	 * (first use), `false` if already consumed (replay).
	 *
	 * Adds a 60-second grace period on top of the token expiry to account
	 * for clock skew and processing time.
	 */
	async consume(jti: string, expiresAt: Date): Promise<boolean> {
		const expiresAtWithGrace = new Date(expiresAt.getTime() + GRACE_PERIOD_MS);
		return await this.jtiRepository.atomicConsume(jti, expiresAtWithGrace);
	}
}
