import { extractJsonCandidate } from '@n8n/ai-utilities/llm-output';

import type { EvalScore } from '../types';

/** Reads a boolean verdict, or the string `"true"` / `"false"` in any case. */
function readPass(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') return value;
	if (typeof value !== 'string') return undefined;
	const lower = value.toLowerCase();
	if (lower === 'true' || lower === 'false') return lower === 'true';
	return undefined;
}

/**
 * Parse an LLM judge response into an EvalScore (pass/fail).
 * Handles JSON wrapped in markdown fences, plain JSON, or malformed JSON.
 *
 * A response without a readable verdict fails closed and is marked
 * `inconclusive`, so callers can tell "the judge said fail" from "the judge
 * gave no verdict". Keywords in free text are not a verdict: "does not pass"
 * contains "pass". The judge prompts require a JSON verdict.
 */
export function parseJudgeResponse(text: string): EvalScore {
	const stripped = extractJsonCandidate(text);

	let parsed: { pass?: unknown; score?: unknown; reasoning?: unknown } | undefined;
	try {
		const value: unknown = JSON.parse(stripped);
		if (typeof value === 'object' && value !== null) parsed = value;
	} catch {
		parsed = undefined;
	}

	if (parsed) {
		const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : stripped;
		const pass = readPass(parsed.pass);
		if (pass !== undefined) return { pass, reasoning };
		// Legacy format: { score: 0.8 }. Used only when `pass` is absent. An invalid
		// `pass` is not a verdict, and the score must not override it.
		if (parsed.pass === undefined && typeof parsed.score === 'number') {
			return { pass: parsed.score >= 0.7, reasoning };
		}
		return { pass: false, reasoning, inconclusive: true };
	}

	// Malformed JSON can still carry an explicit verdict, e.g. a truncated reply.
	// Conflicting verdicts are not a verdict.
	const lowerText = stripped.toLowerCase();
	const hasPassTrue = lowerText.includes('"pass": true') || lowerText.includes('"pass":true');
	const hasPassFalse = lowerText.includes('"pass": false') || lowerText.includes('"pass":false');
	if (hasPassTrue !== hasPassFalse) return { pass: hasPassTrue, reasoning: stripped };
	return { pass: false, reasoning: stripped, inconclusive: true };
}
