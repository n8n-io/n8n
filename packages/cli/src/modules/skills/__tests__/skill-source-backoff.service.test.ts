import { SkillSourceReadError } from '../errors/skill-source-read.error';
import { publicAccessKey, SkillSourceBackoff } from '../services/skill-source-backoff';

describe('SkillSourceBackoff', () => {
	const key = publicAccessKey('github');
	const rateLimit = (retryAfterSeconds?: number) =>
		new SkillSourceReadError('rate_limited', 'Rate limited', { retryAfterSeconds });

	it('waits after a rate limit, for as long as the source asked', () => {
		const backoff = new SkillSourceBackoff();
		const now = Date.now();

		backoff.record(key, rateLimit(600));

		expect(backoff.isWaiting(key, now + 599_000)).toBe(true);
		expect(backoff.isWaiting(publicAccessKey('github'), now)).toBe(true);
		expect(backoff.isWaiting('credential:1', now)).toBe(false);
	});

	it('does not wait after an error that is no rate limit', () => {
		const backoff = new SkillSourceBackoff();

		backoff.record(key, new SkillSourceReadError('unreachable', 'Down'));
		backoff.record(key, new Error('Bug'));

		expect(backoff.isWaiting(key)).toBe(false);
	});

	it('releases the wait that the read started with, and keeps a newer one', () => {
		const backoff = new SkillSourceBackoff();
		backoff.record(key, rateLimit());
		const previous = backoff.get(key);
		backoff.record(key, rateLimit());

		backoff.release(key, previous);
		expect(backoff.isWaiting(key)).toBe(true);

		backoff.release(key, backoff.get(key));
		expect(backoff.isWaiting(key)).toBe(false);
	});
});
