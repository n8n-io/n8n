import type { GlobalConfig } from '@n8n/config';
import type { Request, Response } from 'express';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import {
	OAUTH_BINDING_COOKIE_NAME,
	OAuthBrowserBindingService,
} from '@/oauth/oauth-browser-binding.service';

const makeConfig = (
	overrides: Partial<{
		secure: boolean;
		samesite: 'strict' | 'lax' | 'none';
		oauthBrowserBinding: boolean;
		restEndpoint: string;
	}> = {},
) =>
	mock<GlobalConfig>({
		auth: {
			cookie: { secure: overrides.secure ?? true, samesite: overrides.samesite ?? 'lax' },
			oauthBrowserBinding: overrides.oauthBrowserBinding ?? true,
		},
		endpoints: { rest: overrides.restEndpoint ?? 'rest' },
	});

const makeReq = (cookies: Record<string, unknown> = {}) => ({ cookies }) as unknown as Request;

const makeRes = () => {
	const res = { cookie: vi.fn().mockReturnThis() } as unknown as Response;
	return res;
};

describe('OAuthBrowserBindingService', () => {
	describe('isEnabled', () => {
		it('reflects the auth.oauthBrowserBinding config value', () => {
			expect(
				new OAuthBrowserBindingService(makeConfig({ oauthBrowserBinding: true })).isEnabled(),
			).toBe(true);
			expect(
				new OAuthBrowserBindingService(makeConfig({ oauthBrowserBinding: false })).isEnabled(),
			).toBe(false);
		});
	});

	describe('ensureBindingCookie', () => {
		it('mints a new nonce and sets the cookie when none is present', () => {
			const service = new OAuthBrowserBindingService(makeConfig());
			const req = makeReq();
			const res = makeRes();

			const nonce = service.ensureBindingCookie(req, res);

			expect(typeof nonce).toBe('string');
			expect(nonce.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url ≈ 43 chars
			expect(res.cookie).toHaveBeenCalledWith(
				OAUTH_BINDING_COOKIE_NAME,
				nonce,
				expect.objectContaining({
					httpOnly: true,
					secure: true,
					sameSite: 'lax',
					path: '/rest',
				}),
			);
		});

		it('reuses an existing cookie value when present', () => {
			const service = new OAuthBrowserBindingService(makeConfig());
			const req = makeReq({ [OAUTH_BINDING_COOKIE_NAME]: 'existing-nonce' });
			const res = makeRes();

			const nonce = service.ensureBindingCookie(req, res);

			expect(nonce).toBe('existing-nonce');
			expect(res.cookie).not.toHaveBeenCalled();
		});

		it('inherits secure=false from config', () => {
			const service = new OAuthBrowserBindingService(makeConfig({ secure: false }));
			const res = makeRes();

			service.ensureBindingCookie(makeReq(), res);

			expect(res.cookie).toHaveBeenCalledWith(
				OAUTH_BINDING_COOKIE_NAME,
				expect.any(String),
				expect.objectContaining({ secure: false }),
			);
		});

		it('clamps SameSite=strict to lax', () => {
			const service = new OAuthBrowserBindingService(makeConfig({ samesite: 'strict' }));
			const res = makeRes();

			service.ensureBindingCookie(makeReq(), res);

			expect(res.cookie).toHaveBeenCalledWith(
				OAUTH_BINDING_COOKIE_NAME,
				expect.any(String),
				expect.objectContaining({ sameSite: 'lax' }),
			);
		});

		it('passes SameSite=none through unchanged', () => {
			const service = new OAuthBrowserBindingService(makeConfig({ samesite: 'none' }));
			const res = makeRes();

			service.ensureBindingCookie(makeReq(), res);

			expect(res.cookie).toHaveBeenCalledWith(
				OAUTH_BINDING_COOKIE_NAME,
				expect.any(String),
				expect.objectContaining({ sameSite: 'none' }),
			);
		});

		it('uses the configured REST endpoint as the cookie path', () => {
			const service = new OAuthBrowserBindingService(makeConfig({ restEndpoint: 'api/v1' }));
			const res = makeRes();

			service.ensureBindingCookie(makeReq(), res);

			expect(res.cookie).toHaveBeenCalledWith(
				OAUTH_BINDING_COOKIE_NAME,
				expect.any(String),
				expect.objectContaining({ path: '/api/v1' }),
			);
		});

		it('does not set a Max-Age (session cookie)', () => {
			const service = new OAuthBrowserBindingService(makeConfig());
			const res = makeRes();

			service.ensureBindingCookie(makeReq(), res);

			const [, , options] = (res.cookie as Mock).mock.calls[0];
			expect(options.maxAge).toBeUndefined();
			expect(options.expires).toBeUndefined();
		});
	});

	describe('computeHash', () => {
		it('is deterministic for the same input', () => {
			const service = new OAuthBrowserBindingService(makeConfig());
			expect(service.computeHash('abc')).toBe(service.computeHash('abc'));
		});

		it('differs for different inputs', () => {
			const service = new OAuthBrowserBindingService(makeConfig());
			expect(service.computeHash('abc')).not.toBe(service.computeHash('abd'));
		});

		it('emits a base64url-encoded SHA-256 digest', () => {
			const service = new OAuthBrowserBindingService(makeConfig());
			const hash = service.computeHash('any-nonce-value');
			expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
			expect(hash.length).toBe(43); // 32 bytes base64url with no padding
		});
	});

	describe('verifyBinding', () => {
		const service = new OAuthBrowserBindingService(makeConfig());
		const nonce = 'matching-nonce-value';
		const expectedHash = service.computeHash(nonce);

		it('returns ok when cookie hashes to expected value', () => {
			expect(
				service.verifyBinding(makeReq({ [OAUTH_BINDING_COOKIE_NAME]: nonce }), expectedHash),
			).toEqual({ ok: true });
		});

		it('returns cookie-missing when no binding cookie is present', () => {
			expect(service.verifyBinding(makeReq(), expectedHash)).toEqual({
				ok: false,
				reason: 'cookie-missing',
			});
		});

		it('returns hash-mismatch when cookie value does not match', () => {
			expect(
				service.verifyBinding(
					makeReq({ [OAUTH_BINDING_COOKIE_NAME]: 'different-nonce' }),
					expectedHash,
				),
			).toEqual({ ok: false, reason: 'hash-mismatch' });
		});

		it('returns hash-mismatch when expected hash length differs (timingSafeEqual length pre-check)', () => {
			expect(
				service.verifyBinding(makeReq({ [OAUTH_BINDING_COOKIE_NAME]: nonce }), 'short'),
			).toEqual({ ok: false, reason: 'hash-mismatch' });
		});

		it('returns cookie-missing when cookie value is non-string', () => {
			const req = { cookies: { [OAUTH_BINDING_COOKIE_NAME]: 123 } } as unknown as Request;
			expect(service.verifyBinding(req, expectedHash)).toEqual({
				ok: false,
				reason: 'cookie-missing',
			});
		});
	});
});
