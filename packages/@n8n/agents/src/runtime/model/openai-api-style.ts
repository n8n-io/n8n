import { isRecord } from '@n8n/utils/is-record';
import type * as AiSdk from 'ai';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';

import { loadAi } from './lazy-ai';

/** The model contract the AI SDK's own wrapper returns, and that its middleware speaks. */
type WrappedLanguageModel = ReturnType<typeof AiSdk.wrapLanguageModel>;

/** Every model spec version the AI SDK's wrapper normalizes to the current one. */
type UnwrappedLanguageModel = Parameters<typeof AiSdk.wrapLanguageModel>[0]['model'];

/** The call options a middleware's `wrapGenerate`/`wrapStream` receives. */
type MiddlewareWrapGenerate = NonNullable<AiSdk.LanguageModelMiddleware['wrapGenerate']>;
type CallOptions = Parameters<MiddlewareWrapGenerate>[0]['params'];

/** What a middleware's `wrapStream` hands back: the parts, and the SDK's own fields. */
type StreamResult = Awaited<ReturnType<NonNullable<AiSdk.LanguageModelMiddleware['wrapStream']>>>;
type StreamPart = StreamResult['stream'] extends ReadableStream<infer P> ? P : never;

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
async function requiresChatOnlyAudio(prompt: CallOptions['prompt']): Promise<boolean> {
	// Loaded at point of use, not at the top of the file: `model-factory` imports
	// this module for every provider, and only an OpenAI custom endpoint reaches
	// this code.
	const { getTopLevelMediaType, resolveFullMediaType } = await import('@ai-sdk/provider-utils');
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
 * Statuses that report a missing route on their own. OpenAI-COMPATIBLE servers
 * (LM Studio, vLLM, Ollama, llama.cpp and most proxies) implement only
 * /chat/completions, so they answer 404; a strict router answers 405. Every
 * other failure — 401/403 auth, 429 rate limit, 5xx, a network error, an abort —
 * says nothing about which API the endpoint speaks, so it must surface
 * unchanged. 501 stays out of this set on purpose: it reports that the server
 * does not support the functionality the request needs (RFC 9110 15.6.2), which
 * a /responses route that refuses one feature also answers, so only a body may
 * read it as a missing route.
 */
const MISSING_ROUTE_STATUSES = new Set([404, 405]);

/**
 * Statuses at which only a body naming the missing route decides. A gateway
 * reports an unknown route at 400 or 501 as readily as at 404, but neither
 * status is evidence on its own.
 */
const ROUTE_BODY_STATUSES = new Set([400, 501]);

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
 * server's routes, rather than that the request was bad. Used where the status
 * itself is no evidence ({@link ROUTE_BODY_STATUSES}).
 *
 * Two forms exist. Gateways in front of real OpenAI (OpenAI itself, Groq) use
 * `unknown_url`, sometimes with `code: null` and only the message naming the
 * route ({@link MISSING_RESPONSES_ROUTE_MESSAGE}). Matching on
 * `type: 'invalid_request_error'` instead would swallow real request errors,
 * because a bad parameter and a context-length error carry that same type, and
 * re-sending one of those to /chat/completions runs the generation a second
 * time.
 */
function reportsMissingRoute(data: unknown): boolean {
	if (!isRecord(data) || !isRecord(data.error)) return false;
	const { code, message } = data.error;
	if (code === 'unknown_url') return true;
	return typeof message === 'string' && MISSING_RESPONSES_ROUTE_MESSAGE.test(message);
}

/**
 * Whether an OpenAI-format body reports a failure the route produced itself: a
 * model or deployment that does not exist, or a named parameter the server read
 * and rejected. Such a body proves the route works, so at 404 and 405 it
 * overrides the status — sending the same request to /chat/completions would
 * answer with an unrelated error and hide this one.
 *
 * Everything else at those statuses falls back. A server with no /responses
 * route answers 404 in whatever format it has — an empty body,
 * `{"detail":"Not Found"}`, `{"error":{"message":"Route not found"}}`,
 * `Invalid URL (POST /v1/responses)` — and no list of phrasings covers them all.
 */
function reportsWorkingRoute(data: unknown): boolean {
	if (!isRecord(data) || !isRecord(data.error)) return false;
	const { code, param, message } = data.error;
	if (typeof param === 'string' && param !== '') return true;
	if (typeof code === 'string' && /model|deployment/i.test(code)) return true;
	return typeof message === 'string' && /\b(model|deployment)\b/i.test(message);
}

/**
 * The marker {@link guardOpenAiRoutes} puts on the error it raises for a
 * reverse-proxy catch-all page. Only that guard sets it, and only after it has
 * read the body: an unexpected content type on its own is not evidence, because
 * a gateway can label a real JSON or SSE answer anything, and re-sending the
 * prompt would run that generation a second time.
 */
const HTML_CATCH_ALL = 'n8n.htmlCatchAll';

/** Whether this error is the one the guard raises for a catch-all page. */
function servedHtmlCatchAll(error: Record<string, unknown>): boolean {
	return isRecord(error.data) && error.data[HTML_CATCH_ALL] === true;
}

/**
 * Whether the endpoint reported that it has no Responses API route.
 *
 * The status alone does not report that. The SDK also uses 404 for a model that
 * does not exist, and it turns an error frame inside an HTTP 200 stream into one
 * (`@ai-sdk/openai/src/openai-stream-error.ts`). In both cases the route worked,
 * so retrying on /chat/completions would hide the real error —
 * `isSynthesizedFromStream` rules the second case out first, and
 * {@link reportsWorkingRoute} the first.
 */
function servesNoResponsesApi(error: unknown): boolean {
	if (!isRecord(error) || typeof error.statusCode !== 'number') return false;
	// First: the marker sits in `data`, which the branches below read as an
	// OpenAI error body instead.
	if (servedHtmlCatchAll(error)) return true;
	if (isSynthesizedFromStream(error)) return false;
	if (MISSING_ROUTE_STATUSES.has(error.statusCode)) return !reportsWorkingRoute(error.data);
	// `data` is set only when the SDK read the body through its error handler. A
	// gateway that reports the unknown route inside an HTTP 200 body never gets
	// there: the SDK parses that body as an answer, finds `error` in it and
	// synthesizes a 400 that carries the raw body and no `data`. The body is the
	// same one either way, and no generation ran, so read it when `data` is absent.
	return (
		ROUTE_BODY_STATUSES.has(error.statusCode) && reportsMissingRoute(error.data ?? errorBody(error))
	);
}

/**
 * Whether a value is a Chat Completions payload, by the same test the installed
 * SDK uses (`isOpenAIChatCompletionChunk`): a `choices` array and no `type`
 * discriminator, which every Responses event carries.
 */
function isChatCompletionsPayload(value: unknown): boolean {
	return isRecord(value) && Array.isArray(value.choices) && typeof value.type !== 'string';
}

/**
 * The body the SDK attached to an error: the raw text when it could not parse
 * it, and the parsed value once it could.
 */
function errorBody(error: Record<string, unknown>): unknown {
	if (typeof error.responseBody !== 'string') return error.responseBody;
	try {
		return JSON.parse(error.responseBody);
	} catch {
		return undefined;
	}
}

/**
 * Whether the /responses route answered with a Chat Completions payload.
 *
 * Some gateways serve chat completions on every path they route. The SDK reports
 * that in three ways, and the status is not one of them, so it is not read here:
 * `Invalid JSON response` at 200 when the chat `usage` fails the Responses
 * schema, `Responses API returned no output` at 500 when the body carries no
 * `usage` at all and so parses as an empty answer, and its own mismatch error
 * inside the stream. Every one of them means the answer already ran, so this
 * call keeps its error and never sends the prompt a second time. It is still a
 * definite statement about the endpoint, so the next call goes straight to
 * /chat/completions.
 */
function servedChatCompletionsPayload(error: unknown): boolean {
	if (!isRecord(error)) return false;
	// The stream mismatch error carries the offending chunk as `data`.
	return isChatCompletionsPayload(error.data) || isChatCompletionsPayload(errorBody(error));
}

/** A `fetch`-compatible function, matching {@link import('./model-factory').FetchFn}. */
type FetchFn = typeof globalThis.fetch;

/** How many bytes of a blank opening are read before the body counts as undecidable. */
const HEAD_LIMIT = 1024;

/**
 * The body's first non-blank bytes, and whether the body ended within them.
 *
 * They are read from a clone, so the answer itself stays unread and the SDK
 * still streams it incrementally. Cancelling one branch of a cloned body only
 * settles once the other branch is cancelled or read to its end, so this cancel
 * is never awaited — awaiting it deadlocks against the branch the SDK reads. It
 * still takes effect at once, which is what stops the clone from buffering the
 * whole answer behind us.
 *
 * The budget counts input bytes, not decoded characters: one chunk can carry a
 * whole megabyte-sized page, and the prefix is retained in the error this guard
 * raises.
 */
async function readHead(response: Response): Promise<{ head: string; ended: boolean }> {
	const probe = response.clone().body;
	if (!probe) return { head: '', ended: true };
	const reader = probe.getReader();
	const decoder = new TextDecoder();
	let head = '';
	let budget = HEAD_LIMIT;
	let ended = false;
	try {
		while (head.trim() === '' && budget > 0) {
			const { done, value } = await reader.read();
			if (done) {
				ended = true;
				break;
			}
			head += decoder.decode(value.subarray(0, budget), { stream: true });
			budget -= value.length;
		}
	} finally {
		void reader.cancel().catch(() => {});
	}
	return { head, ended };
}

/**
 * Whether the body is definitely not an answer.
 *
 * Two facts say so. Markup: a page opens with `<`, which no JSON or SSE answer
 * does. And a body that ended with nothing in it: there is no generation to
 * lose, and the caller would otherwise get a silent empty answer.
 *
 * Nothing else counts. The first chunk can end anywhere — `d`, then `ata: …` —
 * and bytes that are only incomplete, or in a shape this code does not know,
 * are not evidence: the answer may already have run, and replaying it would
 * bill the user a second time.
 */
function isNotAnAnswer(head: string, ended: boolean): boolean {
	const start = head.trimStart();
	return start.startsWith('<') || (ended && start === '');
}

/**
 * The media types an answer on either route carries: a generation is JSON, and
 * a stream is server-sent events. Compared against the type token alone, so a
 * charset or any other parameter still takes the fast path.
 */
const ANSWER_CONTENT_TYPES = new Set(['application/json', 'text/event-stream']);

/**
 * Raises {@link servesNoResponsesApi}'s catch-all error when a body is
 * {@link isNotAnAnswer}, and lets everything else through untouched.
 *
 * `createEventSourceResponseHandler` in the installed SDK accepts any 2xx body
 * as a stream with no content-type check, so a reverse proxy's catch-all page
 * reaches the caller as a silent empty stream on either route. The content type
 * alone cannot decide, because a gateway can label a real JSON or SSE answer
 * anything at all and running that generation again would bill it twice — so
 * only the body does, and only its first non-blank bytes, which keeps a
 * mislabelled stream incremental.
 */
async function rejectCatchAllPage(response: Response, url: string): Promise<void> {
	const { head, ended } = await readHead(response);
	if (!isNotAnAnswer(head, ended)) return;
	// Nobody reads this body now. The clone is already cancelled, so this releases
	// the connection; it settles only once both branches are, so it is not awaited.
	void response.body?.cancel().catch(() => {});
	const ai = loadAi();
	throw new ai.APICallError({
		message: 'Invalid JSON response',
		url,
		requestBodyValues: undefined,
		statusCode: response.status,
		responseHeaders: { 'content-type': response.headers.get('content-type') ?? '' },
		responseBody: head,
		data: { [HTML_CATCH_ALL]: true },
	});
}

/**
 * Wraps `fetch` for every adapter built on a custom OpenAI endpoint.
 *
 * It rejects a reverse-proxy catch-all page ({@link rejectCatchAllPage}), and it
 * releases calls waiting on this endpoint as soon as the /responses route
 * answers ({@link publishResponsesRoute}).
 */
export function guardOpenAiRoutes(fetch: FetchFn): FetchFn {
	return async (input, init) => {
		const url = input instanceof Request ? input.url : String(input);
		const response = await fetch(input, init);
		// An answer on either route is JSON or SSE, so the body is read whenever the
		// content type is absent or names anything else: a catch-all page served as
		// `text/plain`, as `application/octet-stream` or with no type at all reaches
		// the SDK's stream handler exactly as an HTML one does.
		const unexpectedType =
			response.status === 200 &&
			!ANSWER_CONTENT_TYPES.has(
				(response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase(),
			);
		if (unexpectedType) await rejectCatchAllPage(response, url);
		// The chat adapter shares this transport, and only /responses reports the
		// route. The provider appends the path to the base URL literally, so a
		// query-routed gateway spells it `…&path=/responses`.
		if (response.status === 200 && url.endsWith('/responses')) publishResponsesRoute();
		return response;
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
 * The cost is that an endpoint which does serve /responses no longer has PDF
 * URLs passed through to it: n8n downloads them and inlines the bytes.
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

/** Endpoints remembered at one time. Over that, the least recently used goes. */
const MAX_REMEMBERED_ENDPOINTS = 50;

/**
 * How long a call waits before it can replace another call's probe. The probe
 * answers as soon as the route does. This bound lets a waiting call send its
 * own request when the first request hangs.
 */
const PROBE_WAIT_MS = 10_000;

/**
 * Which API each endpoint answered on, shared by every model instance in the
 * process: `RuntimeContextBuilder` builds a new model for every turn, so a memo
 * on the instance would probe the endpoint again on each one.
 *
 * The decision and its owner are stored under the hashed key
 * {@link endpointRouteKey} builds. Prompts, results and credentials never enter
 * this map. Owner identities remain bounded with the decisions and live calls.
 */
const endpointApiStyles = new Map<string, { style: ApiStyle; expiresAt: number; owner: Probe }>();

/** A route decision another call is already finding out. */
type Probe = {
	answer: Promise<ApiStyle | undefined>;
	/** Publishes the route. Later calls do nothing, so the first evidence wins. */
	settle: (style: ApiStyle | undefined) => void;
	/** When another call can replace this probe. */
	staleAt: number;
	/** Where this probe sits in the endpoint's probe order: higher started later. */
	seq: number;
	/**
	 * The newest evidence about this endpoint. One object shared by every probe
	 * of the endpoint that is live at the same time, so a predecessor neither map
	 * holds any more still sees evidence that arrived after it started, and no
	 * per-endpoint list of predecessors is kept.
	 */
	newest: Lineage;
};

/**
 * The newest evidence about one endpoint, as the {@link Probe.seq} that produced
 * it, and how many calls still share it.
 */
type Lineage = { seq: number; live: number };

/** Probe order. A later probe asked the endpoint about a later state of it. */
let probeSeq = 0;

/** The first call to an unknown endpoint, so parallel first calls probe one time. */
const runningProbes = new Map<string, Probe>();

/**
 * The evidence marker each endpoint's live calls share, kept only while one of
 * them is running: a probe that fails leaves both maps empty, and without this
 * its predecessor would start over with no knowledge of what it found out. The
 * last call of an endpoint drops the entry, so nothing outlives the calls.
 */
const lineages = new Map<string, Lineage>();

/** Carries the owning probe through the SDK without changing its request. */
const requestProbe = new AsyncLocalStorage<{ endpoint: string; probe: Probe | undefined }>();

/** Test hook: decisions otherwise live for the whole process. */
export function forgetEndpointApiStyles(): void {
	// The marker is shared, so revoking it revokes every probe of that endpoint,
	// including a predecessor that neither map holds any more.
	for (const entry of endpointApiStyles.values()) entry.owner.newest.seq = Infinity;
	endpointApiStyles.clear();
	for (const lineage of lineages.values()) lineage.seq = Infinity;
	lineages.clear();
	for (const probe of runningProbes.values()) probe.settle(undefined);
	runningProbes.clear();
}

function startProbe(endpoint: string): Probe {
	// Starting is not evidence: a generation that runs longer than PROBE_WAIT_MS
	// must still write its own answer, or an endpoint whose calls overlap — slow
	// generations, one call every few seconds — never decides and every turn pays
	// for a /responses request that is known to fail. Only the evidence itself
	// revokes an older generation ({@link ownsDecision}), so this generation
	// takes over the endpoint's marker instead of superseding what came before.
	const shared = lineages.get(endpoint) ?? endpointApiStyles.get(endpoint)?.owner.newest;
	const newest = shared ?? { seq: 0, live: 0 };
	newest.live++;
	lineages.set(endpoint, newest);
	let settle!: (style: ApiStyle | undefined) => void;
	const answer = new Promise<ApiStyle | undefined>((resolve) => {
		settle = resolve;
	});
	const probe = { answer, settle, staleAt: Date.now() + PROBE_WAIT_MS, seq: ++probeSeq, newest };
	runningProbes.set(endpoint, probe);
	return probe;
}

/** Marks this probe's generation as the newest evidence about its endpoint. */
function recordEvidence(probe: Probe): void {
	if (probe.seq > probe.newest.seq) probe.newest.seq = probe.seq;
}

/**
 * Whether this owner may still write the endpoint's decision.
 *
 * A generation that started before the newest evidence must not write over it,
 * even while that evidence's own body is still arriving. The marker is read
 * from the owner and from whoever holds the endpoint now, because a probe that
 * starts when no call is live and nothing is remembered starts a marker of its
 * own, and an owner can still write after its own probe ended (a stream reports
 * a mismatch late).
 */
function ownsDecision(endpoint: string, owner: Probe): boolean {
	const holders = [owner, runningProbes.get(endpoint), endpointApiStyles.get(endpoint)?.owner];
	return !holders.some((holder) => holder !== undefined && holder.newest.seq > owner.seq);
}

/**
 * The probe another call is running, or `undefined` when there is none.
 *
 * A probe stops accepting waiters after {@link PROBE_WAIT_MS}, the same bound a
 * waiting call has. A request that never answers must not keep an expired
 * decision alive, and must not stop the next call from probing again.
 */
function liveProbe(endpoint: string): Probe | undefined {
	const probe = runningProbes.get(endpoint);
	if (!probe) return undefined;
	if (probe.staleAt > Date.now()) return probe;
	probe.settle(undefined);
	// Keep its identity until completion or replacement. Time alone does not
	// revoke a long generation's cache writes.
	return undefined;
}

/** Releases every waiter and drops the probe, unless a newer one took its place. */
function endProbe(endpoint: string, probe: Probe): void {
	probe.settle(undefined);
	if (runningProbes.get(endpoint) === probe) runningProbes.delete(endpoint);
	// The marker outlives this probe while another call of the endpoint still
	// holds it, and goes with the last of them.
	probe.newest.live--;
	if (probe.newest.live <= 0 && lineages.get(endpoint) === probe.newest) lineages.delete(endpoint);
}

/**
 * Drops expired entries first, and only then the least recently used live one.
 *
 * A dropped entry keeps its owner's evidence: the marker outlives the entry, so
 * an older generation still cannot write over what a newer one found out.
 */
function makeRoom(): void {
	const now = Date.now();
	for (const [key, entry] of endpointApiStyles) {
		if (entry.expiresAt <= now) endpointApiStyles.delete(key);
	}
	if (endpointApiStyles.size < MAX_REMEMBERED_ENDPOINTS) return;
	const oldest = endpointApiStyles.entries().next().value;
	if (oldest !== undefined) endpointApiStyles.delete(oldest[0]);
}

function rememberApiStyle(endpoint: string, style: ApiStyle, owner: Probe): void {
	// A written decision is evidence too, so an older generation that answers
	// later does not replace it.
	recordEvidence(owner);
	// A Map iterates in insertion order and `set` on an existing key does not
	// move it, so delete first: a refreshed entry is the most recently used one.
	endpointApiStyles.delete(endpoint);
	if (endpointApiStyles.size >= MAX_REMEMBERED_ENDPOINTS) makeRoom();
	endpointApiStyles.set(endpoint, { style, expiresAt: Date.now() + DECISION_TTL_MS, owner });
}

/**
 * Releases calls waiting on this endpoint the moment /responses answers.
 *
 * The route is known once the response headers arrive, which for a stream is
 * long before the answer ends. It is not remembered here: a 200 on the route is
 * not yet proof that the endpoint speaks the Responses API, because the body can
 * still be a Chat Completions payload, so only a successful SDK result is.
 */
function publishResponsesRoute(): void {
	const context = requestProbe.getStore();
	if (context?.probe && runningProbes.get(context.endpoint) === context.probe) {
		// The route answered: that is evidence, and it revokes an older
		// generation's writes while this answer's body is still arriving.
		recordEvidence(context.probe);
		context.probe.settle('responses');
	}
}

/**
 * One key for one routing target.
 *
 * Two credentials that reach different servers must never share a decision, so
 * the whole effective routing context goes in. The URL is normalized — `…/v1`,
 * `…/v1/` and a differently-cased host are one endpoint — but its query is kept,
 * because a gateway can route by query parameter and `@ai-sdk/openai` appends
 * the path to the base URL literally, so a base of `…/openai?deployment=x&path=`
 * produces `…?deployment=x&path=/responses`. Header-routed gateways are just as
 * common, and an API key can select a tenant, so both go in as well. The
 * injected transport is not part of the key: it is a proxy in front of the same
 * base URL, so it reaches the same routes.
 *
 * The result is a hash: no URL, key or header value is retained or logged.
 */
export function endpointRouteKey(
	baseURL: string,
	creds: { apiKey?: string; headers?: Record<string, string> },
	headers?: CallOptions['headers'],
): string {
	// Keep both raw layers. The SDK spreads call headers over provider headers
	// before normalization. Casing, order and undefined overrides can affect routing.
	// The SDK reads the environment key on each call when no explicit key is set.
	return createHash('sha256')
		.update(
			JSON.stringify([
				normalizeResponsesUrl(baseURL),
				creds.apiKey ?? process.env.OPENAI_API_KEY ?? '',
				Object.entries(creds.headers ?? {}),
				Object.entries(headers ?? {}),
			]),
		)
		.digest('base64url');
}

/**
 * Append the route as the SDK does before URL normalization. This preserves
 * distinct request paths for base URLs such as `https://host/` and `https://host//`.
 */
function normalizeResponsesUrl(baseURL: string): string {
	const responsesUrl = baseURL.replace(/\/$/, '') + '/responses';
	try {
		return new URL(responsesUrl).href;
	} catch {
		return responsesUrl;
	}
}

/**
 * Waits for another call's probe, but never past this call's own abort signal or
 * {@link PROBE_WAIT_MS}: a first call whose request hangs must not hold every
 * other call with it.
 */
async function waitForProbe(
	probe: Probe,
	abortSignal: AbortSignal | undefined,
): Promise<ApiStyle | undefined> {
	let onAbort: (() => void) | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			probe.answer,
			new Promise<undefined>((resolve) => {
				timer = setTimeout(() => resolve(undefined), PROBE_WAIT_MS);
				if (!abortSignal) return;
				if (abortSignal.aborted) {
					resolve(undefined);
					return;
				}
				onAbort = () => resolve(undefined);
				abortSignal.addEventListener('abort', onAbort, { once: true });
			}),
		]);
	} finally {
		clearTimeout(timer);
		// `{ once: true }` only detaches itself when the event actually fires; the
		// probe can just as well win the race, so detach unconditionally here.
		if (onAbort) abortSignal?.removeEventListener('abort', onAbort);
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
	if (known.expiresAt <= Date.now() && !liveProbe(endpoint)) return undefined;
	// Re-insert the same entry to mark it as recently used, so the busiest
	// endpoint is not the one eviction drops.
	endpointApiStyles.delete(endpoint);
	endpointApiStyles.set(endpoint, known);
	return known.style;
}

/**
 * Reports the SDK's Responses/Chat Completions mismatch, which it puts in an
 * error part instead of throwing. The parts pass through untouched, so the
 * answer keeps streaming; only the endpoint's decision moves.
 */
function watchForChatPayload(
	result: StreamResult,
	remember: (style: ApiStyle) => void,
): StreamResult {
	return {
		...result,
		stream: result.stream.pipeThrough(
			new TransformStream<StreamPart, StreamPart>({
				transform(part, controller) {
					if (part.type === 'error' && servedChatCompletionsPayload(part.error)) {
						remember('chat');
					}
					controller.enqueue(part);
				},
			}),
		),
	};
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
 * reports that it has no /responses route. That answer is then shared per
 * `endpoint` ({@link endpointRouteKey}) for {@link DECISION_TTL_MS}, so later
 * turns send one request, not two.
 */
export function withChatCompletionsFallback(
	endpointKey: string | ((headers: CallOptions['headers']) => string),
	responsesModel: UnwrappedLanguageModel,
	chatModel: UnwrappedLanguageModel,
): WrappedLanguageModel {
	const ai = loadAi();
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
		probe: Probe | undefined,
		remember: (style: ApiStyle) => void,
	): Promise<{ value: T; style: ApiStyle }> {
		try {
			const value = await viaResponses();
			// The transport publishes this route when the answer's headers arrive;
			// this covers a model that does not go through the transport.
			probe?.settle('responses');
			return { value, style: 'responses' };
		} catch (error) {
			if (servedChatCompletionsPayload(error)) {
				// The route answered, and that generation ran: this call keeps its
				// error rather than paying for a second one. The endpoint has still
				// said what it speaks, so the next call goes straight to chat.
				remember('chat');
				probe?.settle('chat');
				throw error;
			}
			if (!servesNoResponsesApi(error)) throw error;
			// The route evidence is complete here, so publish it before the chat
			// request runs: a waiting call must not sit through a whole generation.
			probe?.settle('chat');
			try {
				return { value: await viaChat(), style: 'chat' };
			} catch (chatError) {
				// The /responses refusal is the only reason this second request exists.
				try {
					if (isRecord(chatError) && chatError.cause === undefined) chatError.cause = error;
				} catch {
					// A frozen or proxied error keeps its own shape.
				}
				throw chatError;
			}
		}
	}

	async function callEndpoint<T>(
		params: CallOptions,
		viaResponses: (remember: (style: ApiStyle) => void) => PromiseLike<T>,
		viaChat: () => PromiseLike<T>,
	): Promise<T> {
		// Both maps are read before this function's first `await`, so parallel first
		// calls find the probe one of them registers instead of each starting one.
		const endpoint = typeof endpointKey === 'string' ? endpointKey : endpointKey(params.headers);
		let decided = rememberedApiStyle(endpoint);
		let seen = endpointApiStyles.get(endpoint);
		const running = decided === undefined ? liveProbe(endpoint) : undefined;
		if (running) {
			// A probe that fails, is cancelled or hangs answers `undefined`, so this
			// call asks the endpoint itself instead of inheriting another call's fate.
			decided = await waitForProbe(running, params.abortSignal);
			// The wait can also end because this call's own signal fired, not
			// because the probe answered. Report that now instead of starting a
			// second request — to /responses or /chat — on an already-cancelled call.
			if (decided === undefined) params.abortSignal?.throwIfAborted();
		}

		if (decided === 'chat') return await viaChat();

		// A parallel call waits for this answer instead of sending its own prompt to
		// a route that may not exist. It never sees this call's result.
		const probe = decided === undefined && !liveProbe(endpoint) ? startProbe(endpoint) : undefined;
		const owner = probe ?? running ?? seen?.owner;
		const remember = (style: ApiStyle) => {
			if (!owner || !ownsDecision(endpoint, owner) || endpointApiStyles.get(endpoint) !== seen)
				return;
			rememberApiStyle(endpoint, style, owner);
			// A stream can report a mismatch after doStream releases its probe.
			// Keep this call's own write, but reject evidence from a successor.
			seen = endpointApiStyles.get(endpoint);
		};
		try {
			const { value, style } = await requestProbe.run(
				{ endpoint, probe },
				async () => await attempt(() => viaResponses(remember), viaChat, probe, remember),
			);
			// A transient refusal must not replace a known Responses decision.
			if (style === 'responses' || decided === undefined) remember(style);
			return value;
		} finally {
			if (probe) endProbe(endpoint, probe);
		}
	}

	return ai.wrapLanguageModel({
		model: responses,
		middleware: {
			overrideSupportedUrls: async () =>
				sharedSupportedUrls(await responses.supportedUrls, await chat.supportedUrls),
			// Audio routing is a property of this prompt, not of the endpoint, so it
			// stays outside `callEndpoint` and is never remembered.
			wrapGenerate: async ({ doGenerate, params }) => {
				if (await requiresChatOnlyAudio(params.prompt)) return await chat.doGenerate(params);
				return await callEndpoint(params, doGenerate, async () => await chat.doGenerate(params));
			},
			wrapStream: async ({ doStream, params }) => {
				if (await requiresChatOnlyAudio(params.prompt)) return await chat.doStream(params);
				return await callEndpoint(
					params,
					async (remember) => watchForChatPayload(await doStream(), remember),
					async () => await chat.doStream(params),
				);
			},
		},
	});
}
