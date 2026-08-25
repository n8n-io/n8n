import { jsonStringify } from 'n8n-workflow';

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
 */
export const redactSecrets = (content: string): string =>
	content
		.replace(
			/\b(authorization)(["']?\s*[:=]\s*["']?\s*(?:(?:bearer|basic)\s+)?)[^\s"',;}]+/gi,
			`$1$2${SECRET_REDACTION}`,
		)
		.replace(
			/([\w-]*(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|passwd|secret|credential|private[_-]?key))(["']?\s*[:=]\s*)(["']?)[^\s"',;}]+\3/gi,
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
	/^[\w-]*(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|passwd|secret|credential|private[_-]?key)$/i;

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

/**
 * Replaces credential-named properties with a sentinel and masks credential-shaped
 * text in strings. Object and array values are walked rather than regex-replaced in
 * serialized JSON, which can produce invalid JSON and must not restore the original.
 */
export function sanitizeCredentialShapedValues(value: unknown, key?: string): unknown {
	if (key !== undefined && isCredentialNamedKey(key)) {
		return SECRET_REDACTION;
	}

	if (typeof value === 'string') {
		const parsed = parseJsonObject(value);
		if (parsed !== undefined) {
			return jsonStringify(sanitizeCredentialShapedValues(parsed));
		}
		return redactSecrets(value);
	}

	if (Array.isArray(value)) {
		return value.map((item) => sanitizeCredentialShapedValues(item));
	}

	if (value !== null && typeof value === 'object') {
		const sanitized: Record<string, unknown> = {};
		for (const [childKey, childValue] of Object.entries(value)) {
			sanitized[childKey] = sanitizeCredentialShapedValues(childValue, childKey);
		}
		return sanitized;
	}

	return value;
}
