import { Service } from '@n8n/di';

/**
 * Tracks consumed JTI (JWT ID) values to prevent token replay attacks.
 *
 * This is a skeleton service — the real implementation backed by a
 * database table will be introduced in IAM-461.
 */
@Service()
export class JtiStoreService {
	/**
	 * Attempt to consume a JTI. Returns `true` if consumed successfully
	 * (first use), `false` if already consumed (replay).
	 */
	async consume(_jti: string, _expiresAt: Date): Promise<boolean> {
		return true;
	}
}
