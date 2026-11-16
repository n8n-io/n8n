import { DEFAULT_PLACEHOLDER, redactDeep, redactText } from '@n8n/utils/redaction/redact-text';
import { ALWAYS_SENSITIVE_HEADERS } from '@n8n/utils/redaction/sensitive-headers';
import { isSensitiveKey } from '@n8n/utils/redaction/sensitive-key';
import { isRecord } from '@n8n/utils/is-record';

import type { OutboundRequest } from './tool-simulation.contracts';

const PLACEHOLDER = DEFAULT_PLACEHOLDER;
const SENSITIVE_HEADERS = new Set(ALWAYS_SENSITIVE_HEADERS);

/**
 * The second layer that keeps secrets out of requests sent to a simulation backend. A test run
 * hands tools placeholder credentials, so a stored secret never gets here. This removes what a
 * user typed into a tool: auth headers, values under secret-like names, and secret-shaped text.
 */
export function redactOutboundRequest(request: OutboundRequest): OutboundRequest {
	if (request.protocol === 'web_search') {
		return { ...request, args: { ...request.args, query: redactText(request.args.query).text } };
	}
	const headers = redactHeaders(request.headers);
	const body = request.body === undefined ? {} : { body: redactBody(request.body) };
	if (request.protocol === 'mcp') return { ...request, headers, ...body };
	return { ...request, url: redactUrl(request.url), headers, ...body };
}

function redactHeaders(headers: Record<string, string> = {}): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [name, value] of Object.entries(headers)) {
		if (SENSITIVE_HEADERS.has(name.toLowerCase()) || isSensitiveKey(name)) continue;
		result[name] = redactText(value).text;
	}
	return result;
}

function redactBody(body: unknown): unknown {
	return redactDeep(toJsonBody(body), { redactSensitiveKeys: true }).value;
}

/** Search terms and ids in the query stay, so the simulator can answer the request. */
function redactUrl(url: string): string {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return redactText(url).text;
	}
	parsed.username = '';
	parsed.password = '';
	parsed.pathname = redactText(parsed.pathname).text;
	// Value by value: a pattern run over the whole query could swallow the parameters after it.
	const query = new URLSearchParams();
	for (const [name, value] of parsed.searchParams) {
		query.append(name, isSensitiveKey(name) ? PLACEHOLDER : redactText(value).text);
	}
	parsed.search = query.toString();
	return parsed.toString();
}

/** Uploads and streams are described, not walked: walking bytes would make numbered keys. */
function toJsonBody(value: unknown): unknown {
	if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
		return `[binary body, ${value.byteLength} bytes]`;
	}
	if (value instanceof URLSearchParams) return Object.fromEntries(value.entries());
	if (value instanceof FormData) {
		const fields: Record<string, unknown> = {};
		for (const [name, entry] of value.entries()) {
			fields[name] =
				typeof entry === 'string' ? entry : `[file ${entry.name}, ${entry.size} bytes]`;
		}
		return fields;
	}
	if (isRecord(value) && !isPlainObject(value)) {
		return `[${value.constructor?.name ?? 'non-JSON'} body]`;
	}
	return value;
}

function isPlainObject(value: object): boolean {
	const prototype: unknown = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}
