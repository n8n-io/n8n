/**
 * Tiny classifier that maps a user's free-text reply onto one of the offered
 * choice options, or returns `new-intent` when the reply doesn't fit any of
 * them (the orchestrator then inserts a new checklist item to handle it).
 *
 * Uses a small/fast model — this is a one-shot structured-output call, not
 * an agent loop. We rely on `.structuredOutput()` from @n8n/agents.
 */

import { Agent } from '@n8n/agents';
import { z } from 'zod';

import type { HitlChoiceOption } from './hitl-broker';

const classifierOutputSchema = z.object({
	match: z.enum(['option', 'new-intent', 'reject']),
	chosenOptionId: z.string().optional(),
	reasoning: z.string(),
	newIntentSummary: z.string().optional(),
});

export type ClassifierOutput = z.infer<typeof classifierOutputSchema>;

export interface ClassifyOptions {
	model: string;
	question: string;
	options: HitlChoiceOption[];
	freeText: string;
}

export async function classifyFreeTextChoice(opts: ClassifyOptions): Promise<ClassifierOutput> {
	const optionsList = opts.options
		.map((o, idx) => `${idx + 1}. id=${o.id} — ${o.label}`)
		.join('\n');

	const instructions = `You are a routing classifier. Given a multiple-choice question
that was asked of a user, and the user's free-text reply, decide whether the
reply matches one of the offered options, expresses a new intent that doesn't
match any of them, or should be rejected (off-topic / refusal).

Output strictly the structured JSON object — no prose.

- "option" + chosenOptionId — when the reply clearly maps to one of the choices.
  Use the option id exactly as listed.
- "new-intent" + newIntentSummary — when the reply describes something the
  options don't cover. Summarize the new intent in one short sentence.
- "reject" — when the reply is empty, off-topic, or refuses to answer.`;

	const agent = new Agent('inc-intent-classifier')
		.model(opts.model)
		.instructions(instructions)
		.structuredOutput(classifierOutputSchema);

	const userPrompt = `Question: ${opts.question}\n\nOptions:\n${optionsList}\n\nUser reply: ${opts.freeText}`;

	const result = await agent.generate(userPrompt);
	const parsed = (result as { structuredOutput?: ClassifierOutput }).structuredOutput;
	if (!parsed) {
		return {
			match: 'reject',
			reasoning: 'Classifier returned no structured output',
		};
	}
	return parsed;
}
