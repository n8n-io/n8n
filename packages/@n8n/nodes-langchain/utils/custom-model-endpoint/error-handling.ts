import { isRecord } from '@n8n/utils/is-record';

import type { EndpointCredential, LoginMethod } from './types';

const MAX_MESSAGE_LENGTH = 500;
const SHORTEST_PLAUSIBLE_CREDENTIAL = 8;
const REDACTED = '[redacted]';
const UNPARSED = Symbol('unparsed');

/** Only values long enough to be a credential: redacting "k" would eat every "key". */
function plausible(secrets: string[]): string[] {
	return secrets.filter((secret) => secret.length >= SHORTEST_PLAUSIBLE_CREDENTIAL);
}

export function loginSecrets(login: LoginMethod): string[] {
	return plausible(rawLoginSecrets(login));
}

function rawLoginSecrets(login: LoginMethod): string[] {
	switch (login.type) {
		case 'bearer':
			return [login.token];
		case 'header':
			return [login.key];
		case 'basic':
			return [
				login.password,
				Buffer.from(`${login.username}:${login.password}`).toString('base64'),
			];
		case 'oauth2':
			return [
				login.clientSecret,
				encodeURIComponent(login.clientSecret),
				Buffer.from(`${login.clientId}:${login.clientSecret}`).toString('base64'),
			];
		case 'none':
			return [];
	}
}

export function endpointSecrets(endpoint: EndpointCredential): string[] {
	return plausible([...loginSecrets(endpoint.login), ...Object.values(endpoint.gatewayHeaders)]);
}

export function redactSecrets(text: string, secrets: string[]): string {
	return replaceAll(text, bothForms(secrets));
}

function replaceAll(text: string, forms: string[]): string {
	return forms.reduce((redacted, form) => redacted.split(form).join(REDACTED), text);
}

/** The raw secret, and the way it looks once something has serialised it into JSON. */
function bothForms(secrets: string[]): string[] {
	return secrets.flatMap((secret) => {
		const escaped = JSON.stringify(secret).slice(1, -1);
		return escaped === secret ? [secret] : [secret, escaped];
	});
}

function redactValues(value: unknown, secrets: string[]): unknown {
	if (typeof value === 'string') return redactSecrets(value, secrets);
	if (Array.isArray(value)) return value.map((entry) => redactValues(entry, secrets));
	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [
				redact(key, secrets),
				redactValues(entry, secrets),
			]),
		);
	}
	return value;
}

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

function isAlreadyClientShaped(body: Record<string, unknown>): boolean {
	return isRecord(body.error) && typeof body.error.message === 'string';
}

/**
 * A secret reaches a JSON body escaped, so `"sk-a\"b"` never matches the raw
 * value. Redacting the parsed values and serialising again catches it, and
 * keeps the result parseable where truncating the text would not.
 */
function redactSerialised(text: string, secrets: string[]): string {
	const parsed = parseJson(text);
	if (parsed === UNPARSED) return redactSecrets(text, secrets);

	const redacted = redactValues(parsed, secrets);
	if (!isRecord(redacted) || !isRecord(redacted.error)) return JSON.stringify(redacted);

	const { message } = redacted.error;
	if (typeof message !== 'string') return JSON.stringify(redacted);

	return JSON.stringify({
		...redacted,
		error: { ...redacted.error, message: truncateMessage(message) },
	});
}

function messageFromHtml(text: string): string | undefined {
	const title = /<title[^>]*>([^<]+)<\/title>/i.exec(text)?.[1];
	const flattened = (title ?? text.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
	return flattened.length > 0 ? flattened : undefined;
}

function messageFromBody(text: string): string | undefined {
	if (text.length === 0) return undefined;
	if (text.startsWith('<')) return messageFromHtml(text);

	const parsed = parseJson(text);
	if (parsed === UNPARSED) return text;
	if (!isRecord(parsed) || isAlreadyClientShaped(parsed)) return undefined;

	return [parsed.error_description, parsed.error, parsed.message].find(
		(value): value is string => typeof value === 'string',
	);
}

/**
 * The tail worth keeping: the longest end of the buffer that could still turn
 * out to be the start of a secret once the next chunk arrives. Usually nothing,
 * so a token-by-token stream passes straight through.
 */
function unresolvedTail(text: string, forms: string[]): number {
	let keep = 0;

	for (const form of forms) {
		const earliest = Math.max(0, text.length - (form.length - 1));
		for (let at = earliest; at < text.length - keep; at++) {
			if (text.charCodeAt(at) === form.charCodeAt(0) && form.startsWith(text.slice(at))) {
				keep = text.length - at;
				break;
			}
		}
	}

	return keep;
}

/** Splitting a surrogate pair would send each half out as a replacement character. */
function offSurrogatePair(text: string, at: number): number {
	const code = text.charCodeAt(at - 1);
	return at > 0 && code >= 0xd800 && code <= 0xdbff ? at - 1 : at;
}

/**
 * Redacts a body as it passes, because a gateway can answer 200 and put the
 * failure in the stream. A secret can straddle two chunks, so a tail that could
 * be the start of one is held back until the next chunk settles it.
 */
function redactingStream(secrets: string[]): TransformStream<Uint8Array, Uint8Array> {
	const decoder = new TextDecoder();
	const encoder = new TextEncoder();
	const forms = bothForms(secrets);
	let held = '';

	return new TransformStream({
		transform(chunk, controller) {
			const text = replaceAll(held + decoder.decode(chunk, { stream: true }), forms);
			const emit = offSurrogatePair(text, text.length - unresolvedTail(text, forms));
			held = text.slice(emit);
			if (emit > 0) controller.enqueue(encoder.encode(text.slice(0, emit)));
		},
		flush(controller) {
			const rest = held + decoder.decode();
			if (rest) controller.enqueue(encoder.encode(replaceAll(rest, forms)));
		},
	});
}

/** `secrets` is read per response: an OAuth2 access token is minted long after the wrapper is built. */
export function wrapCustomModelEndpointErrorFetch(
	baseFetch: typeof fetch,
	options: { secrets: () => string[] },
): typeof fetch {
	return async (input, init) => {
		const response = await baseFetch(input, init);
		if (response.ok) {
			const streamed = options.secrets();
			if (!response.body || !streamed.length) return response;

			return new Response(response.body.pipeThrough(redactingStream(streamed)), {
				status: response.status,
				statusText: response.statusText,
				headers: response.headers,
			});
		}

		const text = (await response.text()).trim();
		const message = messageFromBody(text);
		const secrets = options.secrets();

		const headers = new Headers(response.headers);
		headers.delete('content-length');
		if (message !== undefined) headers.set('content-type', 'application/json');

		const body =
			message === undefined
				? redactSerialised(text, secrets)
				: asClientError(truncateMessage(redactSecrets(message, secrets)));

		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	};
}
