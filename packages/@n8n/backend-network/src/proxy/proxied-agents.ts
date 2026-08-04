import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type http from 'node:http';
import type https from 'node:https';
import type net from 'node:net';

/** Per-hop connect options of a proxy agent, as `agent-base` hands them to `connect()`. */
type ProxyConnectOpts = Parameters<HttpsProxyAgent<string>['connect']>[1];

/**
 * Options that name the target host or authenticate to it: SNI plus the trust
 * material of a target-specific certificate setup.
 *
 * A proxy presents its own certificate on its own hostname, so these must never
 * reach the socket that carries the proxy handshake.
 */
const TARGET_TLS_OPTION_KEYS = [
	'servername',
	'ca',
	'cert',
	'key',
	'pfx',
	'passphrase',
	'crl',
	'checkServerIdentity',
] as const satisfies ReadonlyArray<keyof https.AgentOptions>;

function omitKeys(agentOptions: https.AgentOptions, keys: readonly string[]): https.AgentOptions {
	return Object.fromEntries(
		Object.entries(agentOptions).filter(([key]) => !keys.includes(key)),
	) as https.AgentOptions;
}

function forProxyConnection(agentOptions: https.AgentOptions = {}): https.AgentOptions {
	return omitKeys(agentOptions, TARGET_TLS_OPTION_KEYS);
}

function forTunnelledConnection(agentOptions: https.AgentOptions = {}): https.AgentOptions {
	return omitKeys(agentOptions, ['servername']);
}

class TunnellingHttpsProxyAgent extends HttpsProxyAgent<string> {
	private readonly tunnelOptions: https.AgentOptions;

	constructor(proxyUrl: string, agentOptions?: https.AgentOptions) {
		super(proxyUrl, forProxyConnection(agentOptions));
		this.tunnelOptions = forTunnelledConnection(agentOptions);
	}

	async connect(req: http.ClientRequest, opts: ProxyConnectOpts): Promise<net.Socket> {
		return await super.connect(req, { ...opts, ...this.tunnelOptions });
	}
}

/**
 * Creates the agent routing plain-HTTP targets through `proxyUrl`.
 * Such a target has no TLS session of its own, so its TLS options are dropped.
 *
 * @param agentOptions options describing the connection to the **target**
 */
export function createProxiedHttpAgent(
	proxyUrl: string,
	agentOptions?: https.AgentOptions,
): HttpProxyAgent<string> {
	return new HttpProxyAgent(proxyUrl, forProxyConnection(agentOptions));
}

/**
 * Creates the agent tunnelling HTTPS targets through `proxyUrl`, applying the
 * target's TLS options to the tunnelled session rather than to the proxy handshake.
 *
 * @param agentOptions options describing the connection to the **target**
 */
export function createProxiedHttpsAgent(
	proxyUrl: string,
	agentOptions?: https.AgentOptions,
): HttpsProxyAgent<string> {
	return new TunnellingHttpsProxyAgent(proxyUrl, agentOptions);
}
