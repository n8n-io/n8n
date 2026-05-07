// ---------------------------------------------------------------------------
// Secret redactor for browser tool responses. Catches issuer-shaped
// credentials defined in ./patterns.ts; loose / structural detection can come
// in a separate redaction layer.
// ---------------------------------------------------------------------------

import type { CallToolResult } from '../types';
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

function marker(slug: string): string {
	return `[REDACTED:${slug}]`;
}

/**
 * Replace every issuer-shaped secret in the input with `[REDACTED:<slug>]`.
 * Element refs in aria-tree text (e.g. `@e123`) are not consumed by any
 * pattern, so they survive redaction and the agent can still target them.
 */
export function redactString(input: string): string {
	let output = input;
	for (const { slug, regex } of GLOBAL_PATTERNS) {
		// Reset lastIndex defensively — regex is stateful with the /g flag.
		regex.lastIndex = 0;
		if (regex.test(output)) {
			regex.lastIndex = 0;
			output = output.replace(regex, marker(slug));
		}
	}
	return output;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
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

/**
 * Redact a CallToolResult in-place: rewrites every `text` content block and
 * the `structuredContent` tree. `image` content blocks are left untouched
 * (regex on base64 PNG bytes is meaningless).
 */
export function redactCallToolResult(result: CallToolResult): CallToolResult {
	for (const item of result.content) {
		if (item.type === 'text' && typeof item.text === 'string') {
			item.text = redactString(item.text);
		}
	}
	if (result.structuredContent !== undefined) {
		const redacted = redactValue(result.structuredContent);
		if (isPlainObject(redacted)) {
			result.structuredContent = redacted;
		}
	}
	return result;
}
