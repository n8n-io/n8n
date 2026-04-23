import { Tool } from '@n8n/agents';
import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import {
	ASK_CREDENTIAL_TOOL_NAME,
	askCredentialInputSchema,
	askCredentialResumeSchema,
	type AskCredentialInput,
	type AskCredentialResume,
} from '@n8n/api-types';

export function buildAskCredentialTool(): BuiltTool {
	return (
		new Tool(ASK_CREDENTIAL_TOOL_NAME)
			.description(
				'Show a credential picker card in the chat UI and suspend until the user selects ' +
					'a credential. Call ONCE per credential slot, BEFORE the write_config / patch_config ' +
					'that introduces the node tool. Returns { credentialId, credentialName } on success ' +
					'or { skipped: true } if the user dismissed the picker.',
			)
			.input(askCredentialInputSchema)
			// Suspend payload mirrors the input — the discriminator on the wire is
			// the tool name, not a separate `interactionType` field.
			.suspend(askCredentialInputSchema)
			.resume(askCredentialResumeSchema)
			.handler(
				async (
					input: AskCredentialInput,
					ctx: InterruptibleToolContext<AskCredentialInput, AskCredentialResume>,
				) => {
					if (ctx.resumeData === undefined) {
						return await ctx.suspend(input);
					}
					return ctx.resumeData;
				},
			)
			.build()
	);
}
