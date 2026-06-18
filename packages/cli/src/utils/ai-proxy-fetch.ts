import type { CustomFetch, OutboundHttp } from '@n8n/backend-network';

/**
 * Timeout (ms) for outbound AI provider / AI-MCP HTTP calls. undici defaults
 * `headersTimeout` / `bodyTimeout` to 5 minutes, which is too short for long
 * LLM completions, so we align to the workflow execution timeout. Overridable
 * via `N8N_AI_TIMEOUT_MAX`.
 */
export const AI_REQUEST_TIMEOUT_MS = parseInt(process.env.N8N_AI_TIMEOUT_MAX ?? '3600000', 10);

/**
 * A proxy-aware (`HTTP(S)_PROXY` / `NO_PROXY`) `fetch` for outbound AI provider
 * and AI-MCP calls, built through the single transport implementer
 * (`@n8n/backend-network`).
 *
 * SSRF stays disabled: these targets are fixed provider hosts plus
 * user-configured `baseURL`s (self-hosted Ollama, OpenAI-compatible gateways),
 * which the previous hand-rolled helpers did not filter either. The long AI
 * timeout is applied so slow completions are not cut off at undici's 5-minute
 * default.
 */
export function createAiProxyFetch(outboundHttp: OutboundHttp): CustomFetch {
	return outboundHttp
		.transport({
			proxy: 'env',
			ssrf: 'disabled',
			timeouts: {
				headersTimeout: AI_REQUEST_TIMEOUT_MS,
				bodyTimeout: AI_REQUEST_TIMEOUT_MS,
			},
		})
		.asCustomFetch();
}
