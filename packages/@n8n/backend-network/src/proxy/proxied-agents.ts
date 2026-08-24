import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type http from 'node:http';
import type https from 'node:https';
import type net from 'node:net';

/** Per-hop connect options of a proxy agent, as `agent-base` hands them to `connect()`. */
type ProxyConnectOpts = Parameters<HttpsProxyAgent<string>['connect']>[1];

/**
 * How a socket is opened and pooled, as opposed to how the peer on the other end is
 * authenticated. Every TLS option in a request describes the target, including the
 * caller's willingness to accept a certificate it cannot verify, so a proxy borrows
 * these and nothing else: it is a different peer, and its certificate is always
 * verified against the proxy hostname. A private proxy CA is trusted through the
 * process trust store (`NODE_EXTRA_CA_CERTS`), not through a per-request option.
 */
const CONNECTION_OPTION_KEYS = [
	'keepAlive',
	'keepAliveMsecs',
	'keepAliveInitialDelay',
	'maxSockets',
	'maxTotalSockets',
	'maxFreeSockets',
	'scheduling',
	'timeout',
	'noDelay',
	'family',
	'hints',
	'localAddress',
	'localPort',
	'lookup',
	'autoSelectFamily',
	'autoSelectFamilyAttemptTimeout',
] as const satisfies ReadonlyArray<keyof https.AgentOptions>;

function pickKeys(agentOptions: https.AgentOptions, keys: readonly string[]): https.AgentOptions {
	return Object.fromEntries(
		Object.entries(agentOptions).filter(([key]) => keys.includes(key)),
	) as https.AgentOptions;
}

function omitKeys(agentOptions: https.AgentOptions, keys: readonly string[]): https.AgentOptions {
	return Object.fromEntries(
		Object.entries(agentOptions).filter(([key]) => !keys.includes(key)),
	) as https.AgentOptions;
}

function forProxyConnection(agentOptions: https.AgentOptions = {}): https.AgentOptions {
	return pickKeys(agentOptions, CONNECTION_OPTION_KEYS);
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
 * @param agentOptions options describing the connection to the **target**; only its
 * connection-management options reach the proxy
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
 * @param agentOptions options describing the connection to the **target**; only its
 * connection-management options reach the proxy
 */
export function createProxiedHttpsAgent(
	proxyUrl: string,
	agentOptions?: https.AgentOptions,
): HttpsProxyAgent<string> {
	return new TunnellingHttpsProxyAgent(proxyUrl, agentOptions);
}
