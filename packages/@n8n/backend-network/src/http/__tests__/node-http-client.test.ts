import type { Logger } from '@n8n/backend-common';
import type { IHttpRequestOptions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { SsrfBridge, SsrfProtectionService } from '../../ssrf';
import { httpRequest } from '../axios/request';
import { NodeHttpClientFactory } from '../node-http-client';

vi.mock('../axios/request', () => ({
	httpRequest: vi.fn().mockResolvedValue({ statusCode: 200, body: 'ok' }),
}));

const mockedHttpRequest = vi.mocked(httpRequest);

// `httpRequest` is mocked, so the service is only passed through as the SSRF
// bridge — its methods are never actually invoked here.
function makeService(): SsrfProtectionService {
	return mock<SsrfProtectionService>();
}

function makeFactory(service: SsrfProtectionService = makeService()): NodeHttpClientFactory {
	return new NodeHttpClientFactory(service, mock<Logger>());
}

const REQUEST: IHttpRequestOptions = { url: 'https://example.test/x', method: 'GET' };

describe('NodeHttpClientFactory', () => {
	beforeEach(() => {
		mockedHttpRequest.mockClear();
	});

	describe('create', () => {
		it('forwards the request and returns the response', async () => {
			const client = makeFactory().create();

			const res = await client.request(REQUEST);

			expect(res).toEqual({ statusCode: 200, body: 'ok' });
			expect(mockedHttpRequest).toHaveBeenCalledTimes(1);
			expect(mockedHttpRequest).toHaveBeenCalledWith(REQUEST, expect.anything());
		});

		it('uses the container SSRF service as the bridge by default', async () => {
			const service = makeService();
			const client = makeFactory(service).create();

			await client.request(REQUEST);

			expect(mockedHttpRequest).toHaveBeenCalledWith(REQUEST, service);
		});

		it('passes an explicit SSRF bridge through to the request', async () => {
			const bridge = mock<SsrfBridge>();
			const client = makeFactory().create({ ssrf: bridge });

			await client.request(REQUEST);

			expect(mockedHttpRequest).toHaveBeenCalledWith(REQUEST, bridge);
		});

		it('omits the bridge when SSRF protection is disabled', async () => {
			const client = makeFactory().create({ ssrf: 'disabled' });

			await client.request(REQUEST);

			expect(mockedHttpRequest).toHaveBeenCalledWith(REQUEST, undefined);
		});
	});
});
