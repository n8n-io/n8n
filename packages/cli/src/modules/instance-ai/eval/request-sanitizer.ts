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
