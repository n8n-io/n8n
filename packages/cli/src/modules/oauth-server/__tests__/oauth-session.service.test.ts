import type { GlobalConfig } from '@n8n/config';
import type { Request, Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { mock } from 'vitest-mock-extended';
import { ZodError } from 'zod';

import { JwtService } from '@/services/jwt.service';

import {
	OAUTH_SESSION_COOKIE_PREFIX,
	OAuthSessionService,
	type OAuthSessionPayload,
} from '../oauth-session.service';

describe('OAuthSessionService', () => {
	const globalConfig = mock<GlobalConfig>({
		userManagement: { jwtSecret: 'random-secret' },
		auth: { cookie: { secure: true, samesite: 'lax' } },
		endpoints: { rest: 'rest' },
	});
	const jwtService = new JwtService(mock(), globalConfig);
	const oauthSessionService = new OAuthSessionService(jwtService, globalConfig);

	const sessionPayload: OAuthSessionPayload = {
		clientId: 'client-id',
		redirectUri: 'https://example.com/callback',
		codeChallenge: 'code-challenge',
		state: 'client-state',
	};

	/** A response whose request carries the given pending flow cookies. */
	const responseWith = (cookies: Record<string, string> = {}) =>
		mock<Response>({ req: mock<Request>({ cookies }) });

	describe('createSession', () => {
		it('should store the session under a flow id of its own', () => {
			const res = responseWith();

			const flowId = oauthSessionService.createSession(res, sessionPayload);

			expect(flowId).toMatch(/^[0-9a-z]{6,12}-[0-9a-f]{24}$/);
			// Exact, so a `path` narrower than the default cannot be added back:
			// it would hide the pending flows from /authorize, where they are
			// evicted, or from the consent endpoints, where they are read.
			expect(res.cookie).toHaveBeenCalledWith(
				`${OAUTH_SESSION_COOKIE_PREFIX}${flowId}`,
				expect.any(String),
				{
					httpOnly: true,
					secure: true,
					sameSite: 'lax',
					maxAge: 10 * 60 * 1000,
				},
			);
		});

		// `strict` would drop the cookie when another site hands the browser to
		// /authorize, which is how every flow starts.
		it('should relax a strict sameSite setting to lax', () => {
			globalConfig.auth.cookie.samesite = 'strict';
			const res = responseWith();

			try {
				oauthSessionService.createSession(res, sessionPayload);
			} finally {
				globalConfig.auth.cookie.samesite = 'lax';
			}

			expect(res.cookie).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({ sameSite: 'lax' }),
			);
		});

		it('should pass a none sameSite setting through', () => {
			globalConfig.auth.cookie.samesite = 'none';
			const res = responseWith();

			try {
				oauthSessionService.createSession(res, sessionPayload);
			} finally {
				globalConfig.auth.cookie.samesite = 'lax';
			}

			expect(res.cookie).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({ sameSite: 'none' }),
			);
		});

		it('should give two authorization requests separate cookies', () => {
			const first = responseWith();
			const firstFlowId = oauthSessionService.createSession(first, sessionPayload);

			// The browser now holds the first flow's cookie and starts a second flow.
			const second = responseWith({
				[`${OAUTH_SESSION_COOKIE_PREFIX}${firstFlowId}`]: 'first-token',
			});
			const secondFlowId = oauthSessionService.createSession(second, {
				...sessionPayload,
				codeChallenge: 'second-challenge',
			});

			expect(secondFlowId).not.toBe(firstFlowId);
			expect(second.clearCookie).not.toHaveBeenCalled();
			expect(second.cookie).toHaveBeenCalledWith(
				`${OAUTH_SESSION_COOKIE_PREFIX}${secondFlowId}`,
				expect.any(String),
				expect.anything(),
			);
		});

		it('should evict the oldest pending flow once the cap is reached', () => {
			// Three already pending, so the new one takes the oldest one's slot. Flow ids
			// carry a timestamp prefix, so sorting the names sorts them oldest first.
			const pending = ['a00000', 'b00000', 'c00000'].map(
				(prefix) => `${OAUTH_SESSION_COOKIE_PREFIX}${prefix}-${'0'.repeat(24)}`,
			);
			const res = responseWith(Object.fromEntries(pending.map((name) => [name, 'token'])));

			oauthSessionService.createSession(res, sessionPayload);

			expect(res.clearCookie).toHaveBeenCalledTimes(1);
			expect(res.clearCookie).toHaveBeenCalledWith(pending[0], expect.anything());
		});

		it('should leave cookies that are not pending flows alone', () => {
			const res = responseWith({ 'n8n-auth': 'auth-token' });

			oauthSessionService.createSession(res, sessionPayload);

			expect(res.clearCookie).not.toHaveBeenCalled();
		});
	});

	describe('getSessionToken', () => {
		it('should return the token of the named flow', () => {
			const flowId = `ktest00-${'a'.repeat(24)}`;
			const cookies = { [`${OAUTH_SESSION_COOKIE_PREFIX}${flowId}`]: 'session-token' };

			expect(oauthSessionService.getSessionToken(cookies, flowId)).toBe('session-token');
		});

		it('should not return the token of a different flow', () => {
			const cookies = { [`${OAUTH_SESSION_COOKIE_PREFIX}ktest00-${'a'.repeat(24)}`]: 'other' };

			expect(
				oauthSessionService.getSessionToken(cookies, `ktest01-${'b'.repeat(24)}`),
			).toBeUndefined();
		});

		// Keyed by the malformed id, so only the guard can make these pass: an
		// implementation that looked the name up regardless would return the token.
		it.each(['', 'not-a-flow-id', '../n8n-auth', '__proto__'])(
			'should reject the malformed flow id %s',
			(flowId) => {
				const cookies = { [`${OAUTH_SESSION_COOKIE_PREFIX}${flowId}`]: 'stale-token' };

				expect(oauthSessionService.getSessionToken(cookies, flowId)).toBeUndefined();
			},
		);
	});

	describe('clearSession', () => {
		it('should clear only the named flow', () => {
			const res = responseWith();
			const flowId = `ktest00-${'a'.repeat(24)}`;

			oauthSessionService.clearSession(res, flowId);

			expect(res.clearCookie).toHaveBeenCalledWith(
				`${OAUTH_SESSION_COOKIE_PREFIX}${flowId}`,
				expect.anything(),
			);
		});

		it('should do nothing for a malformed flow id', () => {
			const res = responseWith();

			oauthSessionService.clearSession(res, 'not-a-flow-id');

			expect(res.clearCookie).not.toHaveBeenCalled();
		});
	});

	describe('verifySession', () => {
		it('should return the payload of an authorization session token', () => {
			const token = jwtService.sign(sessionPayload, { expiresIn: '10m' });

			expect(oauthSessionService.verifySession(token)).toMatchObject(sessionPayload);
		});

		it('should throw when the signature does not match', () => {
			const token = jwtService.sign(sessionPayload, { expiresIn: '10m' });
			const [header, payload, signature] = token.split('.');
			const tampered = [header, payload, `${signature}x`].join('.');

			expect(() => oauthSessionService.verifySession(tampered)).toThrow(JsonWebTokenError);
		});

		it('should throw when the token has expired', () => {
			const token = jwtService.sign(sessionPayload, { expiresIn: -10 });

			expect(() => oauthSessionService.verifySession(token)).toThrow(TokenExpiredError);
		});

		it('should throw when the payload does not describe an authorization session', () => {
			const token = jwtService.sign({ sub: 'user-id' }, { expiresIn: '10m' });

			expect(() => oauthSessionService.verifySession(token)).toThrow(ZodError);
		});

		it('should throw when a required field is missing', () => {
			const { codeChallenge: _, ...withoutCodeChallenge } = sessionPayload;
			const token = jwtService.sign(withoutCodeChallenge, { expiresIn: '10m' });

			expect(() => oauthSessionService.verifySession(token)).toThrow(ZodError);
		});
	});
});
