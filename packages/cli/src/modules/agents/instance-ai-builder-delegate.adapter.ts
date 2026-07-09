import type { BuiltTool, CredentialProvider, StreamChunk } from '@n8n/agents';
import type { BuilderTurnStream, InstanceAiBuilderDelegate } from '@n8n/instance-ai';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { type Scope } from '@n8n/permissions';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentIntegrationPersistenceService } from './agent-integration-persistence.service';
import { AgentsService } from './agents.service';
import { AgentsBuilderService } from './builder/agents-builder.service';
import type { BuilderSessionOptions } from './builder/agents-builder.service';
import {
	createAskQuestionsBuilderTool,
	createConfigureChannelBuilderTool,
	INSTANCE_AI_BUILDER_ADDENDUM,
} from './instance-ai-builder-extra-tools';
import { getSuspendedToolCalls } from './utils/messages-envelope';

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
 * calling user + project (mirrors `InstanceAiAgentBuilderAdapterService`).
 */
@Service()
export class InstanceAiBuilderDelegateAdapterService {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentsBuilderService: AgentsBuilderService,
		private readonly agentIntegrationPersistenceService: AgentIntegrationPersistenceService,
	) {}

	/**
	 * Builder tools + prompt rules that only apply to the sub-agent surface:
	 * chat channels must always go through `configure_channel` (never a bare
	 * credential ask), and multiple questions must be batched into one
	 * `ask_questions` card instead of sequential single-question calls.
	 */
	private buildSubAgentSession(
		agentId: string,
		projectId: string,
		threadId: string,
	): BuilderSessionOptions {
		const extraTools: BuiltTool[] = [
			createConfigureChannelBuilderTool({
				agentId,
				projectId,
				listChatIntegrationTypes: () =>
					this.agentIntegrationPersistenceService
						.listChatIntegrations()
						.map((integration) => integration.type),
			}),
			createAskQuestionsBuilderTool(),
		];

		return { threadId, extraTools, instructionsAddendum: INSTANCE_AI_BUILDER_ADDENDUM };
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
						this.buildSubAgentSession(agentId, projectId, session.threadId),
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
						this.buildSubAgentSession(agentId, projectId, session.threadId),
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
