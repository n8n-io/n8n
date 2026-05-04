import { mock } from 'jest-mock-extended';
import { UserError } from 'n8n-workflow';

import { OAuthJweServiceProxy, type OAuthJweDecryptHandler } from '@/oauth/oauth-jwe-service.proxy';

describe('OAuthJweServiceProxy', () => {
	it('throws when no handler has been registered', async () => {
		const proxy = new OAuthJweServiceProxy();

		await expect(proxy.decryptOAuth2TokenData({ access_token: 'a' })).rejects.toThrow(UserError);
		await expect(proxy.decryptOAuth2TokenData({ access_token: 'a' })).rejects.toThrow(
			'OAuth2 JWE decryption was requested but the feature is not enabled on this instance',
		);
	});

	it('delegates to the registered handler', async () => {
		const handler = mock<OAuthJweDecryptHandler>();
		handler.decryptOAuth2TokenData.mockResolvedValue({ access_token: 'decrypted' });
		const proxy = new OAuthJweServiceProxy();
		proxy.setHandler(handler);

		const result = await proxy.decryptOAuth2TokenData({ access_token: 'a' });

		expect(handler.decryptOAuth2TokenData).toHaveBeenCalledWith({ access_token: 'a' });
		expect(result).toEqual({ access_token: 'decrypted' });
	});

	it('propagates errors thrown by the handler', async () => {
		const handler = mock<OAuthJweDecryptHandler>();
		handler.decryptOAuth2TokenData.mockRejectedValue(new Error('decrypt failed'));
		const proxy = new OAuthJweServiceProxy();
		proxy.setHandler(handler);

		await expect(proxy.decryptOAuth2TokenData({ access_token: 'a' })).rejects.toThrow(
			'decrypt failed',
		);
	});
});
