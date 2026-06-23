import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { OAuthTokenVerifier } from '../oauth-token-verifier-proxy.service';
import { OAuthTokenVerifierProxy } from '../oauth-token-verifier-proxy.service';

describe('OAuthTokenVerifierProxy', () => {
	it('should fail verification gracefully when no provider is registered', async () => {
		const proxy = new OAuthTokenVerifierProxy();

		const result = await proxy.verifyOAuthAccessToken('some-token', 'https://n8n.example.com');

		expect(result.user).toBeNull();
		expect(result.context).toMatchObject({ reason: 'verifier_not_registered', auth_type: 'oauth' });
	});

	it('should delegate to the registered provider', async () => {
		const proxy = new OAuthTokenVerifierProxy();
		const user = mock<User>({ id: 'user-1' });
		const provider = mock<OAuthTokenVerifier>();
		provider.verifyOAuthAccessToken.mockResolvedValue({ user, authType: 'oauth' });

		proxy.registerProvider(provider);

		const result = await proxy.verifyOAuthAccessToken(
			'some-token',
			'https://n8n.example.com/mcp-server/http',
		);

		expect(provider.verifyOAuthAccessToken).toHaveBeenCalledWith(
			'some-token',
			'https://n8n.example.com/mcp-server/http',
		);
		expect(result).toEqual({ user, authType: 'oauth' });
	});
});
