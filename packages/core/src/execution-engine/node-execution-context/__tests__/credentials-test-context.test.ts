import { OutboundHttp } from '@n8n/backend-network';
import type { HttpRequestClient, SsrfBridge } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { CredentialTestContext } from '../credentials-test-context';

// The SSH tunnel helpers resolve a manager from the container; stub them out so
// constructing the context stays a pure unit test focused on the request path.
vi.mock('../utils/ssh-tunnel-helper-functions', () => ({
	getSSHTunnelFunctions: () => ({}),
}));

/**
 * `CredentialTestContext` is the execution context for function-based credential
 * tests. Its `helpers.request` must forward the execution's SSRF bridge so that
 * test requests honour the same egress policy as regular node execution. These
 * tests assert that wiring; the actual SSRF enforcement lives in
 * `@n8n/backend-network`.
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

	it('forwards the SSRF bridge from additionalData to the request', async () => {
		const ssrfBridge = mock<SsrfBridge>();
		const additionalData = mock<IWorkflowExecuteAdditionalData>({ ssrfBridge });

		const context = new CredentialTestContext(additionalData);
		await context.helpers.request('https://example.test');

		expect(requests).toHaveBeenCalledWith({ ssrf: ssrfBridge });
	});

	it('disables SSRF when additionalData carries no bridge', async () => {
		const additionalData = mock<IWorkflowExecuteAdditionalData>({ ssrfBridge: undefined });

		const context = new CredentialTestContext(additionalData);
		await context.helpers.request('https://example.test');

		expect(requests).toHaveBeenCalledWith({ ssrf: 'disabled' });
	});

	it('disables SSRF when no additionalData is provided', async () => {
		const context = new CredentialTestContext();
		await context.helpers.request('https://example.test');

		expect(requests).toHaveBeenCalledWith({ ssrf: 'disabled' });
	});
});
