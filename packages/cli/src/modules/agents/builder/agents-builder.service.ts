import type {
	CredentialProvider,
	SerializableAgentState,
	StreamChunk,
	StreamResult,
} from '@n8n/agents';
import { Agent, Memory, providerTools } from '@n8n/agents';
import { AgentBuilderMessagesResponse, AgentPersistedMessageDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { jsonParse, OperationalError, UserError } from 'n8n-workflow';

import { messagesToDto } from '../agent-message-mapper';
import { buildBuilderPrompt } from './agents-builder-prompts';
import { AgentsBuilderToolsService } from './agents-builder-tools.service';
import { builderThreadId } from './thread';
import { AgentEntity } from '../entities/agent.entity';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { N8nMemory } from '../integrations/n8n-memory';
import type { AgentJsonConfig } from '../json-config/agent-json-config';
import { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';

const BUILDER_MODEL = 'anthropic/claude-sonnet-4-5';

/** Read an Anthropic key from env, preferring the n8n-specific variable. */
function readEnvAnthropicKey(): string | null {
	const key = process.env.N8N_AI_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
	return key && key.length > 0 ? key : null;
}

@Service()
export class AgentsBuilderService {
	constructor(
		private readonly logger: Logger,
		private readonly agentsBuilderToolsService: AgentsBuilderToolsService,
		private readonly n8nMemory: N8nMemory,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
		private readonly agentCheckpointRepository: AgentCheckpointRepository,
	) {}

	/**
	 * Clear persisted builder chat messages for the calling user on an agent.
	 */
	async clearBuilderMessages(agentId: string, userId: string) {
		const threadId = builderThreadId(agentId);
		await this.n8nMemory.deleteMessagesByThread(threadId, userId);
	}
	// ---------------------------------------------------------------------------
	// Public — streaming
	// ---------------------------------------------------------------------------

	async *buildAgent(opts: {
		agent: AgentEntity;
		projectId: string;
		message: string;
		credentialProvider: CredentialProvider;
		userId: string;
	}): AsyncGenerator<StreamChunk> {
		const { agent, projectId, message, credentialProvider, userId } = opts;
		const builder = await this.createBuilderAgent({
			agent,
			projectId,
			credentialProvider,
			userId,
		});

		this.logger.debug('Starting builder agent stream', { agentId: agent.id, projectId });

		const resultStream = await builder.stream(message, {
			persistence: { threadId: builderThreadId(agent.id), resourceId: userId },
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
	async *resumeBuild(opts: {
		agent: AgentEntity;
		projectId: string;
		runId: string;
		toolCallId: string;
		resumeData: unknown;
		credentialProvider: CredentialProvider;
		userId: string;
	}): AsyncGenerator<StreamChunk> {
		const { agent, projectId, runId, toolCallId, resumeData, credentialProvider, userId } = opts;

		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(runId);
		if (checkpointStatus === 'expired') {
			throw new UserError(`Builder checkpoint ${runId} has expired and cannot be resumed`);
		}
		if (checkpointStatus === 'not-found') {
			throw new UserError(`Builder checkpoint ${runId} not found`);
		}

		const builder = await this.createBuilderAgent({ agent, projectId, credentialProvider, userId });

		this.logger.debug('Resuming builder agent', { agentId: agent.id, runId, toolCallId });

		const resultStream = await builder.resume('stream', resumeData, {
			runId,
			toolCallId,
		});

		yield* this.streamFromAgent(resultStream);
	}

	async getBuilderMessageHistory(opts: {
		agentId: string;
		userId: string;
	}): Promise<AgentBuilderMessagesResponse> {
		const { agentId, userId } = opts;

		// Merge persisted thread memory with any open suspension's checkpoint
		// so a refresh during a suspended turn still returns the suspended
		// assistant message (the SDK only saveToMemory's on completion).
		const threadId = builderThreadId(agentId);
		const memory = await this.n8nMemory.getMessages(threadId, { resourceId: userId });
		const checkpoint = await this.findOpenCheckpoint(agentId, userId);
		const openSuspensions = Object.values(checkpoint?.pendingToolCalls ?? {})
			.filter((tc) => tc.suspended)
			.map((tc) => ({
				toolCallId: tc.toolCallId,
				runId: tc.runId,
			}));

		let messages: AgentPersistedMessageDto[];
		if (!checkpoint) {
			messages = messagesToDto(memory);
		} else {
			const memoryIds = new Set(memory.map((m) => m.id));
			const newFromCheckpoint = checkpoint.messageList.messages.filter((m) => !memoryIds.has(m.id));
			messages = messagesToDto([...memory, ...newFromCheckpoint]);
		}

		return { messages, openSuspensions };
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
	private async createBuilderAgent(opts: {
		agent: AgentEntity;
		projectId: string;
		credentialProvider: CredentialProvider;
		userId: string;
	}): Promise<Agent> {
		const { agent, projectId, credentialProvider, userId } = opts;

		// The builder is a built-in, system-level agent — it is driven by an
		// env-var Anthropic key and never uses project credentials. This keeps
		// the builder usable before any user credential has been configured.
		const envAnthropicKey = readEnvAnthropicKey();
		if (!envAnthropicKey) {
			// Operational: the n8n instance hasn't been provisioned with a
			// builder API key. Recoverable by the operator (set the env var)
			// rather than the end user.
			throw new OperationalError(
				'Builder agent is not configured. Set N8N_AI_ANTHROPIC_KEY (preferred) or ANTHROPIC_API_KEY to enable it.',
			);
		}

		// Schema is persisted as JSON — double-cast rehydrates to the typed config.
		const currentConfig = agent.schema as unknown as AgentJsonConfig | null;
		const currentToolsMap = agent.tools ?? {};
		const toolList =
			Object.entries(currentToolsMap)
				.map(([id, t]) => `- ${id}: ${t.descriptor.name} -- ${t.descriptor.description}`)
				.join('\n') || '(none)';

		const configJson = currentConfig ? JSON.stringify(currentConfig, null, 2) : '(no config yet)';
		const instructions = buildBuilderPrompt({
			configJson,
			toolList,
			builderModel: BUILDER_MODEL,
		});

		const tools = this.agentsBuilderToolsService.getTools(agent.id, projectId, credentialProvider);

		const builderMemory = new Memory().storage(this.n8nMemory).lastMessages(40);

		const builder = new Agent('agent-builder')
			.model({ id: BUILDER_MODEL, apiKey: envAnthropicKey })
			.instructions(instructions)
			.memory(builderMemory)
			.checkpoint(this.n8nCheckpointStorage.getStorage(agent.id, userId))
			.providerTool(providerTools.anthropicWebSearch({ maxUses: 5 }));

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

	/**
	 * Return the parsed state of the most recent non-expired suspended
	 * checkpoint for this agent, or `null` if there isn't one. Each pending
	 * tool call inside the state already carries its own `runId`, so callers
	 * don't need a separate runId from this helper.
	 */
	async findOpenCheckpoint(
		agentId: string,
		userId: string,
	): Promise<SerializableAgentState | null> {
		const rows = await this.agentCheckpointRepository.find({
			where: { agentId, userId, expired: false },
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
