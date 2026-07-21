import type http from 'node:http';
import https from 'node:https';
import type { MockInstance } from 'vitest';

import { EnvProxyHttpsAgent } from '../env-proxy-https-agent';

// Routing/caching is covered in env-proxy-router.test.ts; here we only assert
// the agent's wiring: delegate to the resolved proxy agent, else dispatch
// directly via `super.addRequest`. The proxy agent is mocked and `getProxyForUrl`
// drives which branch runs, so nothing hits the network.
const { getProxyForUrl, proxyAddRequest } = vi.hoisted(() => ({
	getProxyForUrl: vi.fn<(url: string) => string>(),
	proxyAddRequest: vi.fn(),
}));

vi.mock('proxy-from-env', () => ({ getProxyForUrl }));
vi.mock('https-proxy-agent', () => ({
	HttpsProxyAgent: class {
		addRequest = proxyAddRequest;
	},
}));

const req = {} as http.ClientRequest;
const options = (o: Partial<https.RequestOptions>): https.RequestOptions =>
	o as https.RequestOptions;

describe('EnvProxyHttpsAgent', () => {
	let superAddRequest: MockInstance;

	beforeEach(() => {
		getProxyForUrl.mockReset();
		proxyAddRequest.mockReset();
		// `super.addRequest` is the only path that would open a real socket.
		// `addRequest` is an internal Agent method untyped on the public types.
		superAddRequest = vi
			.spyOn(https.Agent.prototype, 'addRequest')
			.mockImplementation(() => undefined) as unknown as MockInstance;
	});

	afterEach(() => superAddRequest.mockRestore());

	it('delegates to the https proxy agent when a proxy applies', () => {
		getProxyForUrl.mockReturnValue('http://proxy.internal:3128');
		const opts = options({ host: 'a.example', port: 443 });

		new EnvProxyHttpsAgent().addRequest(req, opts);

		expect(getProxyForUrl).toHaveBeenCalledWith('https://a.example');
		expect(proxyAddRequest).toHaveBeenCalledWith(req, opts);
		expect(superAddRequest).not.toHaveBeenCalled();
	});

	it('serves the request directly when no proxy applies', () => {
		getProxyForUrl.mockReturnValue('');
		const opts = options({ host: 'direct.example', port: 443 });

		new EnvProxyHttpsAgent().addRequest(req, opts);

		expect(proxyAddRequest).not.toHaveBeenCalled();
		expect(superAddRequest).toHaveBeenCalledWith(req, opts);
	});
});
