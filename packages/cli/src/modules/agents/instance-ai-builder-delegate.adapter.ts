import type { CredentialProvider, StreamChunk } from '@n8n/agents';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	instanceAiBuilderThreadPrefix,
	type BuilderDelegateSession,
	type BuilderRequiredArtifact,
	type BuilderTurnStream,
	type InstanceAiBuilderDelegate,
	type InstanceAiCredentialService,
} from '@n8n/instance-ai';
import { type Scope } from '@n8n/permissions';
import { Like } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentConfigService } from './agent-config.service';
import { AGENT_CAPABILITIES, AGENT_LIMITATIONS } from './agent-capabilities';
import { AgentIntegrationPersistenceService } from './agent-integration-persistence.service';
import { AgentSkillsService } from './agent-skills.service';
import { AgentsService } from './agents.service';
import { AgentsBuilderService } from './builder/agents-builder.service';
import type { InstanceAiBuilderSessionOptions } from './builder/agents-builder.service';
import { N8nMemory } from './integrations/n8n-memory';
import { AgentThreadRepository } from './repositories/agent-thread.repository';
import { getAgentConfigHash } from './utils/agent-config-hash';

/** Prompt addendum for sub-agent runs; exported for tests. */
export const INSTANCE_AI_BUILDER_ADDENDUM = `## Instance AI session rules

You are running as a sub-agent inside n8n's instance AI chat; the user sees your questions as chat cards.

Preview links work in this chat. Include a markdown Preview link after a successful build and when \`call_agent\` reports an unsupported interaction as \`approval_required\`, using the exact relative path from "When To Build vs When To Converse" (form: \`[Preview](<path>)\`). Do not invent absolute URLs. Do not omit the link and describe the path in plain text instead.

You can publish and unpublish the target agent with \`publish_agent\` and \`unpublish_agent\`. Never tell the user to open the agent editor and click Publish.

The Instance AI orchestrator can create workflows and data tables — never ask the user to create them manually. For each missing artifact, call \`report_required_artifact\` with its concrete requirements before your final reply; the orchestrator will provision them and call you again when the Agent needs the result.

Some requested chat platforms do not have a native Agent integration. In that case, finish the Agent without adding same-platform messaging nodes as Agent tools, then report an \`agent-entrypoint\` workflow. It must use the platform trigger, pass the incoming message and a stable conversation identifier into Message an Agent with a custom session key, then send the Agent's text response back through the platform. This workflow invokes the Agent and must never be attached to the Agent as a workflow tool.`;

function isTextDeltaChunk(
	chunk: StreamChunk,
): chunk is Extract<StreamChunk, { type: 'text-delta' }> {
	return chunk.type === 'text-delta';
}

/** Wrap a builder stream generator as a `BuilderTurnStream`: forwards every chunk
 *  as-is, while resolving `text` to the concatenated text-delta content once the
 *  stream ends (mirrors the SDK's own `fullStream` + `text` shape). */
