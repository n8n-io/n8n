import { Container } from '@n8n/di';

import { RateLimitConfig } from '../rate-limit.config';

describe('RateLimitConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env.N8N_RATE_LIMIT_MULTIPLIER;
		delete process.env.N8N_RATE_LIMIT_DISABLED;
	});

	describe('multiplier', () => {
		it('defaults to 1 (no scaling)', () => {
			expect(Container.get(RateLimitConfig).multiplier).toBe(1);
		});

		it('reads the multiplier from its environment variable', () => {
			process.env.N8N_RATE_LIMIT_MULTIPLIER = '3';
			expect(Container.get(RateLimitConfig).multiplier).toBe(3);
		});

		it('accepts fractional multipliers', () => {
			process.env.N8N_RATE_LIMIT_MULTIPLIER = '2.5';
			expect(Container.get(RateLimitConfig).multiplier).toBe(2.5);
		});

		it.each(['0', '-2', 'abc'])('falls back to 1 when given an invalid value (%s)', (value) => {
			process.env.N8N_RATE_LIMIT_MULTIPLIER = value;
			expect(Container.get(RateLimitConfig).multiplier).toBe(1);
		});
	});

	describe('disabled', () => {
		it('defaults to false', () => {
			expect(Container.get(RateLimitConfig).disabled).toBe(false);
		});

		it('reads the flag from its environment variable', () => {
			process.env.N8N_RATE_LIMIT_DISABLED = 'true';
			expect(Container.get(RateLimitConfig).disabled).toBe(true);
		});
	});
});
