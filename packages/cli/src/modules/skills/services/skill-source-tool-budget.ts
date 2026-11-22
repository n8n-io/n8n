import { Service } from '@n8n/di';
import { LRUCache } from 'lru-cache';

import { SkillSourceRequestError } from '../errors/skill-source-request.error';

const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 15;

/**
 * How many source requests the AI tools of one user can make in a window. A person starts
 * each request of the connect dialog, but a model can start one on each tool call, and each
 * request reads the source. In memory, so a restart or another main forgets it.
 */
@Service()
export class SkillSourceToolBudget {
	private readonly requests = new LRUCache<string, number[]>({ max: 10_000, ttl: WINDOW_MS });

	/** Counts one request of the user, or refuses it as `rate_limited`. */
	take(userId: string, now = Date.now()): void {
		const recent = (this.requests.get(userId) ?? []).filter((at) => now - at < WINDOW_MS);
		if (recent.length >= MAX_REQUESTS) {
			throw new SkillSourceRequestError(
				'rate_limited',
				'Too many skill source requests. Wait a few minutes before the next one.',
			);
		}
		this.requests.set(userId, [...recent, now]);
	}
}
