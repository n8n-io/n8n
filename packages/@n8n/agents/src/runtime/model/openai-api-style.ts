import { getTopLevelMediaType, resolveFullMediaType } from '@ai-sdk/provider-utils';
import { isRecord } from '@n8n/utils/is-record';
import type * as AiSdk from 'ai';

import { loadAi } from './lazy-ai';

/** The model contract the AI SDK's own wrapper returns, and that its middleware speaks. */
type WrappedLanguageModel = ReturnType<typeof AiSdk.wrapLanguageModel>;

/** Every model spec version the AI SDK's wrapper normalizes to the current one. */
type UnwrappedLanguageModel = Parameters<typeof AiSdk.wrapLanguageModel>[0]['model'];

/** The call options a middleware's `wrapGenerate`/`wrapStream` receives. */
type MiddlewareWrapGenerate = NonNullable<AiSdk.LanguageModelMiddleware['wrapGenerate']>;
type CallOptions = Parameters<MiddlewareWrapGenerate>[0]['params'];

/** The OpenAI API an endpoint answered on. */
type ApiStyle = 'responses' | 'chat';

/**
 * Full media types the installed `@ai-sdk/openai` chat converter accepts as
 * inline audio (`input_audio`). The Responses converter in the same SDK
 * version has no audio branch at all, so it rejects every one of these before
 * a request is made.
 */
const CHAT_ONLY_AUDIO_TYPES = new Set(['audio/wav', 'audio/mp3', 'audio/mpeg']);

/** Whether the prompt carries inline audio only the chat adapter accepts. */
function requiresChatOnlyAudio(prompt: CallOptions['prompt']): boolean {
	for (const message of prompt) {
		if (!Array.isArray(message.content)) continue;
		for (const part of message.content) {
			if (part.type !== 'file') continue;
			if (part.data.type !== 'data') continue;
			if (getTopLevelMediaType(part.mediaType) !== 'audio') continue;
			try {
				if (CHAT_ONLY_AUDIO_TYPES.has(resolveFullMediaType({ part }))) return true;
			} catch {
				// Not sniffable from these bytes; let /responses surface its own error.
			}
		}
	}
	return false;
}

/**
 * Statuses that report a missing route on their own, with no body to read.
 * OpenAI-COMPATIBLE servers (LM Studio, vLLM, Ollama, llama.cpp and most
 * proxies) implement only /chat/completions, so they answer 404; a strict
 * router answers 405. Every other bodyless failure — 401/403 auth, 429 rate
 * limit, 5xx, a network error, an abort — says nothing about which API the
 * endpoint speaks, so it must surface unchanged.
 */
const MISSING_ROUTE_STATUSES = new Set([404, 405]);

/**
 * Statuses at which a body naming the missing route is trusted. A gateway
 * reports an unknown route at 400 or 501 as readily as at 404/405, so those
 * join the bodyless set here. 401/403/429 never mean "no route" — even if a
 * body happens to carry the same shape, an auth or rate-limit response must
 * still surface unchanged.
 */
const MISSING_ROUTE_BODY_STATUSES = new Set([400, 404, 405, 501]);

/** Content type of the response the SDK turned into `error`, or `''` when absent. */
function contentTypeOf(error: Record<string, unknown>): string {
	const contentType = isRecord(error.responseHeaders)
		? error.responseHeaders['content-type']
		: undefined;
	return typeof contentType === 'string' ? contentType : '';
}

/**
 * Whether `error.data` was synthesized from an HTTP 200 SSE stream frame
 * instead of read from an actual non-stream HTTP error response.
 *
 * `openai-stream-error.ts` builds the `APICallError` for a stream error with
 * the raw parsed chunk as `data`, and forwards the real response's
 * `responseHeaders`, which still carry the stream's own `text/event-stream`
 * content type. A stream chunk always carries `type: 'error'` or
 * `'response.failed'` (`isErrorChunk`/`isResponseFailedChunk` in the SDK); a
 * real HTTP error body never does. That frame can still nest an `error`
 * record (`{ type: 'error', error: { code, message } }`), so the flat-shape
 * fallback below only applies once the discriminator is absent.
 */
function isSynthesizedFromStream(error: Record<string, unknown>): boolean {
	if (contentTypeOf(error).includes('text/event-stream')) return true;
	if (!isRecord(error.data)) return false;
	if (error.data.type === 'error' || error.data.type === 'response.failed') return true;
	return !isRecord(error.data.error);
}

