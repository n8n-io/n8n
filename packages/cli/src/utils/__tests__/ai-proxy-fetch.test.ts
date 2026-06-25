import type { HttpTransport, OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { mock } from 'jest-mock-extended';

import {
	AI_REQUEST_TIMEOUT_MS,
	createAiMcpFetch,
	createAiProxyFetch,
} from '@/utils/ai-proxy-fetch';

describe('AI outbound fetch helpers', () => {
	it('creates model fetch with SSRF disabled', () => {
		const fetch = jest.fn() as typeof global.fetch;
		const transport = mock<HttpTransport>();
		transport.asCustomFetch.mockReturnValue(fetch);
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.transport.mockReturnValue(transport);

		expect(createAiProxyFetch(outboundHttp)).toBe(fetch);

		expect(outboundHttp.transport).toHaveBeenCalledWith({
			proxy: 'env',
			ssrf: 'disabled',
			timeouts: {
				headersTimeout: AI_REQUEST_TIMEOUT_MS,
				bodyTimeout: AI_REQUEST_TIMEOUT_MS,
			},
		});
	});

	it('creates MCP fetch with SSRF protection enabled when configured', () => {
		const fetch = jest.fn() as typeof global.fetch;
		const transport = mock<HttpTransport>();
		transport.asCustomFetch.mockReturnValue(fetch);
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.transport.mockReturnValue(transport);
		const ssrfProtectionService = mock<SsrfProtectionService>();
		ssrfProtectionService.isActive.mockReturnValue(true);

		expect(createAiMcpFetch(outboundHttp, ssrfProtectionService)).toBe(fetch);

		expect(outboundHttp.transport).toHaveBeenCalledWith({
			proxy: 'env',
			ssrf: ssrfProtectionService,
			timeouts: {
				headersTimeout: AI_REQUEST_TIMEOUT_MS,
				bodyTimeout: AI_REQUEST_TIMEOUT_MS,
			},
		});
	});

	it('creates MCP fetch with SSRF protection disabled when configured', () => {
		const fetch = jest.fn() as typeof global.fetch;
		const transport = mock<HttpTransport>();
		transport.asCustomFetch.mockReturnValue(fetch);
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.transport.mockReturnValue(transport);
		const ssrfProtectionService = mock<SsrfProtectionService>();
		ssrfProtectionService.isActive.mockReturnValue(false);

		expect(createAiMcpFetch(outboundHttp, ssrfProtectionService)).toBe(fetch);

		expect(outboundHttp.transport).toHaveBeenCalledWith({
			proxy: 'env',
			ssrf: 'disabled',
			timeouts: {
				headersTimeout: AI_REQUEST_TIMEOUT_MS,
				bodyTimeout: AI_REQUEST_TIMEOUT_MS,
			},
		});
	});
});
