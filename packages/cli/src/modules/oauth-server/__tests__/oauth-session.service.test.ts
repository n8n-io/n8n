import type { GlobalConfig } from '@n8n/config';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { mock } from 'vitest-mock-extended';
import { ZodError } from 'zod';

import { JwtService } from '@/services/jwt.service';

import { OAuthSessionService, type OAuthSessionPayload } from '../oauth-session.service';

describe('OAuthSessionService', () => {
	const globalConfig = mock<GlobalConfig>({
		userManagement: { jwtSecret: 'random-secret' },
	});
	const jwtService = new JwtService(mock(), globalConfig);
	const oauthSessionService = new OAuthSessionService(jwtService);

	const sessionPayload: OAuthSessionPayload = {
		clientId: 'client-id',
		redirectUri: 'https://example.com/callback',
		codeChallenge: 'code-challenge',
		state: 'client-state',
	};

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