/**
 * A gateway can send the "unknown route" message with `code: null` instead of
 * `unknown_url`. Narrowed to a phrase that names the Responses route itself, so
 * a bad-parameter or context-length error — same `type: 'invalid_request_error'`
 * — is never mistaken for one. The route can sit behind any prefix a gateway
 * mounts it under (`/v1/responses`, `/openai/v1/responses`), so any number of
 * path segments before the final `responses` segment match.
 */
const MISSING_RESPONSES_ROUTE_MESSAGE = /^Unknown request URL: \S+ \/(?:[^/\s]+\/)*responses\b/i;

/**
 * Whether an OpenAI-format error body reports that the URL is not one of the
 * server's routes, rather than that the request was bad.
 *
 * Three forms exist. Gateways in front of real OpenAI (OpenAI itself, Groq) use
 * `unknown_url`, sometimes with `code: null` and only the message naming the
 * route ({@link MISSING_RESPONSES_ROUTE_MESSAGE}). llama.cpp-style servers use
 * code `404` with "File Not Found". A model or parameter error never uses any
 * of these. Matching on `type: 'invalid_request_error'` instead would swallow
 * them, because a bad parameter and a context-length error carry that same
 * type, and re-sending one of those to /chat/completions runs the generation a
 * second time. The caller restricts this to {@link MISSING_ROUTE_BODY_STATUSES},
 * so an auth or rate-limit response is never read as a missing route either.
 */
function reportsMissingRoute(data: unknown): boolean {
	if (!isRecord(data) || !isRecord(data.error)) return false;
	const { code, message } = data.error;
	if (code === 'unknown_url') return true;
	if (code === 404 || code === '404') return message === 'File Not Found';
	return typeof message === 'string' && MISSING_RESPONSES_ROUTE_MESSAGE.test(message);
}

/**
 * Whether the endpoint answered an HTTP 200 HTML page where the Responses API
 * returns JSON — a reverse proxy whose catch-all route sits in front of a
 * server that has no /responses. The SDK reports that as `Invalid JSON
 * response` carrying the real status (`createJsonResponseHandler` in
 * `@ai-sdk/provider-utils`), so the content type is the evidence. An
 * unparsable JSON body on its own is not: a truncated real answer produces one
 * too, and that generation did run.
 */
function servedHtmlCatchAll(error: Record<string, unknown>): boolean {
	return error.statusCode === 200 && contentTypeOf(error).includes('text/html');
}

/**
 * Whether the endpoint reported that it has no Responses API route.
 *
 * The status alone does not report that. The SDK also uses 404 for a model
 * that does not exist, and it turns an error frame inside an HTTP 200 stream
 * into one (`@ai-sdk/openai/src/openai-stream-error.ts`). In both cases the
 * route worked, so retrying on /chat/completions would hide the real error —
 * `isSynthesizedFromStream` rules the second case out first.
 *
 * After that, an OpenAI-format body decides on its own, at
 * {@link MISSING_ROUTE_BODY_STATUSES}, because gateways answer an unknown route
 * with 400 or 501 as readily as with 404 — but never at an auth or rate-limit
 * status, even if the body happens to carry the same shape. Without such a
 * body the status decides: a server with no /responses route answers with its
 * own framework's 404 or 405 — an empty body, `{"detail":"Not Found"}`, an
 * HTML page — none of which parse as an OpenAI error, so `data` stays unset.
 */
function servesNoResponsesApi(error: unknown): boolean {
	if (!isRecord(error) || typeof error.statusCode !== 'number') return false;
	if (isSynthesizedFromStream(error)) return false;
	if (error.data !== undefined) {
		return MISSING_ROUTE_BODY_STATUSES.has(error.statusCode) && reportsMissingRoute(error.data);
	}
	return MISSING_ROUTE_STATUSES.has(error.statusCode) || servedHtmlCatchAll(error);
}

/** A `fetch`-compatible function, matching {@link import('./model-factory').FetchFn}. */
type FetchFn = typeof globalThis.fetch;

/**
 * Wraps `fetch` so an HTTP 200 HTML page — a reverse-proxy catch-all in front
 * of a server with no /responses route — throws the same shape
 * {@link servesNoResponsesApi} recognizes, instead of reaching the SDK's stream
 * parser. `createEventSourceResponseHandler` in the installed SDK accepts any
 * 2xx body as a stream with no content-type check, so an HTML page produces a
 * silent empty stream rather than the "Invalid JSON response" error the
 * non-streaming JSON handler already throws for the same page. Only a
 * successful, unread response is affected: the body is read here only once
 * that check has already decided to reject it, so a real event stream is
 * never touched.
 */
