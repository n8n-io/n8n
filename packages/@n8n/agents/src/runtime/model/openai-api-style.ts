import { getTopLevelMediaType, resolveFullMediaType } from '@ai-sdk/provider-utils';
import { isRecord } from '@n8n/utils/is-record';
import type * as AiSdk from 'ai';

import { loadAi } from './lazy-ai';

/** The model contract the AI SDK's own wrapper returns, and that its middleware speaks. */
type WrappedLanguageModel = ReturnType<typeof AiSdk.wrapLanguageModel>;

/** The call options a middleware's `wrapGenerate`/`wrapStream` receives. */
type MiddlewareWrapGenerate = NonNullable<AiSdk.LanguageModelMiddleware['wrapGenerate']>;
type CallOptions = Parameters<MiddlewareWrapGenerate>[0]['params'];

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
 * Statuses a server answers with when `POST {baseURL}/responses` is not one of
 * its routes. OpenAI-COMPATIBLE servers (LM Studio, vLLM, Ollama, llama.cpp and
 * most proxies) implement only /chat/completions, so they answer 404; a strict
 * router answers 405. Every other failure — 401/403 auth, 429 rate limit, 5xx, a
 * network error, an abort — says nothing about which API the endpoint speaks, so
 * it must surface unchanged.
 */
const MISSING_ROUTE_STATUSES = new Set([404, 405]);

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
	const contentType = isRecord(error.responseHeaders)
		? error.responseHeaders['content-type']
		: undefined;
	if (typeof contentType === 'string' && contentType.includes('text/event-stream')) return true;
	if (!isRecord(error.data)) return false;
	if (error.data.type === 'error' || error.data.type === 'response.failed') return true;
	return !isRecord(error.data.error);
}

/**
 * The one route-not-found body a server can answer in the OpenAI error format
 * instead of an unstructured 404: llama.cpp-style servers that refuse an
 * unknown route this way use exactly this code and message. A model or
 * resource error (`model_not_found`, `invalid_request_error`, a context-length
 * error, ...) never uses this code, so an exact match cannot swallow one of
 * those — widening to any numeric 404 or a generic `not_found` code would.
 */
function isRouteNotFoundInOpenAIErrorFormat(data: unknown): boolean {
	if (!isRecord(data) || !isRecord(data.error)) return false;
	const { code, message } = data.error;
	return (code === 404 || code === '404') && message === 'File Not Found';
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
 * A server with no /responses route usually answers with its own framework's
 * 404 instead — an empty body, `{"detail":"Not Found"}`, an HTML page — which
 * never parses as an OpenAI error, so `data` stays unset. A llama.cpp-style
 * server instead refuses the unknown route in the OpenAI error format itself;
 * `isRouteNotFoundInOpenAIErrorFormat` recognizes that one exact body and
 * nothing else that arrives dressed the same way.
 */
function servesNoResponsesApi(error: unknown): boolean {
	if (!isRecord(error) || typeof error.statusCode !== 'number') return false;
	if (!MISSING_ROUTE_STATUSES.has(error.statusCode)) return false;
	if (isSynthesizedFromStream(error)) return false;
	return error.data === undefined || isRouteNotFoundInOpenAIErrorFormat(error.data);
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
 * Selects the OpenAI API a custom endpoint speaks, on the first call.
 *
 * A custom `baseURL` is either a proxy in front of real OpenAI, which serves
 * /responses, or an OpenAI-COMPATIBLE server, which serves only
 * /chat/completions. The credential does not say which one it is, and the model
 * name cannot say either, because a proxy aliases model names freely. So this
 * asks for /responses first — reasoning models reject function tools on
 * /chat/completions — and it moves to /chat/completions only when the endpoint
 * reports that it has no /responses route.
 *
 * ponytail: the decision is memoized per model instance, so each instance probes
 * the endpoint one time; cache it by baseURL if that extra request becomes
 * measurable.
 */
export function withChatCompletionsFallback(
	responsesModel: WrappedLanguageModel,
	chatModel: WrappedLanguageModel,
): WrappedLanguageModel {
	let downgraded = false;

	async function callEndpoint<T>(
		viaResponses: () => PromiseLike<T>,
		viaChat: () => PromiseLike<T>,
	): Promise<T> {
		if (downgraded) return await viaChat();
		try {
			return await viaResponses();
		} catch (error) {
			if (!servesNoResponsesApi(error)) throw error;
			let result: T;
			try {
				result = await viaChat();
			} catch (chatError) {
				// The /responses refusal is the only reason this second request exists.
				if (isRecord(chatError) && chatError.cause === undefined) chatError.cause = error;
				throw chatError;
			}
			// Pin the endpoint only once /chat/completions has answered, so a failed
			// retry leaves the next call free to ask for /responses again.
			downgraded = true;
			return result;
		}
	}

	return loadAi().wrapLanguageModel({
		model: responsesModel,
		middleware: {
			overrideSupportedUrls: async () =>
				sharedSupportedUrls(await responsesModel.supportedUrls, await chatModel.supportedUrls),
			wrapGenerate: async ({ doGenerate, params }) =>
				requiresChatOnlyAudio(params.prompt)
					? await chatModel.doGenerate(params)
					: await callEndpoint(doGenerate, async () => await chatModel.doGenerate(params)),
			wrapStream: async ({ doStream, params }) =>
				requiresChatOnlyAudio(params.prompt)
					? await chatModel.doStream(params)
					: await callEndpoint(doStream, async () => await chatModel.doStream(params)),
		},
	});
}
