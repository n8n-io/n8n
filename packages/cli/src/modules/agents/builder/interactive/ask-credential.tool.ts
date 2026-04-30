import { Tool } from '@n8n/agents';
import type { BuiltTool, CredentialProvider, InterruptibleToolContext } from '@n8n/agents';
import {
	ASK_CREDENTIAL_TOOL_NAME,
	askCredentialInputSchema,
	askCredentialResumeSchema,
	type AskCredentialInput,
	type AskCredentialResume,
} from '@n8n/api-types';

export interface AskCredentialToolDeps {
	credentialProvider: CredentialProvider;
}

export function buildAskCredentialTool(deps: AskCredentialToolDeps): BuiltTool {
	return (
		new Tool(ASK_CREDENTIAL_TOOL_NAME)
			.description(
				'Show a credential picker card in the chat UI and suspend until the user selects ' +
					'a credential. Call ONCE per credential slot, BEFORE the write_config / patch_config ' +
					'that introduces the node tool. Returns { credentialId, credentialName } on success ' +
					'or { skipped: true } if the user skips credential setup so the tool can be added ' +
					'without credentials. Auto-resolves without ' +
					'rendering a card when the user has exactly one credential of the requested type.',
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
					if (ctx.resumeData !== undefined) return ctx.resumeData;
					// If the user has exactly one credential of the requested type the
					// picker has nothing to ask — auto-resolve so the LLM doesn't render
					// a card the user can only confirm.
					const all = await deps.credentialProvider.list();
					const matching = all.filter((c) => c.type === input.credentialType);
					if (matching.length === 1) {
						return { credentialId: matching[0].id, credentialName: matching[0].name };
					}
					return await ctx.suspend(input);
				},
			)
			.build()
	);
}
