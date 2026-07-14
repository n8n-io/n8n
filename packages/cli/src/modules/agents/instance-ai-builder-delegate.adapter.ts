import type { CredentialProvider, StreamChunk } from '@n8n/agents';
import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_EMBEDDING_CREDENTIAL_TOOL_NAME,
	ASK_QUESTIONS_TOOL_NAME,
	CONFIGURE_CHANNEL_TOOL_NAME,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	BuilderDelegateSession,
	BuilderTurnStream,
	InstanceAiBuilderDelegate,
} from '@n8n/instance-ai';
import { type Scope } from '@n8n/permissions';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentsService } from './agents.service';
import { AgentsBuilderService } from './builder/agents-builder.service';
import type { BuilderSessionOptions } from './builder/agents-builder.service';

/**
 * Standard builder tools that require user interaction (chat cards). None of
 * them have a rendering surface in instance-AI chat, so they are excluded
 * from the builder's sub-agent session — the builder must complete every
 * turn and report open questions as reply text instead of suspending.
 */
export const NON_INTERACTIVE_EXCLUDED_TOOL_NAMES: string[] = [
	ASK_QUESTIONS_TOOL_NAME,
	CONFIGURE_CHANNEL_TOOL_NAME,
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_EMBEDDING_CREDENTIAL_TOOL_NAME,
];

/** Prompt addendum for sub-agent runs; exported for tests. */
export const INSTANCE_AI_BUILDER_ADDENDUM = `## Instance AI session rules

You are running as a sub-agent inside n8n's instance AI chat. You CANNOT ask the user anything mid-turn: the interactive tools (ask_questions, ask_credential, ask_embedding_credential, configure_channel) are not available in this session.

- Never wait for user input. Complete every turn with your best result.
- Make sensible default choices where the instructions leave room, and state the choices you made in your reply.
- When a decision genuinely needs the user (model choice with no default, missing credential, channel setup), finish the turn and list those open questions clearly at the end of your reply text — the host assistant will ask the user and send you the answers in a follow-up message.
- Credentials and chat channels cannot be connected from this chat; describe what the user must connect and continue with the rest of the build.
- For the model: when the instructions specify or imply a provider/model, call resolve_llm directly; otherwise pick the recommended default and note it in your reply.
- The agent preview link is not visible in this chat; describe outcomes in text instead of linking the preview.`;

function isTextDeltaChunk(
	chunk: StreamChunk,
): chunk is Extract<StreamChunk, { type: 'text-delta' }> {
	return chunk.type === 'text-delta';
}

/** Wrap a builder stream generator as a `BuilderTurnStream`: forwards every chunk
 *  as-is, while resolving `text` to the concatenated text-delta content once the
 *  stream ends (mirrors the SDK's own `fullStream` + `text` shape). */
function toBuilderTurnStream(chunks: AsyncGenerator<StreamChunk>): BuilderTurnStream {
	let resolveText: (text: string) => void;
	const text = new Promise<string>((resolve) => {
		resolveText = resolve;
	});
	let acc = '';

	async function* pump(): AsyncGenerator<StreamChunk> {
		try {
			for await (const chunk of chunks) {
				if (isTextDeltaChunk(chunk)) acc += chunk.delta;
				yield chunk;
			}
		} finally {
			resolveText(acc);
		}
	}

	return { fullStream: pump(), text };
}

/**
 * Host implementation of the instance-ai builder-delegate port. Wraps
 * `AgentsBuilderService` for use as a narrow, non-interactive sub-agent by
 * instance AI's build-agent tool: one builder conversational turn per
 * `streamBuild` call, with builder sessions keyed to an instance-AI-scoped
 * thread id (`session.threadId`) so nothing surfaces in the agents-module
 * builder UI. `createDelegate` returns a per-request object bound to the
 * calling user + project.
 */
@Service()
export class InstanceAiBuilderDelegateAdapterService {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentsBuilderService: AgentsBuilderService,
	) {}

	/**
	 * Builder session options for the sub-agent surface: excludes every
	 * interactive tool (no card UI in this chat) and appends the sub-agent
	 * prompt rules that explain the non-interactive contract.
	 */
	private buildSubAgentSession(session: BuilderDelegateSession): BuilderSessionOptions {
		return {
			threadId: session.threadId,
			instructionsAddendum: INSTANCE_AI_BUILDER_ADDENDUM,
			modelConfig: session.modelConfig,
			excludeTools: NON_INTERACTIVE_EXCLUDED_TOOL_NAMES,
		};
	}

	createDelegate(
		user: User,
		projectId: string,
		credentialProvider: CredentialProvider,
	): InstanceAiBuilderDelegate {
		// Mirrors the `@ProjectScope('agent:*')` guards on the agent-builder REST
		// routes. The delegate calls the builder service directly, bypassing the
		// controller middleware, so a user reaching agent-building via Instance AI
		// must still hold the corresponding project scope before any agent mutation.
		const assertProjectScope = async (scope: Scope): Promise<void> => {
			if (!(await userHasScopes(user, [scope], false, { projectId }))) {
				throw new ForbiddenError('You do not have permission to access agents in this project.');
			}
		};

		return {
			createAgent: async (name) => {
				await assertProjectScope('agent:create');
				const agent = await this.agentsService.create(projectId, name);
				return { agentId: agent.id, projectId };
			},

			streamBuild: async (agentId, message, session) => {
				await assertProjectScope('agent:update');
				return toBuilderTurnStream(
					this.agentsBuilderService.buildAgent(
						agentId,
						projectId,
						message,
						credentialProvider,
						user,
						this.buildSubAgentSession(session),
					),
				);
			},
		};
	}
}
