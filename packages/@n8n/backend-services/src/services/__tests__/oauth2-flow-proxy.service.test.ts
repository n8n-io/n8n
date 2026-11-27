import type { OperationContext } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { OAuth2FlowProxy, type N8nOAuth2Flow } from '../oauth2-flow-proxy.service';

describe('OAuth2FlowProxy.revokeClients', () => {
	const ctx = mock<OperationContext>();
	const urls = ['https://sales.apps.example.com/_n8n/auth/app-1/callback'];

	it('does nothing without a provider', async () => {
		await expect(new OAuth2FlowProxy().revokeClients(urls, ctx)).resolves.toBeUndefined();
	});

	it('passes the URLs and the context to the provider', async () => {
		const proxy = new OAuth2FlowProxy();
		const provider = mock<N8nOAuth2Flow>();
		proxy.registerProvider(provider);

		await proxy.revokeClients(urls, ctx);
		await proxy.revokeClients([], ctx);

		expect(provider.revokeClients).toHaveBeenCalledExactlyOnceWith(urls, ctx);
	});
});
