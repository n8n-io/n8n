import { TaskRunnersConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { randomBytes, timingSafeEqual } from 'crypto';

import { CacheService } from '@/services/cache/cache.service';

/**
 * Cached in place of a runner ID for a grant token minted without one bound.
 * Far shorter than a generated runner ID, so it can never be mistaken for one.
 */
const NO_BOUND_RUNNER = '-';

export type GrantTokenConsumption = {
	isValid: boolean;
	/** ID bound to the token when it was minted, if any. Always `null` for an invalid token. */
	boundRunnerId: string | null;
};

@Service()
export class TaskBrokerAuthService {
	private readonly authToken = Buffer.from(this.runnersConfig.authToken);

	private get grantTokenTtlInMs() {
		return this.runnersConfig.grantTokenTtl * Time.seconds.toMilliseconds;
	}

	constructor(
		private readonly runnersConfig: TaskRunnersConfig,
		private readonly cacheService: CacheService,
	) {}

	isValidAuthToken(token: string) {
		const tokenBuffer = Buffer.from(token);
		if (tokenBuffer.length !== this.authToken.length) return false;

		return timingSafeEqual(tokenBuffer, this.authToken);
	}

	/**
	 * Mints a single-use grant token for establishing a task runner connection.
	 *
	 * @param runnerId ID to bind to the token, so that whoever presents it is known to be
	 * the runner the token was minted for. Omit when the runner is not known in advance.
	 */
	async createGrantToken(runnerId?: string) {
		const grantToken = this.generateGrantToken();

		const key = this.cacheKeyForGrantToken(grantToken);
		await this.cacheService.set(key, runnerId ?? NO_BOUND_RUNNER, this.grantTokenTtlInMs);

		return grantToken;
	}

	/**
	 * Checks if the given `grantToken` is a valid token and marks it as
	 * used.
	 */
	async tryConsumeGrantToken(grantToken: string): Promise<GrantTokenConsumption> {
		const key = this.cacheKeyForGrantToken(grantToken);
		const consumed = await this.cacheService.take<string>(key);
		// Not found in cache --> Invalid or already consumed token
		if (consumed === undefined) return { isValid: false, boundRunnerId: null };

		return {
			isValid: true,
			boundRunnerId: consumed === NO_BOUND_RUNNER ? null : consumed,
		};
	}

	private generateGrantToken() {
		return randomBytes(32).toString('hex');
	}

	private cacheKeyForGrantToken(grantToken: string) {
		return `grant-token:${grantToken}`;
	}
}
