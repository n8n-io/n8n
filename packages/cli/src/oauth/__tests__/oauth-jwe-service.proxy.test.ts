import { mock } from 'jest-mock-extended';

import { OAuthJweServiceProxy, type OAuthJweDecryptHandler } from '@/oauth/oauth-jwe-service.proxy';

describe('OAuthJweServiceProxy', () => {
	const ORIGINAL_FLAG = process.env.N8N_ENV_FEAT_OAUTH2_JWE;

	afterEach(() => {
		if (ORIGINAL_FLAG === undefined) {
			delete process.env.N8N_ENV_FEAT_OAUTH2_JWE;
		} else {
			process.env.N8N_ENV_FEAT_OAUTH2_JWE = ORIGINAL_FLAG;
		}
	});

	it('returns input unchanged when feature flag is off', async () => {
		delete process.env.N8N_ENV_FEAT_OAUTH2_JWE;

		const handler = mock<OAuthJweDecryptHandler>();
		const proxy = new OAuthJweServiceProxy();
		proxy.setHandler(handler);
		const input = { access_token: 'a' };

		const result = await proxy.decryptOAuth2TokenData(input, { jweEnabled: true });

		expect(result).toBe(input);
		expect(handler.decryptOAuth2TokenData).not.toHaveBeenCalled();
	});

	it('returns input unchanged when no handler has been registered', async () => {
		process.env.N8N_ENV_FEAT_OAUTH2_JWE = 'true';

		const proxy = new OAuthJweServiceProxy();
		const input = { access_token: 'a' };

		const result = await proxy.decryptOAuth2TokenData(input, { jweEnabled: true });

		expect(result).toBe(input);
	});

	it('delegates to the registered handler when the flag is on', async () => {
		process.env.N8N_ENV_FEAT_OAUTH2_JWE = 'true';

		const handler = mock<OAuthJweDecryptHandler>();
		handler.decryptOAuth2TokenData.mockResolvedValue({ access_token: 'decrypted' });
		const proxy = new OAuthJweServiceProxy();
		proxy.setHandler(handler);

		const result = await proxy.decryptOAuth2TokenData({ access_token: 'a' }, { jweEnabled: true });

		expect(handler.decryptOAuth2TokenData).toHaveBeenCalledWith(
			{ access_token: 'a' },
			{ jweEnabled: true },
		);
		expect(result).toEqual({ access_token: 'decrypted' });
	});

	it('propagates errors thrown by the handler', async () => {
		process.env.N8N_ENV_FEAT_OAUTH2_JWE = 'true';

		const handler = mock<OAuthJweDecryptHandler>();
		handler.decryptOAuth2TokenData.mockRejectedValue(new Error('decrypt failed'));
		const proxy = new OAuthJweServiceProxy();
		proxy.setHandler(handler);

		await expect(
			proxy.decryptOAuth2TokenData({ access_token: 'a' }, { jweEnabled: true }),
		).rejects.toThrow('decrypt failed');
	});
});
