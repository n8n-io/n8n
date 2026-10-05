import { describe, it, expect } from 'vitest';

import { INTEGRATION_ERROR_CODES } from '../integration-error-codes';

import {
	CHANNEL_RATE_LIMIT_COOLDOWN_MS,
	isHttp429,
	isRateLimitedToolOutput,
	channelRateLimitMessage,
	caughtIntegrationError,
	rateLimitMessageFromError,
} from '../channel-rate-limit';
import { ChannelRateLimitGuard } from '../channel-rate-limit.guard';

describe('channel-rate-limit', () => {
	describe('isHttp429', () => {
		it('returns true for an error with response.status 429', () => {
			const error = Object.assign(new Error('limited'), {
				response: { status: 429 },
			});
			expect(isHttp429(error)).toBe(true);
		});

		it('returns false for a 500 error', () => {
			const error = Object.assign(new Error('server error'), {
				response: { status: 500 },
			});
			expect(isHttp429(error)).toBe(false);
		});

		it('returns false for a message-only 429 (no response.status field)', () => {
			expect(isHttp429(new Error('Discord API failed: 429'))).toBe(false);
		});

		it('returns false for a plain error with no response', () => {
			expect(isHttp429(new Error('boom'))).toBe(false);
		});
	});

	describe('isRateLimitedToolOutput', () => {
		it('returns true for a single RATE_LIMIT_EXCEEDED result', () => {
			expect(
				isRateLimitedToolOutput({
					ok: false,
					error: { code: INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED, message: 'limited' },
				}),
			).toBe(true);
		});

		it('returns true for a batch results array containing a RATE_LIMIT_EXCEEDED entry', () => {
			expect(
				isRateLimitedToolOutput({
					ok: true,
					results: [
						{ action: 'respond', result: { ok: true } },
						{
							action: 'add_reaction',
							result: {
								ok: false,
								error: { code: INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED, message: 'limited' },
							},
						},
					],
				}),
			).toBe(true);
		});

		it('returns false for an ACTION_FAILED result', () => {
			expect(
				isRateLimitedToolOutput({
					ok: false,
					error: { code: INTEGRATION_ERROR_CODES.ACTION_FAILED, message: 'x' },
				}),
			).toBe(false);
		});

		it('returns false for a successful result', () => {
			expect(isRateLimitedToolOutput({ ok: true })).toBe(false);
		});

		it('returns false for a non-record value', () => {
			expect(isRateLimitedToolOutput(null)).toBe(false);
			expect(isRateLimitedToolOutput('string')).toBe(false);
		});
	});

	describe('channelRateLimitMessage', () => {
		it('capitalises the platform name', () => {
			expect(channelRateLimitMessage('slack')).toContain('Slack');
			expect(channelRateLimitMessage('discord')).toContain('Discord');
		});
	});

	describe('rateLimitMessageFromError', () => {
		it('returns the error.message from a rate-limited tool output', () => {
			const output = {
				ok: false,
				error: { code: INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED, message: 'Slack is limited' },
			};
			expect(rateLimitMessageFromError(output)).toBe('Slack is limited');
		});

		it('extracts the message from a batch results array containing a RATE_LIMIT_EXCEEDED entry', () => {
			const output = {
				ok: true,
				results: [
					{ action: 'respond', result: { ok: true } },
					{
						action: 'add_reaction',
						result: {
							ok: false,
							error: {
								code: INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED,
								message: 'Slack is limited',
							},
						},
					},
				],
			};
			expect(rateLimitMessageFromError(output)).toBe('Slack is limited');
		});

		it('returns undefined for a batch with no rate-limited entry', () => {
			const output = {
				ok: true,
				results: [
					{ action: 'respond', result: { ok: true } },
					{
						action: 'add_reaction',
						result: {
							ok: false,
							error: { code: INTEGRATION_ERROR_CODES.ACTION_FAILED, message: 'x' },
						},
					},
				],
			};
			expect(rateLimitMessageFromError(output)).toBeUndefined();
		});

		it('returns undefined for an unrelated error', () => {
			expect(rateLimitMessageFromError(new Error('something else'))).toBeUndefined();
		});

		it('returns undefined for an Error whose message merely contains the rate-limit phrase', () => {
			// Classification is status/code-based only — a message-only match must
			// not be treated as a rate limit.
			const error = new Error('Slack is temporarily limiting requests. Try later.');
			expect(rateLimitMessageFromError(error)).toBeUndefined();
		});
	});

	describe('caughtIntegrationError', () => {
		it('records the guard and returns RATE_LIMIT_EXCEEDED on a 429', () => {
			const guard = new ChannelRateLimitGuard();
			const error = Object.assign(new Error('rate limited'), {
				response: { status: 429 },
			});
			const result = caughtIntegrationError(error, {
				connectionId: 'slack:cred-a',
				platform: 'slack',
				guard,
				failedCode: INTEGRATION_ERROR_CODES.ACTION_FAILED,
			});
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED);
				expect(result.error.message).toContain('Slack');
			}
			expect(guard.isBlocked('slack:cred-a')).toBe(true);
		});

		it('returns the failedCode for a non-429 error', () => {
			const guard = new ChannelRateLimitGuard();
			const result = caughtIntegrationError(new Error('boom'), {
				connectionId: 'slack:cred-a',
				platform: 'slack',
				guard,
				failedCode: INTEGRATION_ERROR_CODES.ACTION_FAILED,
			});
			expect(result).toEqual({
				ok: false,
				error: { code: INTEGRATION_ERROR_CODES.ACTION_FAILED, message: 'boom' },
			});
			expect(guard.isBlocked('slack:cred-a')).toBe(false);
		});

		it('works with a guard of undefined', () => {
			const error = Object.assign(new Error('rate limited'), {
				response: { status: 429 },
			});
			const result = caughtIntegrationError(error, {
				connectionId: 'slack:cred-a',
				platform: 'slack',
				guard: undefined,
				failedCode: INTEGRATION_ERROR_CODES.ACTION_FAILED,
			});
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED);
			}
		});
	});

	describe('CHANNEL_RATE_LIMIT_COOLDOWN_MS', () => {
		it('is 15 minutes (900_000 ms)', () => {
			expect(CHANNEL_RATE_LIMIT_COOLDOWN_MS).toBe(900_000);
		});
	});
});
