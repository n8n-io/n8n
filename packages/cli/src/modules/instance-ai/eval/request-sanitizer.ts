/**
 * Request sanitizer for the eval LLM mock handler.
 *
 * Redacts secret-looking values from request bodies and query strings before
 * they are included in the LLM prompt. This prevents credentials, tokens, and
 * PII from leaking to the external LLM, even when the eval handler is
 * accidentally used with non-synthetic data.
 *
 * Also truncates oversized payloads (file uploads, bulk data) that don't help
 * the LLM generate a better mock response.
 * This adapter deliberately keeps its own vocabulary so judge inputs remain byte-stable.
 */

import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum serialized body size (in characters) sent to the LLM. */
const MAX_BODY_LENGTH = 4096;

/**
 * Key patterns that indicate a value is a secret and must be redacted.
 * Matches common credential, token, and PII field names across APIs.
 * Case-insensitive to catch camelCase, snake_case, and UPPER_CASE variants.
 */
const SECRET_KEY_PATTERN =
	/key|secret|token|password|credential|auth|bearer|cookie|session|ssn|connectionString|private|proxy-auth/i;

/**
 * Key patterns that look secret-ish by name but are actually safe config/data
 * values that the LLM needs to generate accurate responses.
 * Checked BEFORE the secret pattern to avoid false positives.
 */
const SAFE_KEY_PATTERN =
	/keyword|primary.?key|foreign.?key|sort.?key|partition.?key|group.?key|key.?name|key.?type|key.?field|key.?column|authentication$|author(?!.*(key|token|secret|password|credential))/i;

/**
 * Header names whose values are always secrets (case-insensitive).
 * These are redacted even if the key doesn't match SECRET_KEY_PATTERN.
 */
const SECRET_HEADER_PATTERN = /^(authorization|x-api-key|proxy-authorization|cookie|set-cookie)$/i;

const REDACTED = '<redacted>';

/**
 * Well-known secret VALUE shapes (provider API keys, OAuth/bot tokens, bearer
 * values), for text where key-based redaction can't see them — e.g. a secret
 * pasted into message content. Conservative on purpose: distinctive prefixes
 * plus length floors, so prose never matches.
 */
const SECRET_VALUE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
	{ pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g, replacement: REDACTED }, // OpenAI / Anthropic
	{ pattern: /\bxox[a-z]-[A-Za-z0-9-]{10,}\b/g, replacement: REDACTED }, // Slack
	{ pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, replacement: REDACTED }, // GitHub tokens
	{ pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, replacement: REDACTED }, // GitHub fine-grained PATs
	{ pattern: /\bAKIA[0-9A-Z]{16}\b/g, replacement: REDACTED }, // AWS access key ids
	{ pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g, replacement: REDACTED }, // Google API keys
	{ pattern: /\bya29\.[0-9A-Za-z_-]{20,}\b/g, replacement: REDACTED }, // Google OAuth access tokens
	{ pattern: /\bbearer\s+[A-Za-z0-9._~+/-]{20,}=*/gi, replacement: REDACTED },
	// Bare JWTs (three dot-separated base64url segments, header always eyJ…)
	{
		pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/g,
		replacement: REDACTED,
	},
	// Prose-form assignments a key-based redactor can't see inside content
	// text (`api_key=…`, `API key: …`, `password: …`). Keeps the key, scrubs
	// the value; multi-word key names accept space/underscore/hyphen.
	{
		pattern:
			/\b(api[\s_-]?key|access[\s_-]?token|refresh[\s_-]?token|client[\s_-]?secret|secret|password|passwd)\b(["']?\s*[=:]\s*["']?)[^\s"',;]{6,}/gi,
		replacement: `$1$2${REDACTED}`,
	},
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Deep-clone an object, replacing values whose keys look like secrets with
 * `<redacted>`. Handles nested objects, arrays, and mixed structures.
 *
 * Non-object values (strings, numbers, null) are returned as-is — there's
 * no key to classify at the top level.
 */
export function redactSecretKeys(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (Array.isArray(value)) return value.map((item) => redactSecretKeys(item));
	if (typeof value !== 'object') return value;

	const result: Record<string, unknown> = {};
	for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
		if (isSecretKey(key)) {
			result[key] = REDACTED;
		} else if (typeof val === 'object' && val !== null) {
			result[key] = redactSecretKeys(val);
		} else {
			result[key] = val;
		}
	}
	return result;
}

/**
 * Truncate a serialized body string to `MAX_BODY_LENGTH` characters.
 * Appends a note when truncation occurs so the LLM knows the data is incomplete.
 * Logs a warning the first time a large body is encountered.
 */
/** Redact well-known secret VALUE shapes anywhere in a text blob. */
export function redactSecretValuePatterns(text: string): string {
	let result = text;
	for (const { pattern, replacement } of SECRET_VALUE_PATTERNS) {
		result = result.replace(pattern, replacement);
	}
	return result;
}

