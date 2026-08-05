import { mock } from 'vitest-mock-extended';

import type {
	ExternalTokenVerifier,
	VerifiedClaim,
} from '../external-token-verifier-proxy.service';
import { ExternalTokenVerifierProxy } from '../external-token-verifier-proxy.service';

describe('ExternalTokenVerifierProxy', () => {
	it('should fail verification gracefully when no provider is registered', async () => {
		const proxy = new ExternalTokenVerifierProxy();

		const result = await proxy.verifyExternalToken('some-token', 'https://n8n.example.com');

		expect(result.claim).toBeNull();
		expect(result.context).toMatchObject({ reason: 'verifier_not_registered' });
	});

	it('should delegate to the registered provider', async () => {
		const proxy = new ExternalTokenVerifierProxy();
		const claim = mock<VerifiedClaim>({ sourceId: 'source-1', subject: 'external-user-1' });
		const provider = mock<ExternalTokenVerifier>();
		provider.verifyExternalToken.mockResolvedValue({ claim });

		proxy.registerProvider(provider);

		const result = await proxy.verifyExternalToken(
			'some-token',
			'https://n8n.example.com/resource',
		);

		expect(provider.verifyExternalToken).toHaveBeenCalledWith(
			'some-token',
			'https://n8n.example.com/resource',
		);
		expect(result).toEqual({ claim });
	});
});
