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
 * @returns An Agent (no proxy with timeout options) or ProxyAgent (with proxy) configured with timeouts,
 *          or undefined if no proxy is configured and no timeout options are provided (backward compatible behavior).
 *
 * @remarks
 * When timeoutOptions are provided, this function always returns an agent to ensure timeouts are properly configured.
 * The default undici timeouts (5 minutes) are too short for many AI operations.
 * When timeoutOptions are NOT provided, returns undefined if no proxy is configured (backward compatible).
 */
export function getProxyAgent(targetUrl?: string, timeoutOptions?: AgentTimeoutOptions) {
	const proxyUrl = getProxyUrlFromEnv(targetUrl);

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
 * Validates that a URL string is valid and can be parsed.
 * This enforces strict validation to prevent silent failures or delayed crashes.
 *
 * @param url - The URL string to validate
 * @param source - Optional source description for better error messages
 * @throws {TypeError} If the URL is invalid
 */
function validateUrlString(url: string, source?: string): void {
	if (!url || typeof url !== 'string') {
		throw new TypeError(
			`Invalid URL input: expected a non-empty string, got ${typeof url}${source ? ` (from ${source})` : ''}.`,
		);
	}

	// Check for the specific "[object Request]" error pattern
	if (url === '[object Request]') {
		throw new TypeError(
			'Failed to parse URL from Request object. This indicates a bug where Request.toString() was called instead of extracting Request.url. ' +
				`${source ? `Source: ${source}` : 'Please report this issue.'}`,
		);
	}

	try {
		// eslint-disable-next-line no-new
		new URL(url);
	} catch (error) {
		const errorMessage =
			error instanceof TypeError && error.message
				? error.message
				: 'Invalid URL format';
		throw new TypeError(
			`Failed to parse URL from "${url}". ${errorMessage}${source ? ` Source: ${source}` : ''}`,
		);
	}
}

/**
 * Normalizes RequestInfo | URL to string | URL for internal use.
 * This is the single source of truth for request input normalization.
 * All HTTP requests pass through this function to enforce the global invariant:
 * no internal fetch/proxy layer may ever receive an invalid URL input.
 *
 * @param input - RequestInfo (Request | string) or URL object
 * @returns string (URL string) or URL object
 * @throws {TypeError} If the input cannot be normalized to a valid URL
 */
function normalizeRequestInput(input: RequestInfo | URL): string | URL {
	if (input instanceof Request) {
		// Request objects need their URL property extracted (not toString())
		const url = input.url;
		if (!url || typeof url !== 'string') {
			throw new TypeError(
				`Request object has invalid URL property: expected string, got ${typeof url}. ` +
					'This may indicate a corrupted Request object.',
			);
		}
		validateUrlString(url, 'Request.url');
		return url;
	}

	if (typeof input === 'string') {
		validateUrlString(input, 'string input');
		return input;
	}

	if (input instanceof URL) {
		// URL objects are already validated by the constructor
		// Double-check by converting to string to ensure it's valid
		try {
			input.toString();
		} catch (error) {
			throw new TypeError(
				`Invalid URL object: ${error instanceof Error ? error.message : 'unknown error'}`,
			);
		}
		return input;
	}

	// This should never happen with proper TypeScript types, but provides a safety net
	// Helps catch runtime type issues or future API changes
	throw new TypeError(
		`Unsupported fetch input type: ${typeof input}${input?.constructor?.name ? ` (${input.constructor.name})` : ''}. ` +
			'Expected Request, string, or URL object. This may indicate a compatibility issue with the fetch API.',
	);
}

/**
 * Extracts a URL string from normalized input for proxy agent configuration.
 * This is used internally to determine proxy settings based on the target URL.
 *
 * @param input - Normalized input (string | URL)
 * @returns URL string
 */
function extractUrlString(input: string | URL): string {
	if (input instanceof URL) {
		return input.toString();
	}
	return input;
}

/**
 * Make a fetch() request with an Agent/ProxyAgent that has configured timeouts.
 * If proxy environment variables are set, uses ProxyAgent; otherwise uses Agent.
 *
 * This function enforces a global invariant: no internal fetch/proxy layer may ever
 * receive an invalid URL input. All RequestInfo types (Request | string | URL) are
 * normalized and validated at this boundary.
 *
 * @param input - The URL to fetch (RequestInfo: Request | string | URL)
 * @param init - Standard fetch RequestInit options
 * @param timeoutOptions - Optional timeout configuration to override defaults
 * @returns Promise resolving to Response
 * @throws {TypeError} If the input cannot be normalized to a valid URL
 */
export async function proxyFetch(
	input: RequestInfo | URL,
	init?: RequestInit,
	timeoutOptions?: AgentTimeoutOptions,
): Promise<Response> {
	// Normalize and validate input at the HTTP boundary
	const normalizedInput = normalizeRequestInput(input);
	const urlString = extractUrlString(normalizedInput);

	// Use normalized input for fetch and proxy agent configuration
	return await fetch(normalizedInput, {
		...init,
		// @ts-expect-error - dispatcher is an undici-specific option not in standard fetch
		dispatcher: getProxyAgent(urlString, timeoutOptions),
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
