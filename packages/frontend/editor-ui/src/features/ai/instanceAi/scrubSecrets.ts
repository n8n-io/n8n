// Local duplicate of `scrubSecretsInText` from `@n8n/instance-ai`. The shared
// function lives in a backend-only package today and can't be imported from
// editor-ui. Lifting it into `@n8n/utils` so both sides share one source of
// truth is tracked in INS-391 — this file will be deleted then.

const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
	/\b(?:Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{12,}/gi,
	/\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}/g,
	/\bxox[abprso]-[A-Za-z0-9-]{10,}/g,
	/\bgh[psoru]_[A-Za-z0-9]{20,}/g,
	/\bAKIA[0-9A-Z]{16}\b/g,
	/\b(?:password|passwd|secret|api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?token|auth[_-]?token)\s*[:=]\s*\S+/gi,
];

export function scrubSecretsInText(input: string): string {
	let out = input;
	for (const pattern of SECRET_VALUE_PATTERNS) {
		out = out.replace(pattern, '[REDACTED]');
	}
	return out;
}
