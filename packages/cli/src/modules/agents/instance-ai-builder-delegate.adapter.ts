import type { CredentialProvider, StreamChunk } from '@n8n/agents';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { instanceAiBuilderThreadPrefix } from '@n8n/instance-ai';
import type {
	BuilderDelegateSession,
	BuilderTurnStream,
	InstanceAiBuilderDelegate,
} from '@n8n/instance-ai';
import { type Scope } from '@n8n/permissions';
import { Like } from '@n8n/typeorm';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentsService } from './agents.service';
import { AgentsBuilderService } from './builder/agents-builder.service';
import type { InstanceAiBuilderSessionOptions } from './builder/agents-builder.service';
import { N8nMemory } from './integrations/n8n-memory';
import { AgentThreadRepository } from './repositories/agent-thread.repository';

/** Prompt addendum for sub-agent runs; exported for tests. */
export const INSTANCE_AI_BUILDER_ADDENDUM = `## Instance AI session rules

You are running as a sub-agent inside n8n's instance AI chat; the user sees your questions as chat cards.

The agent preview link is not visible in this chat; describe outcomes in text instead of linking the preview.

You can publish and unpublish the target agent with \`publish_agent\` and \`unpublish_agent\`. Never tell the user to open the agent editor and click Publish.`;

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
 * `AgentsBuilderService` for use as a sub-agent by instance AI's build-agent
 * tool: one builder conversational turn per `streamBuild`/`resumeBuild` call,
 * with builder sessions keyed to an instance-AI-scoped thread id
 * (`session.threadId`) so nothing surfaces in the agents-module builder UI.
 * The builder's interactive tools stay enabled — suspensions are surfaced to
 * the caller via `findOpenSuspensions`/`resumeBuild` so it can cascade them
 * through its own suspend/resume. `createDelegate` returns a per-request
 * object bound to the calling user + project.
 */
@Service()
export class InstanceAiBuilderDelegateAdapterService {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentsBuilderService: AgentsBuilderService,
		private readonly n8nMemory: N8nMemory,
		private readonly agentThreadRepository: AgentThreadRepository,
	) {}

	/** Builder session options for the sub-agent surface: appends the sub-agent prompt rules. */
	private buildSubAgentSession(session: BuilderDelegateSession): InstanceAiBuilderSessionOptions {
		return {
			threadId: session.threadId,
			hostThreadId: session.hostThreadId,
			runId: session.runId,
			instructionsAddendum: INSTANCE_AI_BUILDER_ADDENDUM,
			modelConfig: session.modelConfig,
			...(session.telemetry ? { telemetry: session.telemetry } : {}),
			...(session.memoryTaskObserver ? { memoryTaskObserver: session.memoryTaskObserver } : {}),
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

			findOpenSuspensions: async (agentId, session) => {
				await assertProjectScope('agent:update');
				const checkpoint = await this.agentsBuilderService.findOpenCheckpointForThread(
					agentId,
					session.threadId,
				);
				if (!checkpoint) return [];
				return Object.values(checkpoint.pendingToolCalls ?? {})
					.filter((tc) => tc.suspended)
					.map((tc) => ({ runId: tc.runId, toolCallId: tc.toolCallId }));
			},

			cancelOpenSuspension: async (agentId, runId) => {
				await assertProjectScope('agent:update');
				await this.agentsBuilderService.cancelCheckpoint(agentId, runId);
			},

			listAgents: async () => {
				await assertProjectScope('agent:read');
				const agents = await this.agentsService.findByProjectId(projectId);
				return agents.map((agent) => ({
					agentId: agent.id,
					name: agent.name,
					published: agent.activeVersionId !== null,
					updatedAt: agent.updatedAt.toISOString(),
				}));
			},

			resolveAgentName: async (agentId) => {
				await assertProjectScope('agent:read');
				return (await this.agentsService.findById(agentId, projectId))?.name;
			},
		};
	}

	/**
	 * Delete every builder sub-agent session spawned by one instance-AI thread:
	 * the `ia-builder:<threadId>:<agentId>` rows in the agents-module memory
	 * tables (thread, messages, observations, orphaned episodic entries).
	 * Called by the instance-AI host when the thread is deleted or TTL-pruned;
	 * access control happened there. Instance-AI thread ids are UUIDs, so the
	 * prefix carries no LIKE metacharacters.
	 */
	async deleteBuilderSessions(instanceAiThreadId: string): Promise<void> {
		const prefix = instanceAiBuilderThreadPrefix(instanceAiThreadId);
		const threads = await this.agentThreadRepository.find({
			select: { id: true },
			where: { id: Like(`${prefix}%`) },
		});
		for (const { id } of threads) {
			// The target agent id is the suffix; memory impls are agent-scoped.
			const memory = this.n8nMemory.getImplementation(id.slice(prefix.length));
			await memory.deleteMessagesByThread(id);
			await memory.deleteThread(id);
		}
	}
}
