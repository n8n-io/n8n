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
		case 'oauth2':
			return [login.clientSecret];
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
	return secrets.reduce((redacted, secret) => redacted.split(secret).join(REDACTED), text);
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

/** Reads back what this module writes, for callers that handle a failure themselves. */
export function clientErrorMessage(text: string): string | undefined {
	const parsed = parseJson(text);
	if (!isRecord(parsed) || !isRecord(parsed.error)) return undefined;
	return typeof parsed.error.message === 'string' ? parsed.error.message : undefined;
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

export function wrapCustomModelEndpointErrorFetch(
	baseFetch: typeof fetch,
	options: { secrets: string[] },
): typeof fetch {
	return async (input, init) => {
		const response = await baseFetch(input, init);
		if (response.ok) return response;

		const text = (await response.text()).trim();
		const message = messageFromBody(text);

		const headers = new Headers(response.headers);
		headers.delete('content-length');
		if (message !== undefined) headers.set('content-type', 'application/json');

		// Truncating the untouched branch would leave its JSON unparseable
		const body =
			message === undefined
				? redact(text, options.secrets)
				: asClientError(truncate(redact(message, options.secrets)));

		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	};
}
