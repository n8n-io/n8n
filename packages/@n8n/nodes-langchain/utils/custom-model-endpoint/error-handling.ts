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

function clientShapedMessage(parsed: unknown): string | undefined {
	return isRecord(parsed) && isRecord(parsed.error) && typeof parsed.error.message === 'string'
		? parsed.error.message
		: undefined;
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

	return (
		clientShapedMessage(parsed) ??
		[parsed.error_description, parsed.error, parsed.message, parsed.detail].find(
			(value): value is string => typeof value === 'string',
		)
	);
}

export function wrapCustomModelEndpointErrorFetch(baseFetch: typeof fetch): typeof fetch {
	return async (input, init) => {
		const response = await baseFetch(input, init);
		if (response.ok) return response;

		const text = (await response.text()).trim();
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
