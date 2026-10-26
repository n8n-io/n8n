import { describe, it, expect } from 'vitest';

import { CHANNEL_RATE_LIMIT_COOLDOWN_MS } from '../channel-rate-limit';
import { ChannelRateLimitGuard } from '../channel-rate-limit.guard';

describe('ChannelRateLimitGuard', () => {
	it('is not blocked before record is called', () => {
		const guard = new ChannelRateLimitGuard();
		expect(guard.isBlocked('slack:cred-a', 1_000)).toBe(false);
	});

	it('is blocked after record and unblocked after the cooldown expires', () => {
		const guard = new ChannelRateLimitGuard();
		guard.record('slack:cred-a', 1_000);
		expect(guard.isBlocked('slack:cred-a', 1_000)).toBe(true);
		expect(guard.isBlocked('slack:cred-a', 1_000 + CHANNEL_RATE_LIMIT_COOLDOWN_MS)).toBe(false);
	});

	it('is unblocked exactly at the expiry boundary', () => {
		const guard = new ChannelRateLimitGuard();
		guard.record('slack:cred-a', 1_000);
		// nowMs === until → still blocked (nowMs > until is the clear condition)
		expect(guard.isBlocked('slack:cred-a', 1_000 + CHANNEL_RATE_LIMIT_COOLDOWN_MS - 1)).toBe(true);
		expect(guard.isBlocked('slack:cred-a', 1_000 + CHANNEL_RATE_LIMIT_COOLDOWN_MS)).toBe(false);
	});

	it('extends an existing block when a second record would end later', () => {
		const guard = new ChannelRateLimitGuard();
		guard.record('slack:cred-a', 1_000);
		guard.record('slack:cred-a', 10_000);
		// First until = 1_000 + COOLDOWN; second until = 10_000 + COOLDOWN (later)
		expect(guard.isBlocked('slack:cred-a', 5_000 + 10_000)).toBe(true);
		expect(guard.isBlocked('slack:cred-a', 10_000 + CHANNEL_RATE_LIMIT_COOLDOWN_MS)).toBe(false);
	});

	it('keeps the later expiry when a second record would end earlier', () => {
		const guard = new ChannelRateLimitGuard();
		guard.record('slack:cred-a', 10_000);
		guard.record('slack:cred-a', 1_000);
		// First until = 10_000 + COOLDOWN; second until = 1_000 + COOLDOWN (earlier)
		expect(guard.isBlocked('slack:cred-a', 5_000 + 10_000)).toBe(true);
		expect(guard.isBlocked('slack:cred-a', 10_000 + CHANNEL_RATE_LIMIT_COOLDOWN_MS)).toBe(false);
	});

	it('is a no-op for an empty connectionId', () => {
		const guard = new ChannelRateLimitGuard();
		guard.record('', 1_000);
		expect(guard.isBlocked('', 1_000)).toBe(false);
	});

	it('tracks connections independently', () => {
		const guard = new ChannelRateLimitGuard();
		guard.record('slack:cred-a', 1_000);
		expect(guard.isBlocked('slack:cred-b', 1_000)).toBe(false);
		expect(guard.isBlocked('linear:cred-c', 1_000)).toBe(false);
	});
});
