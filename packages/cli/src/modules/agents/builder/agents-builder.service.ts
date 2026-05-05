import type {
	CredentialProvider,
	SerializableAgentState,
	StreamChunk,
	StreamResult,
} from '@n8n/agents';
import { Agent, Memory } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, UserError } from 'n8n-workflow';

import { AgentsService } from '../agents.service';
import { composeJsonConfig } from '../json-config/agent-config-composition';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { N8nMemory } from '../integrations/n8n-memory';
import type { AgentJsonConfig } from '../json-config/agent-json-config';
import { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';
import { buildBuilderPrompt } from './agents-builder-prompts';
import { AgentsBuilderToolsService, getAgentConfigHash } from './agents-builder-tools.service';
import { AGENT_THREAD_PREFIX } from './builder-tool-names';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AgentsBuilderSettingsService } from './agents-builder-settings.service';

const BUILDER_MODEL = 'anthropic/claude-sonnet-4-5';

/** Derive a stable thread ID for the builder chat of a given agent. */
function builderThreadId(agentId: string): string {
	return `${AGENT_THREAD_PREFIX.BUILDER}${agentId}`;
}

@Service()
export class AgentsBuilderService {
	constructor(
		private readonly logger: Logger,
		private readonly agentsService: AgentsService,
		private readonly agentsBuilderToolsService: AgentsBuilderToolsService,
		private readonly n8nMemory: N8nMemory,
		private readonly builderSettings: AgentsBuilderSettingsService,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
		private readonly agentCheckpointRepository: AgentCheckpointRepository,
	) {}

	// ---------------------------------------------------------------------------
	// Public — message storage
	// ---------------------------------------------------------------------------

	/**
	 * Return persisted builder chat messages for an agent.
	 */
	async getBuilderMessages(agentId: string) {
		const threadId = builderThreadId(agentId);
		return await this.n8nMemory.getMessages(threadId);
	}

	/**
	 * Clear persisted builder chat messages for an agent.
	 */
	async clearBuilderMessages(agentId: string) {
		const threadId = builderThreadId(agentId);
		await this.n8nMemory.deleteMessagesByThread(threadId);
		await this.n8nMemory.deleteThread(threadId);
	}
	// ---------------------------------------------------------------------------
	// Public — streaming
	// ---------------------------------------------------------------------------

	async *buildAgent(
		agentId: string,
		projectId: string,
		message: string,
		credentialProvider: CredentialProvider,
		user: User,
	): AsyncGenerator<StreamChunk> {
		const builder = await this.createBuilderAgent(agentId, projectId, credentialProvider, user);

		this.logger.debug('Starting builder agent stream', { agentId, projectId });

		const resourceId = user.id;
		const resultStream = await builder.stream(message, {
			persistence: { threadId: builderThreadId(agentId), resourceId },
		});

		yield* this.streamFromAgent(resultStream);
	}

	/**
	 * Resume a suspended builder tool call and yield the resulting stream chunks.
	 *
	 * The `runId` is supplied by the caller — it originates either from the
	 * `tool-call-suspended` chunk the FE just received (live) or from the
	 * `openSuspensions` sidecar returned by `GET /build/messages` (history
	 * reload). A fresh builder agent is reconstructed every time; the SDK's
	 * `agent.resume(...)` rehydrates the suspended state from the persisted
	 * checkpoint, so the new instance picks up where the old one left off.
	 */
	async *resumeBuild(
		agentId: string,
		projectId: string,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
		credentialProvider: CredentialProvider,
		user: User,
	): AsyncGenerator<StreamChunk> {
		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(runId);
		if (checkpointStatus.status === 'expired') {
			throw new UserError(`Builder checkpoint ${runId} has expired and cannot be resumed`);
		}
		if (checkpointStatus.status === 'not-found') {
			throw new UserError(`Builder checkpoint ${runId} not found`);
		}

		const builder = await this.createBuilderAgent(agentId, projectId, credentialProvider, user);

		this.logger.debug('Resuming builder agent', { agentId, runId, toolCallId });

		const resultStream = await builder.resume('stream', resumeData, {
			runId,
			toolCallId,
		});

		yield* this.streamFromAgent(resultStream);
	}

	// ---------------------------------------------------------------------------
	// Private — builder agent construction
	// ---------------------------------------------------------------------------

	/**
	 * Build a fresh builder `Agent` instance for the given target agent.
	 *
	 * Encapsulates: env-key validation, prompt assembly from current config,
	 * tool registration, memory storage, and checkpoint wiring. Called on
	 * every `buildAgent` / `resumeBuild` — resume rehydrates state from the
	 * persisted checkpoint via the SDK, so the new instance picks up where
	 * the previous one left off.
	 */
	private async createBuilderAgent(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		user: User,
	): Promise<Agent> {
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		// Resolve the model the builder should run on. Throws
		// `BuilderNotConfiguredError` when none of custom-credential / proxy /
		// env-var fallback is available.
		const { config: modelConfig } = await this.builderSettings.resolveModelConfig(user);

		const currentConfig = composeJsonConfig(agent) as unknown as AgentJsonConfig | null;
		const currentToolsMap = agent.tools ?? {};
		const toolList =
			Object.entries(currentToolsMap)
				.map(([id, t]) => `- ${id}: ${t.descriptor.name} -- ${t.descriptor.description}`)
				.join('\n') || '(none)';

		const configJson = currentConfig ? JSON.stringify(currentConfig, null, 2) : '(no config yet)';
		const instructions = buildBuilderPrompt({
			configJson,
			configHash: getAgentConfigHash(currentConfig),
			configUpdatedAt: agent.updatedAt.toISOString(),
			toolList,
			builderModel: BUILDER_MODEL,
		});

		const tools = this.agentsBuilderToolsService.getTools(agentId, projectId, credentialProvider);

		const builderMemory = new Memory().storage(this.n8nMemory).lastMessages(40);

		// Be careful with provider specific options, since user can change model to openai, grok, etc.
		const builder = new Agent('agent-builder')
			.model(modelConfig)
			.instructions(instructions)
			.memory(builderMemory)
			.checkpoint(this.n8nCheckpointStorage.getStorage(agentId));

		for (const tool of [...tools.json, ...tools.shared]) {
			builder.tool(tool);
		}

		return builder;
	}

	/**
	 * Pump SDK stream chunks through to the caller. The runId is now carried
	 * on each `tool-call-suspended` chunk by the SDK, so this is just a
	 * plain reader→generator adapter.
	 */
	private async *streamFromAgent(resultStream: StreamResult): AsyncGenerator<StreamChunk> {
		const reader = resultStream.stream.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				yield value;
			}
		} finally {
			reader.releaseLock();
		}
	}

	// ---------------------------------------------------------------------------
	// Private — open-suspension lookup
	// ---------------------------------------------------------------------------

	/**
	 * Return the parsed state of the most recent non-expired suspended
	 * checkpoint for this agent, or `null` if there isn't one. Each pending
	 * tool call inside the state already carries its own `runId`, so callers
	 * don't need a separate runId from this helper.
	 */
	async findOpenCheckpoint(agentId: string): Promise<SerializableAgentState | null> {
		const rows = await this.agentCheckpointRepository.find({
			where: { agentId, expired: false },
			order: { updatedAt: 'DESC' },
			take: 5,
		});
		for (const row of rows) {
			if (!row.state) continue;
			let parsed: SerializableAgentState;
			try {
				parsed = jsonParse<SerializableAgentState>(row.state);
			} catch {
				continue;
			}
			if (parsed.status === 'suspended') {
				return parsed;
			}
		}
		return null;
	}
}
