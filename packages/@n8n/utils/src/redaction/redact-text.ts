import type { PiiDetectionType, PiiPatternTable, RedactionCategory } from './pii-patterns';
import { resolvePatterns } from './pii-patterns';

export const DEFAULT_PLACEHOLDER = '[REDACTED]';

export interface RedactionOptions {
	/** Scan for credential/secret patterns. Defaults to `true`. */
	secrets?: boolean;
	/** PII categories to scan for. Defaults to none. */
	detect?: readonly PiiDetectionType[];
	/** Replacement text for a match. Defaults to `[REDACTED]`. */
	placeholder?: string;
	/** For `url` matches, keep origin + path + query names and redact the
	 *  value-bearing parts: query values, token-like path segments (webhook
	 *  secrets), userinfo, fragment. Off by default so guardrail behavior is
	 *  unchanged; telemetry/trace scrubbing opts in. */
	preserveUrlStructure?: boolean;
	/** Replace values under secret-shaped object keys. */
	redactSensitiveKeys?: boolean;
	/**
	 * Detection table to resolve PII categories against. Defaults to the
	 * browser-safe {@link PII_PATTERNS}; `@n8n/agents` passes a table whose
	 * `crypto-wallet` entry carries the Node-only Base58Check validator.
	 */
	piiPatterns?: PiiPatternTable;
}

export interface RedactionResult {
	/** The input with every detected match replaced by the placeholder. */
	text: string;
	/** One entry per replaced match (category only — never the value). */
	matches: Array<{ category: RedactionCategory }>;
}

/**
 * Redact secret/PII patterns from a complete string. Pure and idempotent —
 * already-redacted placeholders are left untouched by the underlying patterns.
 */
export function redactText(input: string, opts: RedactionOptions = {}): RedactionResult {
	const placeholder = opts.placeholder ?? DEFAULT_PLACEHOLDER;
	const patterns = resolvePatterns(
		{
			secrets: opts.secrets ?? true,
			detect: opts.detect ?? [],
		},
		opts.piiPatterns,
	);
	// In preserve mode the url pass runs FIRST: it rewrites URLs with a URL-safe
	// placeholder before other patterns can plant one containing `]` mid-URL —
	// `]` stops the url regex, which would hide the URL's tail (and any secrets
	// in it) from this pass entirely.
	const ordered = opts.preserveUrlStructure
		? [
				...patterns.filter((pattern) => pattern.category === 'url'),
				...patterns.filter((pattern) => pattern.category !== 'url'),
			]
		: patterns;

	const matches: Array<{ category: RedactionCategory }> = [];
	let text = input;

	for (const pattern of ordered) {
		// `replace` with a global regex scans from 0 and resets lastIndex, so the
		// shared precompiled regex is safe to reuse across calls.
		text = text.replace(pattern.regex, (match) => {
			if (pattern.validate && !pattern.validate(match)) return match;
			if (opts.preserveUrlStructure && pattern.category === 'url') {
				const rebuilt = stripUrlSensitiveParts(match, placeholder);
				if (rebuilt !== match) matches.push({ category: pattern.category });
				return rebuilt;
			}
			matches.push({ category: pattern.category });
			return placeholder;
		});
	}

	return { text, matches };
}

/** True for a path segment that looks like an embedded token — webhook-style
 *  services (Slack/Discord/Telegram, …) carry their secret as a path segment.
 *  Shape-based on purpose: per-service URL grammars don't scale across hundreds
 *  of integrations. Conservative: words, readable slugs and digit-only ids are
 *  kept. */
function isTokenLikeSegment(segment: string): boolean {
	if (segment.length >= 16 && /[A-Za-z]/.test(segment) && /\d/.test(segment)) return true;
	// Long single-class opaque blob (e.g. a letters-only token) — real words stay
	// shorter and readable slugs contain separators.
	return segment.length >= 24 && /^[A-Za-z]+$/.test(segment);
}

/** Keep origin + path (token-like segments redacted) + query names; redact
 *  query values, drop userinfo and fragment. The replacement is URL-safe (no
 *  `]`, which the url regex stops at) so re-scrubbing is stable. Unparseable ⇒
 *  fully redacted. */
