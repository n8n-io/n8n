/**
 * Replace common credential patterns in free-form text with `[REDACTED]`.
 *
 * Used before persisting user-supplied text (telemetry excerpts, eval report
 * HTML) where keys/tokens accidentally pasted into prompts or command lines
 * could otherwise leak downstream.
 *
 * Conservative by design: matches well-known prefixed tokens and explicit
 * `key=value` pairs only. We don't attempt to redact arbitrary long opaque
 * strings — false positives on file paths, IDs, or base64 payloads would
 * make the output unreadable.
 */
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
	// Generic `password=...` / `api_key=...` / `secret=...` style assignments
	/\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*\S+/gi,
];

export function scrubSecretsInText(input: string): string {
	let out = input;
	for (const pattern of SECRET_VALUE_PATTERNS) {
		out = out.replace(pattern, '[REDACTED]');
	}
	return out;
}
