import type { Logger } from '@n8n/backend-common';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import http from 'node:http';
import https from 'node:https';
import { mock } from 'vitest-mock-extended';

import type { SsrfProtectionService } from '../../ssrf';
import { makeLookupFn, makeSsrfBridge } from '../../ssrf/__tests__/mock-ssrf-bridge';
import { OutboundHttp } from '../outbound-http';

function makeFacade(): OutboundHttp {
	const service = mock<SsrfProtectionService>();
	vi.mocked(service.createSecureLookup).mockReturnValue(makeLookupFn());
	return new OutboundHttp(service, mock<Logger>());
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
// getNodeAgent — proxy routing
// ---------------------------------------------------------------------------

describe('getNodeAgent', () => {
	it('proxy: false → plain http/https.Agent (no proxy class)', () => {
		const { httpAgent, httpsAgent } = makeFacade().transport({ proxy: false }).getNodeAgent();

		expect(httpAgent).toBeInstanceOf(http.Agent);
		expect(httpsAgent).toBeInstanceOf(https.Agent);
		expect(httpAgent).not.toBeInstanceOf(HttpProxyAgent);
		expect(httpsAgent).not.toBeInstanceOf(HttpsProxyAgent);
	});

	it('proxy: explicit URL → HttpProxyAgent / HttpsProxyAgent', () => {
		const { httpAgent, httpsAgent } = makeFacade()
			.transport({ proxy: 'http://proxy.internal:3128' })
			.getNodeAgent();

		expect(httpAgent).toBeInstanceOf(HttpProxyAgent);
		expect(httpsAgent).toBeInstanceOf(HttpsProxyAgent);
	});

	it('proxy: env → custom env-routing agents (http/https.Agent subclasses)', () => {
		const { httpAgent, httpsAgent } = makeFacade().transport({ proxy: 'env' }).getNodeAgent();

		expect(httpAgent).toBeInstanceOf(http.Agent);
		expect(httpsAgent).toBeInstanceOf(https.Agent);
	});

	it('returns the same agent instances on repeated calls', () => {
		const client = makeFacade().transport();
		const a1 = client.getNodeAgent();
		const a2 = client.getNodeAgent();

		expect(a1.httpAgent).toBe(a2.httpAgent);
		expect(a1.httpsAgent).toBe(a2.httpsAgent);
	});

	it('builds fresh agents that forward per-call agent options', () => {
		const client = makeFacade().transport({ proxy: false });
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
			const { httpAgent, httpsAgent } = makeFacade()
				.transport({ ssrf: bridge, proxy: false })
				.getNodeAgent();

			expect(bridge.createSecureLookup).toHaveBeenCalledTimes(1);
			expect(getAgentLookup(httpAgent)).toBe(lookupFn);
			expect(getAgentLookup(httpsAgent)).toBe(lookupFn);
		});

		it('does NOT inject lookup when SSRF is disabled', () => {
			const { httpAgent, httpsAgent } = makeFacade()
				.transport({ ssrf: 'disabled', proxy: false })
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
			const { httpAgent, httpsAgent } = makeFacade()
				.transport({ ssrf: bridge, proxy: 'http://proxy.internal:3128' })
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
			const { httpAgent, httpsAgent } = makeFacade()
				.transport({ ssrf: bridge, proxy: 'env' })
				.getNodeAgent();

			expect(bridge.createSecureLookup).toHaveBeenCalledTimes(1);
			// EnvProxy* agents inherit from http/https.Agent and pass lookup to super()
			expect(getAgentLookup(httpAgent)).toBe(lookupFn);
			expect(getAgentLookup(httpsAgent)).toBe(lookupFn);
		});
	});
});
