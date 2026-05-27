import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';

import { AuthError } from '@/errors/response-errors/auth.error';
import {
	OAUTH_BINDING_COOKIE_NAME,
	OAuthBrowserBindingService,
} from '@/oauth/oauth-browser-binding.service';

const makeConfig = (
	overrides: Partial<{
		secure: boolean;
		samesite: 'strict' | 'lax' | 'none';
		oauthBrowserBinding: boolean;
	}> = {},
) =>
	mock<GlobalConfig>({
		auth: {
			cookie: { secure: overrides.secure ?? true, samesite: overrides.samesite ?? 'lax' },
			oauthBrowserBinding: overrides.oauthBrowserBinding ?? true,
		},
	});

const makeReq = (cookies: Record<string, unknown> = {}) => ({ cookies }) as unknown as Request;

const makeRes = () => {
	const res = { cookie: jest.fn().mockReturnThis() } as unknown as Response;
	return res;
};

describe('OAuthBrowserBindingService', () => {
	const logger = mock<Logger>();

	describe('isEnabled', () => {
		it('reflects the auth.oauthBrowserBinding config value', () => {
			expect(
				new OAuthBrowserBindingService(
					logger,
					makeConfig({ oauthBrowserBinding: true }),
				).isEnabled(),
			).toBe(true);
			expect(
				new OAuthBrowserBindingService(
					logger,
					makeConfig({ oauthBrowserBinding: false }),
				).isEnabled(),
			).toBe(false);
		});
	});

	describe('ensureBindingCookie', () => {
		it('mints a new nonce and sets the cookie when none is present', () => {
			const service = new OAuthBrowserBindingService(logger, makeConfig());
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
			const service = new OAuthBrowserBindingService(logger, makeConfig());
			const req = makeReq({ [OAUTH_BINDING_COOKIE_NAME]: 'existing-nonce' });
			const res = makeRes();

			const nonce = service.ensureBindingCookie(req, res);

			expect(nonce).toBe('existing-nonce');
			expect(res.cookie).not.toHaveBeenCalled();
		});

		it('inherits secure=false from config', () => {
			const service = new OAuthBrowserBindingService(logger, makeConfig({ secure: false }));
			const res = makeRes();

			service.ensureBindingCookie(makeReq(), res);

			expect(res.cookie).toHaveBeenCalledWith(
				OAUTH_BINDING_COOKIE_NAME,
				expect.any(String),
				expect.objectContaining({ secure: false }),
			);
		});

		it('clamps SameSite=strict to lax', () => {
			const service = new OAuthBrowserBindingService(logger, makeConfig({ samesite: 'strict' }));
			const res = makeRes();

			service.ensureBindingCookie(makeReq(), res);

			expect(res.cookie).toHaveBeenCalledWith(
				OAUTH_BINDING_COOKIE_NAME,
				expect.any(String),
				expect.objectContaining({ sameSite: 'lax' }),
			);
		});

		it('passes SameSite=none through unchanged', () => {
			const service = new OAuthBrowserBindingService(logger, makeConfig({ samesite: 'none' }));
			const res = makeRes();

			service.ensureBindingCookie(makeReq(), res);

			expect(res.cookie).toHaveBeenCalledWith(
				OAUTH_BINDING_COOKIE_NAME,
				expect.any(String),
				expect.objectContaining({ sameSite: 'none' }),
			);
		});

		it('does not set a Max-Age (session cookie)', () => {
			const service = new OAuthBrowserBindingService(logger, makeConfig());
			const res = makeRes();

			service.ensureBindingCookie(makeReq(), res);

			const [, , options] = (res.cookie as jest.Mock).mock.calls[0];
			expect(options.maxAge).toBeUndefined();
			expect(options.expires).toBeUndefined();
		});
	});

	describe('computeHash', () => {
		it('is deterministic for the same input', () => {
			const service = new OAuthBrowserBindingService(logger, makeConfig());
			expect(service.computeHash('abc')).toBe(service.computeHash('abc'));
		});

		it('differs for different inputs', () => {
			const service = new OAuthBrowserBindingService(logger, makeConfig());
			expect(service.computeHash('abc')).not.toBe(service.computeHash('abd'));
		});

		it('emits a base64url-encoded SHA-256 digest', () => {
			const service = new OAuthBrowserBindingService(logger, makeConfig());
			const hash = service.computeHash('any-nonce-value');
			expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
			expect(hash.length).toBe(43); // 32 bytes base64url with no padding
		});
	});

	describe('verifyBindingOrThrow', () => {
		const service = new OAuthBrowserBindingService(logger, makeConfig());
		const nonce = 'matching-nonce-value';
		const expectedHash = service.computeHash(nonce);

		it('passes when cookie hashes to expected value', () => {
			expect(() =>
				service.verifyBindingOrThrow(makeReq({ [OAUTH_BINDING_COOKIE_NAME]: nonce }), expectedHash),
			).not.toThrow();
		});

		it('throws AuthError when cookie is missing', () => {
			expect(() => service.verifyBindingOrThrow(makeReq(), expectedHash)).toThrow(AuthError);
		});

		it('throws AuthError when cookie value does not match', () => {
			expect(() =>
				service.verifyBindingOrThrow(
					makeReq({ [OAUTH_BINDING_COOKIE_NAME]: 'different-nonce' }),
					expectedHash,
				),
			).toThrow(AuthError);
		});

		it('throws AuthError when expected hash length differs (no length-leak via timingSafeEqual)', () => {
			expect(() =>
				service.verifyBindingOrThrow(makeReq({ [OAUTH_BINDING_COOKIE_NAME]: nonce }), 'short'),
			).toThrow(AuthError);
		});

		it('throws AuthError when cookie value is non-string', () => {
			const req = { cookies: { [OAUTH_BINDING_COOKIE_NAME]: 123 } } as unknown as Request;
			expect(() => service.verifyBindingOrThrow(req, expectedHash)).toThrow(AuthError);
		});
	});
});