export function guardHtmlCatchAll(fetch: FetchFn): FetchFn {
	return async (input, init) => {
		const response = await fetch(input, init);
		const contentType = response.headers.get('content-type') ?? '';
		if (response.status !== 200 || !contentType.includes('text/html')) return response;
		const ai = loadAi();
		throw new ai.APICallError({
			message: 'Invalid JSON response',
			url: input instanceof Request ? input.url : String(input),
			requestBodyValues: undefined,
			statusCode: response.status,
			responseHeaders: { 'content-type': contentType },
			responseBody: await response.text(),
		});
	};
}

/**
 * The URL patterns both APIs accept.
 *
 * The AI SDK reads `supportedUrls` one time, before it converts the prompt and
 * before the endpoint has said which API it speaks. A pattern only one API takes
 * (the Responses API accepts PDF URLs, chat does not) makes the SDK skip the
 * download, and the chat conversion then rejects the URL. Advertising the
 * intersection keeps the download, and both APIs accept the downloaded bytes.
 */
function sharedSupportedUrls(
	responses: Record<string, RegExp[]>,
	chat: Record<string, RegExp[]>,
): Record<string, RegExp[]> {
	const shared: Record<string, RegExp[]> = {};
	for (const [mediaType, patterns] of Object.entries(responses)) {
		const chatPatterns = chat[mediaType] ?? [];
		const inBoth = patterns.filter((p) => chatPatterns.some((q) => String(q) === String(p)));
		if (inBoth.length > 0) shared[mediaType] = inBoth;
	}
	return shared;
}

/**
 * How long one endpoint's answer stays valid. Short, so a server that gains a
 * /responses route in a later version is used again without an n8n restart.
 */
const DECISION_TTL_MS = 5 * 60 * 1000;

/** Endpoints remembered at one time. Over that, the oldest entry is dropped. */
const MAX_REMEMBERED_ENDPOINTS = 50;

/**
 * Which API each base URL answered on, shared by every model instance in the
 * process: `RuntimeContextBuilder` builds a new model for every turn, so a memo
 * on the instance would probe the endpoint again on each one.
 *
 * Only that decision is stored. A prompt, a generated result and a credential
 * never enter this map, so one caller can never read another caller's work.
 */
const endpointApiStyles = new Map<string, { style: ApiStyle; expiresAt: number }>();

/** The first call to an unknown endpoint, so parallel first calls probe one time. */
const runningProbes = new Map<string, Promise<ApiStyle | undefined>>();

/** Test hook: decisions otherwise live for the whole process. */
export function forgetEndpointApiStyles(): void {
	endpointApiStyles.clear();
	runningProbes.clear();
}

function rememberApiStyle(endpoint: string, style: ApiStyle): void {
	// A Map iterates in insertion order, so its first key is its oldest entry.
	if (endpointApiStyles.size >= MAX_REMEMBERED_ENDPOINTS && !endpointApiStyles.has(endpoint)) {
		const oldest = endpointApiStyles.keys().next().value;
		if (oldest !== undefined) endpointApiStyles.delete(oldest);
	}
	endpointApiStyles.set(endpoint, { style, expiresAt: Date.now() + DECISION_TTL_MS });
}

/**
 * One key for one server: `…/v1`, `…/v1/` and a differently-cased host are the
 * same endpoint. The query string is kept as-is: a gateway can route by query
 * parameter (`?deployment=…`), where two different values are two different
 * servers and must never share a cached decision.
 */
function normalizeEndpoint(baseURL: string): string {
	try {
		const url = new URL(baseURL);
		return `${url.origin}${url.pathname.replace(/\/+$/, '')}${url.search}`;
	} catch {
		return baseURL.replace(/\/+$/, '');
	}
}

/** Waits for the probe, but stops as soon as this request's own signal aborts. */
async function raceAbort(
	probe: Promise<ApiStyle | undefined>,
	abortSignal: AbortSignal | undefined,
): Promise<ApiStyle | undefined> {
	if (!abortSignal) return await probe;
	if (abortSignal.aborted) return undefined;
	let onAbort!: () => void;
	const aborted = new Promise<undefined>((resolve) => {
		onAbort = () => resolve(undefined);
		abortSignal.addEventListener('abort', onAbort, { once: true });
	});
	try {
		return await Promise.race([probe, aborted]);
	} finally {
		// `{ once: true }` only detaches itself when the event actually fires; the
		// probe can just as well win the race, so detach unconditionally here.
		abortSignal.removeEventListener('abort', onAbort);
	}
}

/**
 * The API remembered for this endpoint, or `undefined` when the caller must
 * find out. An entry past its TTL still answers while one call re-probes, so
 * only the first call to an endpoint ever waits for a decision.
 */
