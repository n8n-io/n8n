import type { HttpsProxyAgent } from 'https-proxy-agent';
import { UnexpectedError } from 'n8n-workflow';
import type http from 'node:http';
import type net from 'node:net';

import type { SsrfBridge } from '../ssrf';

/** Per-hop connect options of a proxy agent, as `agent-base` hands them to `connect()`. */
type ProxyConnectOpts = Parameters<HttpsProxyAgent<string>['connect']>[1];

export class UnknownConnectionHostError extends UnexpectedError {
	constructor() {
		super('Cannot determine the host for this connection');
	}
}

/** Subset of an agent's connection options we read to find the target host. */
type ConnectionOptions = { host?: string | null; hostname?: string | null };

/**
 * Runtime-only `createConnection` method of Node's http(s) agents.
 */
type CreateConnection = (
	options: ConnectionOptions,
	onConnect?: (error: Error | null, stream?: unknown) => void,
) => unknown;

interface ProxyConnectionAgent {
	connectOpts: ConnectionOptions;
	connect(req: http.ClientRequest, opts: ProxyConnectOpts): Promise<net.Socket>;
}

function connectionHostError(ssrf: SsrfBridge, options: ConnectionOptions): Error | undefined {
	const host = options.host ?? options.hostname ?? undefined;
	if (typeof host !== 'string' || host.length === 0) {
		return new UnknownConnectionHostError();
	}
	const result = ssrf.validateConnectionHost(host);
	return result.ok ? undefined : result.error;
}

/**
 * Validates the proxy's own host before the socket to it opens.
 *
 * `agent-base` opens that socket inside `connect()`, from `connectOpts`.
 * The agent's `createConnection` receives the target's options and never sees the proxy.
 * This guard decides IP literals only.
 * A hostname proxy relies on the secure lookup in the agent's options, which validates
 * the address that hostname resolves to.
 */
export function installProxyConnectionGuard(agent: ProxyConnectionAgent, ssrf: SsrfBridge): void {
	const connect = agent.connect.bind(agent);
	agent.connect = async (req, opts) => {
		const error = connectionHostError(ssrf, agent.connectOpts);
		if (error) {
			throw error;
		}
		return await connect(req, opts);
	};
}

/**
 * Wraps an agent's `createConnection` to validate the connection target before the socket opens.
 *
 * Node invokes the custom `lookup` to resolve hostnames only.
 * An IP-literal target therefore reaches the socket unresolved, and needs this check
 * at connection time.
 */
export function installConnectionGuard(
	target: { createConnection: CreateConnection },
	ssrf: SsrfBridge,
): void {
	const createConnection = target.createConnection.bind(target);
	target.createConnection = (options, onConnect) => {
		const error = connectionHostError(ssrf, options);
		if (error) {
			if (onConnect) {
				onConnect(error);
				return undefined;
			}
			throw error;
		}
		return createConnection(options, onConnect);
	};
}
