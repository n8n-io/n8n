import { mock } from 'vitest-mock-extended';

import {
	TrustedKeySourceRegistrationProxy,
	type TrustedKeySourceRegistrar,
} from '@/services/trusted-key-source-registration-proxy.service';

describe('TrustedKeySourceRegistrationProxy', () => {
	it('no-ops when no provider is registered', async () => {
		const proxy = new TrustedKeySourceRegistrationProxy();

		await expect(
			proxy.registerFromDiscovery('https://idp.example.com', 'https://idp.example.com/jwks.json'),
		).resolves.toBeUndefined();
	});

	it('delegates to the registered provider', async () => {
		const proxy = new TrustedKeySourceRegistrationProxy();
		const provider = mock<TrustedKeySourceRegistrar>();
		proxy.registerProvider(provider);

		await proxy.registerFromDiscovery(
			'https://idp.example.com',
			'https://idp.example.com/jwks.json',
			'n8n-client-id',
		);

		expect(provider.registerFromDiscovery).toHaveBeenCalledWith(
			'https://idp.example.com',
			'https://idp.example.com/jwks.json',
			'n8n-client-id',
		);
	});
});
