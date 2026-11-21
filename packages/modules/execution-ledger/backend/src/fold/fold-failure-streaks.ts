import { Logger } from '@n8n/backend-common';
import { CacheService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';

type Streak = { batchKey: string; failures: number };

const STREAK_TTL_MS = Time.hours.toMilliseconds;

/**
 * Counts how many times in a row a fold step failed on the same batch. The count is in the
 * shared cache, because any main can run the next fold.
 */
@Service()
export class FoldFailureStreaks {
	constructor(
		private readonly cacheService: CacheService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('execution-ledger');
	}

	/** Returns 0 when the cache fails: the fold then retries more, and loses nothing. */
	async get(step: string, batchKey: string): Promise<number> {
		try {
			const streak = await this.cacheService.get(keyOf(step));
			return isStreak(streak) && streak.batchKey === batchKey ? streak.failures : 0;
		} catch (error) {
			this.logger.warn('Could not read the failure count of a fold step', { step, error });
			return 0;
		}
	}

	/** One key for each step, so a new streak replaces the old one. */
	async set(step: string, batchKey: string, failures: number): Promise<void> {
		const streak: Streak = { batchKey, failures };
		try {
			await this.cacheService.set(keyOf(step), streak, STREAK_TTL_MS);
		} catch (error) {
			this.logger.warn('Could not save the failure count of a fold step', { step, error });
		}
	}
}

const keyOf = (step: string) => `execution-ledger:fold-failures:${step}`;

function isStreak(value: unknown): value is Streak {
	return (
		isRecord(value) && typeof value.batchKey === 'string' && typeof value.failures === 'number'
	);
}
