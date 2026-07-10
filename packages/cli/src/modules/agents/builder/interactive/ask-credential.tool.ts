import type { BuiltTool, CredentialProvider, InterruptibleToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_EMBEDDING_CREDENTIAL_TOOL_NAME,
	MANAGED_CREDENTIAL_TOKEN,
	askCredentialInputSchema,
	askCredentialResumeSchema,
	type AskCredentialInput,
	type AskCredentialResume,
} from '@n8n/api-types';

export interface AskCredentialToolDeps {
	credentialProvider: CredentialProvider;
	isCredentialTypeKnown?: (credentialType: string) => boolean;
}

export interface AskEmbeddingCredentialToolDeps extends AskCredentialToolDeps {
	isAssistantProxyEnabled: () => boolean;
}

type AskCredentialToolResult =
	| { skipped: true }
	| {
			credentialId: string;
			credentialName: string;
			credentials: Record<string, { id: string; name: string }>;
	  };

function withNodeCredentialMap(
	input: AskCredentialInput,
	resume: AskCredentialResume,
): AskCredentialToolResult {
	if ('skipped' in resume) return resume;

	const credentialSlot = input.credentialSlot ?? input.credentialType;
	return {
		credentialId: resume.credentialId,
		credentialName: resume.credentialName,
		credentials: {
			[credentialSlot]: {
				id: resume.credentialId,
				name: resume.credentialName,
			},
		},
	};
}

async function resolveCredentialSelection<TResult>(
	input: AskCredentialInput,
	ctx: InterruptibleToolContext<AskCredentialInput, AskCredentialResume>,
	deps: AskCredentialToolDeps,
	mapResume: (resume: AskCredentialResume) => TResult,
): Promise<TResult> {
	if (ctx.resumeData !== undefined) return mapResume(ctx.resumeData);
	if (deps.isCredentialTypeKnown && !deps.isCredentialTypeKnown(input.credentialType)) {
		throw new Error(
			`Unknown credential type "${input.credentialType}". Use an exact n8n credential type name.`,
		);
	}
	// If the user has exactly one credential of the requested type the
	// picker has nothing to ask — auto-resolve so the LLM doesn't render
	// a card the user can only confirm.
	const all = await deps.credentialProvider.list();
	const matching = all.filter((c) => c.type === input.credentialType);
	if (matching.length === 1) {
		return mapResume({
			credentialId: matching[0].id,
			credentialName: matching[0].name,
		});
	}
	return await ctx.suspend(input);
}

export function buildAskCredentialTool(deps: AskCredentialToolDeps): BuiltTool {
	return (
		new Tool(ASK_CREDENTIAL_TOOL_NAME)
			.description(
				'Show a credential picker card in the chat UI and suspend until the user selects ' +
					'a credential. Call ONCE per credential slot, BEFORE the write_config / patch_config ' +
					'that introduces the node tool. Returns { credentialId, credentialName, credentials } on success ' +
					'or { skipped: true } if the user skips credential setup so the tool can be added ' +
					'without credentials. For node tools, copy the returned `credentials` object into `node.credentials`. Auto-resolves without ' +
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
					return await resolveCredentialSelection(input, ctx, deps, (resume) =>
						withNodeCredentialMap(input, resume),
					);
				},
			)
			.build()
	);
}

export function buildAskEmbeddingCredentialTool(deps: AskEmbeddingCredentialToolDeps): BuiltTool {
	return new Tool(ASK_EMBEDDING_CREDENTIAL_TOOL_NAME)
		.description(
			'Resolve the OpenAI embedding credential for Episodic Memory. Tries to resolve n8n managed credential. Otherwise behaves ' +
				'like ask_credential: show a credential picker card in the chat UI and suspend until ' +
				'the user selects a credential. Returns { credentialId, credentialName, credentials } ' +
				'on success or { skipped: true } if the user skips credential setup.',
		)
		.input(askCredentialInputSchema)
		.suspend(askCredentialInputSchema)
		.resume(askCredentialResumeSchema)
		.handler(
			async (
				input: AskCredentialInput,
				ctx: InterruptibleToolContext<AskCredentialInput, AskCredentialResume>,
			): Promise<AskCredentialToolResult> => {
				if (deps.isAssistantProxyEnabled()) {
					return withNodeCredentialMap(input, {
						credentialId: MANAGED_CREDENTIAL_TOKEN,
						credentialName: 'Managed by n8n',
					});
				}
				return await resolveCredentialSelection(input, ctx, deps, (resume) =>
					withNodeCredentialMap(input, resume),
				);
			},
		)
		.build();
}
