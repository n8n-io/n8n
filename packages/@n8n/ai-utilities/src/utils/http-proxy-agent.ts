import { HttpsProxyAgent } from 'https-proxy-agent';
import proxyFromEnv from 'proxy-from-env';
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

/**
 * TLS/mTLS client certificate options for mutual TLS authentication.
 * These are passed as `connect` options to undici's Agent/ProxyAgent.
 */
export interface TlsOptions {
	/** Certificate Authority certificate in PEM format */
	ca?: string;
	/** Client certificate in PEM format (for mTLS) */
	cert?: string;
	/** Client private key in PEM format (for mTLS) */
	key?: string;
	/** Passphrase for the private key, if encrypted */
	passphrase?: string;
}

// Default timeout for AI operations (1 hour)
// Aligned with EXECUTIONS_TIMEOUT_MAX to ensure AI requests don't exceed workflow execution limits
// Configurable via N8N_AI_TIMEOUT_MAX environment variable to support custom timeout requirements
const DEFAULT_TIMEOUT = parseInt(process.env.N8N_AI_TIMEOUT_MAX ?? '3600000', 10);

/**
 * Resolves the proxy URL from environment variables for a given target URL.
 *
 * @param targetUrl - The target URL to check proxy configuration for (optional)
 * @returns The proxy URL string or undefined if no proxy is configured
 *
 * @remarks
 * There are cases where we don't know the target URL in advance (e.g. when we need to provide a proxy agent to ChatAwsBedrock).
 * In such case we use a dummy URL.
 * This will lead to `NO_PROXY` environment variable not being respected, but it is better than not having a proxy agent at all.
 */
function getProxyUrlFromEnv(targetUrl?: string): string {
	return proxyFromEnv.getProxyForUrl(targetUrl ?? 'https://example.nonexistent/');
}

/**
 * Returns an undici Agent or ProxyAgent with configured timeouts based on the environment variables and target URL.
 * When target URL is not provided, NO_PROXY environment variable is not respected.
 *
 * @param targetUrl - The target URL to check proxy configuration for (optional)
 * @param timeoutOptions - Optional timeout configuration to override defaults. When provided,
 *                         always returns an Agent/ProxyAgent (even without proxy) to ensure timeouts are applied.
 * @param tlsOptions - Optional TLS/mTLS client certificate options. When provided,
 *                     always returns an Agent/ProxyAgent to ensure TLS is applied.
 * @returns An Agent (no proxy with timeout/tls options) or ProxyAgent (with proxy) configured with timeouts and TLS,
 *          or undefined if no proxy is configured and no timeout/tls options are provided (backward compatible behavior).
 *
 * @remarks
 * When timeoutOptions or tlsOptions are provided, this function always returns an agent.
 * The default undici timeouts (5 minutes) are too short for many AI operations.
 * When neither timeoutOptions nor tlsOptions are provided, returns undefined if no proxy is configured (backward compatible).
 */
export function getProxyAgent(
	targetUrl?: string,
	timeoutOptions?: AgentTimeoutOptions,
	tlsOptions?: TlsOptions,
) {
	const proxyUrl = getProxyUrlFromEnv(targetUrl);

	const agentOptions = {
		headersTimeout: timeoutOptions?.headersTimeout ?? DEFAULT_TIMEOUT,
		bodyTimeout: timeoutOptions?.bodyTimeout ?? DEFAULT_TIMEOUT,
		...(timeoutOptions?.connectTimeout !== undefined && {
			connectTimeout: timeoutOptions.connectTimeout,
		}),
	};

	const connectOptions = tlsOptions
		? {
				ca: tlsOptions.ca || undefined,
				cert: tlsOptions.cert || undefined,
				key: tlsOptions.key || undefined,
				passphrase: tlsOptions.passphrase || undefined,
			}
		: undefined;

	if (!proxyUrl) {
		if (timeoutOptions || tlsOptions) {
			return new Agent({ ...agentOptions, ...(connectOptions && { connect: connectOptions }) });
		}
		return undefined;
	}

	return new ProxyAgent({
		uri: proxyUrl,
		...agentOptions,
		...(connectOptions && { connect: connectOptions }),
	});
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
 * @returns HttpsProxyAgent instance or undefined if no proxy is configured
 */
export function getNodeProxyAgent(targetUrl?: string) {
	const proxyUrl = getProxyUrlFromEnv(targetUrl);

	if (!proxyUrl) {
		return undefined;
	}

	return new HttpsProxyAgent(proxyUrl);
}
