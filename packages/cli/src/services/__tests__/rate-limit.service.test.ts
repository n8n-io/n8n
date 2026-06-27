import type { RateLimitConfig } from '@n8n/config';
import type { Options } from 'express-rate-limit';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import { mock } from 'jest-mock-extended';

import { RateLimitService } from '../rate-limit.service';

jest.mock('express-rate-limit', () => ({
	rateLimit: jest.fn(() => jest.fn()),
}));

const expressRateLimitMock = expressRateLimit as unknown as jest.Mock<unknown, [Options]>;

const lastOptions = (): Options => expressRateLimitMock.mock.calls.at(-1)![0];

describe('RateLimitService - global multiplier', () => {
	beforeEach(() => {
		expressRateLimitMock.mockClear();
	});

	const buildService = (multiplier: number, disabled = false) =>
		new RateLimitService(mock<RateLimitConfig>({ multiplier, disabled }));

	it('does not change the limit when multiplier is 1', () => {
		buildService(1).createIpRateLimitMiddleware({ limit: 100 });
		expect(lastOptions().limit).toBe(100);
	});

	it('scales the IP limit by the multiplier', () => {
		buildService(3).createIpRateLimitMiddleware({ limit: 100 });
		expect(lastOptions().limit).toBe(300);
	});

	it('rounds a fractionally-scaled limit up', () => {
		buildService(2.5).createIpRateLimitMiddleware({ limit: 5 });
		expect(lastOptions().limit).toBe(13); // ceil(5 * 2.5) = 13
	});

	it('scales the default limit when ipRateLimit is `true`', () => {
		buildService(2).createIpRateLimitMiddleware(true);
		expect(lastOptions().limit).toBe(10); // default 5 * 2
	});

	it('leaves the window unchanged (count-only)', () => {
		buildService(4).createIpRateLimitMiddleware({ limit: 10, windowMs: 60_000 });
		expect(lastOptions().windowMs).toBe(60_000);
	});

	it('does not apply the multiplier to user-keyed (Layer 2) limiters', () => {
		buildService(5).createUserKeyedRateLimitMiddleware({ source: 'user', limit: 10 });
		expect(lastOptions().limit).toBe(10);
	});
});
