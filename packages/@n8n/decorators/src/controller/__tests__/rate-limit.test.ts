import { createIpRateLimit } from '../rate-limit';

describe('createIpRateLimit', () => {
	it('returns the limit config for a positive limit', () => {
		expect(createIpRateLimit(100)).toEqual({ limit: 100 });
	});

	it('includes windowMs when provided', () => {
		expect(createIpRateLimit(50, 60000)).toEqual({ limit: 50, windowMs: 60000 });
	});

	it('returns false for a limit of 0 to disable rate limiting', () => {
		expect(createIpRateLimit(0)).toBe(false);
		expect(createIpRateLimit(0, 60000)).toBe(false);
	});
});
