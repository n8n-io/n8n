import type { CredentialProvider, StreamChunk } from '@n8n/agents';
import { ASK_LLM_TOOL_NAME } from '@n8n/api-types';
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
import { getSuspendedToolCalls } from './utils/messages-envelope';

/**
 * Standard builder tool names to omit for instance-AI sub-agent sessions.
 * `ask_llm` has no card UI in instance-AI chat (a bounce workaround exists in
 * instance-ai's build-agent tool instead), so it must never be offered here.
 */
export const BUILDER_EXCLUDED_TOOL_NAMES: string[] = [ASK_LLM_TOOL_NAME];

/**
 * Prompt addendum for sub-agent runs; exported for tests. `ask_questions` and
 * `configure_channel` are now part of the builder's own standard toolset and
 * carry their own usage guidance in the builder prompts/skills — only the
 * rules that are genuinely specific to running inside instance AI's chat
 * remain here.
 */
export const INSTANCE_AI_BUILDER_ADDENDUM = `## Instance AI session rules

You are running as a sub-agent inside n8n's instance AI chat; the user sees your questions as chat cards.

The agent preview link is not visible in this chat; describe outcomes in text instead of linking the preview.

\`ask_llm\` is NOT available in this chat. For model selection: ask via \`ask_questions\`, then call \`resolve_llm\` with the choice to resolve the credential.`;

function isTextDeltaChunk(
	chunk: StreamChunk,
): chunk is Extract<StreamChunk, { type: 'text-delta' }> {
	return chunk.type === 'text-delta';
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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
 * `AgentsBuilderService` for use as a narrow sub-agent by instance AI's
 * build-agent tool: one builder conversational turn per `streamBuild` /
 * `resumeBuild` call, with builder sessions keyed to an instance-AI-scoped
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
	 * Prompt rules that only apply to the sub-agent surface: `ask_llm` (no
	 * card UI in this chat) is excluded from the standard tool set.
	 * `ask_questions` and `configure_channel` are now part of the builder's
	 * own standard toolset — no per-session tool injection needed anymore.
	 */
	private buildSubAgentSession(session: BuilderDelegateSession): BuilderSessionOptions {
		return {
			threadId: session.threadId,
			instructionsAddendum: INSTANCE_AI_BUILDER_ADDENDUM,
			excludeTools: BUILDER_EXCLUDED_TOOL_NAMES,
			modelConfig: session.modelConfig,
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

			resumeBuild: async (agentId, resume, session) => {
				await assertProjectScope('agent:update');
				return toBuilderTurnStream(
					this.agentsBuilderService.resumeBuild(
						agentId,
						projectId,
						resume.runId,
						resume.toolCallId,
						resume.resumeData,
						credentialProvider,
						user,
						this.buildSubAgentSession(session),
					),
				);
			},

			findOpenSuspension: async (agentId, session) => {
				await assertProjectScope('agent:update');
				const checkpoint = await this.agentsBuilderService.findOpenCheckpointForThread(
					agentId,
					session.threadId,
				);
				if (!checkpoint) return null;

				const mostRecent = getSuspendedToolCalls(checkpoint).at(-1);
				if (!mostRecent) return null;

				return {
					runId: mostRecent.runId,
					toolCallId: mostRecent.toolCallId,
					toolName: mostRecent.toolName,
					suspendPayload: isPlainRecord(mostRecent.suspendPayload) ? mostRecent.suspendPayload : {},
				};
			},
		};
	}
}
