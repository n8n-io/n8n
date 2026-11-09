import { X_N8N_FEATURE_HEADER } from '@n8n/api-types';
import type { OutboundHttp } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';

import { createProxyEmbeddingProviderOptions } from '../ai-proxy-embedding-options';

const proxyFetch = vi.hoisted(() =>
	vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(),
);

vi.mock('@/utils/ai-proxy-fetch', () => ({
	createAiProxyFetch: () => proxyFetch,
}));

describe('createProxyEmbeddingProviderOptions', () => {
	beforeEach(() => {
		proxyFetch.mockReset();
		proxyFetch.mockResolvedValue(new Response('{}'));
	});

	it('sends embedding requests through the proxy fetch with auth and proxy headers', async () => {
		const payload = Buffer.from(
			JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
		).toString('base64url');
		const accessToken = `header.${payload}.signature`;
		const fetchToken = vi.fn().mockResolvedValue({ tokenType: 'Bearer', accessToken });
		const options = createProxyEmbeddingProviderOptions({
			proxyBaseUrl: 'https://proxy.example.com/',
			feature: 'instance-ai',
			fetchToken,
			outboundHttp: mock<OutboundHttp>(),
		});

		expect(options.baseURL).toBe('https://proxy.example.com/openai/');

		await options.fetch!('https://proxy.example.com/openai/embeddings', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
		});

		expect(fetchToken).toHaveBeenCalledTimes(1);
		expect(proxyFetch).toHaveBeenCalledTimes(1);
		const [input, init] = proxyFetch.mock.calls[0];
		expect(input).toBe('https://proxy.example.com/openai/embeddings');
		const headers = new Headers(init?.headers);
		expect(headers.get('authorization')).toBe(`Bearer ${accessToken}`);
		expect(headers.get(X_N8N_FEATURE_HEADER)).toBe('instance-ai');
		expect(headers.get('content-type')).toBe('application/json');
	});
});
