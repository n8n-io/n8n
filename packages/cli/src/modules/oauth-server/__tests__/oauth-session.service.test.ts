import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { JwtService } from '@/services/jwt.service';

import { OAuthSessionService, type OAuthSessionPayload } from '../oauth-session.service';

describe('OAuthSessionService', () => {
	const globalConfig = mock<GlobalConfig>({
		userManagement: { jwtSecret: 'random-secret' },
	});
	const jwtService = new JwtService(mock(), globalConfig, mock());
	const oauthSessionService = new OAuthSessionService(jwtService);

	const sessionPayload: OAuthSessionPayload = {
		clientId: 'client-id',
		redirectUri: 'https://example.com/callback',
		codeChallenge: 'code-challenge',
		state: 'client-state',
	};

	describe('verifySession', () => {
		it('should return the payload of an authorization session token', () => {
			const token = jwtService.sign('oauthSession', sessionPayload, { expiresIn: '10m' });

			expect(oauthSessionService.verifySession(token)).toMatchObject(sessionPayload);
		});

		it('should throw when the payload does not describe an authorization session', () => {
			const token = jwtService.sign('oauthSession', { sub: 'user-id' }, { expiresIn: '10m' });

			expect(() => oauthSessionService.verifySession(token)).toThrow();
		});

		it('should throw when a required field is missing', () => {
			const { codeChallenge: _, ...withoutCodeChallenge } = sessionPayload;
			const token = jwtService.sign('oauthSession', withoutCodeChallenge, { expiresIn: '10m' });

			expect(() => oauthSessionService.verifySession(token)).toThrow();
		});
	});
});
