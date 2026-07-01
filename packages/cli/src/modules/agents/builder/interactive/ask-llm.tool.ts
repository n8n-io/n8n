import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
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
				'selects a provider, model and credential. ' +
				'After resume: set model = "{provider}/{model}" and credential = credentialId ' +
				'via write_config or patch_config.',
		)
		.systemInstruction(
			'Never ask the user in plain text to choose, confirm, configure, or change the agent ' +
				'main LLM, provider, model, or main LLM credential. If the user needs to make that ' +
				'choice, call ask_llm so the picker card is shown.',
		)
		.input(askLlmInputSchema)
		.suspend(askLlmInputSchema)
		.resume(askLlmResumeSchema)
		.handler(
			async (input: AskLlmInput, ctx: InterruptibleToolContext<AskLlmInput, AskLlmResume>) => {
				if (ctx.resumeData !== undefined) return ctx.resumeData;
				return await ctx.suspend(input);
			},
		)
		.build();
}
