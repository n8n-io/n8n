import type { Logger } from '@n8n/backend-common';
import type { IHttpRequestOptions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { SsrfBridge, SsrfProtectionService } from '../../ssrf';
import { httpRequest } from '../axios/request';
import { OutboundHttp } from '../outbound-http';

vi.mock('../axios/request', () => ({
	httpRequest: vi.fn().mockResolvedValue({ statusCode: 200, body: 'ok' }),
}));

const mockedHttpRequest = vi.mocked(httpRequest);

// `httpRequest` is mocked, so the service is only passed through as the SSRF
// bridge — its methods are never actually invoked here.
function makeService(): SsrfProtectionService {
	return mock<SsrfProtectionService>();
}

function makeFacade(service: SsrfProtectionService = makeService()): OutboundHttp {
	return new OutboundHttp(service, mock<Logger>());
}

const REQUEST: IHttpRequestOptions = { url: 'https://example.test/x', method: 'GET' };

describe('OutboundHttp.requests', () => {
	beforeEach(() => {
		mockedHttpRequest.mockClear();
	});

	it('forwards the request and returns the response', async () => {
		const client = makeFacade().requests();

		const res = await client.request(REQUEST);

		expect(res).toEqual({ statusCode: 200, body: 'ok' });
		expect(mockedHttpRequest).toHaveBeenCalledTimes(1);
		expect(mockedHttpRequest).toHaveBeenCalledWith(REQUEST, expect.anything());
	});

	it('uses the container SSRF service as the bridge by default', async () => {
		const service = makeService();
		const client = makeFacade(service).requests();

		await client.request(REQUEST);

		expect(mockedHttpRequest).toHaveBeenCalledWith(REQUEST, service);
	});

	it('passes an explicit SSRF bridge through to the request', async () => {
		const bridge = mock<SsrfBridge>();
		const client = makeFacade().requests({ ssrf: bridge });

		await client.request(REQUEST);

		expect(mockedHttpRequest).toHaveBeenCalledWith(REQUEST, bridge);
	});

	it('omits the bridge when SSRF protection is disabled', async () => {
		const client = makeFacade().requests({ ssrf: 'disabled' });

		await client.request(REQUEST);

		expect(mockedHttpRequest).toHaveBeenCalledWith(REQUEST, undefined);
	});

	describe('bound baseURL', () => {
		it('injects the bound baseURL when the request has none', async () => {
			const client = makeFacade().requests({ baseURL: 'https://vault.test/v1/' });

			await client.request({ url: 'auth/token/lookup-self', method: 'GET' });

			expect(mockedHttpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'auth/token/lookup-self',
					baseURL: 'https://vault.test/v1/',
				}),
				expect.anything(),
			);
		});

		it('leaves an explicit per-request baseURL untouched', async () => {
			const client = makeFacade().requests({ baseURL: 'https://vault.test/v1/' });

			await client.request({ url: 'x', baseURL: 'https://other.test/', method: 'GET' });

			expect(mockedHttpRequest).toHaveBeenCalledWith(
				expect.objectContaining({ baseURL: 'https://other.test/' }),
				expect.anything(),
			);
		});
	});

	describe('bound headers', () => {
		it('merges default headers, with per-request headers winning per key', async () => {
			const client = makeFacade().requests({
				headers: { 'X-Vault-Namespace': 'admin', Accept: 'application/json' },
			});

			await client.request({ ...REQUEST, headers: { Accept: 'text/plain' } });

			expect(mockedHttpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: { 'X-Vault-Namespace': 'admin', Accept: 'text/plain' },
				}),
				expect.anything(),
			);
		});

		it('calls a headers factory per request so a rotating token is re-read', async () => {
			let token = 'first';
			const client = makeFacade().requests({
				headers: () => ({ Authorization: `Bearer ${token}` }),
			});

			await client.request(REQUEST);
			token = 'second';
			await client.request(REQUEST);

			expect(mockedHttpRequest).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ headers: { Authorization: 'Bearer first' } }),
				expect.anything(),
			);
			expect(mockedHttpRequest).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ headers: { Authorization: 'Bearer second' } }),
				expect.anything(),
			);
		});

		it('drops default headers whose value is undefined', async () => {
			const client = makeFacade().requests({ headers: () => ({ Authorization: undefined }) });

			await client.request(REQUEST);

			expect(mockedHttpRequest).toHaveBeenCalledWith(
				expect.objectContaining({ headers: {} }),
				expect.anything(),
			);
		});
	});
});
