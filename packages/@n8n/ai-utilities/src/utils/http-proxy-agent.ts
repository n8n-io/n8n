/**
 * Proxy/transport helpers for the AI model suppliers.
 *
 * The dispatchers this module hands out go to AI SDK clients via
 * `fetchOptions: { dispatcher }` and are dispatched by the SDK's fetch. They
 * must be built by a v7 undici — which is why construction is delegated to
 * `@n8n/backend-network/transport` (itself on `catalog:undici-v7`): a v7
 * dispatcher accepts the dispatch handlers of every supported Node's fetch,
 * while a v6 dispatcher rejects the v7 handlers of Node >= 26
 * (`invalid onError method`).
 *
 * Dispatcher construction, egress validation and the dispatcher-bound fetch
 * come from `@n8n/backend-network`'s DI-free subpaths, so this
 * module only maps its callers' options — AI timeout defaults, the shared
 * default dispatcher — onto that shared core.
 */
import { passthroughEgressFilter } from '@n8n/backend-network/egress';
import {
	createHttpsProxyAgent,
	isProxyRequired,
	resolveProxyUrl,
} from '@n8n/backend-network/proxy'; // `@n8n/backend-network/proxy` is a DI-free subpath: it pulls in only the proxy-agent libs
import {
	buildDispatcher,
	dispatchedFetch,
	limitResponseBody,
	type ResponseSizeLimit,
	type TransportSsrfPolicy,
} from '@n8n/backend-network/transport';
import type { AgentOptions } from 'node:https';
import { pipeline, type Readable, Transform } from 'node:stream';
import type { Dispatcher } from 'undici';
import { OperationalError } from 'n8n-workflow';

/**
 * Options for configuring HTTP agent timeouts.
 * These timeouts are passed to the underlying undici agents to override default 5-minute timeouts.
 */
export interface AgentTimeoutOptions {
	headersTimeout?: number;
	bodyTimeout?: number;
	connectTimeout?: number;
}

export type EgressFilter = TransportSsrfPolicy;

// Default timeout for AI operations (1 hour)
// Aligned with EXECUTIONS_TIMEOUT_MAX to ensure AI requests don't exceed workflow execution limits
// Configurable via N8N_AI_TIMEOUT_MAX environment variable to support custom timeout requirements
const DEFAULT_TIMEOUT = parseInt(process.env.N8N_AI_TIMEOUT_MAX ?? '3600000', 10);

// Bound the response body every AI client may buffer, so a hostile or
// misbehaving endpoint cannot stream an unbounded body until the heap runs
// out. The count is of decoded bytes, so a compressed body cannot expand past
// the cap. Real completions are far below this 100 MB default.
const DEFAULT_MAX_RESPONSE_SIZE = 100 * 1024 * 1024;

/**
 * Resolve the cap from `N8N_AI_MAX_RESPONSE_SIZE` (in bytes). Set it to 0 to
 * disable the cap; a blank, malformed or negative value falls back to the
 * default.
 */
function resolveMaxResponseSize(): number {
	const configured = process.env.N8N_AI_MAX_RESPONSE_SIZE?.trim();
	if (!configured) return DEFAULT_MAX_RESPONSE_SIZE;

	const parsed = Number(configured);
	const isValid = Number.isSafeInteger(parsed) && parsed >= 0;
	return isValid ? parsed : DEFAULT_MAX_RESPONSE_SIZE;
}

const MAX_RESPONSE_SIZE = resolveMaxResponseSize();

function responseSizeError(maxBytes: number): OperationalError {
	return new OperationalError(
		`Response body exceeded the maximum allowed size of ${maxBytes} bytes`,
	);
}

/** The AI response-size limit, in the shape `@n8n/backend-network` consumes. */
const responseSizeLimit: ResponseSizeLimit = {
	maxBytes: MAX_RESPONSE_SIZE,
	createError: responseSizeError,
};

/**
 * Stand-in target used when the real target URL is unknown in advance (e.g. when providing a proxy agent to ChatAwsBedrock).
 * It only decides whether an env-proxied dispatcher is built at all: that dispatcher re-resolves
 * the proxy from the environment per dispatched request, so `NO_PROXY` is honored for the real target.
 */
const PROXY_FALLBACK_TARGET = 'https://example.nonexistent/';

/**
 * Dispatcher shared by every caller that needs no proxy, no timeout overrides
 * and no effective egress filter, so those callers keep a single connection
 * pool instead of building a dispatcher (and a pool) per request.
 */
let sharedDispatcher: Dispatcher | undefined;

/**
 * The passthrough filter (the "no policy configured" singleton) enforces
 * nothing, so it resolves to `'disabled'` and keeps the shared-dispatcher
 * fast path. Every other supplied policy is returned unchanged.
 */
function toSsrfOption(egressFilter: EgressFilter): EgressFilter | 'disabled' {
	if (egressFilter === passthroughEgressFilter) {
		return 'disabled';
	}
	return egressFilter;
}

