import { Container } from '@n8n/di';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';
import { Agent, EnvHttpProxyAgent, ProxyAgent, fetch as undiciFetch } from 'undici';
import { mock } from 'vitest-mock-extended';

import type { SsrfBridge, SsrfProtectionService } from '../../../ssrf';
import { OutboundHttpFactory, type OutboundHttpClientOptions } from '../factory';

// Only stub undiciFetch to avoid real network calls; keep undici constructors
// so that instanceof checks work correctly. vi.mock is hoisted before the
// static imports above, so `undiciFetch` here is already the mocked version.
vi.mock('undici', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	const mod = (await importOriginal()) as Record<string, unknown>;
	return {
		...mod,
		fetch: vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => 'ok',
		}),
	};
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeLookupFn(): LookupFunction {
	return vi.fn() as unknown as LookupFunction;
}

function makeSsrfBridge(overrides?: Partial<SsrfBridge>): SsrfBridge {
	return {
		validateUrl: vi.fn().mockResolvedValue({ ok: true, result: undefined }),
		validateIp: vi.fn().mockReturnValue({ ok: true, result: undefined }),
		validateRedirectSync: vi.fn(),
		createSecureLookup: vi.fn().mockReturnValue(makeLookupFn()),
		...overrides,
	};
}

function makeFactory(): OutboundHttpFactory {
	const service = mock<SsrfProtectionService>();
	vi.mocked(service.createSecureLookup).mockReturnValue(makeLookupFn());
	vi.mocked(service.validateUrl).mockResolvedValue({ ok: true, result: undefined });
	return new OutboundHttpFactory(service);
}

function makeSsrfFactory(): { factory: OutboundHttpFactory; service: SsrfProtectionService } {
	const service = mock<SsrfProtectionService>();
	vi.mocked(service.createSecureLookup).mockReturnValue(makeLookupFn());
	vi.mocked(service.validateUrl).mockResolvedValue({ ok: true, result: undefined });
	return { factory: new OutboundHttpFactory(service), service };
}

// HttpsProxyAgent stores `lookup` in `connectOpts` rather than `options`
// (unlike http.Agent and HttpProxyAgent which use `options`).
function getAgentLookup(agent: http.Agent | https.Agent): unknown {
	const a = agent as {
		options?: { lookup?: unknown };
		connectOpts?: { lookup?: unknown };
	};
	return a.options?.lookup ?? a.connectOpts?.lookup;
}

// ---------------------------------------------------------------------------
// DI registration
// ---------------------------------------------------------------------------

describe('DI registration', () => {
	it('should be resolvable from the container', () => {
		expect(Container.get(OutboundHttpFactory)).toBeInstanceOf(OutboundHttpFactory);
	});
});

// ---------------------------------------------------------------------------
// create — defaults
// ---------------------------------------------------------------------------

describe('create', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('validates the URL before fetching when SSRF is enabled by default', async () => {
		const { factory, service } = makeSsrfFactory();
		const fetchFn = factory.create().asCustomFetch();

		await fetchFn('https://api.example.com/data');

		expect(service.validateUrl).toHaveBeenCalledWith('https://api.example.com/data');
	});

	it('allows SSRF to be explicitly disabled', async () => {
		const { factory, service } = makeSsrfFactory();
		const fetchFn = factory.create({ ssrf: 'disabled' }).asCustomFetch();

		await fetchFn('https://api.example.com/data');

		expect(service.validateUrl).not.toHaveBeenCalled();
	});

	it('allows SSRF to be overridden with a custom bridge', async () => {
		const customBridge = makeSsrfBridge();
		const factory = makeFactory();
		const fetchFn = factory.create({ ssrf: customBridge }).asCustomFetch();

		await fetchFn('https://api.example.com/data');

		expect(customBridge.validateUrl).toHaveBeenCalledWith('https://api.example.com/data');
	});

	it('defaults to env-based proxy (EnvHttpProxyAgent dispatcher)', () => {
		const factory = makeFactory();
		const dispatcher = factory.create().getDispatcher();

		expect(dispatcher).toBeInstanceOf(EnvHttpProxyAgent);
	});
});

