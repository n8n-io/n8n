/**
 * Replace common credential patterns in free-form text with `[REDACTED]`.
 *
 * Used before persisting or transmitting user-supplied text (telemetry
 * excerpts, eval report HTML, free-form feedback) where keys/tokens
 * accidentally pasted into prompts or command lines could otherwise leak
 * downstream.
 *
 * Conservative by design: matches well-known prefixed tokens, explicit
 * `key=value` pairs, and quoted JSON/JS-object fields with sensitive
 * names. We don't attempt to redact arbitrary long opaque strings — false
 * positives on file paths, IDs, or base64 payloads would make the output
 * unreadable.
 */
const SECRET_KEYS =
	'password|passwd|secret|credentials?|api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key|session|session[_-]?cookie|cookie|bearer|token';

const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
	// Authorization-header substrings: `Bearer <token>`, `Basic <token>`, `Token <token>`
	/\b(?:Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{12,}/gi,
	// OpenAI / Anthropic API keys
	/\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}/g,
	// Slack tokens (xoxb, xoxp, xoxa, xoxr, xoxs, xoxo)
	/\bxox[abprso]-[A-Za-z0-9-]{10,}/g,
	// GitHub tokens (ghp, ghs, gho, ghr, ghu)
	/\bgh[psoru]_[A-Za-z0-9]{20,}/g,
	// AWS access key id
	/\bAKIA[0-9A-Z]{16}\b/g,
	// JSON-shaped `"key": "value"` — matches the quoted field as a whole.
	// Run before the loose pattern so nested objects like
	// `{"credentials": {"apiKey": "..."}}` don't have the outer key consume
	// the inner key on its way to a non-quoted (object) value. The value
	// body uses the standard JSON-string idiom `(?:\\.|[^"\r\n])*` so an
	// escaped quote inside the value (`"abc\"def"`) doesn't end the match
	// early and leak the rest of the secret. The negative lookahead skips
	// values that are already a `[redacted]` / `[REDACTED]` placeholder so
	// this stays idempotent when chained behind upstream object-walking
	// redaction (e.g. langsmith trace payloads).
	new RegExp(
		`"(?:${SECRET_KEYS})"\\s*:\\s*"(?!\\[(?:redacted|REDACTED)\\]")(?:\\\\.|[^"\\r\\n])*"`,
		'gi',
	),
	// JS-object-shaped `'key': 'value'`
	new RegExp(
		`'(?:${SECRET_KEYS})'\\s*:\\s*'(?!\\[(?:redacted|REDACTED)\\]')(?:\\\\.|[^'\\r\\n])*'`,
		'gi',
	),
	// Generic `password=...` / `api_key=...` / `secret=...` style assignments
	new RegExp(`\\b(?:${SECRET_KEYS})\\s*[:=]\\s*\\S+`, 'gi'),
];

const REDACTED_VALUE = '[redacted]';
const CIRCULAR_VALUE = '[Circular]';
const SECRET_KEY_PATTERN = new RegExp(`^(?:${SECRET_KEYS}|auth)$`, 'i');

export function scrubSecretsInText(input: string): string {
	let out = input;
	for (const pattern of SECRET_VALUE_PATTERNS) {
		out = out.replace(pattern, '[REDACTED]');
	}
	return out;
}

function normalizeKey(key: string): string {
	return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isSecretKey(key: string): boolean {
	return SECRET_KEY_PATTERN.test(normalizeKey(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function scrubSecrets(value: unknown, seen = new WeakSet<object>()): unknown {
	if (typeof value === 'string') return scrubSecretsInText(value);

	if (Array.isArray(value)) {
		if (seen.has(value)) return CIRCULAR_VALUE;
		seen.add(value);
		const scrubbed = value.map((item) => scrubSecrets(item, seen));
		seen.delete(value);
		return scrubbed;
	}

	if (!isRecord(value)) return value;

	if (seen.has(value)) return CIRCULAR_VALUE;
	seen.add(value);

	const scrubbed: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(value)) {
		scrubbed[key] = isSecretKey(key) ? REDACTED_VALUE : scrubSecrets(item, seen);
	}

	seen.delete(value);
	return scrubbed;
}
