import { redactMatches } from '@n8n/ai-utilities/guardrails';

import type { GuardrailResult } from '../actions/types';

/** Masks the PII matches the preflight checks reported. Shared implementation in `@n8n/ai-utilities`. */
export function applyPreflightModifications(
	data: string,
	preflightResults: GuardrailResult[],
): string {
	// The node's `text` parameter can arrive as a non-string when an
	// expression yields `null` or a number; pass it through untouched.
	return typeof data === 'string' ? redactMatches(data, preflightResults) : data;
}