// ---------------------------------------------------------------------------
// getDispatcher — proxy routing
// ---------------------------------------------------------------------------

describe('getDispatcher', () => {
	it('proxy: false → plain undici Agent', () => {
		const factory = makeFactory();
		const dispatcher = factory.create({ proxy: false }).getDispatcher();

		expect(dispatcher).toBeInstanceOf(Agent);
		expect(dispatcher).not.toBeInstanceOf(EnvHttpProxyAgent);
		expect(dispatcher).not.toBeInstanceOf(ProxyAgent);
	});

	it('proxy: env → EnvHttpProxyAgent', () => {
		const factory = makeFactory();
		const dispatcher = factory.create({ proxy: 'env' }).getDispatcher();

		expect(dispatcher).toBeInstanceOf(EnvHttpProxyAgent);
	});

	it('proxy: explicit URL → ProxyAgent', () => {
		const factory = makeFactory();
		const dispatcher = factory.create({ proxy: 'http://proxy.internal:3128' }).getDispatcher();

		expect(dispatcher).toBeInstanceOf(ProxyAgent);
		expect(dispatcher).not.toBeInstanceOf(Agent);
		expect(dispatcher).not.toBeInstanceOf(EnvHttpProxyAgent);
	});

	it('returns the same dispatcher instance on repeated calls', () => {
		const factory = makeFactory();
		const client = factory.create();

		expect(client.getDispatcher()).toBe(client.getDispatcher());
	});
});

// ---------------------------------------------------------------------------
// getNodeAgent — proxy routing
// ---------------------------------------------------------------------------

