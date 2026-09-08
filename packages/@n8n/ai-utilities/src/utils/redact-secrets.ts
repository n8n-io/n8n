import { redactDeep, redactText } from '@n8n/utils/redaction/redact-text';
import { jsonParse, jsonStringify } from 'n8n-workflow';

const OPTIONS = { secrets: true, redactSensitiveKeys: true };

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonObject(value: string): object | undefined {
	try {
		const parsed: unknown = JSON.parse(value);
		if (parsed !== null && typeof parsed === 'object') {
			return parsed;
		}
	} catch {
		return undefined;
	}
	return undefined;
}

/** Keep the original string when redaction is a no-op so pretty JSON stays pretty. */
function serializeJson(original: string, parsed: unknown, redacted: unknown): string {
	if (jsonStringify(redacted) === jsonStringify(parsed)) {
		return original;
	}
	return original.includes('\n') ? JSON.stringify(redacted, null, 2) : jsonStringify(redacted);
}

/** Expand JSON-looking strings so nested payloads can be walked as structure. */
function parseNestedJson(value: unknown): unknown {
	if (typeof value === 'string') {
		const parsed = parseJsonObject(value);
		return parsed === undefined ? value : parseNestedJson(parsed);
	}

	if (Array.isArray(value)) {
		return value.map(parseNestedJson);
	}

	if (isPlainObject(value)) {
		const walked: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			walked[key] = parseNestedJson(child);
		}
		return walked;
	}

	return value;
}

/** Put parsed JSON strings back; keep the original when redaction did not change them. */
function restoreJsonStrings(original: unknown, redacted: unknown): unknown {
	if (typeof original === 'string') {
		const parsed = parseJsonObject(original);
		if (parsed !== undefined) {
			return serializeJson(original, parsed, restoreJsonStrings(parsed, redacted));
		}
		return redacted;
	}

	if (Array.isArray(original) && Array.isArray(redacted)) {
		return original.map((item, index) => restoreJsonStrings(item, redacted[index]));
	}

	if (isPlainObject(original) && isPlainObject(redacted)) {
		const restored: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(original)) {
			restored[key] = restoreJsonStrings(child, redacted[key]);
		}
		return restored;
	}

	return redacted;
}

function redactJsonValue(value: unknown): unknown {
	return restoreJsonStrings(value, redactDeep(parseNestedJson(value), OPTIONS).value);
}

/**
 * Masks credential-shaped values in text. JSON objects are walked with
 * `redactDeep` so keys stay visible; non-JSON text uses `redactText`.
 */
export const redactSecrets = (content: string): string => {
	const parsed = parseJsonObject(content);
	if (parsed !== undefined) {
		return serializeJson(content, parsed, redactJsonValue(parsed));
	}

	const start = content.indexOf('{');
	const end = content.lastIndexOf('}');
	if (start !== -1 && end > start) {
		const slice = content.slice(start, end + 1);
		const nested = parseJsonObject(slice);
		if (nested !== undefined) {
			content =
				content.slice(0, start) +
				serializeJson(slice, nested, redactJsonValue(nested)) +
				content.slice(end + 1);
		}
	}

	return redactText(content, OPTIONS).text;
};

/**
 * Replaces credential-named properties with a sentinel and masks credential-shaped
 * text in strings. JSON.stringify runs first so Date and custom toJSON values
 * keep their serialized form, then the JSON-compatible tree is walked.
 */
export function sanitizeCredentialShapedValues(value: unknown): unknown {
	if (value !== null && typeof value === 'object') {
		const parsed: unknown = jsonParse(jsonStringify(value), { fallbackValue: undefined });
		if (parsed === undefined) {
			throw new Error('Unable to sanitize tool-called payload');
		}
		return redactJsonValue(parsed);
	}

	return redactJsonValue(value);
}
