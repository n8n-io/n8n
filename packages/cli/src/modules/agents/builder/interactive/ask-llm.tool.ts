import { Tool } from '@n8n/agents';
import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import {
	ASK_LLM_TOOL_NAME,
	askLlmInputSchema,
	askLlmResumeSchema,
	type AskLlmInput,
	type AskLlmResume,
} from '@n8n/api-types';

export function buildAskLlmTool(): BuiltTool {
	return new Tool(ASK_LLM_TOOL_NAME)
		.description(
			'Show a model + credential picker card in the chat UI and suspend until the user ' +
				'selects a provider, model and credential. Call AT MOST ONCE per build turn unless ' +
				'the user explicitly asks to change the model. ' +
				'After resume: set model = "{provider}/{model}" and credential = credentialName ' +
				'via write_config or patch_config.',
		)
		.input(askLlmInputSchema)
		.suspend(askLlmInputSchema)
		.resume(askLlmResumeSchema)
		.handler(
			async (input: AskLlmInput, ctx: InterruptibleToolContext<AskLlmInput, AskLlmResume>) => {
				if (ctx.resumeData === undefined) {
					return await ctx.suspend(input);
				}
				return ctx.resumeData;
			},
		)
		.build();
}
