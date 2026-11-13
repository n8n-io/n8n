/**
 * Shared keep-alive HTTP(S) agents for the steps of a worker.
 *
 * n8n's request helpers (`@n8n/backend-network`) make a new `http.Agent` or
 * `https.Agent` for each request. So each request of a v1 node opens a new
 * connection: a DNS lookup, a TCP connect and a full TLS handshake. In the
 * host, that is about 2 ms of CPU for each HTTPS request, more than most
 * nodes need for their own work.
 *
 * `installSharedAgents` makes `http.request` and `https.request` send such a
 * request through one keep-alive agent of the worker instead. The result of
 * the request does not change; only the connection can be one that an earlier
 * request opened. The rules:
 *
 * - Only an agent of the plain classes (or n8n's environment proxy agents
 *   when no proxy is set) is replaced. An agent with a `lookup` (the SSRF
 *   guard), a proxy agent or any other agent class keeps its own connections.
 * - The TLS options of the replaced agent go with the request. Node.js keys
 *   its connection pools by host, port and these options (`Agent.getName`),
 *   so a request with another CA, client certificate or key (mTLS) never gets
 *   the connection of another credential.
 * - An agent option that `getName` does not include (for example a
 *   `checkServerIdentity` function) keeps the request on its own agent.
 * - Agents hold no cookies or headers. Each request sends its own.
 * - An idle connection closes after `IDLE_MS`, shorter than the idle timeout
 *   of most servers, so a request rarely gets a connection that the server
 *   has closed.
 *
 * DNS answers are kept for `DNS_TTL_MS` for new connections of the shared
 * agents.
 *
 * `WF_FALLBACK_HTTP_KEEP_ALIVE=false` turns this off.
 */
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';

/** Idle time after which a free connection closes. */
const IDLE_MS = 4_000;

/** Time for which a DNS answer is kept. */
const DNS_TTL_MS = 30_000;

/** The most DNS answers that are kept. */
const DNS_CACHE_SIZE = 1_000;

const PROXY_VARIABLES = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY'];

/** The agent classes of `@n8n/backend-network` that connect directly when no proxy is set. */
const ENV_PROXY_AGENTS = new Set(['EnvProxyHttpAgent', 'EnvProxyHttpsAgent']);

/**
 * Agent options that `Agent.getName` puts in the pool key, or that do not
 * change a connection. A request whose agent has another option keeps its agent.
 */
const POOL_KEY_OPTIONS = new Set([
	'ca',
	'cert',
	'ciphers',
	'clientCertEngine',
	'crl',
	'dhparam',
	'ecdhCurve',
	'honorCipherOrder',
	'key',
	'maxVersion',
	'minVersion',
	'passphrase',
	'pfx',
	'privateKeyEngine',
	'privateKeyIdentifier',
	'rejectUnauthorized',
	'secureOptions',
	'secureProtocol',
	'servername',
	'sessionIdContext',
	'sigalgs',
]);

/** Options of every agent that the shared agent sets itself. */
const AGENT_OWN_OPTIONS = new Set([
	'keepAlive',
	'keepAliveMsecs',
	'maxSockets',
	'maxFreeSockets',
	'maxTotalSockets',
	'scheduling',
	'timeout',
	'noDelay',
	'path',
	'proxyEnv',
	'defaultPort',
	'protocol',
]);

let installed = false;

export function keepAliveEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
	return env.WF_FALLBACK_HTTP_KEEP_ALIVE !== 'false';
}

function proxyIsSet(env: NodeJS.ProcessEnv): boolean {
	return PROXY_VARIABLES.some((name) => (env[name] ?? env[name.toLowerCase()] ?? '').trim() !== '');
}

/** Replaces the per-request agents of the n8n request helpers with shared keep-alive agents. */
export function installSharedAgents(env: NodeJS.ProcessEnv = process.env): void {
	if (installed || !keepAliveEnabled(env) || proxyIsSet(env)) return;
	installed = true;
	const lookup = cachedLookup();
	const options = { keepAlive: true, timeout: IDLE_MS, scheduling: 'lifo' as const, lookup };
	patchRequest(http, new http.Agent(options), http.Agent);
	patchRequest(https, new https.Agent(options), https.Agent);
}

interface RequestModule {
	request: typeof http.request;
	globalAgent: http.Agent;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The TLS options of an agent that the request takes over, or undefined when
 * the agent must keep its own connections.
 */
function sharedOptions(
	agent: http.Agent,
	agentClass: typeof http.Agent,
	module: RequestModule,
): Record<string, unknown> | undefined {
	if (agent === module.globalAgent) return undefined;
	const ctor: unknown = Object.getPrototypeOf(agent)?.constructor;
	const name = typeof ctor === 'function' ? ctor.name : '';
	if (ctor !== agentClass && !ENV_PROXY_AGENTS.has(name)) return undefined;
	const own: unknown = Reflect.get(agent, 'options');
	if (!isRecord(own)) return undefined;
	const taken: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(own)) {
		if (value === undefined || value === null || AGENT_OWN_OPTIONS.has(key)) continue;
		if (!POOL_KEY_OPTIONS.has(key)) return undefined;
		taken[key] = value;
	}
	return taken;
}

function patchRequest(
	module: RequestModule,
	shared: http.Agent,
	agentClass: typeof http.Agent,
): void {
	const original = module.request;
	const request = function (this: unknown, ...args: unknown[]): http.ClientRequest {
		// `request(options[, done])` or `request(url, options[, done])`.
		const at = isRecord(args[0]) && !(args[0] instanceof URL) ? 0 : 1;
		const options = args[at];
		if (isRecord(options) && options.agent instanceof http.Agent) {
			const taken = sharedOptions(options.agent, agentClass, module);
			if (taken) {
				const copy = [...args];
				// The agent's options win over the request's, as in `Agent.addRequest`.
				copy[at] = { ...options, ...taken, agent: shared };
				return Reflect.apply(original, this, copy);
			}
		}
		return Reflect.apply(original, this, args);
	};
	Reflect.set(module, 'request', request);
	// `get` calls the module's own `request`, not the export. This is Node.js's `get`.
	Reflect.set(module, 'get', function (this: unknown, ...args: unknown[]): http.ClientRequest {
		const req = Reflect.apply(request, this, args);
		req.end();
		return req;
	});
}

interface CachedAnswer {
	expires: number;
	address: string | dns.LookupAddress[];
	family: number;
}

/** `dns.lookup` with a short cache, for the new connections of the shared agents. */
function cachedLookup(): LookupFunction {
	const answers = new Map<string, CachedAnswer>();
	return (hostname, options, done) => {
		const key = `${hostname}|${options.family ?? 0}|${options.all === true ? 1 : 0}|${options.hints ?? 0}`;
		const hit = answers.get(key);
		if (hit && hit.expires > Date.now()) {
			if (Array.isArray(hit.address)) done(null, hit.address);
			else done(null, hit.address, hit.family);
			return;
		}
		// `dns.lookup` is read at call time, so a resolver that n8n or a test installs applies.
		dns.lookup(hostname, options, (error, address, family) => {
			if (!error) {
				if (answers.size >= DNS_CACHE_SIZE) answers.clear();
				answers.set(key, { expires: Date.now() + DNS_TTL_MS, address, family: family ?? 0 });
			}
			if (Array.isArray(address)) done(error, address);
			else done(error, address, family ?? 0);
		});
	};
}
