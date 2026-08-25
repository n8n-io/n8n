import {
	findMatchRanges as findMatchRangesWith,
	redactDeep as redactDeepWith,
	redactText as redactTextWith,
	type DeepRedactionResult,
	type RedactionOptions,
	type RedactionResult,
} from '@n8n/utils/redaction/redact-text';

import { PII_PATTERNS } from './patterns';
import type { BuiltGuardrail, PiiDetectionType } from '../../types';

export { DEFAULT_PLACEHOLDER } from '@n8n/utils/redaction/redact-text';
export type { RedactionOptions, RedactionResult, DeepRedactionResult };

/**
 * The engine lives in `@n8n/utils` so the frontend can apply the same policy.
 * These wrappers bind it to the Node detection table (checksum-verified crypto
 * wallets); everything else is shared code.
 */
function withNodePatterns(opts: RedactionOptions): RedactionOptions {
	return { ...opts, piiPatterns: opts.piiPatterns ?? PII_PATTERNS };
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
	return redactTextWith(input, withNodePatterns(opts));
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
	return findMatchRangesWith(input, withNodePatterns(opts));
}

/**
 * Recursively redact string values inside an arbitrary JSON-like value
 * (tool results, structured payloads). Object keys are left intact; only
 * string values are scanned.
 */
export function redactDeep(
	value: unknown,
	opts: RedactionOptions = {},
	depth = 0,
): DeepRedactionResult {
	return redactDeepWith(value, withNodePatterns(opts), depth);
}
