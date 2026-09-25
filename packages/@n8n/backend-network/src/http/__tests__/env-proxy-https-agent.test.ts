import type http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';
import type { MockInstance } from 'vitest';

import { makeLookupFn } from '../../ssrf/__tests__/mock-ssrf-bridge';
import { EnvProxyHttpsAgent } from '../env-proxy-https-agent';

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
vi.mock('https-proxy-agent', () => ({
	HttpsProxyAgent: class {
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
const options = (o: Partial<https.RequestOptions>): https.RequestOptions =>
	o as https.RequestOptions;

describe('EnvProxyHttpsAgent', () => {
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

	describe('SSRF scope of the resolved proxy agent', () => {
		beforeEach(() => {
			getProxyForUrl.mockReturnValue('http://proxy.internal:3128');
		});

		function resolvedProxyAgent(lookup?: LookupFunction): CreatedProxyAgent {
			new EnvProxyHttpsAgent(lookup).addRequest(req, options({ host: 'a.example', port: 443 }));
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

			const agent = new EnvProxyHttpsAgent(lookupFn) as unknown as {
				options: { lookup?: unknown };
			};

			expect(agent.options.lookup).toBe(lookupFn);
		});
	});
});
