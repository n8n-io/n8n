import type { BuiltTool, CredentialProvider, InterruptibleToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_EMBEDDING_CREDENTIAL_TOOL_NAME,
	MANAGED_CREDENTIAL_TOKEN,
	askCredentialInputSchema,
	credentialResumeSchema,
	credentialSuspendPayloadSchema,
	type AskCredentialInput,
	type CredentialResumeData,
	type CredentialSuspendPayload,
} from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { nanoid } from 'nanoid';

import type { BuilderTrackFn } from '../builder-config-telemetry';

export interface AskCredentialToolDeps {
	credentialProvider: CredentialProvider;
	isCredentialTypeKnown?: (credentialType: string) => boolean;
	/**
	 * Credential ids of the agent's configured chat channel integrations. When
	 * one of them matches the requested credential type, it is reused for the
	 * tool instead of asking the user to pick a credential.
	 */
	listIntegrationCredentialIds?: () => Promise<string[]>;
	track: BuilderTrackFn;
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
	credentialId: string,
	credentialName: string,
): AskCredentialToolResult {
	const credentialSlot = input.credentialSlot ?? input.credentialType;
	return {
		credentialId,
		credentialName,
		credentials: {
			[credentialSlot]: { id: credentialId, name: credentialName },
		},
	};
}

/** Existing credentials of the requested type — used both for the suspend card and to resolve a display name on resume. */
async function listExistingCredentials(
	credentialProvider: CredentialProvider,
	credentialType: string,
): Promise<Array<{ id: string; name: string }>> {
	const all = await credentialProvider.list();
	return all.filter((c) => c.type === credentialType).map((c) => ({ id: c.id, name: c.name }));
}

/** Resolve the resume leg — a selection, a denial, or a dismissal — into the tool's output shape. */
async function resolveResume(
	input: AskCredentialInput,
	resumeData: CredentialResumeData,
	credentialProvider: CredentialProvider,
	track: BuilderTrackFn,
): Promise<AskCredentialToolResult> {
	if (!('credentials' in resumeData)) {
		track(TELEMETRY_EVENT.AGENTS.USER_PROVIDED_CREDENTIAL, {
			credential_type: input.credentialType,
			outcome: 'skipped',
		});
		return { skipped: true };
	}

	const credentialId = resumeData.credentials[input.credentialType];
	if (!credentialId) {
		track(TELEMETRY_EVENT.AGENTS.USER_PROVIDED_CREDENTIAL, {
			credential_type: input.credentialType,
			outcome: 'skipped',
		});
		return { skipped: true };
	}

	const existingCredentials = await listExistingCredentials(
		credentialProvider,
		input.credentialType,
	);
	const match = existingCredentials.find((c) => c.id === credentialId);
	track(TELEMETRY_EVENT.AGENTS.USER_PROVIDED_CREDENTIAL, {
		credential_type: input.credentialType,
		outcome: 'provided',
	});
	return withNodeCredentialMap(input, credentialId, match?.name ?? credentialId);
}

async function resolveCredentialSelection(
	input: AskCredentialInput,
	ctx: InterruptibleToolContext<CredentialSuspendPayload, CredentialResumeData>,
	deps: AskCredentialToolDeps,
): Promise<AskCredentialToolResult> {
	if (ctx.resumeData !== undefined && ctx.resumeData !== null) {
		return await resolveResume(input, ctx.resumeData, deps.credentialProvider, deps.track);
	}

	if (deps.isCredentialTypeKnown && !deps.isCredentialTypeKnown(input.credentialType)) {
		throw new Error(
			`Unknown credential type "${input.credentialType}". Use an exact n8n credential type name.`,
		);
	}

	const existingCredentials = await listExistingCredentials(
		deps.credentialProvider,
		input.credentialType,
	);

	// The agent's configured chat channel credential wins when it matches the
	// requested type — tools should act through the same connection the user
	// already set up for the channel, not an arbitrary same-type credential.
	const integrationCredentialIds = (await deps.listIntegrationCredentialIds?.()) ?? [];
	const channelCredential = existingCredentials.find((credential) =>
		integrationCredentialIds.includes(credential.id),
	);
	if (channelCredential) {
		return withNodeCredentialMap(input, channelCredential.id, channelCredential.name);
	}

	// If the user has exactly one credential of the requested type the
	// picker has nothing to ask — auto-resolve so the LLM doesn't render
	// a card the user can only confirm.
	if (existingCredentials.length === 1) {
		return withNodeCredentialMap(input, existingCredentials[0].id, existingCredentials[0].name);
	}

	deps.track(TELEMETRY_EVENT.AGENTS.BUILDER_REQUESTED_CREDENTIAL, {
		credential_type: input.credentialType,
	});
	return await ctx.suspend({
		requestId: nanoid(),
		message: input.purpose,
		severity: 'info' as const,
		credentialRequests: [
			{
				credentialType: input.credentialType,
				reason: input.purpose,
				existingCredentials,
			},
		],
		credentialFlow: { stage: 'generic' as const },
	});
}

export function buildAskCredentialTool(deps: AskCredentialToolDeps): BuiltTool {
	return new Tool(ASK_CREDENTIAL_TOOL_NAME)
		.description(
			'Show a credential picker card in the chat UI and suspend until the user selects ' +
				'a credential. Call ONCE per credential slot. For an addition to an existing agent, ' +
				'call it before the write_config / patch_config that introduces the tool. Never call ' +
				'this during an initial build — follow the Initial Build rules in your system prompt; ' +
				'use it for additions to an existing agent and follow-up setup turns. ' +
				'Returns { credentialId, credentialName, credentials } on success ' +
				'or { skipped: true } if the user skips credential setup so the tool can be added ' +
				'without credentials. For node tools, copy the returned `credentials` object into `node.credentials`. Auto-resolves without ' +
				'rendering a card when the agent has a chat channel configured whose credential matches the ' +
				'requested type (the channel credential is reused so tools act through the same connection), ' +
				'or when the user has exactly one credential of the requested type.',
		)
		.input(askCredentialInputSchema)
		.suspend(credentialSuspendPayloadSchema)
		.resume(credentialResumeSchema)
		.handler(
			async (
				input: AskCredentialInput,
				ctx: InterruptibleToolContext<CredentialSuspendPayload, CredentialResumeData>,
			) => {
				return await resolveCredentialSelection(input, ctx, deps);
			},
		)
		.build();
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
		.suspend(credentialSuspendPayloadSchema)
		.resume(credentialResumeSchema)
		.handler(
			async (
				input: AskCredentialInput,
				ctx: InterruptibleToolContext<CredentialSuspendPayload, CredentialResumeData>,
			): Promise<AskCredentialToolResult> => {
				if (deps.isAssistantProxyEnabled()) {
					return withNodeCredentialMap(input, MANAGED_CREDENTIAL_TOKEN, 'Managed by n8n');
				}
				return await resolveCredentialSelection(input, ctx, deps);
			},
		)
		.build();
}
