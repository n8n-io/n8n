// ---------------------------------------------------------------------------
// Secret redaction + safe stringification for eval artifacts.
//
// Tool-call traces (args, results, errors) are persisted to disk via the
// chunk log and the per-run results.jsonl. Upstream tools may pass auth
// tokens or credentials in their input/output, so we walk the value tree
// and replace anything under a secret-shaped key before it lands on disk.
// ---------------------------------------------------------------------------

const SECRET_KEY_PATTERNS: readonly RegExp[] = [
	/password/i,
	/passwd/i,
	/secret/i,
	/token/i,
	/api[-_]?key/i,
	/access[-_]?key/i,
	/private[-_]?key/i,
	/authorization/i,
	/^auth$/i,
	/credential/i,
	/cookie/i,
	/bearer/i,
	/session[-_]?id/i,
];

function isSecretKey(key: string): boolean {
	return SECRET_KEY_PATTERNS.some((p) => p.test(key));
}

// Agent-supplied credential recipes (`credentialHints` on workflows.setup,
// `setupHint` on credentials.setup) are secret-free by contract: the secret
// slots are `{{placeholder}}` markers (enforced at the tool boundary) and the
// statics are things like header names. Blanket key-redaction (`/credential/i`,
// `/authorization/i`) would blind the eval judge to them, so traverse hints
// with inline content masking only — defense-in-depth against a misbehaving
// model, while markers and statics stay readable.
const HINT_KEYS = new Set(['credentialHints', 'setupHint']);

const TEMPLATE_MARKER = /\{\{\s*[\w.-]+\s*\}\}/g;

// A secret-shaped key (a template's `Authorization`/`X-Api-Key` header) should
// hold only `{{marker}}`s plus benign scaffolding: short scheme words (`Bearer`,
// `Key`, vendor schemes like `SSWS`) and separators. Any other residue — even a
// literal token sitting next to a valid marker — reads as a leaked secret.
function isMarkerOnlyValue(value: string): boolean {
	const staticParts = value.split(TEMPLATE_MARKER);
	if (staticParts.length === 1) return false; // no marker at all
	return staticParts
		.flatMap((part) => part.split(/[\s:=,;]+/))
		.every((word) => /^[A-Za-z]{0,12}$/.test(word));
}

function redactHintValue(value: unknown, depth: number, key?: string): unknown {
	if (depth > 10 || value === null || value === undefined) return value;
	if (typeof value === 'string') {
		// Content masking can't spot an arbitrary token, so anything beyond
		// marker-plus-scaffolding under a secret-shaped key is redacted wholesale.
		if (key !== undefined && isSecretKey(key) && !isMarkerOnlyValue(value)) {
			return '[REDACTED]';
		}
		return redactSecretsInText(value);
	}
	if (Array.isArray(value)) {
		return value.map((entry) => redactHintValue(entry, depth + 1, key));
	}
	if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			out[k] = redactHintValue(v, depth + 1, k);
		}
		return out;
	}
	return value;
}

/**
 * Recursively replaces values under secret-shaped keys with `'[REDACTED]'`.
 * Only walks plain objects and arrays — class instances (Error, Date, etc.)
 * are returned as-is so the caller can stringify them through their default
 * representation.
 */
export function redactSecrets(value: unknown, depth = 0): unknown {
	if (depth > 10 || value === null || value === undefined) return value;
	if (Array.isArray(value)) {
		return value.map((entry) => redactSecrets(entry, depth + 1));
	}
	if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			out[k] = HINT_KEYS.has(k)
				? redactHintValue(v, depth + 1)
				: isSecretKey(k)
					? '[REDACTED]'
					: redactSecrets(v, depth + 1);
		}
		return out;
	}
	return value;
}

