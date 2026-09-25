import { OutboundHttp } from '@n8n/backend-network';
import type { HttpRequestClient } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { CredentialTestContext } from '../credentials-test-context';

// The SSH tunnel helpers resolve a manager from the container; stub them out so
// constructing the context stays a pure unit test focused on the request path.
vi.mock('../utils/ssh-tunnel-helper-functions', () => ({
	getSSHTunnelFunctions: () => ({}),
}));

/**
 * `CredentialTestContext` is the execution context for function-based credential
 * tests. Its `helpers.request` must go through the default (safe) request
 * client so that test requests honour the same egress policy as regular node
 * execution. These tests assert that wiring; the actual SSRF enforcement lives
 * in `@n8n/backend-network`.
 */
describe('CredentialTestContext', () => {
	const requestLegacy = vi.fn();
	const requests = vi.fn();
	const outboundHttp = mock<OutboundHttp>({ requests });

	beforeEach(() => {
		vi.resetAllMocks();
		requestLegacy.mockResolvedValue('response-body');
		requests.mockReturnValue(mock<HttpRequestClient>({ requestLegacy }));
		Container.set(OutboundHttp, outboundHttp);
	});

	it('routes requests through the default safe client', async () => {
		const context = new CredentialTestContext();
		const body = await context.helpers.request('https://example.test');

		expect(body).toBe('response-body');
		expect(requests).toHaveBeenCalledWith();
		expect(requestLegacy).toHaveBeenCalledTimes(1);
	});
});