function rememberedApiStyle(endpoint: string): ApiStyle | undefined {
	const known = endpointApiStyles.get(endpoint);
	if (!known) return undefined;
	return known.expiresAt > Date.now() || runningProbes.has(endpoint) ? known.style : undefined;
}

/**
 * Selects the OpenAI API a custom endpoint speaks, on the first call to it.
 *
 * A custom `baseURL` is either a proxy in front of real OpenAI, which serves
 * /responses, or an OpenAI-COMPATIBLE server, which serves only
 * /chat/completions. The credential does not say which one it is, and the model
 * name cannot say either, because a proxy aliases model names freely. So this
 * asks for /responses first — reasoning models reject function tools on
 * /chat/completions — and it moves to /chat/completions only when the endpoint
 * reports that it has no /responses route. That answer is then shared per base
 * URL for {@link DECISION_TTL_MS}, so later turns send one request, not two.
 */
export function withChatCompletionsFallback(
	baseURL: string,
	responsesModel: UnwrappedLanguageModel,
	chatModel: UnwrappedLanguageModel,
): WrappedLanguageModel {
	const ai = loadAi();
	const endpoint = normalizeEndpoint(baseURL);
	// `wrapLanguageModel` normalizes its model to the spec version its middleware
	// speaks. Both models need that, or a provider still on an older spec would
	// return an unconverted result through the fallback path. An empty middleware
	// list normalizes and wraps nothing.
	const responses = ai.wrapLanguageModel({ model: responsesModel, middleware: [] });
	const chat = ai.wrapLanguageModel({ model: chatModel, middleware: [] });

	/** Runs the request, and reports which API answered it. */
	async function attempt<T>(
		viaResponses: () => PromiseLike<T>,
		viaChat: () => PromiseLike<T>,
	): Promise<{ value: T; style: ApiStyle }> {
		try {
			return { value: await viaResponses(), style: 'responses' };
		} catch (error) {
			if (!servesNoResponsesApi(error)) throw error;
			try {
				return { value: await viaChat(), style: 'chat' };
			} catch (chatError) {
				// The /responses refusal is the only reason this second request exists.
				if (isRecord(chatError) && chatError.cause === undefined) chatError.cause = error;
				throw chatError;
			}
		}
	}

	async function callEndpoint<T>(
		params: CallOptions,
		viaResponses: () => PromiseLike<T>,
		viaChat: () => PromiseLike<T>,
	): Promise<T> {
		// Both maps are read before this function's first `await`, so parallel first
		// calls find the probe one of them registers instead of each starting one.
		let decided = rememberedApiStyle(endpoint);
		const probe = decided === undefined ? runningProbes.get(endpoint) : undefined;
		// A probe that fails or is aborted answers `undefined`, so the waiting call
		// asks the endpoint itself instead of inheriting another call's failure.
		if (probe) {
			decided = await raceAbort(probe, params.abortSignal);
			// The wait can also end because this call's own signal fired, not
			// because the probe answered. Report that now instead of starting a
			// second request — to /responses or /chat — on an already-cancelled call.
			if (decided === undefined) params.abortSignal?.throwIfAborted();
		}

		if (decided === 'chat') return await viaChat();

		const running = attempt(viaResponses, viaChat);
		if (!runningProbes.has(endpoint)) {
			// A parallel call waits for this answer instead of sending its own prompt
			// to a route that may not exist. It never sees this call's result.
			runningProbes.set(
				endpoint,
				running
					.then(
						({ style }) => style,
						() => undefined,
					)
					.finally(() => runningProbes.delete(endpoint)),
			);
		}
		const { value, style } = await running;
		// Remember only once the endpoint has answered, so a failed downgrade leaves
		// the next call free to ask for /responses again.
		rememberApiStyle(endpoint, style);
		return value;
	}

	return ai.wrapLanguageModel({
		model: responses,
		middleware: {
			overrideSupportedUrls: async () =>
				sharedSupportedUrls(await responses.supportedUrls, await chat.supportedUrls),
			// Audio routing is a property of this prompt, not of the endpoint, so it
			// stays outside `callEndpoint` and is never remembered.
			wrapGenerate: async ({ doGenerate, params }) =>
				requiresChatOnlyAudio(params.prompt)
					? await chat.doGenerate(params)
					: await callEndpoint(params, doGenerate, async () => await chat.doGenerate(params)),
			wrapStream: async ({ doStream, params }) =>
				requiresChatOnlyAudio(params.prompt)
					? await chat.doStream(params)
					: await callEndpoint(params, doStream, async () => await chat.doStream(params)),
		},
	});
}
