// ---------------------------------------------------------------------------
// Single-shot redactor: replaces every issuer-shaped secret in a string or
// JSON value with `[REDACTED:<slug>]`. For streaming (delta-by-delta) inputs
// see `streaming-redactor.ts` — naive use of `redactString` on a stream of
// chunks would miss secrets that span chunk boundaries.
// ---------------------------------------------------------------------------

import { BUILTIN_PATTERNS, type SecretPattern } from './patterns';

const MAX_DEPTH = 10;

/** Compiled global-flagged regexes used during replacement. */
const GLOBAL_PATTERNS: ReadonlyArray<{ slug: string; regex: RegExp }> = BUILTIN_PATTERNS.map(
	(p: SecretPattern) => ({
		slug: p.slug,
		regex: new RegExp(
			p.pattern.source,
			p.pattern.flags.includes('g') ? p.pattern.flags : `${p.pattern.flags}g`,
		),
	}),
);

export function redactionMarker(slug: string): string {
	return `[REDACTED:${slug}]`;
}

/**
 * Replace every issuer-shaped secret in the input with `[REDACTED:<slug>]`.
 * Element refs in aria-tree text (e.g. `@e123`) are not consumed by any
 * pattern, so they survive redaction and the agent can still target them.
 */
export function redactString(input: string): string {
	return redactStringDetailed(input).output;
}

/** Like `redactString`, but also reports which pattern slugs fired. */
export function redactStringDetailed(input: string): { output: string; hits: string[] } {
	let output = input;
	const hits: string[] = [];
	for (const { slug, regex } of GLOBAL_PATTERNS) {
		// Reset lastIndex defensively — regex is stateful with the /g flag.
		regex.lastIndex = 0;
		if (regex.test(output)) {
			regex.lastIndex = 0;
			output = output.replace(regex, () => {
				hits.push(slug);
				return redactionMarker(slug);
			});
		}
	}
	return { output, hits };
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object') return false;
	return Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Walk a value tree and redact every string field. Plain objects and arrays
 * are recursed into; class instances (Error, Date, etc.) are returned as-is
 * to avoid corrupting their internal representation. Depth-capped at 10
 * (mirrors `evaluations/harness/redact.ts:redactSecrets`).
 */
export function redactValue(value: unknown, depth = 0): unknown {
	if (depth > MAX_DEPTH || value === null || value === undefined) return value;
	if (typeof value === 'string') return redactString(value);
	if (Array.isArray(value)) return value.map((entry) => redactValue(entry, depth + 1));
	if (isPlainObject(value)) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = redactValue(v, depth + 1);
		}
		return out;
	}
	return value;
}

/** Like `redactValue`, but also reports which pattern slugs fired anywhere
 *  in the tree. Hits are collected in tree-order. */
export function redactValueDetailed(
	value: unknown,
	depth = 0,
	collected: string[] = [],
): { output: unknown; hits: string[] } {
	if (depth > MAX_DEPTH || value === null || value === undefined) {
		return { output: value, hits: collected };
	}
	if (typeof value === 'string') {
		const { output, hits } = redactStringDetailed(value);
		collected.push(...hits);
		return { output, hits: collected };
	}
	if (Array.isArray(value)) {
		const out = value.map((entry) => redactValueDetailed(entry, depth + 1, collected).output);
		return { output: out, hits: collected };
	}
	if (isPlainObject(value)) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = redactValueDetailed(v, depth + 1, collected).output;
		}
		return { output: out, hits: collected };
	}
	return { output: value, hits: collected };
}
