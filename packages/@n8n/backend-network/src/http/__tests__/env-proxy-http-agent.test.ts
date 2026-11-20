import http from 'node:http';
import type { LookupFunction } from 'node:net';
import type { MockInstance } from 'vitest';

import { makeLookupFn } from '../../ssrf/__tests__/mock-ssrf-bridge';
import { EnvProxyHttpAgent } from '../env-proxy-http-agent';

// Routing/caching is covered in env-proxy-router.test.ts; here we only assert
// the agent's wiring: delegate to the resolved proxy agent, else dispatch
// directly via `super.addRequest`. The proxy agent is mocked and `getProxyForUrl`
// drives which branch runs, so nothing hits the network.
const { getProxyForUrl, proxyAddRequest, proxyConnect, proxyAgents } = vi.hoisted(() => ({
	getProxyForUrl: vi.fn<(url: string) => string>(),
	proxyAddRequest: vi.fn(),
	proxyConnect: vi.fn(),
	proxyAgents: [] as unknown[],
}));

vi.mock('proxy-from-env', () => ({ getProxyForUrl }));
vi.mock('http-proxy-agent', () => ({
	HttpProxyAgent: class {
		connectOpts: { host: string };

		addRequest = proxyAddRequest;

		constructor(
			proxyUrl: string,
			readonly agentOptions?: { lookup?: unknown },
		) {
			this.connectOpts = { host: new URL(proxyUrl).hostname };
			proxyAgents.push(this);
		}

		async connect(...args: unknown[]): Promise<unknown> {
			return await proxyConnect(...args);
		}
	},
}));

type CreatedProxyAgent = {
	agentOptions?: { lookup?: unknown };
	connect: (req: unknown, opts: unknown) => Promise<unknown>;
};

const req = {} as http.ClientRequest;
const options = (o: Partial<http.RequestOptions>): http.RequestOptions => o as http.RequestOptions;

describe('EnvProxyHttpAgent', () => {
	let superAddRequest: MockInstance;

	beforeEach(() => {
		getProxyForUrl.mockReset();
		proxyAddRequest.mockReset();
		proxyConnect.mockReset();
		proxyConnect.mockResolvedValue('SOCKET');
		proxyAgents.length = 0;
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

	describe('SSRF scope of the resolved proxy agent', () => {
		beforeEach(() => {
			getProxyForUrl.mockReturnValue('http://proxy.internal:3128');
		});

		function resolvedProxyAgent(lookup?: LookupFunction): CreatedProxyAgent {
			new EnvProxyHttpAgent(lookup).addRequest(req, options({ host: 'a.example', port: 80 }));
			return proxyAgents[0] as CreatedProxyAgent;
		}

		it.each([
			['a lookup is given', () => makeLookupFn()],
			['no lookup is given', () => undefined],
		])('opens the connection to the proxy unchecked when %s', async (_label, makeLookup) => {
			const lookup = makeLookup();
			const proxyAgent = resolvedProxyAgent(lookup);

			await expect(proxyAgent.connect(req, {})).resolves.toBe('SOCKET');

			expect(proxyAgent.agentOptions?.lookup).toBeUndefined();
		});

		it('keeps the secure lookup on its own direct pool', () => {
			const lookupFn = makeLookupFn();

			const agent = new EnvProxyHttpAgent(lookupFn) as unknown as {
				options: { lookup?: unknown };
			};

			expect(agent.options.lookup).toBe(lookupFn);
		});
	});
});
