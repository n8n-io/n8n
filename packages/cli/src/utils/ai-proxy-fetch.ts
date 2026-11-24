import type { CustomFetch, OutboundHttp } from '@n8n/backend-network';
import { Time } from '@n8n/constants';

const DEFAULT_AI_REQUEST_TIMEOUT_MS = Time.hours.toMilliseconds;

/**
 * Timeout (ms) for outbound AI provider / AI-MCP HTTP calls. undici defaults
 * `headersTimeout` / `bodyTimeout` to 5 minutes, which is too short for long
 * LLM completions, so we align to the workflow execution timeout. Overridable
 * via `N8N_AI_TIMEOUT_MAX`; a non-numeric override falls back to the default.
 */
export const AI_REQUEST_TIMEOUT_MS = resolveTimeoutMs(process.env.N8N_AI_TIMEOUT_MAX);

function resolveTimeoutMs(raw: string | undefined): number {
	if (raw === undefined) {
		return DEFAULT_AI_REQUEST_TIMEOUT_MS;
	}
	const parsed = parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AI_REQUEST_TIMEOUT_MS;
}

/**
 * A proxy-aware (`HTTP(S)_PROXY` / `NO_PROXY`) `fetch` for outbound AI provider
 * and AI-MCP calls, built through the single transport implementer
 * (`@n8n/backend-network`).
 *
 * Model-provider base URLs are user-configured, so follow the configured SSRF
 * policy while preserving the long AI timeout.
 */
export function createAiProxyFetch(outboundHttp: OutboundHttp): CustomFetch {
	return outboundHttp
		.transport({
			proxy: 'env',
			timeouts: {
				headersTimeout: AI_REQUEST_TIMEOUT_MS,
				bodyTimeout: AI_REQUEST_TIMEOUT_MS,
			},
		})
		.asCustomFetch();
}

/**
 * A proxy-aware fetch for user-configured MCP endpoints.
 * MCP URLs are user-controlled, so follow the configured SSRF policy
 * while preserving the long AI timeout.
 */
export function createAiMcpFetch(outboundHttp: OutboundHttp): CustomFetch {
	return outboundHttp
		.transport({
			proxy: 'env',
			timeouts: {
				headersTimeout: AI_REQUEST_TIMEOUT_MS,
				bodyTimeout: AI_REQUEST_TIMEOUT_MS,
			},
		})
		.asCustomFetch();
}

/**
 * A proxy-aware fetch for web-search providers (e.g. SearXNG) whose base URL
 * is user-configured, so follow the configured SSRF policy.
 */
export function createWebSearchFetch(outboundHttp: OutboundHttp): CustomFetch {
	return outboundHttp
		.transport({
			proxy: 'env',
		})
		.asCustomFetch();
}
