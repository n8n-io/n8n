import { z } from 'zod';

import type { SemanticJudgeFn } from './types';
import { createEvalAgent, extractText, HAIKU_MODEL } from '../../src/utils/eval-agents';

const verdictSchema = z.object({
	verdicts: z.array(
		z.object({
			rowIndex: z.number().int(),
			passed: z.boolean(),
			reason: z.string().optional(),
		}),
	),
});

const SYSTEM_PROMPT = [
	'You are evaluating whether dataset rows satisfy a stated quality criterion.',
	'For each sample, return passed=true if the value clearly meets the criterion, otherwise passed=false with a short reason.',
	'Be strict but fair. Reasons must be concise (one sentence).',
	'Respond with JSON only — no prose, no markdown — using shape: { "verdicts": [{ "rowIndex": number, "passed": boolean, "reason"?: string }] }',
].join('\n');

export function createDefaultJudge(): SemanticJudgeFn {
	const agent = createEvalAgent('eval-data-judge', {
		model: HAIKU_MODEL,
		instructions: SYSTEM_PROMPT,
	});

	return async ({ column, criterion, samples }) => {
		const userPrompt = [
			`Column: ${column}`,
			`Criterion: ${criterion}`,
			'Samples:',
			...samples.map(({ rowIndex, value }) => `- rowIndex=${rowIndex}: ${stringify(value)}`),
		].join('\n');

		const response = await agent.generate([
			{ role: 'user' as const, content: [{ type: 'text' as const, text: userPrompt }] },
		]);
		const text = extractText(response).trim();
		const stripped = stripCodeFences(text);

		const parsed = verdictSchema.safeParse(safeParseJson(stripped));
		if (!parsed.success) {
			return {
				failures: samples.map((sample) => ({
					rowIndex: sample.rowIndex,
					reason: 'Judge response could not be parsed as JSON.',
				})),
			};
		}

		return {
			failures: parsed.data.verdicts
				.filter((verdict) => !verdict.passed)
				.map((verdict) => ({
					rowIndex: verdict.rowIndex,
					reason: verdict.reason ?? 'No reason provided.',
				})),
		};
	};
}

function stringify(value: unknown): string {
	if (value === null) return 'null';
	if (typeof value === 'string') return JSON.stringify(value);
	return JSON.stringify(value);
}

function safeParseJson(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return null;
	}
}

function stripCodeFences(text: string): string {
	const match = text.match(/^```(?:json)?\s*([\s\S]*?)```$/);
	return match ? match[1].trim() : text;
}
