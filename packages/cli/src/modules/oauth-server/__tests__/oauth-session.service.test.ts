import type { GlobalConfig } from '@n8n/config';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { JwtService } from '@/services/jwt.service';

import { OAuthSessionService, type OAuthSessionPayload } from '../oauth-session.service';

const payload: OAuthSessionPayload = {
	clientId: 'client-id',
	redirectUri: 'https://example.com/callback',
	codeChallenge: 'code-challenge',
	state: 'state',
};

describe('OAuthSessionService', () => {
	it.each([true, false])('sets secure=%s from the auth cookie config', (secure) => {
		const jwtService = mock<JwtService>();
		jwtService.sign.mockReturnValue('session-token');
		const globalConfig = mock<GlobalConfig>({ auth: { cookie: { secure } } });
		const response = mock<Response>();
		const service = new OAuthSessionService(jwtService, globalConfig);

		service.createSession(response, payload);

		expect(response.cookie).toHaveBeenCalledWith(
			'n8n-oauth-session',
			'session-token',
			expect.objectContaining({ secure }),
		);
	});
});
