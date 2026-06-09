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
			out[k] = isSecretKey(k) ? '[REDACTED]' : redactSecrets(v, depth + 1);
		}
		return out;
	}
	return value;
}

// ---------------------------------------------------------------------------
// Content-based redaction for free text.
//
// `redactSecrets` only masks values under secret-shaped *keys*. Tool errors
// arrive pre-flattened to a string (an HTTP client serializing its request
// config/headers into the message), so a token can sit inline with no key to
// match. Scrub those by content — conservatively: only the value after a
// recognized secret marker is masked, so surrounding error context survives.
// Patterns run in order; the Authorization rule consumes the whole header
// value first so a "Bearer <token>" inside it isn't half-masked.
// ---------------------------------------------------------------------------

const SECRET_TEXT_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
	// "Authorization: Bearer xyz" / "authorization=<opaque>" — keep the key and any
	// scheme word, mask just the credential token so trailing context survives.
	[
		/\b((?:proxy-)?authorization\s*[:=]\s*)((?:bearer|basic|digest|negotiate)\s+)?\S+/gi,
		'$1$2[REDACTED]',
	],
	// Scheme-prefixed credentials standing on their own: "Bearer eyJ...", "Basic dXNlcg==".
	[/\b(bearer|basic)\s+[\w.+/=~-]+/gi, '$1 [REDACTED]'],
	// Secret-shaped key/value pairs: "api_key=abc", '"token":"abc"', "password: abc".
	[
		/\b(api[-_]?key|access[-_]?key|x-api-key|access[-_]?token|refresh[-_]?token|client[-_]?secret|private[-_]?key|secret|token|password|passwd|cookie|set-cookie|session[-_]?id)("?\s*[:=]\s*"?)[^\s"',&}]+/gi,
		'$1$2[REDACTED]',
	],
];

/**
 * Masks secret values embedded in a free-text string — complements
 * `redactSecrets` (key-based) for values that arrive inline with no key to
 * match, chiefly tool-error messages. Conservative: preserves the message
 * around each match so error context survives for the report and the judge.
 */
export function redactSecretsInText(text: string): string {
	return SECRET_TEXT_PATTERNS.reduce(
		(acc, [pattern, replacement]) => acc.replace(pattern, replacement),
		text,
	);
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
