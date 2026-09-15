import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';

import type { SsrfBridge } from '../../ssrf';
import {
	makeDenyingLookup,
	makeLookupFn,
	makeSsrfBridge,
} from '../../ssrf/__tests__/mock-ssrf-bridge';
import { installConnectionGuard, UnknownConnectionHostError } from '../connection-guards';
import { EnvProxyHttpAgent } from '../env-proxy-http-agent';
import { EnvProxyHttpsAgent } from '../env-proxy-https-agent';
import { type LocalServer, startServer } from '../local-server';
import { buildNodeAgents, type ProxyUrl } from '../node-agents';

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

		it('proxy: explicit URL → keeps the target TLS options off the proxy connection', () => {
			const agents = buildNodeAgents('https://proxy.internal:3128', 'disabled', {
				servername: 'target.example.com',
				ca: 'TARGET_CA',
				rejectUnauthorized: false,
			});

			for (const agent of [agents.httpAgent, agents.httpsAgent]) {
				const { connectOpts } = agent as unknown as { connectOpts: Record<string, unknown> };
				expect(connectOpts).toMatchObject({ host: 'proxy.internal', port: 3128 });
				expect(connectOpts).not.toHaveProperty('servername');
				expect(connectOpts).not.toHaveProperty('ca');
				expect(connectOpts).not.toHaveProperty('rejectUnauthorized');
			}
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

	describe('SSRF lookup placement', () => {
		const modes: Array<[string, false | 'env' | ProxyUrl]> = [
			['proxy: false', false],
			['proxy: env', 'env'],
			['proxy: explicit URL', 'http://proxy.internal:3128'],
		];

		it.each(modes)('%s → injects the secure lookup on both agents', (_label, proxy) => {
			const lookupFn = makeLookupFn();
			const bridge = makeSsrfBridge({ createSecureLookup: vi.fn().mockReturnValue(lookupFn) });

			const { httpAgent, httpsAgent } = buildNodeAgents(proxy, bridge);

			expect(getAgentLookup(httpAgent)).toBe(lookupFn);
			expect(getAgentLookup(httpsAgent)).toBe(lookupFn);
		});

		it.each(modes)('%s with SSRF disabled → no lookup on either agent', (_label, proxy) => {
			const { httpAgent, httpsAgent } = buildNodeAgents(proxy, 'disabled');

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

		it.each([
			['missing', {}],
			['null', { host: null, hostname: null }],
			['empty', { host: '' }],
			['empty while `hostname` is set', { host: '', hostname: 'target.example' }],
		])('rejects the connection when the host is %s', (_label, options) => {
			const bridge = makeSsrfBridge();
			const { createConnection, original } = guarded(bridge);
			const onCreate = vi.fn();

			const result = createConnection(options, onCreate);

			expect(onCreate).toHaveBeenCalledWith(expect.any(UnknownConnectionHostError));
			expect(original).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
			expect(bridge.validateConnectionHost).not.toHaveBeenCalled();
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

	describe('proxy host validation (explicit proxy URL)', () => {
		let proxyServer: LocalServer;
		let proxyByIp: ProxyUrl;
		let proxyByHostname: ProxyUrl;

		const realLookup = () => dns.lookup as unknown as LookupFunction;

		async function getThroughAgent(agent: http.Agent): Promise<string> {
			return await new Promise((resolve, reject) => {
				const req = http.get('http://proxied-target.invalid/x', { agent, timeout: 3000 }, (res) => {
					let data = '';
					res.on('data', (chunk) => (data += String(chunk)));
					res.on('end', () => resolve(data));
				});
				req.on('error', reject);
				req.on('timeout', () => {
					req.destroy();
					reject(new Error('timeout'));
				});
			});
		}

		beforeEach(async () => {
			proxyServer = await startServer((_req, res) => {
				res.setHeader('Content-Type', 'text/plain');
				res.end('proxied');
			});
			const { port } = new URL(proxyServer.url);
			proxyByIp = `http://127.0.0.1:${port}`;
			proxyByHostname = `http://localhost:${port}`;
		});

		afterEach(async () => {
			await proxyServer.close();
		});

		it('rejects a proxy host the SSRF policy denies, without reaching the proxy', async () => {
			const error = new Error(
				'The request was blocked because it resolves to a restricted IP address',
			);
			const bridge = makeSsrfBridge({
				createSecureLookup: realLookup,
				validateConnectionHost: vi.fn().mockReturnValue({ ok: false, error }),
			});
			const { httpAgent } = buildNodeAgents(proxyByIp, bridge);

			await expect(getThroughAgent(httpAgent)).rejects.toThrow(error.message);

			expect(bridge.validateConnectionHost).toHaveBeenCalledWith('127.0.0.1');
			expect(proxyServer.captured).toEqual([]);
		});

		it.each(['httpAgent', 'httpsAgent'] as const)(
			'validates the proxy host before the %s opens its connection',
			async (which) => {
				const error = new Error('blocked');
				const bridge = makeSsrfBridge({
					validateConnectionHost: vi.fn().mockReturnValue({ ok: false, error }),
				});
				const agents = buildNodeAgents('http://proxy.internal:3128', bridge);
				const agent = agents[which] as unknown as {
					connect: (req: unknown, opts: unknown) => Promise<unknown>;
				};

				await expect(agent.connect({}, {})).rejects.toBe(error);

				expect(bridge.validateConnectionHost).toHaveBeenCalledWith('proxy.internal');
			},
		);

		it('rejects a proxy hostname that resolves to a restricted address', async () => {
			const error = new Error(
				'The request was blocked because it resolves to a restricted IP address',
			);
			const lookup = makeDenyingLookup(error);
			const bridge = makeSsrfBridge({ createSecureLookup: () => lookup });
			const { httpAgent } = buildNodeAgents(proxyByHostname, bridge);

			await expect(getThroughAgent(httpAgent)).rejects.toThrow(error.message);

			expect(lookup).toHaveBeenCalledWith('localhost', expect.any(Object), expect.any(Function));
			expect(proxyServer.captured).toEqual([]);
		});

		it('connects through a proxy host the SSRF policy allows', async () => {
			const bridge = makeSsrfBridge({ createSecureLookup: realLookup });
			const { httpAgent } = buildNodeAgents(proxyByIp, bridge);

			await expect(getThroughAgent(httpAgent)).resolves.toBe('proxied');

			expect(bridge.validateConnectionHost).toHaveBeenCalledWith('127.0.0.1');
			expect(proxyServer.captured).toEqual(['http://proxied-target.invalid/x']);
		});

		it('connects through the proxy unchanged when SSRF protection is disabled', async () => {
			const { httpAgent } = buildNodeAgents(proxyByHostname, 'disabled');

			await expect(getThroughAgent(httpAgent)).resolves.toBe('proxied');

			expect(proxyServer.captured).toEqual(['http://proxied-target.invalid/x']);
		});
	});
});
