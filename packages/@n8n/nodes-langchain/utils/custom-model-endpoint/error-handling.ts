import { redactSecrets } from '@n8n/ai-utilities';
import { isRecord } from '@n8n/utils/is-record';

import type { CredentialSecrets } from './headers';

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

function clientShapedMessage(parsed: unknown): string | undefined {
	return isRecord(parsed) && isRecord(parsed.error) && typeof parsed.error.message === 'string'
		? parsed.error.message
		: undefined;
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
 * looks like a credential, and it replaces a subtree deeper than eight levels wholesale.
 * That trade is worth it on an error body and not on an answer, which is why the streamed
 * path below strips the known values alone.
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

function endOfLastFrame(text: string): number {
	let end = -1;
	for (const boundary of text.matchAll(EVENT_BOUNDARY)) {
		end = boundary.index + boundary[0].length;
	}
	return end;
}

/**
 * A streamed answer carries the gateway's refusal in a frame of a 200, so the error path
 * below never sees it. Frames are delimited, so each complete one is filtered as it passes
 * and the stream is not held up.
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

	const emit = (text: string, controller: TransformStreamDefaultController<Uint8Array>) =>
		controller.enqueue(encoder.encode(withoutKnownSecrets(text, secrets)));

	return body.pipeThrough(
		new TransformStream<Uint8Array, Uint8Array>({
			transform(chunk, controller) {
				carried += decoder.decode(chunk, { stream: true });

				const release =
					endOfLastFrame(carried) === -1
						? carried.length > MAX_CARRIED
							? carried.length - overlap
							: -1
						: endOfLastFrame(carried);
				if (release <= 0) return;

				emit(carried.slice(0, release), controller);
				carried = carried.slice(release);
			},
			flush(controller) {
				carried += decoder.decode();
				if (carried.length > 0) emit(carried, controller);
			},
		}),
	);
}

const STREAM_CONTENT_TYPE = 'text/event-stream';

/** Media types are case-insensitive and carry parameters, so compare the essence alone. */
function isStreamed(response: Response): boolean {
	const declared = response.headers.get('content-type');
	return declared?.split(';')[0].trim().toLowerCase() === STREAM_CONTENT_TYPE;
}

export function wrapCustomModelEndpointErrorFetch(
	baseFetch: typeof fetch,
	secrets: CredentialSecrets = { login: [], gatewayHeaders: [] },
): typeof fetch {
	return async (input, init) => {
		const response = await baseFetch(input, init);
		// A credential cannot be a word of the answer, so it is taken out of every body
		const inAnswers = [...secrets.login, ...sentCredential(input, init)];

		if (response.ok) {
			if (inAnswers.length === 0 || response.body === null) return response;

			// A gateway can refuse on a 200, and the client prints that body as the error.
			// Only the known values go here: the generic pass would redact the answer itself.
			const filtered = isStreamed(response)
				? withoutSecretsInStream(response.body, inAnswers)
				: withoutKnownSecrets(await response.text(), inAnswers);

			const headers = new Headers(response.headers);
			headers.delete('content-length');

			return new Response(filtered, {
				status: response.status,
				statusText: response.statusText,
				headers,
			});
		}

		// A gateway header value can be a word of an answer but not of an error worth keeping
		const text = withoutSecrets((await response.text()).trim(), [
			...inAnswers,
			...secrets.gatewayHeaders,
		]);
		// Reshaping a body the client already understands would drop the fields beside its message
		const message =
			clientShapedMessage(parseJson(text)) === undefined ? messageFromBody(text) : undefined;

		const headers = new Headers(response.headers);
		headers.delete('content-length');
		if (message !== undefined) headers.set('content-type', 'application/json');

		return new Response(message === undefined ? text : asClientError(truncateMessage(message)), {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	};
}
