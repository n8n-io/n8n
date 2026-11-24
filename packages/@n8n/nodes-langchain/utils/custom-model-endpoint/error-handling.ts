import { redactSecrets } from '@n8n/ai-utilities';
import { isRecord } from '@n8n/utils/is-record';

const MAX_MESSAGE_LENGTH = 500;
const UNPARSED = Symbol('unparsed');

export function truncateMessage(text: string): string {
	return text.length > MAX_MESSAGE_LENGTH ? `${text.slice(0, MAX_MESSAGE_LENGTH)}…` : text;
}

function asClientError(message: string): string {
	return JSON.stringify({ error: { message } });
}

function parseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return UNPARSED;
	}
}

type ClientShaped = Record<string, unknown> & {
	error: Record<string, unknown> & { message: string };
};

function isClientShaped(parsed: unknown): parsed is ClientShaped {
	return isRecord(parsed) && isRecord(parsed.error) && typeof parsed.error.message === 'string';
}

function clientShapedMessage(parsed: unknown): string | undefined {
	return isClientShaped(parsed) ? parsed.error.message : undefined;
}

/** Reads back what this module writes, for callers that handle a failure themselves. */
export function clientErrorMessage(text: string): string | undefined {
	const parsed = parseJson(text);
	if (!isRecord(parsed) || !isRecord(parsed.error)) return undefined;
	const message = parsed.error.message;
	return typeof message === 'string' && message.trim() ? message : undefined;
}

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
};

function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity: string, body: string) => {
		const named = NAMED_ENTITIES[body.toLowerCase()];
		if (named !== undefined) return named;

		const code = /^#x/i.test(body) ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
		return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
	});
}

function messageFromHtml(text: string): string | undefined {
	const title = /<title[^>]*>([^<]+)<\/title>/i.exec(text)?.[1];
	const flattened = decodeEntities(title ?? text.replace(/<[^>]*>/g, ' '))
		.replace(/\s+/g, ' ')
		.trim();
	return flattened.length > 0 ? flattened : undefined;
}

export function messageFromBody(text: string): string | undefined {
	if (text.length === 0) return undefined;
	if (text.startsWith('<')) return messageFromHtml(text);

	const parsed = parseJson(text);
	if (parsed === UNPARSED) return text;
	if (!isRecord(parsed)) return undefined;

	// `||`, not `??`: an empty message is not a message, and taking it would hide
	// both the fields beside it and the status the caller falls back to.
	return (
		clientShapedMessage(parsed) ||
		[parsed.error_description, parsed.error, parsed.message, parsed.detail].find(
			(value): value is string => typeof value === 'string' && value.trim().length > 0,
		)
	);
}

function withoutKnownSecrets(text: string, secrets: string[]): string {
	return secrets.reduce((carried, secret) => carried.split(secret).join('***'), text);
}

/**
 * The known values first, then the shapes `redactSecrets` recognises on its own. A gateway
 * is free to repeat what it was sent, so its error text is never shown unfiltered.
 *
 * `redactSecrets` is a heuristic over the whole body: it also takes out a phrase that merely
 * looks like a credential, and it replaces a subtree deeper than eight levels wholesale. An
 * error is worth that trade and an answer is not, so nothing here ever reaches an answer.
 */
export function withoutSecrets(text: string, secrets: string[]): string {
	return redactSecrets(withoutKnownSecrets(text, secrets));
}

/** Whatever this request carried as a credential, the OAuth2 token minted for it included. */
function sentCredential(input: RequestInfo | URL, init?: RequestInit): string[] {
	const source = init?.headers ?? (input instanceof Request ? input.headers : undefined);
	const authorization = source === undefined ? null : new Headers(source).get('authorization');
	if (authorization === null) return [];

	// Everything after the scheme, because a token is free to contain a space
	const scheme = authorization.indexOf(' ');
	const credential = scheme === -1 ? '' : authorization.slice(scheme + 1);
	return [authorization, credential].filter((value) => value.length > 0);
}

/** A blank line ends a frame, and the spec allows all three line terminators for it. */
const EVENT_BOUNDARY = /\r\n\r\n|\n\n|\r\r/g;

/** Nothing is held past this without a frame boundary, so an odd gateway cannot grow it. */
const MAX_CARRIED = 64 * 1024;

/**
 * A refusal filtered in place, with the escaped spellings covered. `\u006f` in a JSON
 * string is the credential once the client parses it, so every string in the body is
 * filtered after decoding and the body is rebuilt only when that changed something.
 * A body that does not parse falls back to the bytes, which is all there is to work with.
 */
