import { Agent, Memory } from '@n8n/agents';
import type {
	AgentDbMessage,
	CredentialProvider,
	SerializableAgentState,
	StreamChunk,
	StreamResult,
} from '@n8n/agents';
import type { AgentBuilderOpenSuspension } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { jsonParse, UserError } from 'n8n-workflow';

import { AgentsService } from '../agents.service';
import { buildBuilderPrompt } from './agents-builder-prompts';
import { AgentsBuilderToolsService } from './agents-builder-tools.service';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { N8nMemory } from '../integrations/n8n-memory';
import type { AgentJsonConfig } from '../json-config/agent-json-config';
import { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';

const BUILDER_MODEL = 'anthropic/claude-sonnet-4-5';

/** Derive a stable thread ID for the builder chat of a given agent. */
function builderThreadId(agentId: string): string {
	return `builder:${agentId}`;
}

/** Read an Anthropic key from env, preferring the n8n-specific variable. */
function readEnvAnthropicKey(): string | null {
	const key = process.env.N8N_AI_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
	return key && key.length > 0 ? key : null;
}

interface BuilderRuntime {
	agent: Agent;
	agentId: string;
}

@Service()
export class AgentsBuilderService {
	/** Active builder agent instances keyed by agentId, for resume support. */
	private readonly builderRuntimes = new Map<string, BuilderRuntime>();

	constructor(
		private readonly logger: Logger,
		private readonly agentsService: AgentsService,
		private readonly agentsBuilderToolsService: AgentsBuilderToolsService,
		private readonly n8nMemory: N8nMemory,
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

	/**
	 * If an open (suspended) checkpoint exists for this agent, return its
	 * full message transcript so the controller can merge it with persisted
	 * thread memory. Returns `null` when no live suspension is found.
	 *
	 * Backed by the most recent non-expired suspended row in
	 * `agent_checkpoints` for this agent — covers server restarts where the
	 * in-memory cache is gone but the checkpoint is still on disk.
	 */
	async getOpenCheckpointMessages(agentId: string): Promise<AgentDbMessage[] | null> {
		const state = await this.findOpenCheckpoint(agentId);
		if (!state) return null;
		return state.messageList.messages;
	}

	/**
	 * List every still-open (suspended) interactive tool call for this agent
	 * along with its runId. The FE uses this on history reload to re-attach
	 * the runId to the matching interactive card so the user can resume it.
	 *
	 * In practice the builder only has one open turn at a time, but a single
	 * suspended turn can carry multiple pending interactive tool calls — they
	 * all share the same runId.
	 */
	async getOpenSuspensions(agentId: string): Promise<AgentBuilderOpenSuspension[]> {
		const state = await this.findOpenCheckpoint(agentId);
		if (!state) return [];
		const out: AgentBuilderOpenSuspension[] = [];
		for (const tc of Object.values(state.pendingToolCalls)) {
			if (tc.suspended) {
				out.push({ toolCallId: tc.toolCallId, runId: tc.runId });
			}
		}
		return out;
	}

	// ---------------------------------------------------------------------------
	// Public — streaming
	// ---------------------------------------------------------------------------

	async *buildAgent(
		agentId: string,
		projectId: string,
		message: string,
		credentialProvider: CredentialProvider,
		userId?: string,
	): AsyncGenerator<StreamChunk> {
		const builder = await this.createBuilderAgent(agentId, projectId, credentialProvider);
		this.cacheRuntime(agentId, builder);

		this.logger.debug('Starting builder agent stream', { agentId, projectId });

		const resourceId = userId ?? agentId;
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
	 * reload). When no cached agent runtime exists (e.g. server restarted
	 * between suspension and resume), a fresh builder agent is constructed
	 * using the same logic as `buildAgent`; the SDK's `agent.resume(...)`
	 * then rehydrates the suspended state from the persisted checkpoint and
	 * continues seamlessly.
	 */
	async *resumeBuild(
		agentId: string,
		projectId: string,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
		credentialProvider: CredentialProvider,
	): AsyncGenerator<StreamChunk> {
		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(runId);
		if (checkpointStatus === 'expired') {
			throw new UserError(`Builder checkpoint ${runId} has expired and cannot be resumed`);
		}
		if (checkpointStatus === 'not-found') {
			throw new UserError(`Builder checkpoint ${runId} not found`);
		}

		// Reuse the cached runtime when available; otherwise reconstruct a fresh
		// builder agent. The SDK's resume() rehydrates the suspended state from
		// the persisted checkpoint, so the new instance picks up where the old
		// one left off without losing any messages or pending tool calls.
		const cached = this.builderRuntimes.get(agentId);
		const builder =
			cached?.agent ?? (await this.createBuilderAgent(agentId, projectId, credentialProvider));

		this.cacheRuntime(agentId, builder);

		this.logger.debug('Resuming builder agent', {
			agentId,
			runId,
			toolCallId,
			recreated: !cached,
		});

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
	 * tool registration, memory storage, and checkpoint wiring. Used by both
	 * `buildAgent` (for the initial call) and `resumeBuild` (when the cached
	 * runtime is missing after a server restart).
	 */
	private async createBuilderAgent(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
	): Promise<Agent> {
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) {
			throw new Error(`Agent "${agentId}" not found`);
		}

		// The builder is a built-in, system-level agent — it is driven by an
		// env-var Anthropic key and never uses project credentials. This keeps
		// the builder usable before any user credential has been configured.
		const envAnthropicKey = readEnvAnthropicKey();
		if (!envAnthropicKey) {
			throw new Error(
				'Builder agent is not configured. Set N8N_AI_ANTHROPIC_KEY (preferred) or ANTHROPIC_API_KEY to enable it.',
			);
		}

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

		const tools = this.agentsBuilderToolsService.getTools(agentId, projectId, credentialProvider);

		const builderMemory = new Memory().storage(this.n8nMemory).lastMessages(40);

		const builder = new Agent('agent-builder')
			.model({ id: BUILDER_MODEL, apiKey: envAnthropicKey })
			.instructions(instructions)
			.memory(builderMemory)
			.checkpoint(this.n8nCheckpointStorage.getStorage(agentId));

		for (const tool of [...tools.json, ...tools.shared]) {
			builder.tool(tool);
		}

		return builder;
	}

	private cacheRuntime(agentId: string, agent: Agent) {
		this.builderRuntimes.set(agentId, { agent, agentId });
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
	private async findOpenCheckpoint(agentId: string): Promise<SerializableAgentState | null> {
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
