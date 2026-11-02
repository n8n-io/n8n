import { isRecord } from '@n8n/utils/is-record';

import type { EndpointCredential, LoginMethod } from './types';

const MAX_MESSAGE_LENGTH = 500;
const SHORTEST_PLAUSIBLE_CREDENTIAL = 8;
const REDACTED = '[redacted]';
const UNPARSED = Symbol('unparsed');

function loginSecrets(login: LoginMethod): string[] {
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
		case 'none':
			return [];
	}
}

export function endpointSecrets(endpoint: EndpointCredential): string[] {
	return [...loginSecrets(endpoint.login), ...Object.values(endpoint.gatewayHeaders)].filter(
		(secret) => secret.length >= SHORTEST_PLAUSIBLE_CREDENTIAL,
	);
}

function redact(text: string, secrets: string[]): string {
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
	if (typeof value === 'string') return redact(value, secrets);
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

function truncate(text: string): string {
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
	if (parsed === UNPARSED) return redact(text, secrets);

	const redacted = redactValues(parsed, secrets);
	if (!isRecord(redacted) || !isRecord(redacted.error)) return JSON.stringify(redacted);

	const { message } = redacted.error;
	if (typeof message !== 'string') return JSON.stringify(redacted);

	return JSON.stringify({
		...redacted,
		error: { ...redacted.error, message: truncate(message) },
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
 * Redacts a body as it passes, because a gateway can answer 200 and put the
 * failure in the stream. A secret can straddle two chunks, so the tail of each
 * chunk is held back until the next one can be matched against it.
 */
function redactingStream(secrets: string[]): TransformStream<Uint8Array, Uint8Array> {
	const decoder = new TextDecoder();
	const encoder = new TextEncoder();
	const forms = bothForms(secrets);
	const straddle = Math.max(0, ...forms.map((form) => form.length)) - 1;
	let held = '';

	return new TransformStream({
		transform(chunk, controller) {
			const text = replaceAll(held + decoder.decode(chunk, { stream: true }), forms);
			const emit = Math.max(0, text.length - straddle);
			held = text.slice(emit);
			if (emit > 0) controller.enqueue(encoder.encode(text.slice(0, emit)));
		},
		flush(controller) {
			if (held) controller.enqueue(encoder.encode(replaceAll(held, forms)));
		},
	});
}

export function wrapCustomModelEndpointErrorFetch(
	baseFetch: typeof fetch,
	options: { secrets: string[] },
): typeof fetch {
	return async (input, init) => {
		const response = await baseFetch(input, init);
		if (response.ok) {
			if (!response.body || !options.secrets.length) return response;

			return new Response(response.body.pipeThrough(redactingStream(options.secrets)), {
				status: response.status,
				statusText: response.statusText,
				headers: response.headers,
			});
		}

		const text = (await response.text()).trim();
		const message = messageFromBody(text);

		const headers = new Headers(response.headers);
		headers.delete('content-length');
		if (message !== undefined) headers.set('content-type', 'application/json');

		const body =
			message === undefined
				? redactSerialised(text, options.secrets)
				: asClientError(truncate(redact(message, options.secrets)));

		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	};
}
