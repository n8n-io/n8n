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

	const [, credential] = authorization.split(' ');
	return [authorization, credential].filter((value) => Boolean(value?.length));
}

/** A blank line ends a frame, and the spec allows all three line terminators for it. */
const EVENT_BOUNDARY = /\r\n\r\n|\n\n|\r\r/g;

/** Nothing is held past this without a frame boundary, so an odd gateway cannot grow it. */
const MAX_CARRIED = 64 * 1024;

/** The client throws on a frame whose JSON carries this, and only such a frame is a refusal. */
const REFUSAL_KEY = '"error"';

function endOfLastFrame(text: string): number {
	let end = -1;
	for (const boundary of text.matchAll(EVENT_BOUNDARY)) {
		end = boundary.index + boundary[0].length;
	}
	return end;
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
	 * A whole frame is self-contained, so a refusal can be told from an answer and an answer
	 * passes through untouched. A release forced by the size bound is part of neither, and the
	 * marker may already have gone out in an earlier piece, so that one is always filtered.
	 */
	const emit = (
		text: string,
		controller: TransformStreamDefaultController<Uint8Array>,
		framed: boolean,
	) => {
		const safe = framed && !text.includes(REFUSAL_KEY) ? text : withoutKnownSecrets(text, secrets);
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

				emit(carried.slice(0, release), controller, frameEnd !== -1);
				carried = carried.slice(release);
			},
			flush(controller) {
				carried += decoder.decode();
				if (carried.length > 0) emit(carried, controller, false);
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

			// A refusal can arrive on a 200. An answer never passes through a filter: it is the
			// user's content, and a credential that is also an ordinary word would corrupt it.
			if (isStreamed(response)) {
				const filtered = withoutSecretsInStream(response.body, known);
				return rebuiltFrom(response, filtered, withoutContentLength(response));
			}

			const raw = await response.text();
			if (!isClientShaped(parseJson(raw))) return rebuiltFrom(response, raw, response.headers);

			const body = filteredErrorBody(raw, known);
			return rebuiltFrom(response, body, withoutContentLength(response));
		}

		const body = filteredErrorBody((await response.text()).trim(), known);
		const headers = withoutContentLength(response);
		// Reshaping produced client-shaped JSON; saying so is a no-op when it already was
		if (isClientShaped(parseJson(body))) headers.set('content-type', 'application/json');

		return rebuiltFrom(response, body, headers);
	};
}
