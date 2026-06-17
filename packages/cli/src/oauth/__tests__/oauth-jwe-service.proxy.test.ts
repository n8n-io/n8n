import { mock } from 'jest-mock-extended';
import { UserError } from 'n8n-workflow';

import { OAuthJweServiceProxy, type OAuthJweHandler } from '@/oauth/oauth-jwe-service.proxy';

describe('OAuthJweServiceProxy', () => {
	describe('decryptOAuth2TokenData', () => {
		const NO_HANDLER_MESSAGE =
			'OAuth2 JWE decryption was requested but the feature is not enabled on this instance';

		it('throws when no handler has been registered', async () => {
			const proxy = new OAuthJweServiceProxy();

			await expect(proxy.decryptOAuth2TokenData({ access_token: 'a' })).rejects.toThrow(UserError);
			await expect(proxy.decryptOAuth2TokenData({ access_token: 'a' })).rejects.toThrow(
				NO_HANDLER_MESSAGE,
			);
		});

		it('delegates to the registered handler', async () => {
			const handler = mock<OAuthJweHandler>();
			handler.decryptOAuth2TokenData.mockResolvedValue({ access_token: 'decrypted' });
			const proxy = new OAuthJweServiceProxy();
			proxy.setHandler(handler);

			const result = await proxy.decryptOAuth2TokenData({ access_token: 'a' });

			expect(handler.decryptOAuth2TokenData).toHaveBeenCalledWith({ access_token: 'a' });
			expect(result).toEqual({ access_token: 'decrypted' });
		});

		it('propagates errors thrown by the handler', async () => {
			const handler = mock<OAuthJweHandler>();
			handler.decryptOAuth2TokenData.mockRejectedValue(new Error('decrypt failed'));
			const proxy = new OAuthJweServiceProxy();
			proxy.setHandler(handler);

			await expect(proxy.decryptOAuth2TokenData({ access_token: 'a' })).rejects.toThrow(
				'decrypt failed',
			);
		});
	});

	describe('getDcrJweFields', () => {
		it('returns an empty object when no handler is registered (feature off)', async () => {
			const proxy = new OAuthJweServiceProxy();

			await expect(proxy.getDcrJweFields(false)).resolves.toEqual({});
		});

		it('delegates with inlineJwks=false to the registered handler', async () => {
			const fields = {
				jwks_uri: 'http://localhost:5678/rest/.well-known/jwks.json',
				id_token_encrypted_response_alg: 'RSA-OAEP-256',
			};
			const handler = mock<OAuthJweHandler>();
			handler.getDcrJweFields.mockResolvedValue(fields);
			const proxy = new OAuthJweServiceProxy();
			proxy.setHandler(handler);

			const result = await proxy.getDcrJweFields(false);

			expect(handler.getDcrJweFields).toHaveBeenCalledWith(false);
			expect(result).toEqual(fields);
		});

		it('delegates with inlineJwks=true to the registered handler', async () => {
			const fields = {
				jwks: { keys: [{ kty: 'RSA', alg: 'RSA-OAEP-256', kid: 'kid-1' }] },
				id_token_encrypted_response_alg: 'RSA-OAEP-256',
			};
			const handler = mock<OAuthJweHandler>();
			handler.getDcrJweFields.mockResolvedValue(fields);
			const proxy = new OAuthJweServiceProxy();
			proxy.setHandler(handler);

			const result = await proxy.getDcrJweFields(true);

			expect(handler.getDcrJweFields).toHaveBeenCalledWith(true);
			expect(result).toEqual(fields);
		});
	});
});