// Content-based redaction: `redactSecrets` only masks secret-shaped keys, but a
// tool error arrives as a flat string where a token can sit inline. Order matters.
const SECRET_TEXT_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
	// Authorization header: keep the scheme word, mask the credential token.
	[
		/\b((?:proxy-)?authorization\s*[:=]\s*)((?:bearer|basic|digest|negotiate)\s+)?\S+/gi,
		'$1$2[REDACTED]',
	],
	// Standalone "Bearer <token>" / "Basic <creds>".
	[/\b(bearer|basic)\s+[\w.+/=~-]+/gi, '$1 [REDACTED]'],
	// Secret-shaped key/value pairs: "api_key=abc", '"token":"abc"'.
	[
		/\b(api[-_]?key|access[-_]?key|x-api-key|access[-_]?token|refresh[-_]?token|client[-_]?secret|private[-_]?key|secret|token|password|passwd|cookie|set-cookie|session[-_]?id)("?\s*[:=]\s*"?)[^\s"',&}]+/gi,
		'$1$2[REDACTED]',
	],
	// Bare well-known credential formats — recognizable with no key or scheme
	// around them. Length floors keep prose lookalikes (sk-learn, xoxo, the
	// AKIA prefix mentioned in text) unmatched.
	// OpenAI/Anthropic-style: sk-…, sk-ant-…, sk-proj-….
	[/\bsk-(?:[a-z0-9]+-)*[A-Za-z0-9_-]{16,}\b/g, '[REDACTED]'],
	// Slack tokens: xoxb-/xoxp-/xoxa-/xoxs-… plus app-level xapp-….
	[/\b(?:xox[a-z]|xapp)-[A-Za-z0-9-]{8,}\b/gi, '[REDACTED]'],
	// GitHub tokens: ghp_/gho_/ghu_/ghs_/ghr_ + fine-grained github_pat_.
	[/\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}\b/g, '[REDACTED]'],
	// AWS access key ids.
	[/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED]'],
];

/** Mask secrets embedded inline in free text (e.g. a token in a tool-error string). */
export function redactSecretsInText(text: string): string {
	return SECRET_TEXT_PATTERNS.reduce(
		(acc, [pattern, replacement]) => acc.replace(pattern, replacement),
		text,
	);
}

/**
 * Content-based pass over a value tree: applies `redactSecretsInText` to every
 * string leaf. Complements the key-based `redactSecrets` for payloads where a
 * token sits inline in a value under a non-secret-shaped key. Same walk rules
 * as `redactSecrets`: plain objects and arrays only, depth-capped.
 */
export function redactSecretsInTextDeep(value: unknown, depth = 0): unknown {
	if (depth > 10 || value === null || value === undefined) return value;
	if (typeof value === 'string') return redactSecretsInText(value);
	if (Array.isArray(value)) {
		return value.map((entry) => redactSecretsInTextDeep(entry, depth + 1));
	}
	if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			out[k] = redactSecretsInTextDeep(v, depth + 1);
		}
		return out;
	}
	return value;
}

/**
 * Truncates serializable values to a max stringified length, redacting
 * secrets first. Returns the redacted value when it fits, the truncated
 * string otherwise, or `'<unserializable>'` if `JSON.stringify` returns
 * `undefined` or throws (cycles, BigInt).
 */
export function truncate(value: unknown, max: number): unknown {
	if (value === null || value === undefined) return value;
	const safe = redactSecrets(value);
	try {
		const str = typeof safe === 'string' ? safe : JSON.stringify(safe);
		if (str === undefined) return '<unserializable>';
		if (str.length <= max) return safe;
		return str.substring(0, max) + '... [truncated]';
	} catch {
		return '<unserializable>';
	}
}

/**
 * Defensively stringifies a tool-error payload. Strings pass through
 * unchanged (modulo length cap); other values are redacted then JSON
 * stringified. Falls back to `String(value)` when `JSON.stringify` returns
 * `undefined` (e.g. a function) or throws (cycles, BigInt).
 */
export function stringifyError(value: unknown, max: number): string {
	if (typeof value === 'string') {
		return value.length > max ? value.slice(0, max) : value;
	}
	const safe = redactSecrets(value);
	let str: string;
	try {
		str = JSON.stringify(safe) ?? String(safe);
	} catch {
		str = String(safe);
	}
	return str.length > max ? str.slice(0, max) : str;
}