export function truncateForLlm(serialized: string, maxLength = MAX_BODY_LENGTH): string {
	if (serialized.length <= maxLength) return serialized;

	Container.get(Logger).warn(
		`[EvalMock] Request body truncated from ${serialized.length} to ${maxLength} chars — ` +
			'large bodies may indicate non-synthetic data flowing through the eval handler',
	);

	return serialized.slice(0, maxLength) + '... [truncated]';
}

/**
 * Determine whether a JSON key name likely holds a secret value.
 * Header patterns are checked first (exact match on known secret headers),
 * then safe patterns to avoid false positives on keys like "primaryKey"
 * or "keyword", then general secret patterns.
 */
export function isSecretKey(key: string): boolean {
	if (SECRET_HEADER_PATTERN.test(key)) return true;
	if (SAFE_KEY_PATTERN.test(key)) return false;
	if (SECRET_KEY_PATTERN.test(key)) return true;
	return false;
}

/**
 * Redact the values of secret-named query parameters in a URL path with its
 * query (`/path?a=1`), by the same key rules as `redactSecretKeys`. Returned
 * unchanged when no parameter is secret.
 */
export function redactSecretSearchParams(endpoint: string): string {
	const queryStart = endpoint.indexOf('?');
	if (queryStart === -1) return endpoint;
	const params = [...new URLSearchParams(endpoint.slice(queryStart + 1))];
	if (!params.some(([key]) => isSecretKey(key))) return endpoint;
	const query = params
		.map(([key, value]) => {
			const shown = isSecretKey(key) ? REDACTED : encodeURIComponent(value);
			return `${encodeURIComponent(key)}=${shown}`;
		})
		.join('&');
	return `${endpoint.slice(0, queryStart)}?${query}`;
}

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TELEGRAM_TOKEN_SEGMENT = /^(?:bot)?\d{6,}:[A-Za-z0-9_-]{20,}$/i;
const OPAQUE_SEGMENT = /^[A-Za-z0-9_-]{24,}$/;

// A path segment that holds a credential, such as `/bot<token>/sendMessage`. No vendor profile tells
// which segment it is, so this reads the shape: a bot token, or a long mix of letters and digits.
// A UUID and a plain hex id stay, because the model needs ids to write a consistent answer.
function isTokenSegment(segment: string): boolean {
	let text = segment;
	try {
		text = decodeURIComponent(segment);
	} catch {
		// Use the segment as it is.
	}
	if (TELEGRAM_TOKEN_SEGMENT.test(text)) return true;
	return (
		OPAQUE_SEGMENT.test(text) &&
		/\d/.test(text) &&
		/[A-Za-z]/.test(text) &&
		!UUID_SEGMENT.test(text) &&
		!/^[0-9a-f]+$/i.test(text)
	);
}

/**
 * Redact the secrets of an endpoint or of a URL for a model or a log: a token-like path segment, and
 * the secret parameters of the query. A host has dots, so it is never a token segment.
 */
export function redactEndpoint(endpoint: string): string {
	const queryStart = endpoint.indexOf('?');
	const path = queryStart === -1 ? endpoint : endpoint.slice(0, queryStart);
	const query = queryStart === -1 ? '' : endpoint.slice(queryStart);
	const safePath = path
		.split('/')
		.map((segment) => (isTokenSegment(segment) ? REDACTED : segment))
		.join('/');
	return redactSecretSearchParams(safePath + query);
}

// A string parameter can hold a URL, or a JSON text such as the headers of a node.
function redactStringParameter(value: string): string {
	const trimmed = value.trim();
	if (/^=?\s*https?:\/\//i.test(trimmed)) return redactEndpoint(value);
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		try {
			const parsed: unknown = JSON.parse(trimmed);
			const redacted = JSON.stringify(redactNodeParameters(parsed));
			// Keep the text as it is when nothing changed.
			return redacted === JSON.stringify(parsed) ? value : redacted;
		} catch {
			// Not JSON. Keep the text.
		}
	}
	return value;
}

/**
 * Redact the secrets of the parameters of a node. Besides the key rules of `redactSecretKeys`, it
 * hides the value of a `{ name, value }` pair whose name is a secret, such as a header or a query
 * parameter of the HTTP Request node.
 */
export function redactNodeParameters(value: unknown): unknown {
	if (typeof value === 'string') return redactStringParameter(value);
	if (Array.isArray(value)) return value.map((item) => redactNodeParameters(item));
	if (typeof value !== 'object' || value === null) return value;

	const record = value as Record<string, unknown>;
	const pairIsSecret = typeof record.name === 'string' && isSecretKey(record.name);
	const result: Record<string, unknown> = {};
	for (const [key, val] of Object.entries(record)) {
		if (isSecretKey(key) || (pairIsSecret && key === 'value')) result[key] = REDACTED;
		else result[key] = redactNodeParameters(val);
	}
	return result;
}
