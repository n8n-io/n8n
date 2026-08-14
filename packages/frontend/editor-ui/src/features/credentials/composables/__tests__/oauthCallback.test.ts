import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CREDENTIAL_EMPTY_VALUE } from 'n8n-workflow';
import {
	getTrustedOAuthOrigins,
	parseOAuthCallbackMessage,
	waitForOAuthCallback,
	isOAuthTokenDataSet,
	hasOAuthTokenData,
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

	describe('isOAuthTokenDataSet', () => {
		it('returns true for a redacted token placeholder', () => {
			expect(isOAuthTokenDataSet({ oauthTokenData: '__n8n_BLANK_VALUE' })).toBe(true);
		});

		it('returns false when token data is absent', () => {
			expect(isOAuthTokenDataSet({})).toBe(false);
			expect(isOAuthTokenDataSet(undefined)).toBe(false);
			expect(isOAuthTokenDataSet(null)).toBe(false);
		});

		it('returns false for falsy or empty-sentinel token data', () => {
			expect(isOAuthTokenDataSet({ oauthTokenData: null })).toBe(false);
			expect(isOAuthTokenDataSet({ oauthTokenData: CREDENTIAL_EMPTY_VALUE })).toBe(false);
		});
	});

	describe('hasOAuthTokenData', () => {
		it('returns true when the fetched credential data contains token data', () => {
			expect(hasOAuthTokenData({ data: { oauthTokenData: '__n8n_BLANK_VALUE' } })).toBe(true);
		});

		it('returns false when the credential or its data lacks token data', () => {
			expect(hasOAuthTokenData(undefined)).toBe(false);
			expect(hasOAuthTokenData({})).toBe(false);
			expect(hasOAuthTokenData({ data: undefined })).toBe(false);
			expect(hasOAuthTokenData({ data: {} })).toBe(false);
			expect(hasOAuthTokenData({ data: { oauthTokenData: CREDENTIAL_EMPTY_VALUE } })).toBe(false);
		});
	});

	describe('waitForOAuthCallback', () => {
		class MockBroadcastChannel {
			static instances: MockBroadcastChannel[] = [];

			handlers: Array<(e: MessageEvent) => void> = [];

			closed = false;

			constructor(public name: string) {
				MockBroadcastChannel.instances.push(this);
			}

			addEventListener(event: string, handler: (e: MessageEvent) => void) {
				if (event === 'message') this.handlers.push(handler);
			}

			removeEventListener(_event: string, handler: (e: MessageEvent) => void) {
				this.handlers = this.handlers.filter((h) => h !== handler);
			}

			close() {
				this.closed = true;
			}

			postMessage = vi.fn();

			emit(data: unknown) {
				for (const handler of [...this.handlers]) {
					handler({ data } as MessageEvent);
				}
			}
		}

		const trustedOrigins = [window.location.origin];

		function createPopup(closed = false) {
			return { closed, close: vi.fn() } as unknown as Window;
		}

		function lastChannel() {
			return MockBroadcastChannel.instances[MockBroadcastChannel.instances.length - 1];
		}

		beforeEach(() => {
			vi.useFakeTimers();
			MockBroadcastChannel.instances = [];
			vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
		});

		afterEach(() => {
			vi.useRealTimers();
			vi.unstubAllGlobals();
		});

		it('resolves "success" on a BroadcastChannel success message', async () => {
			const promise = waitForOAuthCallback({ popup: createPopup(), trustedOrigins });

			lastChannel().emit(OAUTH_CALLBACK_SUCCESS);

			await expect(promise).resolves.toBe(OAUTH_CALLBACK_SUCCESS);
			expect(lastChannel().closed).toBe(true);
		});

		it('resolves "error" on a BroadcastChannel non-success message', async () => {
			const promise = waitForOAuthCallback({ popup: createPopup(), trustedOrigins });

			lastChannel().emit(OAUTH_CALLBACK_ERROR);

			await expect(promise).resolves.toBe(OAUTH_CALLBACK_ERROR);
		});

		it('resolves via a window message from a trusted origin', async () => {
			const promise = waitForOAuthCallback({ popup: createPopup(), trustedOrigins });

			window.dispatchEvent(
				new MessageEvent('message', {
					data: OAUTH_CALLBACK_SUCCESS,
					origin: window.location.origin,
				}),
			);

			await expect(promise).resolves.toBe(OAUTH_CALLBACK_SUCCESS);
		});

		it('ignores window messages from untrusted origins', async () => {
			const promise = waitForOAuthCallback({
				popup: createPopup(),
				trustedOrigins,
				timeoutMs: 3000,
			});

			window.dispatchEvent(
				new MessageEvent('message', {
					data: OAUTH_CALLBACK_SUCCESS,
					origin: 'https://evil.example.com',
				}),
			);

			await vi.advanceTimersByTimeAsync(3000);
			await expect(promise).resolves.toBe('timeout');
		});

		it('does not fail when the popup reads as closed and resolves once verifyConnected reports success', async () => {
			// A provider responding with COOP `same-origin` severs the opener
			// relationship, so `popup.closed` reads true while the flow is running.
			const verifyConnected = vi
				.fn<() => Promise<boolean>>()
				.mockResolvedValueOnce(false)
				.mockResolvedValue(true);

			const promise = waitForOAuthCallback({
				popup: createPopup(true),
				trustedOrigins,
				verifyConnected,
			});

			await vi.advanceTimersByTimeAsync(500);
			expect(verifyConnected).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(2000);
			await expect(promise).resolves.toBe(OAUTH_CALLBACK_SUCCESS);
		});

		it('keeps waiting for verifyConnected while it reports not connected', async () => {
			const verifyConnected = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);

			const promise = waitForOAuthCallback({
				popup: createPopup(true),
				trustedOrigins,
				verifyConnected,
				timeoutMs: 10_000,
			});

			await vi.advanceTimersByTimeAsync(10_000);
			await expect(promise).resolves.toBe('timeout');
			expect(verifyConnected.mock.calls.length).toBeGreaterThan(1);
		});

		it('keeps waiting for verification errors and settles on a later success', async () => {
			const verifyConnected = vi
				.fn<() => Promise<boolean>>()
				.mockRejectedValueOnce(new Error('network'))
				.mockResolvedValue(true);

			const promise = waitForOAuthCallback({
				popup: createPopup(true),
				trustedOrigins,
				verifyConnected,
			});

			await vi.advanceTimersByTimeAsync(2500);
			await expect(promise).resolves.toBe(OAUTH_CALLBACK_SUCCESS);
		});

		it('still resolves via messages after the popup reads as closed without a verifier', async () => {
			const promise = waitForOAuthCallback({ popup: createPopup(true), trustedOrigins });

			await vi.advanceTimersByTimeAsync(1500);

			lastChannel().emit(OAUTH_CALLBACK_SUCCESS);
			await expect(promise).resolves.toBe(OAUTH_CALLBACK_SUCCESS);
		});

		it('resolves "timeout" when no result arrives in time', async () => {
			const promise = waitForOAuthCallback({
				popup: createPopup(),
				trustedOrigins,
				timeoutMs: 3000,
			});

			await vi.advanceTimersByTimeAsync(3000);
			await expect(promise).resolves.toBe('timeout');
		});

		it('resolves "aborted" when the signal aborts', async () => {
			const controller = new AbortController();
			const promise = waitForOAuthCallback({
				popup: createPopup(),
				trustedOrigins,
				signal: controller.signal,
			});

			controller.abort();
			await expect(promise).resolves.toBe('aborted');
		});

		it('resolves "aborted" immediately for an already-aborted signal', async () => {
			const controller = new AbortController();
			controller.abort();

			const promise = waitForOAuthCallback({
				popup: createPopup(),
				trustedOrigins,
				signal: controller.signal,
			});

			await expect(promise).resolves.toBe('aborted');
		});
	});
});
