import { redactDeep, redactText } from '@n8n/utils/redaction/redact-text';
import { jsonParse, jsonStringify } from 'n8n-workflow';

const OPTIONS = { secrets: true, redactSensitiveKeys: true };

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

function redactJsonValue(value: unknown): unknown {
	if (typeof value === 'string') {
		const parsed = parseJsonObject(value);
		if (parsed !== undefined) {
			return serializeJson(value, parsed, redactJsonValue(parsed));
		}
		return redactText(value, OPTIONS).text;
	}

	if (Array.isArray(value)) {
		return value.map(redactJsonValue);
	}

	if (value !== null && typeof value === 'object') {
		const walked: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			walked[key] = redactJsonValue(child);
		}
		return redactDeep(walked, OPTIONS).value;
	}

	return value;
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
