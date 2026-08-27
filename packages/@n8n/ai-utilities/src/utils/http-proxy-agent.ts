/**
 * Proxy/transport helpers for the AI model suppliers.
 *
 * These are the last AI proxy-fetch helpers not yet consolidated onto `@n8n/backend-network`.
 *
 * The dispatchers built here are handed to AI SDK clients via
 * `fetchOptions: { dispatcher }` and dispatched by the global `fetch`. They
 * must come from undici v7: a v7 dispatcher accepts the dispatch handlers of
 * every supported Node's fetch, while a v6 dispatcher rejects the v7 handlers
 * of Node >= 26 (`invalid onError method`).
 *
 * Proxy URL resolution and the Node `http(s).Agent` (both version-agnostic) do come from `@n8n/backend-network/proxy`,
 * so this module no longer depends on `proxy-from-env` / `https-proxy-agent` directly.
 *
 * TODO: drop these helpers and route their calls through
 * `@n8n/backend-network/transport` (CAT-3377 consolidated the backend callers
 * and left these runner-side ones in place).
 */
import { createHttpsProxyAgent, resolveProxyUrl } from '@n8n/backend-network/proxy'; // `@n8n/backend-network/proxy` is a DI-free subpath: it pulls in only the proxy-agent libs
import type { AgentOptions } from 'node:https';
import type { LookupFunction } from 'node:net';
/* eslint-disable n8n-local-rules/no-uncentralized-http -- raw dispatchers for AI SDK `fetchOptions`; see block comment above */
import { Agent, ProxyAgent, fetch as undiciFetch } from 'undici';

/**
 * Options for configuring HTTP agent timeouts.
 * These timeouts are passed to undici's Agent/ProxyAgent to override default 5-minute timeouts.
 */
export interface AgentTimeoutOptions {
	headersTimeout?: number;
	bodyTimeout?: number;
	connectTimeout?: number;
}

// Default timeout for AI operations (1 hour)
// Aligned with EXECUTIONS_TIMEOUT_MAX to ensure AI requests don't exceed workflow execution limits
// Configurable via N8N_AI_TIMEOUT_MAX environment variable to support custom timeout requirements
const DEFAULT_TIMEOUT = parseInt(process.env.N8N_AI_TIMEOUT_MAX ?? '3600000', 10);

/**
 * Stand-in target used when the real target URL is unknown in advance (e.g. when providing a proxy agent to ChatAwsBedrock).
 * Resolving against a stand-in cannot honor `NO_PROXY` for the real target, but it is better than having no proxy agent at all.
 */
const PROXY_FALLBACK_TARGET = 'https://example.nonexistent/';

/**
 * Returns an undici Agent or ProxyAgent with configured timeouts based on the environment variables and target URL.
 * When target URL is not provided, NO_PROXY environment variable is not respected.
 *
 * @param targetUrl - The target URL to check proxy configuration for (optional)
 * @param timeoutOptions - Optional timeout configuration to override defaults. When provided,
 *                         always returns an Agent/ProxyAgent (even without proxy) to ensure timeouts are applied.
 * @param lookup - Optional DNS lookup to pin the resolved address at connect time (e.g. an egress
 *                 filter's secure lookup). When provided (without a proxy) an Agent is always returned.
 * @returns An Agent (no proxy with timeout options, a lookup, or `N8N_AI_TIMEOUT_MAX` set) or ProxyAgent
 *          (with proxy) configured with timeouts, or undefined if no proxy, timeout options, lookup, nor
 *          `N8N_AI_TIMEOUT_MAX` are provided/set (backward compatible behavior).
 *
 * @remarks
 * When timeoutOptions are provided, this function always returns an agent to ensure timeouts are properly configured.
 * The default undici timeouts (5 minutes) are too short for many AI operations.
 * When timeoutOptions are NOT provided, this still returns an agent if `N8N_AI_TIMEOUT_MAX` is set,
 * so the env override isn't silently ignored just because no proxy is configured. Otherwise, returns
 * undefined if no proxy is configured (backward compatible).
 */
export function getProxyAgent(
	targetUrl?: string,
	timeoutOptions?: AgentTimeoutOptions,
	lookup?: LookupFunction,
) {
	const proxyUrl = resolveProxyUrl(targetUrl, PROXY_FALLBACK_TARGET);

	const agentOptions = {
		headersTimeout: timeoutOptions?.headersTimeout ?? DEFAULT_TIMEOUT,
		bodyTimeout: timeoutOptions?.bodyTimeout ?? DEFAULT_TIMEOUT,
		...(timeoutOptions?.connectTimeout !== undefined && {
			connectTimeout: timeoutOptions.connectTimeout,
		}),
	};

	if (!proxyUrl) {
		if (lookup) {
			return new Agent({ ...agentOptions, connect: { lookup } });
		}
		if (timeoutOptions) {
			return new Agent(agentOptions);
		}
		if (process.env.N8N_AI_TIMEOUT_MAX) {
			return new Agent(agentOptions);
		}
		return undefined;
	}

	return new ProxyAgent({ uri: proxyUrl, ...agentOptions });
}

/**
 * Make a fetch() request with an Agent/ProxyAgent that has configured timeouts.
 * If proxy environment variables are set, uses ProxyAgent; otherwise uses Agent.
 *
 * @param input - The URL to fetch
 * @param init - Standard fetch RequestInit options
 * @param timeoutOptions - Optional timeout configuration to override defaults
 * @param lookup - Optional connect-time DNS lookup (e.g. an egress filter's secure lookup)
 */
export async function proxyFetch(
	input: RequestInfo | URL,
	init?: RequestInit,
	timeoutOptions?: AgentTimeoutOptions,
	lookup?: LookupFunction,
): Promise<Response> {
	const targetUrl = input instanceof Request ? input.url : input.toString();
	const dispatcher = getProxyAgent(targetUrl, timeoutOptions, lookup);

	// The dispatcher comes from this package's undici, so the request must use
	// the same undici's fetch: the global fetch on Node >= 26 rejects it.
	return (await undiciFetch(input as Parameters<typeof undiciFetch>[0], {
		...(init as Parameters<typeof undiciFetch>[1]),
		dispatcher,
	})) as unknown as Response;
}

/**
 * Returns a Node.js HTTP/HTTPS proxy agent for use with AWS SDK v3 clients.
 * AWS SDK v3 requires Node.js http.Agent/https.Agent instances (not undici ProxyAgent).
 *
 * @param targetUrl - The target URL to check proxy configuration for
 * @param agentOptions - Optional agent options (e.g. TCP keepalive settings) applied to the proxy agent
 * @returns An https.Agent proxy instance or undefined if no proxy is configured
 */
export function getNodeProxyAgent(targetUrl?: string, agentOptions?: AgentOptions) {
	const proxyUrl = resolveProxyUrl(targetUrl, PROXY_FALLBACK_TARGET);

	if (!proxyUrl) {
		return undefined;
	}

	return createHttpsProxyAgent(targetUrl ?? PROXY_FALLBACK_TARGET, proxyUrl, agentOptions);
}
