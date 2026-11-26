import { redactSecrets } from '@n8n/ai-utilities';
import { isRecord } from '@n8n/utils/is-record';

import { modelIdsIn } from './model-list';

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
		// Own keys only: `&constructor;` in a title would otherwise reach Object.prototype
		const name = body.toLowerCase();
		if (Object.hasOwn(NAMED_ENTITIES, name)) return NAMED_ENTITIES[name];

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

/** Longest first: replacing a secret that prefixes another would leave the other's tail. */
function withoutKnownSecrets(text: string, secrets: string[]): string {
	const longestFirst = [...secrets].sort((left, right) => right.length - left.length);
	return longestFirst.reduce((carried, secret) => carried.split(secret).join('***'), text);
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

/**
 * A memory guard, not a framing rule. A release forced by it cannot be read, so it is
 * filtered, and filtering an answer corrupts it. The bound therefore sits well above the
 * largest frame a gateway really sends: a `response.completed` frame carries the whole
 * answer, which 64 KiB does not cover.
 */
export const MAX_CARRIED = 4 * 1024 * 1024;

/**
 * Filters the decoded text of a refusal as well as the bytes. `\u006f` in a JSON string is
 * the credential once the client parses it, so every name and every string in the body is
 * filtered after decoding, and the body is rebuilt only when that changed something.
 *
 * A body that parses is returned as it arrived when nothing changed. The bytes around the
 * decoded text are JSON syntax and numbers, and a listed value that is also an ordinary
 * run of digits would rewrite those and leave a body the client can no longer parse.
 * A body that does not parse falls back to the bytes, which is all there is to work with.
 */
function withoutSecretsInJson(raw: string, secrets: string[]): string {
	const parsed = parseJson(raw);
	if (parsed === UNPARSED) return withoutKnownSecrets(raw, secrets);

	let changed = false;
	const filter = (text: string) => {
		const safe = withoutKnownSecrets(text, secrets);
		changed ||= safe !== text;
		return safe;
	};
	const walk = (value: unknown): unknown => {
		if (typeof value === 'string') return filter(value);
		if (Array.isArray(value)) return value.map(walk);
		if (isRecord(value))
			return Object.fromEntries(Object.entries(value).map(([k, v]) => [filter(k), walk(v)]));
		return value;
	};

	const filtered = walk(parsed);
	return changed ? JSON.stringify(filtered) : raw;
}

/**
 * The closing frame of a chat stream, which the client asks for by default. Every mark of
 * the shape is required, so a refusal that merely names itself one does not reach it.
 */
function isClosingUsageFrame(parsed: Record<string, unknown>): boolean {
	return (
		parsed.object === 'chat.completion.chunk' &&
		Array.isArray(parsed.choices) &&
		parsed.choices.length === 0 &&
		isRecord(parsed.usage) &&
		typeof parsed.usage.total_tokens === 'number'
	);
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
		// No choices is what the client reports as an empty answer, so it is not one
		(Array.isArray(parsed.choices) && parsed.choices.length > 0) ||
		isClosingUsageFrame(parsed) ||
		modelIdsIn(parsed) !== undefined ||
		parsed.object === 'response' ||
		Array.isArray(parsed.output) ||
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

/**
 * Filters the value of every line that is not a `data:` line. The field names and the
 * `data:` prefix are left alone, so a listed value that is also a word of the protocol
 * cannot rewrite the framing.
 */
function withoutSecretsInMetadata(frame: string, secrets: string[]): string {
	// The separators are captured, so joining the parts gives the bytes back unchanged
	return frame
		.split(/(\r\n|\n|\r)/)
		.map((part, at) => {
			if (at % 2 === 1 || part.startsWith('data:')) return part;
			const colon = part.indexOf(':');
			// No colon is a field with no value, so there is nothing of the gateway's in it
			return colon === -1
				? part
				: part.slice(0, colon + 1) + withoutKnownSecrets(part.slice(colon + 1), secrets);
		})
		.join('');
}

/**
 * Filters the payload of a frame and the values of its other lines, and leaves the
 * `data:` prefix and the field names as they arrived.
 */
function withoutSecretsInFrame(frame: string, secrets: string[]): string {
	const data = frameData(frame);
	// A gateway that frames nothing still sends a body, and it reaches here rather than the
	// branch below, so it takes the same decoded filter that branch uses. The boundary is
	// held back and put on again, because a rebuilt JSON body would drop it and the next
	// frame would arrive fused onto this one.
	if (data === undefined) {
		const boundary = ENDS_A_FRAME.exec(frame)?.[0] ?? '';
		const content = boundary === '' ? frame : frame.slice(0, -boundary.length);
		return withoutSecretsInJson(content, secrets) + boundary;
	}

	const metadataSafe = withoutSecretsInMetadata(frame, secrets);
	const safe = withoutSecretsInJson(data, secrets);
	if (safe === data) return metadataSafe;

	const spliced = metadataSafe.split(data).join(safe);
	// A payload carried over several `data:` lines is joined from them, so it is not a
	// substring of the frame and the splice finds nothing. The bytes are then the only
	// way to reach it.
	return spliced === metadataSafe ? withoutKnownSecrets(frame, secrets) : spliced;
}

const ENDS_A_FRAME = /(?:\r\n\r\n|\n\n|\r\r)$/;
const LONGEST_BOUNDARY = '\r\n\r\n'.length;

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
	/** Backs off a half character, which would otherwise re-encode as two U+FFFD. */
	const safeCut = (text: string) => {
		const at = text.length - overlap;
		const leadsAPair =
			at > 0 && text.charCodeAt(at - 1) >= 0xd800 && text.charCodeAt(at - 1) <= 0xdbff;
		return leadsAPair ? at - 1 : at;
	};
	let carried = '';
	/** The tail of `carried`, so a boundary split across two chunks is still found. */
	let seam = '';
	const tailOf = (text: string) => text.slice(-(LONGEST_BOUNDARY - 1));

	/** A whole frame can be read, so an answer passes through untouched. */
	const emit = (text: string, controller: TransformStreamDefaultController<Uint8Array>) => {
		const safe = isAnswerText(text) ? text : withoutSecretsInFrame(text, secrets);
		controller.enqueue(encoder.encode(safe));
	};

	return body.pipeThrough(
		new TransformStream<Uint8Array, Uint8Array>({
			transform(chunk, controller) {
				const text = decoder.decode(chunk, { stream: true });
				if (text.length === 0) return;

				// Only the new text and the seam before it are read. `carried` holds no boundary,
				// because every one found releases the text up to it, so searching it again would
				// cost one pass over the whole stream for each chunk and find nothing.
				const searched = seam + text;
				const found = endOfLastFrame(searched);
				const frameEnd = found === -1 ? -1 : carried.length - seam.length + found;

				carried += text;
				seam = tailOf(searched);

				if (frameEnd === -1) {
					if (carried.length <= MAX_CARRIED) return;

					// Filtered whole and cut afterwards, so a value that spans the cut is already
					// replaced. Only a value that runs on into the next chunk waits in the tail.
					const safe = withoutSecretsInFrame(carried, secrets);
					const at = safeCut(safe);
					if (at <= 0) return;

					controller.enqueue(encoder.encode(safe.slice(0, at)));
					carried = safe.slice(at);
					seam = tailOf(carried);
					return;
				}

				const complete = carried.slice(0, frameEnd);
				carried = carried.slice(frameEnd);
				seam = tailOf(carried);
				for (const frame of framesOf(complete)) emit(frame, controller);
			},
			flush(controller) {
				carried += decoder.decode();
				if (carried.length > 0) emit(carried, controller);
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
 * Filters the decoded text as well as the bytes, because every reader decodes before it
 * displays. The body is rewritten only when a filter changed something, so an untouched
 * error reaches the client exactly as the gateway sent it.
 */
function filteredErrorBody(raw: string, secrets: string[]): string {
	// Filtered before trimming, because `String.trim` also takes a no-break space, which a
	// credential can be padded with: trimming first would leave that spelling unmatched.
	const filtered = withoutSecrets(raw, secrets).trim();
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

		const body = filteredErrorBody(await response.text(), known);
		const headers = withoutContentLength(response);
		// Reshaping produced client-shaped JSON; saying so is a no-op when it already was
		if (isClientShaped(parseJson(body))) headers.set('content-type', 'application/json');

		return rebuiltFrom(response, body, headers);
	};
}