function stripUrlSensitiveParts(match: string, placeholder: string): string {
	const urlPlaceholder = placeholder.replace(/[^A-Za-z0-9_.~-]/g, '') || 'REDACTED';
	try {
		const url = new URL(match);
		const pathname = url.pathname
			.split('/')
			.map((segment) => (isTokenLikeSegment(segment) ? urlPlaceholder : segment))
			.join('/');
		const names = [...url.searchParams.keys()];
		const query =
			names.length > 0
				? `?${names.map((name) => `${encodeURIComponent(name)}=${urlPlaceholder}`).join('&')}`
				: '';
		return `${url.origin}${pathname}${query}`;
	} catch {
		return placeholder;
	}
}

/**
 * Find the `[start, end)` ranges of every (validated) match in `input`. Used by
 * the streaming redactor to avoid emitting through the middle of a complete
 * match that contains internal whitespace (e.g. a spaced credit-card number).
 */
export function findMatchRanges(
	input: string,
	opts: RedactionOptions = {},
): Array<[number, number]> {
	const patterns = resolvePatterns(
		{
			secrets: opts.secrets ?? true,
			detect: opts.detect ?? [],
		},
		opts.piiPatterns,
	);

	const ranges: Array<[number, number]> = [];
	for (const pattern of patterns) {
		const { regex } = pattern;
		// Reset before the scan loop; reusing the shared global regex is safe
		// because usage is synchronous and the loop always runs to completion.
		regex.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(input)) !== null) {
			if (match[0].length === 0) {
				regex.lastIndex++;
				continue;
			}
			if (pattern.validate && !pattern.validate(match[0])) continue;
			ranges.push([match.index, match.index + match[0].length]);
		}
	}
	return ranges;
}

const MAX_DEEP_DEPTH = 8;
const SENSITIVE_KEY_PATTERN =
	/(api[_-]?key|private[_-]?key|authorization|bearer|cookie|credentials?|password|secret|access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?token|auth[_-]?token|(?:^|[._-])token$)/i;

export interface DeepRedactionResult {
	value: unknown;
	matches: Array<{ category: RedactionCategory }>;
}

/**
 * Recursively redact string values inside an arbitrary JSON-like value
 * (tool results, structured payloads). Object keys are left intact; only
 * string values are scanned. Recursion is depth-bounded as a cheap guard
 * against pathological/cyclic structures.
 */
export function redactDeep(
	value: unknown,
	opts: RedactionOptions = {},
	depth = 0,
): DeepRedactionResult {
	return redactDeepValue(value, opts, depth);
}

function redactDeepValue(
	value: unknown,
	opts: RedactionOptions,
	depth: number,
	key?: string,
): DeepRedactionResult {
	if (opts.redactSensitiveKeys && key && SENSITIVE_KEY_PATTERN.test(key)) {
		return { value: opts.placeholder ?? DEFAULT_PLACEHOLDER, matches: [{ category: 'secret' }] };
	}

	if (typeof value === 'string') {
		const { text, matches } = redactText(value, opts);
		return { value: text, matches };
	}

	// Fail closed at the recursion bound: a subtree we refuse to walk is withheld
	// rather than passed through unscanned. Real payloads don't nest this deep,
	// so the only things reaching here are pathological or cyclic.
	if (depth >= MAX_DEEP_DEPTH) {
		if (value !== null && typeof value === 'object') {
			return { value: opts.placeholder ?? DEFAULT_PLACEHOLDER, matches: [{ category: 'secret' }] };
		}
		return { value, matches: [] };
	}

	if (Array.isArray(value)) {
		const matches: Array<{ category: RedactionCategory }> = [];
		const next = value.map((item) => {
			const result = redactDeepValue(item, opts, depth + 1, key);
			matches.push(...result.matches);
			return result.value;
		});
		return { value: next, matches };
	}

	if (value !== null && typeof value === 'object') {
		const matches: Array<{ category: RedactionCategory }> = [];
		const next: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value)) {
			const result = redactDeepValue(item, opts, depth + 1, key);
			matches.push(...result.matches);
			next[key] = result.value;
		}
		return { value: next, matches };
	}

	return { value, matches: [] };
}
