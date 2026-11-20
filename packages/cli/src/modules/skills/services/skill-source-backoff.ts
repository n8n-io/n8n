import { Service } from '@n8n/di';

import { SkillSourceReadError } from '../errors/skill-source-read.error';
import { skillSourceBackoffSeconds } from '../utils/skill-source-backoff';

export type SkillSourceWait = { until: number; attempts: number };

/** The public access of a source type, as a rate limit applies to it. */
export const publicAccessKey = (type: string) => `public:${type}`;

/**
 * When each access may read its source again after a rate limit: a credential, or the
 * public access of a source type. In memory, so a restart or another main forgets it.
 */
@Service()
export class SkillSourceBackoff {
	private readonly waits = new Map<string, SkillSourceWait>();

	get(key: string): SkillSourceWait | undefined {
		return this.waits.get(key);
	}

	isWaiting(key: string, now = Date.now()): boolean {
		return (this.waits.get(key)?.until ?? 0) > now;
	}

	/** A rate limit starts or extends the wait. Any other error changes nothing. */
	record(key: string, error: unknown): void {
		if (!(error instanceof SkillSourceReadError) || error.reason !== 'rate_limited') return;
		const current = this.waits.get(key);
		const attempts = (current?.attempts ?? 0) + 1;
		const seconds = skillSourceBackoffSeconds(attempts, error.retryAfterSeconds);
		this.waits.set(key, {
			until: Math.max(current?.until ?? 0, Date.now() + seconds * 1000),
			attempts,
		});
	}

	/** Ends the wait after a read that worked, unless a concurrent read set a newer one. */
	release(key: string, previous: SkillSourceWait | undefined): void {
		if (this.waits.get(key) === previous) this.waits.delete(key);
	}
}
