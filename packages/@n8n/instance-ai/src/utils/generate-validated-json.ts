/**
 * One-shot "LLM returns a JSON object" helper for eval-agent calls: create the
 * agent, send the user text, strip markdown fences, parse, validate against a
 * zod schema. Never throws — callers own their fallback (and the schema-issue
 * details when they want to log them).
 *
 * Lives outside `eval-agents.ts` so tests can mock this module while the
 * helper's own tests mock `eval-agents`.
 */

import type { z } from 'zod';

import { createEvalAgent, extractText } from './eval-agents';

export type ValidatedJsonResult<T> =
	| { ok: true; data: T }
	| {
			ok: false;
			reason: 'generation_failed' | 'invalid_json' | 'schema_mismatch';
			issues?: z.ZodIssue[];
	  };

export interface GenerateValidatedJsonOptions<T> {
	model?: string;
	instructions: string;
	userText: string;
	schema: z.ZodType<T>;
}

function stripMarkdownFences(text: string): string {
	const trimmed = text.trim();
	const fencedMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
	return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

export async function generateValidatedJson<T>(
	agentName: string,
	options: GenerateValidatedJsonOptions<T>,
): Promise<ValidatedJsonResult<T>> {
	let text: string;
	try {
		const llm = createEvalAgent(agentName, {
			model: options.model,
			instructions: options.instructions,
		});
		const result = await llm.generate([
			{ role: 'user' as const, content: [{ type: 'text' as const, text: options.userText }] },
		]);
		text = extractText(result);
	} catch {
		return { ok: false, reason: 'generation_failed' };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(stripMarkdownFences(text));
	} catch {
		return { ok: false, reason: 'invalid_json' };
	}

	const validated = options.schema.safeParse(parsed);
	if (!validated.success) {
		return { ok: false, reason: 'schema_mismatch', issues: validated.error.issues };
	}
	return { ok: true, data: validated.data };
}
