import { mock } from 'jest-mock-extended';

import { OAuthJweServiceProxy, type OAuthJweDecryptHandler } from '@/oauth/oauth-jwe-service.proxy';

describe('OAuthJweServiceProxy', () => {
	it('returns input unchanged when no handler has been registered', async () => {
		const proxy = new OAuthJweServiceProxy();
		const input = { access_token: 'a' };

		const result = await proxy.decryptOAuth2TokenData(input);

		expect(result).toBe(input);
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
