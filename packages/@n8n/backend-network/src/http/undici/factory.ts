import { Service } from '@n8n/di';
import type http from 'node:http';
import type https from 'node:https';
import type { Dispatcher } from 'undici';
import { Agent, EnvHttpProxyAgent, ProxyAgent, fetch as undiciFetch } from 'undici';

import { SsrfProtectionService } from '../../ssrf';
import { buildNodeAgents } from '../node-agents';
import type { NodeAgentOptions, ProxyOption, SsrfOption } from '../node-agents';

/**
 * Drop-in replacement type for the global `fetch`.
 */
export type CustomFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface OutboundHttpClientOptions {
	/**
	 * Proxy routing for requests made via this client. Defaults to `'env'`.
	 */
	proxy?: ProxyOption;
	/**
	 * SSRF protection level.
	 * Pass `'disabled'` to explicitly opt out.
	 */
	ssrf?: SsrfOption;
}

export interface OutboundHttpClient {
	/**
	 * Returns a drop-in replacement for the global `fetch`, suitable for AI
	 * SDKs that accept a `customFetch` option (e.g. Anthropic SDK, OpenAI SDK).
	 *
	 * When SSRF protection is active the URL is validated (pre-flight async DNS
	 * check) before every request is dispatched. Proxy routing is applied via
	 * the underlying undici dispatcher.
	 */
	asCustomFetch(): CustomFetch;

	/**
	 * Returns an undici `Dispatcher` configured with this client's proxy settings.
	 * Pass this to SDKs that accept a dispatcher directly.
	 *
	 * SSRF validation is **not** applied inside the dispatcher itself. When
	 * per-request SSRF enforcement is needed, use `asCustomFetch()` instead.
	 */
	getDispatcher(): Dispatcher;

	/**
	 * Returns a `{ httpAgent, httpsAgent }` pair for AWS SDK v3 and similar
	 * libraries that accept explicit Node.js agent options.
	 *
	 * Pass `agentOptions` to forward per-call TLS / agent settings (e.g.
	 * `servername`, `rejectUnauthorized`, `ca`). Calls without `agentOptions`
	 * return cached agent instances; calls with `agentOptions` build fresh ones.
	 *
	 * When SSRF protection is active, a secure DNS lookup is injected only for
	 * **direct** connections (no proxy). Behind a proxy the lookup would resolve
	 * the proxy host rather than the final target, so it is omitted there and the
	 * proxy is responsible for validating the final target.
	 * (see CAT-2554 for future developments about that)
	 */
	getNodeAgent(agentOptions?: NodeAgentOptions): { httpAgent: http.Agent; httpsAgent: https.Agent };
}

/**
 * Factory for outbound HTTP clients.
 *
 * Injectable via `@n8n/di`. This step is additive. No existing callsite
 * migrates yet. Registering the factory in the container is enough to start
 * wiring new code against it.
 */
@Service()
export class OutboundHttpFactory {
	constructor(private readonly ssrfProtection: SsrfProtectionService) {}

	/**
	 * Creates an outbound HTTP client.
	 *
	 * Defaults: `proxy: 'env'`, `ssrf` enabled.
	 * Pass `{ ssrf: 'disabled' }` to opt out.
	 */
	create(options?: OutboundHttpClientOptions): OutboundHttpClient {
		return this.buildClient({
			proxy: options?.proxy ?? 'env',
			ssrf: options?.ssrf ?? this.ssrfProtection,
		});
	}

	private buildClient(config: { proxy: ProxyOption; ssrf: SsrfOption }): OutboundHttpClient {
		const dispatcher = buildDispatcher(config.proxy);
		const defaultNodeAgents = buildNodeAgents(config.proxy, config.ssrf);

		return {
			asCustomFetch: () => buildCustomFetch(dispatcher, config.ssrf),
			getDispatcher: () => dispatcher,
			getNodeAgent: (agentOptions) =>
				agentOptions === undefined
					? defaultNodeAgents
					: buildNodeAgents(config.proxy, config.ssrf, agentOptions),
		};
	}
}

function buildDispatcher(proxy: ProxyOption): Dispatcher {
	if (proxy === false) {
		return new Agent();
	}
	if (proxy === 'env') {
		return new EnvHttpProxyAgent();
	}
	return new ProxyAgent(proxy);
}

function buildCustomFetch(dispatcher: Dispatcher, ssrf: SsrfOption): CustomFetch {
	if (ssrf === 'disabled') {
		return async (input, init) => await dispatchedFetch(dispatcher, input, init);
	}

	const bridge = ssrf;
	return async (input, init) => {
		const url = input instanceof URL ? input.href : typeof input === 'string' ? input : input.url;

		const result = await bridge.validateUrl(url);
		if (!result.ok) {
			throw result.error;
		}

		return await dispatchedFetch(dispatcher, input, init);
	};
}

async function dispatchedFetch(
	dispatcher: Dispatcher,
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	return (await undiciFetch(
		input as Parameters<typeof undiciFetch>[0],
		{ ...(init ?? {}), dispatcher } as Parameters<typeof undiciFetch>[1],
	)) as unknown as Response;
}
