import { describe, it, expect } from 'vitest';
import {
	getTrustedOAuthOrigins,
	parseOAuthCallbackMessage,
	OAUTH_CALLBACK_SUCCESS,
	OAUTH_CALLBACK_ERROR,
} from '../oauthCallback';

describe('oauthCallback', () => {
	describe('getTrustedOAuthOrigins', () => {
		it('always trusts the current window origin', () => {
			const origins = getTrustedOAuthOrigins('');
			expect(origins).toContain(window.location.origin);
		});

		it('trusts the origin of an absolute editor base URL', () => {
			const origins = getTrustedOAuthOrigins('https://integration-app.brevo.com/');
			expect(origins).toContain('https://integration-app.brevo.com');
		});

		it('resolves a relative editor base URL against the current origin', () => {
			const origins = getTrustedOAuthOrigins('/');
			expect(origins).toEqual([window.location.origin]);
		});

		it('ignores a malformed editor base URL but keeps the current origin', () => {
			const origins = getTrustedOAuthOrigins('http://');
			expect(origins).toContain(window.location.origin);
		});

		it('deduplicates when the editor base URL is the current origin', () => {
			const origins = getTrustedOAuthOrigins(window.location.origin);
			expect(origins).toEqual([window.location.origin]);
		});
	});

	describe('parseOAuthCallbackMessage', () => {
		const trusted = ['https://integration-app.brevo.com'];

		it('returns "success" for a success payload from a trusted origin', () => {
			const event = {
				origin: 'https://integration-app.brevo.com',
				data: 'success',
			} as MessageEvent;
			expect(parseOAuthCallbackMessage(event, trusted)).toBe(OAUTH_CALLBACK_SUCCESS);
		});

		it('returns "error" for an error payload from a trusted origin', () => {
			const event = {
				origin: 'https://integration-app.brevo.com',
				data: 'error',
			} as MessageEvent;
			expect(parseOAuthCallbackMessage(event, trusted)).toBe(OAUTH_CALLBACK_ERROR);
		});

		it('returns null for a message from an untrusted origin', () => {
			const event = {
				origin: 'https://evil.example.com',
				data: 'success',
			} as MessageEvent;
			expect(parseOAuthCallbackMessage(event, trusted)).toBeNull();
		});

		it('returns null for an unrelated payload from a trusted origin', () => {
			const event = {
				origin: 'https://integration-app.brevo.com',
				data: { type: 'something-else' },
			} as MessageEvent;
			expect(parseOAuthCallbackMessage(event, trusted)).toBeNull();
		});
	});
});
