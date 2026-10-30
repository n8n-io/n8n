import { isRecord } from '@n8n/utils/is-record';

import type { EndpointCredential } from './types';

/** Long enough for a gateway's own wording, short enough not to paste a page into a toast. */
const MAX_MESSAGE_LENGTH = 500;

const REDACTED = '[redacted]';

/**
 * Redaction is a substring match, so a short value censors ordinary words - a
 * two-letter key would blank every "key" in the sentence. Nothing this short is
 * a real gateway credential, and a mangled message helps nobody.
 */
const MIN_REDACTABLE_LENGTH = 8;

/** Every value the user typed as a secret, so none of it can be echoed back into an error. */
export function endpointSecrets(endpoint: EndpointCredential): string[] {
	const { login } = endpoint;
	const loginSecrets =
		login.type === 'bearer'
			? [login.token]
			: login.type === 'header'
				? [login.key]
				: login.type === 'basic'
					? [login.password, Buffer.from(`${login.username}:${login.password}`).toString('base64')]
					: [];

	return [...loginSecrets, ...Object.values(endpoint.gatewayHeaders)].filter(
		(secret) => secret.length > 0,
	);
}

function redact(text: string, secrets: string[]): string {
	return secrets
		.filter((secret) => secret.length >= MIN_REDACTABLE_LENGTH)
		.reduce((redacted, secret) => redacted.split(secret).join(REDACTED), text);
}

function truncate(text: string): string {
	return text.length > MAX_MESSAGE_LENGTH ? `${text.slice(0, MAX_MESSAGE_LENGTH)}…` : text;
}

/** Tags carry no meaning once flattened, and an error page is mostly tags. */
function messageFromHtml(text: string): string | undefined {
	const title = /<title[^>]*>([^<]+)<\/title>/i.exec(text)?.[1];
	const body = (title ?? text.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
	return body.length > 0 ? body : undefined;
}

/**
 * Gateways disagree on the shape of an error. OpenAI-style bodies already reach
 * the user; the rest arrive as `{ message }` (Azure API Management, Databricks),
 * `{ error: "..." }`, an OAuth `{ error_description }`, plain text, or an HTML
 * error page. `undefined` means the body needs no reshaping.
 */
function messageFromBody(text: string): string | undefined {
	const trimmed = text.trim();
	if (trimmed.length === 0) return undefined;

	try {
		const parsed: unknown = JSON.parse(trimmed);
		if (!isRecord(parsed)) return undefined;
		// Already the shape the OpenAI client reads
		if (isRecord(parsed.error) && typeof parsed.error.message === 'string') return undefined;
		// OAuth sends a code in `error` and the sentence in `error_description`
		if (typeof parsed.error_description === 'string') return parsed.error_description;
		if (typeof parsed.error === 'string') return parsed.error;
		if (typeof parsed.message === 'string') return parsed.message;
		return undefined;
	} catch {}

	if (trimmed.startsWith('<')) return messageFromHtml(trimmed);
	return trimmed;
}

/**
 * Puts the gateway's own words in front of the user. The AI library reports
 * `<status> status code (no body)` for anything it cannot read as an OpenAI
 * error, which loses the one sentence that says what went wrong - a missing
 * subscription key, a disabled deployment, a quota.
 *
 * A 401 is reshaped like any other status rather than being swapped for advice
 * about checking credentials: the gateway usually knows which of several login
 * problems it was.
 */
export function wrapCustomModelEndpointErrorFetch(
	baseFetch: typeof fetch,
	options: { secrets: string[] },
): typeof fetch {
	return async (input, init) => {
		const response = await baseFetch(input, init);
		if (response.ok) return response;

		const text = await response.text();
		const message = messageFromBody(text);
		const body =
			message === undefined
				? text
				: JSON.stringify({ error: { message: truncate(redact(message, options.secrets)) } });

		const headers = new Headers(response.headers);
		headers.delete('content-length');
		// The reshaped body is JSON whatever the gateway sent
		if (message !== undefined) headers.set('content-type', 'application/json');

		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	};
}
