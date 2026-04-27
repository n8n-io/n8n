import { Tool } from '@n8n/agents';
import type { BuiltTool, CredentialProvider, InterruptibleToolContext } from '@n8n/agents';
import {
	ASK_LLM_TOOL_NAME,
	askLlmInputSchema,
	askLlmResumeSchema,
	type AskLlmInput,
	type AskLlmResume,
} from '@n8n/api-types';

import { LLM_PROVIDER_DEFAULTS } from './llm-provider-defaults';

export interface AskLlmToolDeps {
	credentialProvider: CredentialProvider;
}

export function buildAskLlmTool(deps: AskLlmToolDeps): BuiltTool {
	return new Tool(ASK_LLM_TOOL_NAME)
		.description(
			'Show a model + credential picker card in the chat UI and suspend until the user ' +
				'selects a provider, model and credential. Call AT MOST ONCE per build turn unless ' +
				'the user explicitly asks to change the model. ' +
				'After resume: set model = "{provider}/{model}" and credential = credentialName ' +
				'via write_config or patch_config. Auto-resolves without rendering a card when the ' +
				'user has exactly one LLM-provider credential.',
		)
		.input(askLlmInputSchema)
		.suspend(askLlmInputSchema)
		.resume(askLlmResumeSchema)
		.handler(
			async (input: AskLlmInput, ctx: InterruptibleToolContext<AskLlmInput, AskLlmResume>) => {
				if (ctx.resumeData !== undefined) return ctx.resumeData;
				const all = await deps.credentialProvider.list();
				// Keep only credentials whose type maps to a known LLM provider.
				const llmCreds = all.filter((c) => LLM_PROVIDER_DEFAULTS[c.type]);
				// Auto-resolve only when there's exactly one — if the user has
				// multiple LLM credentials (or two of the same type), the choice is
				// real and the card must render.
				if (llmCreds.length === 1) {
					const cred = llmCreds[0];
					const def = LLM_PROVIDER_DEFAULTS[cred.type];
					return {
						provider: def.provider,
						model: def.defaultModel,
						credentialId: cred.id,
						credentialName: cred.name,
					};
				}
				return await ctx.suspend(input);
			},
		)
		.build();
}