/**
 * Returns an undici dispatcher with configured timeouts based on the environment variables and target URL.
 * When target URL is not provided, NO_PROXY environment variable is not respected.
 *
 * @param targetUrl - The target URL to check proxy configuration for (optional)
 * @param timeoutOptions - Optional timeout configuration to override defaults.
 * @param egressFilter - The execution context's secure egress filter, enforced on every
 *                       dispatched request: pre-flight URL validation on each redirect hop and
 *                       a pinned DNS resolution. The passthrough filter enforces nothing.
 * @returns A dispatcher routing through the environment proxy when one applies to the target,
 *          otherwise a direct dispatcher. Callers using the defaults (no timeout options, no
 *          `N8N_AI_TIMEOUT_MAX`, no effective egress filter) share one dispatcher.
 *
 * @remarks
 * The default undici timeouts (5 minutes) are too short for many AI operations, so a dispatcher
 * is always returned rather than falling back to undici's global dispatcher. `N8N_AI_TIMEOUT_MAX`
 * is honoured even when no proxy and no explicit timeout options are configured.
 */
export function getProxyAgent(
	targetUrl: string | undefined,
	timeoutOptions: AgentTimeoutOptions | undefined,
	egressFilter: EgressFilter,
): Dispatcher {
	const proxyRequired = isProxyRequired(targetUrl, PROXY_FALLBACK_TARGET);
	const ssrf = toSsrfOption(egressFilter);

	const timeouts = {
		headersTimeout: timeoutOptions?.headersTimeout ?? DEFAULT_TIMEOUT,
		bodyTimeout: timeoutOptions?.bodyTimeout ?? DEFAULT_TIMEOUT,
		...(timeoutOptions?.connectTimeout !== undefined && {
			connectTimeout: timeoutOptions.connectTimeout,
		}),
	};

	const isDefaultCase =
		!proxyRequired && !timeoutOptions && !process.env.N8N_AI_TIMEOUT_MAX && ssrf === 'disabled';

	if (isDefaultCase) {
		sharedDispatcher ??= buildDispatcher(false, 'disabled', { timeouts });
		return sharedDispatcher;
	}

	return buildDispatcher(proxyRequired ? 'env' : false, ssrf, { timeouts });
}

/**
 * Options for {@link proxyFetch}.
 */
export interface ProxyFetchOptions {
	/** The URL to fetch */
	input: RequestInfo | URL;
	/** Standard fetch RequestInit options */
	init?: RequestInit;
	/** Optional timeout configuration to override defaults */
	timeoutOptions?: AgentTimeoutOptions;
	/** Egress filter enforced on every dispatched request, e.g. the execution context's secure egress filter */
	egressFilter: EgressFilter;
}

/**
 * Make a fetch() request with a dispatcher that has configured timeouts.
 * If proxy environment variables are set, the dispatcher routes through the proxy.
 */
export async function proxyFetch({
	input,
	init,
	timeoutOptions,
	egressFilter,
}: ProxyFetchOptions): Promise<Response> {
	// Two Request classes exist at runtime (the global one and this package's
	// undici), so detect a Request by exclusion instead of `instanceof`.
	const isRequest = typeof input !== 'string' && !(input instanceof URL);
	const targetUrl = isRequest ? input.url : input.toString();
	const dispatcher = getProxyAgent(targetUrl, timeoutOptions, egressFilter);

	// `dispatchedFetch` runs the fetch of the undici the dispatcher was built
	// from: the global fetch on Node >= 26 rejects a foreign dispatcher. That
	// fetch only recognizes its own Request class and stringifies any other, so
	// a Request (the Mistral SDK builds one with the global class) is passed
	// as url + init instead.
	if (!isRequest) return await dispatchedFetch(dispatcher, input, init, responseSizeLimit);

	return await dispatchedFetch(
		dispatcher,
		targetUrl,
		{
			method: input.method,
			headers: [...input.headers],
			body: input.body === null ? undefined : await input.arrayBuffer(),
			signal: input.signal,
			redirect: input.redirect,
			...init,
		},
		responseSizeLimit,
	);
}

/**
 * A drop-in for an SDK's `fetch` option that applies n8n's AI transport
 * policy. Today that policy bounds the decoded response body; wrap the SDK's
 * fetch through this instead of using the SDK default. It stays global `fetch`
 * (with the dispatcher passed through `fetchOptions`), so HTTP mocks that patch
 * the global undici still see the request.
 */
export async function aiClientFetch(...args: Parameters<typeof fetch>): Promise<Response> {
	return limitResponseBody(await fetch(...args), responseSizeLimit);
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

/**
 * A Node `Transform` that errors once the bytes it has passed through exceed
 * the cap. Its own function so it can be unit-tested in isolation. This is the
 * Node-stream counterpart of `@n8n/backend-network`'s web-stream limiter, for
 * SDKs (AWS Bedrock) that hand back a Node `Readable` instead of a fetch body.
 */
export function createResponseStreamLimit(maxBytes: number): Transform {
	let received = 0;
	return new Transform({
		transform(chunk: Buffer, _encoding, done) {
			received += chunk.length;
			done(received > maxBytes ? responseSizeError(maxBytes) : null, chunk);
		},
	});
}

/** Bound a response body that arrives as a Node `Readable`. */
export function limitAiResponseStream(body: Readable): Readable {
	if (MAX_RESPONSE_SIZE === 0) return body;
	return pipeline(body, createResponseStreamLimit(MAX_RESPONSE_SIZE), () => {
		// The SDK reads errors off the returned stream; pipeline closes the source too.
	});
}
