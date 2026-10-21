import { extractJsonCandidate } from '@n8n/ai-utilities/llm-output';

import type { EvalScore } from '../types';

/**
 * Parse an LLM judge response into an EvalScore (pass/fail).
 * Handles JSON wrapped in markdown fences, plain JSON, or malformed JSON.
 * The judge prompts require a JSON verdict, so a reply without one fails.
 */
export function parseJudgeResponse(text: string): EvalScore {
	const stripped = extractJsonCandidate(text);

	try {
		const parsed = JSON.parse(stripped) as { pass?: unknown; score?: unknown; reasoning?: unknown };
		const parsedPass = typeof parsed.pass === 'string' ? parsed.pass.toLowerCase() : parsed.pass;
		let pass: boolean;
		if (typeof parsedPass === 'boolean') {
			pass = parsedPass;
		} else if (parsedPass === 'true' || parsedPass === 'false') {
			pass = parsedPass === 'true';
		} else if (parsedPass !== undefined) {
			// An invalid pass value is not a verdict. Do not fall back to the score.
			pass = false;
		} else {
			// Support the legacy { score: 0.8 } format.
			pass = typeof parsed.score === 'number' && parsed.score >= 0.7;
		}
		return {
			pass,
			reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : stripped,
		};
	} catch {
		// Fallback: detect pass/fail from plain text or malformed JSON
		const lowerText = stripped.toLowerCase();
		const hasPassTrue = lowerText.includes('"pass": true') || lowerText.includes('"pass":true');
		const hasPassFalse = lowerText.includes('"pass": false') || lowerText.includes('"pass":false');
		// Fail closed when there is no explicit verdict or the verdicts conflict.
		return { pass: hasPassTrue && !hasPassFalse, reasoning: stripped };
	}
}
