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
export const SECRET_KEYS =
	'password|passwd|secret|credentials?|api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?token|auth[_-]?token';

export const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
	// PEM private-key blocks (RSA/EC/DSA/OpenSSH/PGP). Whole block, multiline.
	/-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
	// JWTs: `eyJ<header>.eyJ<payload>.<signature>` (both leading segments are
	// base64url of a `{"` object, which makes this highly distinctive).
	/\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
	// Authorization-header substrings: `Bearer <token>`, `Basic <token>`, `Token <token>`
	/\b(?:Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{12,}/gi,
	// OpenAI / Anthropic API keys
	/\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}/g,
	// Stripe secret/restricted/publishable keys (`sk_live_…`, `rk_test_…`, …)
	/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/g,
	// Google API keys
	/\bAIza[0-9A-Za-z_-]{35}\b/g,
	// Slack tokens (xoxb, xoxp, xoxa, xoxr, xoxs, xoxo)
	/\bxox[abprso]-[A-Za-z0-9-]{10,}/g,
	// GitHub tokens (ghp, ghs, gho, ghr, ghu)
	/\bgh[psoru]_[A-Za-z0-9]{20,}/g,
	// GitHub fine-grained personal access tokens
	/\bgithub_pat_[A-Za-z0-9_]{22,}/g,
	// AWS access key id
	/\bAKIA[0-9A-Z]{16}\b/g,
	// Telegram bot token (`<bot id>:<35-char secret>`, also inside `/bot…/` URLs)
	/\b(?:bot)?\d{8,10}:[A-Za-z0-9_-]{35}\b/g,
	// Credentials embedded in a URL: `scheme://user:password@` — redact the userinfo.
	/(?<=:\/\/)[^\s:/@]+:[^\s:/@]+(?=@)/g,
	// JSON-shaped `"key": "value"` — matches the quoted field as a whole.
	// Run before the loose pattern so nested objects like
	// `{"credentials": {"apiKey": "..."}}` don't have the outer key consume
	// the inner key on its way to a non-quoted (object) value. The value
	// body uses the unrolled JSON-string idiom `(?:[^"\\\r\n]|\\.)*`: the
	// negated class excludes the backslash so a backslash can only be consumed
	// by the `\\.` escape branch. Keep the two alternatives disjoint (don't
	// fold `\\` back into the negated class) — that keeps every run of
	// backslashes to a single, unambiguous parse, so matching stays fast on any
	// input. An escaped quote inside the value (`"abc\"def"`) still doesn't end
	// the match early, via the escape branch. The negative lookahead skips
	// values that are already a `[redacted]` / `[REDACTED]` / typed
	// `[REDACTED:<type>:<index>]` placeholder so this stays idempotent when
	// chained behind upstream object-walking redaction (langsmith trace
	// payloads, mcp-browser markers).
	new RegExp(
		`"(?:${SECRET_KEYS})"\\s*:\\s*"(?!\\[(?:redacted|REDACTED)(?::[^"\\]]*)?\\]")(?:[^"\\\\\\r\\n]|\\\\.)*"`,
		'gi',
	),
	// JS-object-shaped `'key': 'value'`
	new RegExp(
		`'(?:${SECRET_KEYS})'\\s*:\\s*'(?!\\[(?:redacted|REDACTED)(?::[^'\\]]*)?\\]')(?:[^'\\\\\\r\\n]|\\\\.)*'`,
		'gi',
	),
	// Generic `password=...` / `api_key=...` / `secret=...` style assignments.
	// The negative lookbehind skips a keyword sitting at the `<type>` position of
	// an upstream `[REDACTED:<type>:<index>]` marker (e.g. mcp-browser output), so
	// the `secret:1]` tail isn't re-matched into a nested `[REDACTED:[REDACTED]`.
	// Checking only the `[REDACTED:` prefix suffices: inside a marker a keyword can
	// only start a `\b` match right after that prefix — every other keyword-shaped
	// substring is preceded by `_` (snake_case type slug) or a digit, so no word
	// boundary opens there. The value lookahead skips values that are already a
	// redaction placeholder (bracketed, typed, or URL-safe bare form) — the same
	// idempotency convention as the quoted forms.
	new RegExp(
		`(?<!\\[(?:redacted|REDACTED):)\\b(?:${SECRET_KEYS})\\s*[:=]\\s*(?!\\[?(?:redacted|REDACTED)\\b)\\S+`,
		'gi',
	),
];

export function scrubSecretsInText(input: string): string {
	let out = input;
	for (const pattern of SECRET_VALUE_PATTERNS) {
		out = out.replace(pattern, '[REDACTED]');
	}
	return out;
}
