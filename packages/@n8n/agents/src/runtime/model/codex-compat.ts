import { codexWebSocketResponse } from './codex-websocket';
import type { FetchFn } from './model-factory';

/**
 * Headers and body fields the Codex backend requires from every caller.
 *
 * Values mirror the Codex CLI (`codex-rs/login/src/auth/default_client.rs` for
 * the originator, `codex-rs/core/src/client.rs` for the request body). Requests
 * without `originator` are refused with 403, and `store: true` is rejected
 * outright: the ChatGPT-subscription endpoint is stateless.
 */
const CODEX_ORIGINATOR = 'codex_cli_rs';

/** Codex refuses an unrecognized originator, so keep this aligned with the CLI. */
const CODEX_USER_AGENT = 'codex_cli_rs';

function withCodexBody(body: BodyInit | null | undefined): BodyInit | null | undefined {
	if (typeof body !== 'string') return body;

	try {
		const parsed: unknown = JSON.parse(body);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return body;

		// `store` is the only field forced here. `stream` is deliberately left
		// alone: Codex only answers streaming requests, but rewriting it would
		// hand an SSE body to a caller that is waiting for JSON.
		return JSON.stringify({ ...(parsed as Record<string, unknown>), store: false });
	} catch {
		return body;
	}
}

/**
 * Wraps a fetch so requests satisfy the Codex backend's requirements.
 *
 * This sits at the transport layer because `store` is a per-request body field:
 * the AI SDK defaults it to `true` in Responses mode and only exposes it through
 * per-call `providerOptions`, which a `ModelConfig` cannot reach.
 */
function requestUrl(input: RequestInfo | URL): string {
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.toString();
	return input.url;
}

/** Opt-out for deployments where the WebSocket upgrade is blocked. */
function websocketDisabled(): boolean {
	return process.env.N8N_CODEX_DISABLE_WEBSOCKET === 'true';
}

export function withCodexCompat(fetchFn: FetchFn | undefined): FetchFn {
	const inner: FetchFn = fetchFn ?? globalThis.fetch;

	return async (input, init) => {
		if (!init) return await inner(input);

		const headers = new Headers(init.headers);
		if (!headers.has('originator')) headers.set('originator', CODEX_ORIGINATOR);
		if (!headers.has('user-agent')) headers.set('user-agent', CODEX_USER_AGENT);
		// The Codex Responses route is gated behind this beta opt-in.
		if (!headers.has('openai-beta')) headers.set('OpenAI-Beta', 'responses=experimental');

		const body = withCodexBody(init.body);
		const sse = async () => await inner(input, { ...init, headers, body });

		if (websocketDisabled() || typeof body !== 'string') return await sse();

		// Reusing a pooled socket saves a TLS+HTTP handshake per turn. The helper
		// only resolves once the first frame lands, so anything that throws here
		// happened before the response committed and is safe to retry over SSE.
		try {
			return await codexWebSocketResponse(requestUrl(input), headers, body, init.signal);
		} catch {
			return await sse();
		}
	};
}