function withoutSecretsInJson(raw: string, secrets: string[]): string {
	const parsed = parseJson(raw);
	if (parsed === UNPARSED) return withoutKnownSecrets(raw, secrets);

	let changed = false;
	const walk = (value: unknown): unknown => {
		if (typeof value === 'string') {
			const safe = withoutKnownSecrets(value, secrets);
			changed ||= safe !== value;
			return safe;
		}
		if (Array.isArray(value)) return value.map(walk);
		if (isRecord(value))
			return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
		return value;
	};

	const filtered = walk(parsed);
	return changed ? JSON.stringify(filtered) : withoutKnownSecrets(raw, secrets);
}

/**
 * What this node reads as an answer, and nothing else.
 *
 * The set of refusals a gateway can send is open: every vendor and every proxy in front of
 * one words it differently, and three rounds of recognising them left most unmatched. The
 * set of answers is closed, because this node speaks three protocols. So an answer is what
 * is matched here, and everything else is filtered.
 *
 * `error` being truthy is the client's own test for a refusal, which the Responses format
 * needs: it carries `error: null` on every normal lifecycle frame.
 */
function isAnswer(parsed: unknown): boolean {
	if (Array.isArray(parsed)) return true;
	if (!isRecord(parsed) || parsed.error) return false;
	// `response.failed` is an answer-shaped frame whose error sits one level down
	if (isRecord(parsed.response) && parsed.response.error) return false;

	return (
		Array.isArray(parsed.choices) ||
		Array.isArray(parsed.data) ||
		parsed.object === 'response' ||
		'output' in parsed ||
		(typeof parsed.type === 'string' && parsed.type.startsWith('response.'))
	);
}

/** A frame carries its payload on `data:` lines; the rest of it is protocol. */
function frameData(frame: string): string | undefined {
	const data = frame
		.split(/\r\n|\n|\r/)
		.filter((line) => line.startsWith('data:'))
		.map((line) => line.slice('data:'.length).trim())
		.join('');
	return data.length > 0 ? data : undefined;
}

/** Reads one frame, or a whole body from a gateway that framed nothing. */
function isAnswerText(text: string): boolean {
	return isAnswer(parseJson(frameData(text) ?? text.trim()));
}

function endOfLastFrame(text: string): number {
	let end = -1;
	for (const boundary of text.matchAll(EVENT_BOUNDARY)) {
		end = boundary.index + boundary[0].length;
	}
	return end;
}

/** A frame is `data:` lines around a payload, so the payload is filtered and put back. */
function withoutSecretsInFrame(frame: string, secrets: string[]): string {
	const data = frameData(frame);
	if (data === undefined) return withoutKnownSecrets(frame, secrets);

	const safe = withoutSecretsInJson(data, secrets);
	return safe === data ? withoutKnownSecrets(frame, secrets) : frame.split(data).join(safe);
}

/** Splits on the boundary and keeps it, so the bytes out are the bytes in. */
function framesOf(text: string): string[] {
	const frames: string[] = [];
	let at = 0;
	for (const boundary of text.matchAll(EVENT_BOUNDARY)) {
		const end = boundary.index + boundary[0].length;
		frames.push(text.slice(at, end));
		at = end;
	}
	if (at < text.length) frames.push(text.slice(at));
	return frames;
}

/**
 * A gateway can refuse inside a frame of a 200, which the error path below never sees.
 * Only a frame carrying a refusal is filtered: an answer is the user's own content, and
 * replacing a credential that is also an ordinary word would corrupt it.
 *
 * `redactSecrets` is deliberately not used here. It re-serialises the JSON it walks, and a
 * re-indented frame no longer parses as one.
 */
