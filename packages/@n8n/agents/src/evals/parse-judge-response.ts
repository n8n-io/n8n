import { extractJsonCandidate } from '@n8n/ai-utilities/llm-output';

import type { EvalScore } from '../types';

/**
 * Parse an LLM judge response into an EvalScore (pass/fail).
 * Handles JSON wrapped in markdown fences, plain JSON, or raw text.
 */
export function parseJudgeResponse(text: string): EvalScore {
	const stripped = extractJsonCandidate(text);

	try {
		const parsed = JSON.parse(stripped) as { pass?: unknown; score?: number; reasoning?: string };
		const parsedPass = typeof parsed.pass === 'string' ? parsed.pass.toLowerCase() : parsed.pass;
		let pass: boolean;
		if (typeof parsedPass === 'boolean') {
			pass = parsedPass;
		} else if (parsedPass === 'true' || parsedPass === 'false') {
			pass = parsedPass === 'true';
		} else {
			// Use the legacy score only when there is no valid pass value.
			pass = parsed.score !== undefined ? parsed.score >= 0.7 : false;
		}
		return {
			pass,
			reasoning: parsed.reasoning ?? stripped,
		};
	} catch {
		// Fallback: detect pass/fail from plain text or malformed JSON
		const lowerText = stripped.toLowerCase();
		const hasPassTrue = lowerText.includes('"pass": true') || lowerText.includes('"pass":true');
		const hasPassFalse = lowerText.includes('"pass": false') || lowerText.includes('"pass":false');
		if (hasPassTrue) return { pass: true, reasoning: stripped };
		if (hasPassFalse) return { pass: false, reasoning: stripped };
		// Fail closed when there is no explicit verdict.
		return { pass: false, reasoning: stripped };
	}
}
