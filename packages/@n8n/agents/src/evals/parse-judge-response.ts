import type { EvalScore } from '../types';

/**
 * Parse an LLM judge response into an EvalScore (pass/fail).
 * Handles JSON wrapped in markdown fences, plain JSON, or raw text.
 */
export function parseJudgeResponse(text: string): EvalScore {
	// Strip markdown code fences if present: ```json ... ``` or ``` ... ```
	const stripped = text
		.replace(/^```(?:json)?\s*\n?/i, '')
		.replace(/\n?```\s*$/i, '')
		.trim();

	try {
		const parsed = JSON.parse(stripped) as { pass?: boolean; score?: number; reasoning?: string };
		// Support both { pass: true } and legacy { score: 0.8 } formats
		const pass = parsed.pass ?? (parsed.score !== undefined ? parsed.score >= 0.7 : false);
		return {
			pass,
			reasoning: parsed.reasoning ?? stripped,
		};
	} catch {
		// Fallback: detect pass/fail from plain text or malformed JSON
		const lowerText = stripped.toLowerCase();
		const hasPassTrue = lowerText.includes('"pass": true') || lowerText.includes('"pass":true');
		const hasFailFalse = lowerText.includes('"pass": false') || lowerText.includes('"pass":false');
		// If no JSON-like pattern, check for plain-text "pass" or "fail" keywords
		const pass =
			hasPassTrue || (!hasFailFalse && /\bpass\b/i.test(stripped) && !/\bfail\b/i.test(stripped));
		return { pass, reasoning: stripped };
	}
}