function withoutSecretsInStream(
	body: ReadableStream<Uint8Array>,
	secrets: string[],
): ReadableStream<Uint8Array> {
	const decoder = new TextDecoder();
	const encoder = new TextEncoder();
	// A secret can straddle a release, so this much of the tail waits for the next chunk
	const overlap = Math.max(...secrets.map((secret) => secret.length)) - 1;
	let carried = '';

	/**
	 * A whole frame can be read, so an answer passes through untouched. A release forced by
	 * the size bound is an arbitrary slice of one, which cannot be read, so it is filtered.
	 */
	const emit = (
		text: string,
		controller: TransformStreamDefaultController<Uint8Array>,
		readable: boolean,
	) => {
		const safe = readable && isAnswerText(text) ? text : withoutSecretsInFrame(text, secrets);
		controller.enqueue(encoder.encode(safe));
	};

	return body.pipeThrough(
		new TransformStream<Uint8Array, Uint8Array>({
			transform(chunk, controller) {
				carried += decoder.decode(chunk, { stream: true });

				const frameEnd = endOfLastFrame(carried);
				const release =
					frameEnd !== -1 ? frameEnd : carried.length > MAX_CARRIED ? carried.length - overlap : -1;
				if (release <= 0) return;

				const complete = carried.slice(0, release);
				carried = carried.slice(release);

				if (frameEnd === -1) return emit(complete, controller, false);
				for (const frame of framesOf(complete)) emit(frame, controller, true);
			},
			flush(controller) {
				carried += decoder.decode();
				if (carried.length > 0) emit(carried, controller, true);
			},
		}),
	);
}

const STREAM_CONTENT_TYPE = 'text/event-stream';

/**
 * Media types are case-insensitive and carry parameters, so the essence is compared. A
 * gateway that declares nothing is treated as streaming, because buffering a stream to
 * find out would hold back every token.
 */
function isStreamed(response: Response): boolean {
	const declared = response.headers.get('content-type');
	if (declared === null) return true;
	return declared.split(';')[0].trim().toLowerCase() === STREAM_CONTENT_TYPE;
}

/**
 * `new Response(body, init)` drops these read-only fields, as the transport below also
 * finds. `statusText` is left behind on purpose: the constructor rejects a reason phrase
 * that is not ASCII, and nothing downstream reads it.
 */
function rebuiltFrom(response: Response, body: BodyInit, headers: Headers): Response {
	return Object.defineProperties(new Response(body, { status: response.status, headers }), {
		url: { value: response.url },
		redirected: { value: response.redirected },
		type: { value: response.type },
	});
}

function withoutContentLength(response: Response): Headers {
	const headers = new Headers(response.headers);
	headers.delete('content-length');
	return headers;
}

/**
 * Every reader decodes before it displays, so the decoded text is filtered as well as the
 * bytes: a credential spelled `\u0073k-…` or `&#115;k-…` would otherwise be rebuilt in
 * cleartext downstream. The body is rewritten only when a filter changed something, so an
 * untouched error reaches the client exactly as the gateway sent it.
 */
function filteredErrorBody(raw: string, secrets: string[]): string {
	const filtered = withoutSecrets(raw, secrets);
	const parsed = parseJson(filtered);

	if (isClientShaped(parsed)) {
		// Reshaping a body the client already understands would drop the fields beside its message
		const safe = withoutSecrets(parsed.error.message, secrets);
		return safe === parsed.error.message
			? filtered
			: JSON.stringify({ ...parsed, error: { ...parsed.error, message: safe } });
	}

	const message = messageFromBody(filtered);
	return message === undefined
		? filtered
		: asClientError(truncateMessage(withoutSecrets(message, secrets)));
}

export function wrapCustomModelEndpointErrorFetch(
	baseFetch: typeof fetch,
	secrets: string[] = [],
): typeof fetch {
	return async (input, init) => {
		const response = await baseFetch(input, init);
		const known = [...secrets, ...sentCredential(input, init)];

		if (response.ok) {
			if (known.length === 0 || response.body === null) return response;

			if (isStreamed(response)) {
				const filtered = withoutSecretsInStream(response.body, known);
				return rebuiltFrom(response, filtered, withoutContentLength(response));
			}

			const raw = await response.text();
			if (isAnswer(parseJson(raw))) return rebuiltFrom(response, raw, response.headers);

			// A refusal on a 200 keeps its shape and loses only the credential. It is not
			// reshaped: the client reads a 200 as an answer, so the body it gets must still
			// be the one the gateway sent.
			return rebuiltFrom(
				response,
				withoutSecretsInJson(raw, known),
				withoutContentLength(response),
			);
		}

		// A status that carries no body cannot be rebuilt around one
		if (response.body === null) return response;

		const body = filteredErrorBody((await response.text()).trim(), known);
		const headers = withoutContentLength(response);
		// Reshaping produced client-shaped JSON; saying so is a no-op when it already was
		if (isClientShaped(parseJson(body))) headers.set('content-type', 'application/json');

		return rebuiltFrom(response, body, headers);
	};
}