describe('getNodeAgent', () => {
	it('proxy: false → plain http/https.Agent (no proxy class)', () => {
		const factory = makeFactory();
		const { httpAgent, httpsAgent } = factory.create({ proxy: false }).getNodeAgent();

		expect(httpAgent).toBeInstanceOf(http.Agent);
		expect(httpsAgent).toBeInstanceOf(https.Agent);
		expect(httpAgent).not.toBeInstanceOf(HttpProxyAgent);
		expect(httpsAgent).not.toBeInstanceOf(HttpsProxyAgent);
	});

	it('proxy: explicit URL → HttpProxyAgent / HttpsProxyAgent', () => {
		const factory = makeFactory();
		const { httpAgent, httpsAgent } = factory
			.create({ proxy: 'http://proxy.internal:3128' })
			.getNodeAgent();

		expect(httpAgent).toBeInstanceOf(HttpProxyAgent);
		expect(httpsAgent).toBeInstanceOf(HttpsProxyAgent);
	});

	it('proxy: env → custom env-routing agents (http/https.Agent subclasses)', () => {
		const factory = makeFactory();
		const { httpAgent, httpsAgent } = factory.create({ proxy: 'env' }).getNodeAgent();

		expect(httpAgent).toBeInstanceOf(http.Agent);
		expect(httpsAgent).toBeInstanceOf(https.Agent);
	});

	it('returns the same agent instances on repeated calls', () => {
		const factory = makeFactory();
		const client = factory.create();
		const a1 = client.getNodeAgent();
		const a2 = client.getNodeAgent();

		expect(a1.httpAgent).toBe(a2.httpAgent);
		expect(a1.httpsAgent).toBe(a2.httpsAgent);
	});

	it('builds fresh agents that forward per-call agent options', () => {
		const factory = makeFactory();
		const client = factory.create({ proxy: false });
		const cached = client.getNodeAgent();
		const custom = client.getNodeAgent({ rejectUnauthorized: false });

		expect(custom.httpsAgent).not.toBe(cached.httpsAgent);
		expect(custom.httpsAgent.options.rejectUnauthorized).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getNodeAgent — SSRF lookup injection
// ---------------------------------------------------------------------------

describe('getNodeAgent SSRF lookup injection', () => {
	describe('proxy: false', () => {
		it('injects createSecureLookup when SSRF is enabled', () => {
			const lookupFn = makeLookupFn();
			const bridge = makeSsrfBridge({
				createSecureLookup: vi.fn().mockReturnValue(lookupFn),
			});
			const factory = makeFactory();
			const { httpAgent, httpsAgent } = factory
				.create({ ssrf: bridge, proxy: false })
				.getNodeAgent();

			expect(bridge.createSecureLookup).toHaveBeenCalledTimes(1);
			expect(getAgentLookup(httpAgent)).toBe(lookupFn);
			expect(getAgentLookup(httpsAgent)).toBe(lookupFn);
		});

		it('does NOT inject lookup when SSRF is disabled', () => {
			const factory = makeFactory();
			const { httpAgent, httpsAgent } = factory
				.create({ ssrf: 'disabled', proxy: false })
				.getNodeAgent();

			expect(getAgentLookup(httpAgent)).toBeUndefined();
			expect(getAgentLookup(httpsAgent)).toBeUndefined();
		});
	});

	describe('proxy: explicit URL', () => {
		it('does NOT inject lookup behind an explicit proxy (proxy validates the target)', () => {
			const lookupFn = makeLookupFn();
			const bridge = makeSsrfBridge({
				createSecureLookup: vi.fn().mockReturnValue(lookupFn),
			});
			const factory = makeFactory();
			const { httpAgent, httpsAgent } = factory
				.create({ ssrf: bridge, proxy: 'http://proxy.internal:3128' })
				.getNodeAgent();

			// SSRF lookup is applied to direct connections only. Behind a proxy it
			// would resolve the proxy host, not the final target, so it is omitted.
			expect(getAgentLookup(httpAgent)).toBeUndefined();
			expect(getAgentLookup(httpsAgent)).toBeUndefined();
		});
	});

	describe('proxy: env', () => {
		it('injects createSecureLookup when SSRF is enabled', () => {
			const lookupFn = makeLookupFn();
			const bridge = makeSsrfBridge({
				createSecureLookup: vi.fn().mockReturnValue(lookupFn),
			});
			const factory = makeFactory();
			const { httpAgent, httpsAgent } = factory
				.create({ ssrf: bridge, proxy: 'env' })
				.getNodeAgent();

			expect(bridge.createSecureLookup).toHaveBeenCalledTimes(1);
			// EnvProxy* agents inherit from http/https.Agent and pass lookup to super()
			expect(getAgentLookup(httpAgent)).toBe(lookupFn);
			expect(getAgentLookup(httpsAgent)).toBe(lookupFn);
		});
	});
});

// ---------------------------------------------------------------------------
// asCustomFetch — SSRF behaviour
// ---------------------------------------------------------------------------

describe('asCustomFetch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls undiciFetch after successful SSRF validation', async () => {
		const bridge = makeSsrfBridge();
		const factory = makeFactory();
		const fetchFn = factory.create({ ssrf: bridge }).asCustomFetch();

		await fetchFn('https://api.example.com/data', { method: 'POST' });

		expect(bridge.validateUrl).toHaveBeenCalledWith('https://api.example.com/data');
		expect(undiciFetch).toHaveBeenCalledTimes(1);
	});

	it('throws and does NOT call undiciFetch when SSRF blocks the URL', async () => {
		const ssrfError = new Error('SSRF: blocked IP 10.0.0.1');
		const bridge = makeSsrfBridge({
			validateUrl: vi.fn().mockResolvedValue({ ok: false, error: ssrfError }),
		});
		const factory = makeFactory();
		const fetchFn = factory.create({ ssrf: bridge }).asCustomFetch();

		await expect(fetchFn('http://10.0.0.1/secret')).rejects.toThrow(ssrfError);
		expect(undiciFetch).not.toHaveBeenCalled();
	});

	it('does NOT call validateUrl and calls undiciFetch directly when SSRF is disabled', async () => {
		const { factory, service } = makeSsrfFactory();
		const fetchFn = factory.create({ ssrf: 'disabled' }).asCustomFetch();

		await fetchFn('https://api.example.com/data');

		expect(service.validateUrl).not.toHaveBeenCalled();
		expect(undiciFetch).toHaveBeenCalledTimes(1);
	});

	it('extracts URL from a URL object', async () => {
		const bridge = makeSsrfBridge();
		const factory = makeFactory();
		const fetchFn = factory.create({ ssrf: bridge }).asCustomFetch();

		await fetchFn(new URL('https://api.example.com/data'));

		expect(bridge.validateUrl).toHaveBeenCalledWith('https://api.example.com/data');
	});

	it('extracts URL from a Request object', async () => {
		const bridge = makeSsrfBridge();
		const factory = makeFactory();
		const fetchFn = factory.create({ ssrf: bridge }).asCustomFetch();

		await fetchFn(new Request('https://api.example.com/data'));

		expect(bridge.validateUrl).toHaveBeenCalledWith('https://api.example.com/data');
	});

	it('passes init options through to undiciFetch', async () => {
		const factory = makeFactory();
		const fetchFn = factory.create().asCustomFetch();
		const init: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' } };

		await fetchFn('https://api.example.com/data', init);

		const [, calledInit] = vi.mocked(undiciFetch).mock.calls[0] as [
			unknown,
			Record<string, unknown>,
		];
		expect(calledInit).toMatchObject({ method: 'POST' });
	});

	it('injects the bare dispatcher into undiciFetch when SSRF is disabled', async () => {
		const factory = makeFactory();
		const client = factory.create({ proxy: false, ssrf: 'disabled' });
		const expectedDispatcher = client.getDispatcher();
		const fetchFn = client.asCustomFetch();

		await fetchFn('https://api.example.com/data');

		const [, calledInit] = vi.mocked(undiciFetch).mock.calls[0] as [
			unknown,
			{ dispatcher: unknown },
		];
		expect(calledInit.dispatcher).toBe(expectedDispatcher);
	});

	it('dispatches through an SSRF-composed dispatcher, not the bare getDispatcher(), when SSRF is enabled', async () => {
		const factory = makeFactory();
		const client = factory.create({ proxy: false });
		const bareDispatcher = client.getDispatcher();
		const fetchFn = client.asCustomFetch();

		await fetchFn('https://api.example.com/data');

		const [, calledInit] = vi.mocked(undiciFetch).mock.calls[0] as [
			unknown,
			{ dispatcher: unknown },
		];
		expect(calledInit.dispatcher).toBeDefined();
		expect(calledInit.dispatcher).not.toBe(bareDispatcher);
	});

	it('returns a new function on each call (fresh closure)', () => {
		const factory = makeFactory();
		const client = factory.create();

		const fn1 = client.asCustomFetch();
		const fn2 = client.asCustomFetch();

		expect(fn1).not.toBe(fn2);
	});
});

// ---------------------------------------------------------------------------
// proxy + SSRF option matrix
// ---------------------------------------------------------------------------

describe('proxy + SSRF option matrix', () => {
	const proxyOptions: Array<OutboundHttpClientOptions['proxy']> = [
		false,
		'env',
		'http://proxy.test:3128',
	];

	it.each(proxyOptions)('proxy %j: validates the URL when SSRF is enabled', async (proxy) => {
		vi.clearAllMocks();
		const bridge = makeSsrfBridge();
		const factory = makeFactory();
		const fetchFn = factory.create({ ssrf: bridge, proxy }).asCustomFetch();

		await fetchFn('https://api.example.com');

		expect(bridge.validateUrl).toHaveBeenCalledWith('https://api.example.com');
	});

	it.each(proxyOptions)(
		'proxy %j: does NOT validate the URL when SSRF is disabled',
		async (proxy) => {
			vi.clearAllMocks();
			const { factory, service } = makeSsrfFactory();
			const fetchFn = factory.create({ ssrf: 'disabled', proxy }).asCustomFetch();

			await fetchFn('https://api.example.com');

			expect(service.validateUrl).not.toHaveBeenCalled();
		},
	);
});
