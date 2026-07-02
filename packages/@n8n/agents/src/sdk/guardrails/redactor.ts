import type { RedactionCategory } from './patterns';
import { resolvePatterns } from './patterns';
import type { BuiltGuardrail, PiiDetectionType } from '../../types';

export const DEFAULT_PLACEHOLDER = '[REDACTED]';

export interface RedactionOptions {
	/** Scan for credential/secret patterns. Defaults to `true`. */
	secrets?: boolean;
	/** PII categories to scan for. Defaults to none. */
	detect?: readonly PiiDetectionType[];
	/** Replacement text for a match. Defaults to `[REDACTED]`. */
	placeholder?: string;
	/**
	 * For `url` matches, keep the routable identity (origin + pathname + query
	 * param names) and redact only the value-bearing parts (query values,
	 * userinfo, fragment). Off by default so guardrail behavior is unchanged.
	 * Telemetry/trace scrubbing enables it: whole-URL redaction destroys machine
	 * payloads (workflow definitions) without adding protection — secret
	 * patterns run first and already redact tokens inside URLs.
	 */
	preserveUrlStructure?: boolean;
}

export interface RedactionResult {
	/** The input with every detected match replaced by the placeholder. */
	text: string;
	/** One entry per replaced match (category only — never the value). */
	matches: Array<{ category: RedactionCategory }>;
}

/**
 * Map an `@n8n/agents` {@link BuiltGuardrail} to redaction options, so a future
 * `.outputGuardrail()` runtime enforcement can drive this engine directly.
 */
export function redactionOptionsFromGuardrail(guardrail: BuiltGuardrail): RedactionOptions {
	const detect = guardrail._config.detectionTypes;
	return {
		secrets: guardrail.guardType === 'pii' ? false : true,
		detect: Array.isArray(detect) ? (detect as PiiDetectionType[]) : [],
	};
}

/**
 * Redact secret/PII patterns from a complete string. Pure and idempotent —
 * already-redacted placeholders are left untouched by the underlying patterns.
 */
export function redactText(input: string, opts: RedactionOptions = {}): RedactionResult {
	const placeholder = opts.placeholder ?? DEFAULT_PLACEHOLDER;
	const patterns = resolvePatterns({
		secrets: opts.secrets ?? true,
		detect: opts.detect ?? [],
	});

	const matches: Array<{ category: RedactionCategory }> = [];
	let text = input;

	for (const pattern of patterns) {
		// `replace` with a global regex scans from 0 and resets lastIndex, so the
		// shared precompiled regex is safe to reuse across calls.
		text = text.replace(pattern.regex, (match) => {
			if (pattern.validate && !pattern.validate(match)) return match;
			if (opts.preserveUrlStructure && pattern.category === 'url') {
				// A placeholder inside the match ⇒ an earlier pattern (secrets,
				// email, …) already redacted part of this URL — leave it as-is,
				// which also keeps the pass idempotent. The URL regex's stop-set
				// can clip the placeholder's final char (e.g. `]`), so test for
				// the placeholder minus its last character.
				const placeholderMark = placeholder.length > 1 ? placeholder.slice(0, -1) : placeholder;
				if (match.includes(placeholderMark)) return match;
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

/**
 * Rebuild a matched URL keeping its routable identity (origin + pathname +
 * query param names) while redacting the value-bearing parts: query values,
 * userinfo (excluded from `origin`) and fragment. Unparseable matches fall
 * back to full redaction.
 */
function stripUrlSensitiveParts(match: string, placeholder: string): string {
	try {
		const url = new URL(match);
		const names = [...url.searchParams.keys()];
		const query =
			names.length > 0 ? `?${names.map((name) => `${name}=${placeholder}`).join('&')}` : '';
		return `${url.origin}${url.pathname}${query}`;
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
	const patterns = resolvePatterns({
		secrets: opts.secrets ?? true,
		detect: opts.detect ?? [],
	});

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
	if (typeof value === 'string') {
		const { text, matches } = redactText(value, opts);
		return { value: text, matches };
	}

	if (depth >= MAX_DEEP_DEPTH) return { value, matches: [] };

	if (Array.isArray(value)) {
		const matches: Array<{ category: RedactionCategory }> = [];
		const next = value.map((item) => {
			const result = redactDeep(item, opts, depth + 1);
			matches.push(...result.matches);
			return result.value;
		});
		return { value: next, matches };
	}

	if (value !== null && typeof value === 'object') {
		const matches: Array<{ category: RedactionCategory }> = [];
		const next: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value)) {
			const result = redactDeep(item, opts, depth + 1);
			matches.push(...result.matches);
			next[key] = result.value;
		}
		return { value: next, matches };
	}

	return { value, matches: [] };
}
