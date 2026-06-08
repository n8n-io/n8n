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
		// Fresh regex per pass so `lastIndex` never leaks across calls.
		const regex = new RegExp(pattern.source, pattern.flags);
		text = text.replace(regex, (match) => {
			if (pattern.validate && !pattern.validate(match)) return match;
			matches.push({ category: pattern.category });
			return placeholder;
		});
	}

	return { text, matches };
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
