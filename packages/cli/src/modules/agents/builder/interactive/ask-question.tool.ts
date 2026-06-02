import { Tool } from '@n8n/agents/tool';
import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import {
	ASK_QUESTION_TOOL_NAME,
	askQuestionInputSchema,
	askQuestionResumeSchema,
	type AskQuestionInput,
	type AskQuestionResume,
} from '@n8n/api-types';

export function buildAskQuestionTool(): BuiltTool {
	return new Tool(ASK_QUESTION_TOOL_NAME)
		.description(
			'Show a question card in the chat UI and suspend until the user answers. Use when ' +
				'the request is ambiguous. Pass `options` as the known choices; for an open-ended ' +
				'question pass an empty `options` array and the card shows only a freeform input. ' +
				'Do NOT add your own "Other" option — the card always includes a freeform field, so ' +
				'returned values may include user-entered text. Returns { values: string[] } with ' +
				'selected option values and/or freeform text.',
		)
		.input(askQuestionInputSchema)
		.suspend(askQuestionInputSchema)
		.resume(askQuestionResumeSchema)
		.handler(
			async (
				input: AskQuestionInput,
				ctx: InterruptibleToolContext<AskQuestionInput, AskQuestionResume>,
			) => {
				if (ctx.resumeData !== undefined) return ctx.resumeData;
				// A single concrete option has no real choice — auto-pick it so the
				// LLM doesn't render a card the user can only confirm. Open-ended
				// questions use an empty options array and still suspend (the card
				// renders a freeform-only input).
				if (input.options.length === 1) {
					return { values: [input.options[0].value] };
				}
				return await ctx.suspend(input);
			},
		)
		.build();
}
