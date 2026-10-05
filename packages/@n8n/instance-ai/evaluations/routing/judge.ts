// ---------------------------------------------------------------------------
// LLM judge for the routing grader.
//
// The grader calls the judge only when tool calls cannot decide the route: an
// `ask-user` card (the judge gives the steer) or a reply with no committing
// call (the judge gives the kind and the steer).
// ---------------------------------------------------------------------------

import { z } from 'zod';

import { SONNET_MODEL, createEvalAgent } from '../../src/utils/eval-agents';

export const judgeVerdictSchema = z.object({
	kind: z
		.enum(['answer', 'clarify', 'decline'])
		.describe('What the reply does: answer, clarify, or decline.'),
	steer: z
		.enum(['agent', 'workflow', 'both', 'none'])
		.describe('The artifact that the reply pushes the user toward.'),
	reason: z.string().describe('One sentence that justifies the steer.'),
});

export type JudgeVerdict = z.infer<typeof judgeVerdictSchema>;
export type Steer = JudgeVerdict['steer'];

export interface JudgeInput {
	/** `ask-user` when the Assistant showed a question card, `text` when it only wrote text. */
	mode: 'ask-user' | 'text';
	userMessage: string;
	askUserIntro?: string;
	askUserQuestions: Array<{ question: string; options: string[] }>;
	finalText: string;
}

const MAX_ATTEMPTS = 2;
const ATTEMPT_TIMEOUT_MS = 60_000;

const SYSTEM_PROMPT = `You grade one reply from the n8n Assistant. n8n is a workflow automation product. The Assistant can build two different artifacts:

- A workflow: a trigger and a fixed graph of steps (nodes) that runs the same way each time. A workflow can contain AI steps, including an "AI Agent" node. It is still a workflow.
- An Agent: a standalone n8n Agent made with the Agent Builder. It has instructions, tools, and memory. It holds conversations or owns an ongoing role that needs judgment. It can also run scheduled tasks.

The Assistant can also answer questions, do a one-time action, or ask the user for more detail.

You get the user's message and the Assistant's reply. The reply is a structured question card from the ask-user tool (questions with options), free text, or both. Return your judgment as structured output.

kind:
- answer: The reply deals with the request directly. It gives information, instructions, an explanation, or a result, and it does not need input from the user to continue. An answer that ends with an optional offer ("Do you want me to build this?") is still an answer.
- clarify: The main purpose of the reply is to get a decision or a missing detail from the user before the Assistant continues. It asks one or more questions and stops.
- decline: The reply refuses the request, or it says that it cannot help with it. It can suggest an alternative.

steer is the artifact that the reply pushes the user toward:
- agent: The reply recommends or assumes an Agent, or its questions only make sense for an Agent (persona, tone, what the Agent remembers, where it talks to people). It does not offer a workflow as a real option.
- workflow: The reply recommends or assumes a workflow, or its questions are about workflow details (trigger, schedule, nodes, steps, field mappings). It does not offer an Agent as a real option. A workflow with an AI Agent node is a workflow.
- both: The reply offers an Agent and a workflow as real options, and the user can pick either one. This applies also when the reply marks one of them as recommended.
- none: The reply pushes toward neither artifact. It asks about the goal or the use case without favouring one, it asks only about details that fit both (which app holds the data, which channel), or it only answers or declines.

Rules:
- Judge what the reply does, not what the reply should do.
- The words "agent", "assistant", or "bot" alone do not decide the steer. Decide from what the reply proposes to build.
- Consider the questions, the options, and the text together.
- reason: one sentence that quotes or names the part of the reply that decided the steer.`;

function renderQuestions(input: JudgeInput): string {
	const lines: string[] = [];
	if (input.askUserIntro) lines.push(`Intro: ${input.askUserIntro}`);
	for (const [index, question] of input.askUserQuestions.entries()) {
		lines.push(`${index + 1}. ${question.question}`);
		if (question.options.length === 0) lines.push('   (free-text answer, no options)');
		for (const option of question.options) lines.push(`   - ${option}`);
	}
	return lines.length > 0 ? lines.join('\n') : '(the card has no readable questions)';
}

export function renderJudgePrompt(input: JudgeInput): string {
	const parts = [`<user_message>\n${input.userMessage}\n</user_message>`];
	if (input.mode === 'ask-user') {
		parts.push(`<ask_user_card>\n${renderQuestions(input)}\n</ask_user_card>`);
	}
	parts.push(
		`<assistant_text>\n${input.finalText.trim() || '(no text)'}\n</assistant_text>`,
		input.mode === 'ask-user'
			? 'The Assistant showed the ask-user card above and waited for the answer, so the kind is clarify. Decide the steer from the questions, the options, and the text.'
			: 'The Assistant made no build or action call. Decide the kind and the steer from its text.',
	);
	return parts.join('\n\n');
}

/** Throws when no attempt returns a valid verdict. */
export async function judgeRoute(input: JudgeInput): Promise<JudgeVerdict> {
	let lastError = 'no attempt made';
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		const agent = createEvalAgent('eval-routing-judge', {
			instructions: SYSTEM_PROMPT,
			cache: true,
			model: SONNET_MODEL,
		}).structuredOutput(judgeVerdictSchema);
		try {
			const result = await agent.generate(renderJudgePrompt(input), {
				abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
			});
			const parsed = judgeVerdictSchema.safeParse(result.structuredOutput);
			if (parsed.success) return parsed.data;
			// generate() reports API failures in `result.error` instead of throwing.
			lastError =
				result.error instanceof Error
					? result.error.message
					: `no valid verdict (${JSON.stringify(result.error ?? null)})`;
		} catch (error) {
			lastError = error instanceof Error ? error.message : String(error);
		}
	}
	throw new Error(`Routing judge failed: ${lastError}`);
}
