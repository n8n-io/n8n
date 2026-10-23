import type { HttpTransport, OutboundHttp } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';

import {
	AI_REQUEST_TIMEOUT_MS,
	createAiMcpFetch,
	createAiProxyFetch,
	createWebSearchFetch,
} from '@/utils/ai-proxy-fetch';

describe('AI outbound fetch helpers', () => {
	const makeOutboundHttp = () => {
		const fetch = vi.fn() as typeof global.fetch;
		const transport = mock<HttpTransport>();
		transport.asCustomFetch.mockReturnValue(fetch);
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.transport.mockReturnValue(transport);
		return { fetch, outboundHttp };
	};

	it('creates model fetch with the outbound network policy bypassed', () => {
		const { fetch, outboundHttp } = makeOutboundHttp();

		expect(createAiProxyFetch(outboundHttp)).toBe(fetch);

		expect(outboundHttp.transport).toHaveBeenCalledWith({
			proxy: 'env',
			useDefaultSsrfPolicy: 'unsafe',
			timeouts: {
				headersTimeout: AI_REQUEST_TIMEOUT_MS,
				bodyTimeout: AI_REQUEST_TIMEOUT_MS,
			},
		});
	});

	it('creates MCP fetch with the default safe mode', () => {
		const { fetch, outboundHttp } = makeOutboundHttp();

		expect(createAiMcpFetch(outboundHttp)).toBe(fetch);

		expect(outboundHttp.transport).toHaveBeenCalledWith({
			proxy: 'env',
			timeouts: {
				headersTimeout: AI_REQUEST_TIMEOUT_MS,
				bodyTimeout: AI_REQUEST_TIMEOUT_MS,
			},
		});
	});

	it('creates web-search fetch with the default safe mode', () => {
		const { fetch, outboundHttp } = makeOutboundHttp();

		expect(createWebSearchFetch(outboundHttp)).toBe(fetch);

		expect(outboundHttp.transport).toHaveBeenCalledWith({
			proxy: 'env',
		});
	});
});
