import http from 'node:http';
import type { MockInstance } from 'vitest';

import { EnvProxyHttpAgent } from '../env-proxy-http-agent';

// Routing/caching is covered in env-proxy-router.test.ts; here we only assert
// the agent's wiring: delegate to the resolved proxy agent, else dispatch
// directly via `super.addRequest`. The proxy agent is mocked and `getProxyForUrl`
// drives which branch runs, so nothing hits the network.
const { getProxyForUrl, proxyAddRequest } = vi.hoisted(() => ({
	getProxyForUrl: vi.fn<(url: string) => string>(),
	proxyAddRequest: vi.fn(),
}));

vi.mock('proxy-from-env', () => ({ getProxyForUrl }));
vi.mock('http-proxy-agent', () => ({
	HttpProxyAgent: class {
		addRequest = proxyAddRequest;
	},
}));

const req = {} as http.ClientRequest;
const options = (o: Partial<http.RequestOptions>): http.RequestOptions => o as http.RequestOptions;

describe('EnvProxyHttpAgent', () => {
	let superAddRequest: MockInstance;

	beforeEach(() => {
		getProxyForUrl.mockReset();
		proxyAddRequest.mockReset();
		// `super.addRequest` is the only path that would open a real socket.
		// `addRequest` is an internal Agent method untyped on the public types.
		superAddRequest = vi
			.spyOn(http.Agent.prototype, 'addRequest')
			.mockImplementation(() => undefined) as unknown as MockInstance;
	});

	afterEach(() => superAddRequest.mockRestore());

	it('delegates to the http proxy agent when a proxy applies', () => {
		getProxyForUrl.mockReturnValue('http://proxy.internal:3128');
		const opts = options({ host: 'a.example', port: 80 });

		new EnvProxyHttpAgent().addRequest(req, opts);

		expect(getProxyForUrl).toHaveBeenCalledWith('http://a.example');
		expect(proxyAddRequest).toHaveBeenCalledWith(req, opts);
		expect(superAddRequest).not.toHaveBeenCalled();
	});

	it('serves the request directly when no proxy applies', () => {
		getProxyForUrl.mockReturnValue('');
		const opts = options({ host: 'direct.example', port: 80 });

		new EnvProxyHttpAgent().addRequest(req, opts);

		expect(proxyAddRequest).not.toHaveBeenCalled();
		expect(superAddRequest).toHaveBeenCalledWith(req, opts);
	});
});
