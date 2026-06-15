import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import http from 'node:http';
import https from 'node:https';

import { makeLookupFn, makeSsrfBridge } from '../../ssrf/__tests__/mock-ssrf-bridge';
import { buildNodeAgents, EnvProxyHttpAgent, EnvProxyHttpsAgent } from '../node-agents';

// HttpsProxyAgent stores `lookup` in `connectOpts` rather than `options`
// (unlike http.Agent and HttpProxyAgent which use `options`).
function getAgentLookup(agent: http.Agent | https.Agent): unknown {
	const a = agent as {
		options?: { lookup?: unknown };
		connectOpts?: { lookup?: unknown };
	};
	return a.options?.lookup ?? a.connectOpts?.lookup;
}

// `http.Agent['options']` is not exposed on the public Node types.
function getAgentOptions(agent: http.Agent | https.Agent): { keepAlive?: boolean } {
	return (agent as unknown as { options?: { keepAlive?: boolean } }).options ?? {};
}

// ---------------------------------------------------------------------------
// buildNodeAgents — shared builder (single source of truth for the undici
// factory, the axios transport layer, and the global proxy agents)
// ---------------------------------------------------------------------------

describe('buildNodeAgents', () => {
	describe('agent classes per proxy mode', () => {
		it('proxy: false → plain http/https.Agent (no proxy class)', () => {
			const { httpAgent, httpsAgent } = buildNodeAgents(false, 'disabled');

			expect(httpAgent).toBeInstanceOf(http.Agent);
			expect(httpsAgent).toBeInstanceOf(https.Agent);
			expect(httpAgent).not.toBeInstanceOf(HttpProxyAgent);
			expect(httpsAgent).not.toBeInstanceOf(HttpsProxyAgent);
		});

		it('proxy: env → EnvProxy agents', () => {
			const { httpAgent, httpsAgent } = buildNodeAgents('env', 'disabled');

			expect(httpAgent).toBeInstanceOf(EnvProxyHttpAgent);
			expect(httpsAgent).toBeInstanceOf(EnvProxyHttpsAgent);
		});

		it('proxy: explicit URL → HttpProxyAgent / HttpsProxyAgent', () => {
			const { httpAgent, httpsAgent } = buildNodeAgents('http://proxy.internal:3128', 'disabled');

			expect(httpAgent).toBeInstanceOf(HttpProxyAgent);
			expect(httpsAgent).toBeInstanceOf(HttpsProxyAgent);
		});
	});

	describe('agent options forwarding', () => {
		it('forwards options to plain agents (proxy: false)', () => {
			const { httpAgent, httpsAgent } = buildNodeAgents(false, 'disabled', { keepAlive: true });

			expect(getAgentOptions(httpAgent).keepAlive).toBe(true);
			expect(getAgentOptions(httpsAgent).keepAlive).toBe(true);
		});

		it('forwards options to the env agent (which serves NO_PROXY targets directly)', () => {
			const { httpAgent } = buildNodeAgents('env', 'disabled', { keepAlive: true });

			expect(getAgentOptions(httpAgent).keepAlive).toBe(true);
		});
	});

	describe('SSRF lookup placement (direct connections only)', () => {
		it('proxy: false → injects the secure lookup on both agents', () => {
			const lookupFn = makeLookupFn();
			const bridge = makeSsrfBridge({ createSecureLookup: vi.fn().mockReturnValue(lookupFn) });

			const { httpAgent, httpsAgent } = buildNodeAgents(false, bridge);

			expect(getAgentLookup(httpAgent)).toBe(lookupFn);
			expect(getAgentLookup(httpsAgent)).toBe(lookupFn);
		});

		it('proxy: env → injects the secure lookup for the direct path', () => {
			const lookupFn = makeLookupFn();
			const bridge = makeSsrfBridge({ createSecureLookup: vi.fn().mockReturnValue(lookupFn) });

			const { httpAgent, httpsAgent } = buildNodeAgents('env', bridge);

			expect(getAgentLookup(httpAgent)).toBe(lookupFn);
			expect(getAgentLookup(httpsAgent)).toBe(lookupFn);
		});

		it('proxy: explicit URL → does NOT inject the lookup (proxy validates the target)', () => {
			const lookupFn = makeLookupFn();
			const bridge = makeSsrfBridge({ createSecureLookup: vi.fn().mockReturnValue(lookupFn) });

			const { httpAgent, httpsAgent } = buildNodeAgents('http://proxy.internal:3128', bridge);

			expect(getAgentLookup(httpAgent)).toBeUndefined();
			expect(getAgentLookup(httpsAgent)).toBeUndefined();
		});

		it('ssrf disabled → no lookup on the direct path', () => {
			const { httpAgent, httpsAgent } = buildNodeAgents('env', 'disabled');

			expect(getAgentLookup(httpAgent)).toBeUndefined();
			expect(getAgentLookup(httpsAgent)).toBeUndefined();
		});
	});
});
