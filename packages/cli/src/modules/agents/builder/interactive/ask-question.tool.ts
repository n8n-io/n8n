import { Tool } from '@n8n/agents';
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
			'Show a multiple-choice card in the chat UI and suspend until the user picks an ' +
				'answer. Use when the request is ambiguous and the answer is one (or more) of a ' +
				'known list of options. Do NOT use for free-text input — ask in prose for that. ' +
				'Returns { values: string[] } with the selected values.',
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
				// Single-option questions have no actual choice — auto-pick so the
				// LLM doesn't render a card the user can only confirm.
				if (input.options.length === 1) {
					return { values: [input.options[0].value] };
				}
				return await ctx.suspend(input);
			},
		)
		.build();
}
