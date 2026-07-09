/**
 * Proxy/transport helpers for the AI model suppliers.
 *
 * These are the last AI proxy-fetch helpers not yet consolidated onto `@n8n/backend-network`.
 * They are kept here because their consumers (the langchain providers, e.g. `@langchain/openai` / `@langchain/anthropic`) pin
 * undici v6 and inject the proxy via `fetchOptions: { dispatcher }`,
 * while `@n8n/backend-network` builds undici v7 dispatchers.
 *
 * A v7 `Dispatcher` is not interoperable with a v6 `fetch` (the dispatch-handler protocol differs),
 * so the dispatcher produced here cannot simply come from backend-network.
 *
 * Proxy URL resolution and the Node `http(s).Agent` (both version-agnostic) do come from `@n8n/backend-network/proxy`,
 * so this module no longer depends on `proxy-from-env` / `https-proxy-agent` directly.
 *
 * TODO: once these consumers move to undici v7, drop these helpers and route
 * their calls through `@n8n/backend-network/transport` (use `asCustomFetch()`,
 * a self-contained `fetch` that is version-agnostic, rather than handing out a
 * raw dispatcher). See CAT-3377 for the consolidation this completes.
 */
import { createHttpsProxyAgent, resolveProxyUrl } from '@n8n/backend-network/proxy'; // `@n8n/backend-network/proxy` is a DI-free subpath: it pulls in only the proxy-agent libs
/* eslint-disable n8n-local-rules/no-uncentralized-http -- langchain consumers pin undici v6, incompatible with backend-network's v7 dispatchers; see block comment below */
import { Agent, ProxyAgent } from 'undici';

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
 * @returns An Agent (no proxy with timeout options) or ProxyAgent (with proxy) configured with timeouts,
 *          or undefined if no proxy is configured and no timeout options are provided (backward compatible behavior).
 *
 * @remarks
 * When timeoutOptions are provided, this function always returns an agent to ensure timeouts are properly configured.
 * The default undici timeouts (5 minutes) are too short for many AI operations.
 * When timeoutOptions are NOT provided, returns undefined if no proxy is configured (backward compatible).
 */
export function getProxyAgent(targetUrl?: string, timeoutOptions?: AgentTimeoutOptions) {
	const proxyUrl = resolveProxyUrl(targetUrl, PROXY_FALLBACK_TARGET);

	const agentOptions = {
		headersTimeout: timeoutOptions?.headersTimeout ?? DEFAULT_TIMEOUT,
		bodyTimeout: timeoutOptions?.bodyTimeout ?? DEFAULT_TIMEOUT,
		...(timeoutOptions?.connectTimeout !== undefined && {
			connectTimeout: timeoutOptions.connectTimeout,
		}),
	};

	if (!proxyUrl) {
		if (timeoutOptions) {
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
 */
export async function proxyFetch(
	input: RequestInfo | URL,
	init?: RequestInit,
	timeoutOptions?: AgentTimeoutOptions,
): Promise<Response> {
	const targetUrl = input instanceof Request ? input.url : input.toString();
	const dispatcher = getProxyAgent(targetUrl, timeoutOptions);

	return await fetch(input, {
		...init,
		// @ts-expect-error - dispatcher is an undici-specific option not in standard fetch
		dispatcher,
	});
}

/**
 * Returns a Node.js HTTP/HTTPS proxy agent for use with AWS SDK v3 clients.
 * AWS SDK v3 requires Node.js http.Agent/https.Agent instances (not undici ProxyAgent).
 *
 * @param targetUrl - The target URL to check proxy configuration for
 * @returns An https.Agent proxy instance or undefined if no proxy is configured
 */
export function getNodeProxyAgent(targetUrl?: string) {
	const proxyUrl = resolveProxyUrl(targetUrl, PROXY_FALLBACK_TARGET);

	if (!proxyUrl) {
		return undefined;
	}

	return createHttpsProxyAgent(targetUrl ?? PROXY_FALLBACK_TARGET, proxyUrl);
}
