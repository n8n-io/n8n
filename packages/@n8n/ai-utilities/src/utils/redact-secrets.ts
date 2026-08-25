import { jsonParse, jsonStringify } from 'n8n-workflow';

const SECRET_REDACTION = '[redacted]';

/**
 * Masks credential-shaped values while keeping the key, so
 * `invalid api_key: <secret>` still names which credential was rejected.
 *
 * A sibling of the redaction in `packages/@n8n/agents/src/skills/tools.ts`;
 * kept separate because `@n8n/agents` is not a dependency here.
 *
 * The leading `[\w-]*` matters: `\b` alone never fires inside a compound key
 * such as `client_secret`. The auth scheme is optional so an `Authorization`
 * header holding a bare key is masked too.
 *
 * Composite names (`secretAccessKey`, `accessKeyId`) and cookie fields follow
 * `@n8n/instance-ai/evaluations/harness/redact.ts`. `token_type` does not match.
 */
export const redactSecrets = (content: string): string =>
	content
		.replace(
			/\b(authorization)(["']?\s*[:=]\s*["']?\s*(?:(?:bearer|basic)\s+)?)[^\s"',;}]+/gi,
			`$1$2${SECRET_REDACTION}`,
		)
		.replace(
			/([\w-]*(?:api[_-]?key|access[_-]?key(?:[_-]?id)?|access[_-]?token|refresh[_-]?token|token|password|passwd|secret(?:[_-]?access[_-]?key)?|credential|private[_-]?key|set[_-]?cookie|cookies?))(["']?\s*[:=]\s*)(["']?)[^\s"',;}]+\3/gi,
			`$1$2$3${SECRET_REDACTION}$3`,
		)
		// Unlabeled formats from `@n8n/instance-ai/evaluations/harness/redact.ts`.
		// Length floors leave prose lookalikes (sk-learn, AKIA as a word) unmatched.
		.replace(/\b(bearer|basic)\s+[\w.+/=~-]+/gi, `$1 ${SECRET_REDACTION}`)
		.replace(/\bsk-(?:[a-z0-9]+-)*[A-Za-z0-9_-]{16,}\b/g, SECRET_REDACTION)
		.replace(/\b(?:xox[a-z]|xapp)-[A-Za-z0-9-]{8,}\b/gi, SECRET_REDACTION)
		.replace(/\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}\b/g, SECRET_REDACTION)
		.replace(/\bAKIA[0-9A-Z]{16}\b/g, SECRET_REDACTION);

const CREDENTIAL_KEY_PATTERN =
	/^[\w-]*(?:api[_-]?key|access[_-]?key(?:[_-]?id)?|access[_-]?token|refresh[_-]?token|token|password|passwd|secret(?:[_-]?access[_-]?key)?|credential|private[_-]?key|set[_-]?cookie|cookies?)$/i;

const isCredentialNamedKey = (key: string): boolean =>
	key.toLowerCase() === 'authorization' || CREDENTIAL_KEY_PATTERN.test(key);

const parseJsonObject = (value: string): object | undefined => {
	try {
		const parsed: unknown = JSON.parse(value);
		if (parsed !== null && typeof parsed === 'object') {
			return parsed;
		}
	} catch {
		return undefined;
	}
	return undefined;
};

function redactJsonValue(value: unknown, key?: string): unknown {
	if (key !== undefined && isCredentialNamedKey(key)) {
		return SECRET_REDACTION;
	}

	if (typeof value === 'string') {
		const parsed = parseJsonObject(value);
		if (parsed !== undefined) {
			const redacted = redactJsonValue(parsed);
			return jsonStringify(redacted) === jsonStringify(parsed) ? value : jsonStringify(redacted);
		}
		return redactSecrets(value);
	}

	if (Array.isArray(value)) {
		return value.map((item) => redactJsonValue(item));
	}

	if (value !== null && typeof value === 'object') {
		const sanitized: Record<string, unknown> = {};
		for (const [childKey, childValue] of Object.entries(value)) {
			sanitized[childKey] = redactJsonValue(childValue, childKey);
		}
		return sanitized;
	}

	return value;
}

/**
 * Replaces credential-named properties with a sentinel and masks credential-shaped
 * text in strings. JSON.stringify runs first so Date and custom toJSON values
 * keep their serialized form, then the JSON-compatible tree is walked.
 */
export function sanitizeCredentialShapedValues(value: unknown, key?: string): unknown {
	if (key !== undefined && isCredentialNamedKey(key)) {
		return SECRET_REDACTION;
	}

	if (value !== null && typeof value === 'object') {
		const parsed: unknown = jsonParse(jsonStringify(value), { fallbackValue: undefined });
		if (parsed === undefined) {
			throw new Error('Unable to sanitize tool-called payload');
		}
		return redactJsonValue(parsed);
	}

	return redactJsonValue(value, key);
}