function toBuilderTurnStream(
	chunks: AsyncGenerator<StreamChunk>,
	requiredArtifacts: BuilderRequiredArtifact[],
): BuilderTurnStream {
	let resolveText: (text: string) => void;
	const text = new Promise<string>((resolve) => {
		resolveText = resolve;
	});
	let resolveRequiredArtifacts: (artifacts: BuilderRequiredArtifact[]) => void;
	const requiredArtifactsPromise = new Promise<BuilderRequiredArtifact[]>((resolve) => {
		resolveRequiredArtifacts = resolve;
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
			resolveRequiredArtifacts([...requiredArtifacts]);
		}
	}

	return { fullStream: pump(), text, requiredArtifacts: requiredArtifactsPromise };
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
		private readonly agentConfig: AgentConfigService,
		private readonly agentSkills: AgentSkillsService,
		private readonly agentIntegrationPersistenceService: AgentIntegrationPersistenceService,
	) {}

	/** Builder session options for the sub-agent surface: appends the sub-agent prompt rules. */
	private buildSubAgentSession(
		session: BuilderDelegateSession,
		onRequiredArtifact: (artifact: BuilderRequiredArtifact) => void,
	): InstanceAiBuilderSessionOptions {
		return {
			threadId: session.threadId,
			hostThreadId: session.hostThreadId,
			runId: session.runId,
			instructionsAddendum: INSTANCE_AI_BUILDER_ADDENDUM,
			modelConfig: session.modelConfig,
			...(session.telemetry ? { telemetry: session.telemetry } : {}),
			...(session.memoryTaskObserver ? { memoryTaskObserver: session.memoryTaskObserver } : {}),
			abortSignal: session.abortSignal,
			...(session.mcpTools ? { mcpTools: session.mcpTools } : {}),
			onRequiredArtifact,
		};
	}

	createDelegate(
		user: User,
		projectId: string,
		credentialProvider: CredentialProvider,
		credentialService: InstanceAiCredentialService,
	): InstanceAiBuilderDelegate {
		// Mirrors the `@ProjectScope('agent:*')` guards on the agent-builder REST
		// routes. The delegate calls the builder service directly, bypassing the
		// controller middleware, so a user reaching agent-building via Instance AI
		// must still hold the corresponding project scope before any agent mutation.
		const assertProjectScope = async (...scopes: Scope[]): Promise<void> => {
			if (!(await userHasScopes(user, scopes, false, { projectId }))) {
				throw new ForbiddenError('You do not have permission to access agents in this project.');
			}
		};

		return {
			createAgent: async (name, options) => {
				// Adopting also needs `agent:update` — see the port's `adoptOnCollision` docs.
				await assertProjectScope(
					...(options?.adoptOnCollision
						? (['agent:create', 'agent:update'] as const)
						: (['agent:create'] as const)),
				);
				const { agent, adopted } = await this.agentsService.createOrAdopt(
					projectId,
					name,
					options ?? {},
				);
				// An adopted row keeps the winner's name, so report the persisted one.
				return { agentId: agent.id, projectId, name: agent.name, adopted };
			},

			streamBuild: async (agentId, message, session) => {
				await assertProjectScope('agent:update');
				const requiredArtifacts: BuilderRequiredArtifact[] = [];
				return toBuilderTurnStream(
					this.agentsBuilderService.buildAgent(
						agentId,
						projectId,
						message,
						credentialProvider,
						credentialService,
						user,
						this.buildSubAgentSession(session, (artifact) => requiredArtifacts.push(artifact)),
					),
					requiredArtifacts,
				);
			},

			resumeBuild: async (agentId, resume, session) => {
				await assertProjectScope('agent:update');
				const requiredArtifacts: BuilderRequiredArtifact[] = [];
				return toBuilderTurnStream(
					this.agentsBuilderService.resumeBuild(
						agentId,
						projectId,
						resume.runId,
						resume.toolCallId,
						resume.resumeData,
						credentialProvider,
						credentialService,
						user,
						this.buildSubAgentSession(session, (artifact) => requiredArtifacts.push(artifact)),
					),
					requiredArtifacts,
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

			listAgentCapabilities: async () => {
				await assertProjectScope('agent:read');
				// Channels come from the registry (same source the builder's
				// `list_integration_types` projects); agent-level capabilities and
				// limitations come from this module's constants, so the registry
				// and the agent config schema stay the single sources of truth as
				// channels, tools, or limits are added or removed.
				const channels = this.agentIntegrationPersistenceService.listChatIntegrations();
				return {
					channels,
					agentCapabilities: [...AGENT_CAPABILITIES],
					limitations: [...AGENT_LIMITATIONS],
				};
			},

			resolveAgentName: async (agentId) => {
				await assertProjectScope('agent:read');
				return (await this.agentsService.findById(agentId, projectId))?.name;
			},
			readAgentArtifact: async (agentId) => {
				await assertProjectScope('agent:read');
				// No JSON config yet (freshly created) is an empty snapshot, not an error.
				// Anything else propagates: the callers already treat a throw as "no
				// snapshot", and it gets logged there instead of vanishing here.
				const config = await this.agentConfig.getConfig(agentId, projectId).catch((error) => {
					if (error instanceof UserError) return null;
					throw error;
				});
				if (!config) return null;
				return {
					config,
					skills: await this.agentSkills.listSkills(agentId, projectId),
					// The same hash `read_config` hands the model, so consumers can dedupe.
					configHash: getAgentConfigHash(config),
				};
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
