import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import http from 'node:http';
import https from 'node:https';

import type { SsrfBridge } from '../../ssrf';
import { makeLookupFn, makeSsrfBridge } from '../../ssrf/__tests__/mock-ssrf-bridge';
import { EnvProxyHttpAgent } from '../env-proxy-http-agent';
import { EnvProxyHttpsAgent } from '../env-proxy-https-agent';
import { buildNodeAgents, installConnectionGuard } from '../node-agents';

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

	describe('rejects a caller-provided lookup (managed by the SSRF policy)', () => {
		const lookup = makeLookupFn();

		it.each([
			['ssrf disabled', 'disabled' as const],
			['ssrf active', makeSsrfBridge()],
		])('throws when agentOptions.lookup is set (%s)', (_label, ssrf) => {
			expect(() => buildNodeAgents(false, ssrf, { lookup })).toThrow(
				'`agentOptions.lookup` is not supported',
			);
		});

		it('allows other agentOptions without a lookup', () => {
			expect(() => buildNodeAgents(false, 'disabled', { keepAlive: true })).not.toThrow();
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

	describe('direct-IP validation (installConnectionGuard)', () => {
		type ConnFn = (
			options: { host?: string | null; hostname?: string | null; port?: number },
			onConnect?: (error: Error | null, stream?: unknown) => void,
		) => unknown;

		const connectionOf = (agent: http.Agent): ConnFn =>
			(agent as unknown as { createConnection: ConnFn }).createConnection;

		function guarded(bridge: SsrfBridge) {
			const original = vi.fn().mockReturnValue('SOCKET');
			const agent = { createConnection: original } as unknown as http.Agent;
			installConnectionGuard(agent, bridge);
			return { createConnection: connectionOf(agent), original };
		}

		it('blocks a connection the bridge rejects without opening a socket', () => {
			const error = new Error('blocked');
			const bridge = makeSsrfBridge({
				validateConnectionHost: vi.fn().mockReturnValue({ ok: false, error }),
			});
			const { createConnection, original } = guarded(bridge);
			const onCreate = vi.fn();

			const result = createConnection({ host: '169.254.169.254', port: 80 }, onCreate);

			expect(bridge.validateConnectionHost).toHaveBeenCalledWith('169.254.169.254');
			expect(onCreate).toHaveBeenCalledWith(error);
			expect(original).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		});

		it('delegates to the underlying connection when the bridge allows the host', () => {
			const bridge = makeSsrfBridge();
			const { createConnection, original } = guarded(bridge);

			const socket = createConnection({ host: '93.184.216.34', port: 80 }, vi.fn());

			expect(bridge.validateConnectionHost).toHaveBeenCalledWith('93.184.216.34');
			expect(original).toHaveBeenCalledTimes(1);
			expect(socket).toBe('SOCKET');
		});

		it('passes the raw host through to the bridge (normalization is the service’s job)', () => {
			const bridge = makeSsrfBridge();
			const { createConnection } = guarded(bridge);

			createConnection({ host: '[::1]', port: 80 }, vi.fn());

			expect(bridge.validateConnectionHost).toHaveBeenCalledWith('[::1]');
		});

		it.each(['false', 'env'] as const)(
			'buildNodeAgents (proxy: %s) blocks rejected direct connections on both agents',
			(mode) => {
				const error = new Error('blocked');
				const bridge = makeSsrfBridge({
					validateConnectionHost: vi.fn().mockReturnValue({ ok: false, error }),
				});
				const proxy = mode === 'false' ? false : 'env';
				const { httpAgent, httpsAgent } = buildNodeAgents(proxy, bridge);

				const onHttp = vi.fn();
				const onHttps = vi.fn();
				connectionOf(httpAgent)({ host: '10.0.0.1', port: 80 }, onHttp);
				connectionOf(httpsAgent)({ host: '10.0.0.1', port: 443 }, onHttps);

				expect(onHttp).toHaveBeenCalledWith(error);
				expect(onHttps).toHaveBeenCalledWith(error);
			},
		);
	});
});
