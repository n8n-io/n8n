import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

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
			undefined,
		);
		expect(result).toEqual({ user, authType: 'oauth' });
	});

	it('should pass a sealed resource grant through to the provider', async () => {
		const proxy = new OAuthTokenVerifierProxy();
		const provider = mock<OAuthTokenVerifier>();
		provider.verifyOAuthAccessToken.mockResolvedValue({ user: mock<User>(), authType: 'oauth' });
		proxy.registerProvider(provider);

		const grant = { audiences: ['https://n8n.example.com/webhook-test/abc?method=POST'] };

		await proxy.verifyOAuthAccessToken('some-token', 'https://n8n.example.com/x', grant);

		expect(provider.verifyOAuthAccessToken).toHaveBeenCalledWith(
			'some-token',
			'https://n8n.example.com/x',
			grant,
		);
	});

	describe('authorizeSealedGrant', () => {
		const grant = { audiences: ['https://n8n.example.com/x'], executeAccessWorkflowId: 'wf' };

		it('should fail closed when no provider is registered', async () => {
			const proxy = new OAuthTokenVerifierProxy();

			expect(await proxy.authorizeSealedGrant('user-1', grant)).toBe(false);
		});

		it('should delegate to the registered provider', async () => {
			const proxy = new OAuthTokenVerifierProxy();
			const provider = mock<OAuthTokenVerifier>();
			provider.authorizeSealedGrant.mockResolvedValue(true);
			proxy.registerProvider(provider);

			expect(await proxy.authorizeSealedGrant('user-1', grant)).toBe(true);
			expect(provider.authorizeSealedGrant).toHaveBeenCalledWith('user-1', grant);
		});
	});
});
