import { Agent, Memory } from '@n8n/agents';
import type { CredentialProvider, StreamChunk } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { AgentsService } from '../agents.service';
import { buildBuilderPrompt } from './agents-builder-prompts';
import { AgentsBuilderToolsService } from './agents-builder-tools.service';
import { N8nMemory } from '../integrations/n8n-memory';
import type { AgentJsonConfig } from '../json-config/agent-json-config';

/** Derive a stable thread ID for the builder chat of a given agent. */
function builderThreadId(agentId: string): string {
	return `builder:${agentId}`;
}

/**
 * Synthetic credential name used when the builder is driven by an env-var API
 * key. Kept private so it never collides with user-defined credential names.
 */
const ENV_BUILDER_CREDENTIAL_NAME = '__builder_env_anthropic__';

/** Read an Anthropic key from env, preferring the n8n-specific variable. */
function readEnvAnthropicKey(): string | null {
	const key = process.env.N8N_AI_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
	return key && key.length > 0 ? key : null;
}

@Service()
export class AgentsBuilderService {
	constructor(
		private readonly logger: Logger,
		private readonly agentsService: AgentsService,
		private readonly agentsBuilderToolsService: AgentsBuilderToolsService,
		private readonly n8nMemory: N8nMemory,
	) {}

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
		const messages = await this.n8nMemory.getMessages(threadId);
		if (messages.length > 0) {
			await this.n8nMemory.deleteMessages(messages.map((m) => m.id));
		}
		await this.n8nMemory.deleteThread(threadId);
	}

	async *buildAgent(
		agentId: string,
		projectId: string,
		message: string,
		credentialProvider: CredentialProvider,
		_userId?: string,
	): AsyncGenerator<StreamChunk> {
		const agent = await this.agentsService.findById(agentId, projectId);

		if (!agent) {
			throw new Error(`Agent "${agentId}" not found`);
		}

		await this.agentsBuilderToolsService.initialize();

		// The builder is a built-in, system-level agent — it is driven by an
		// env-var Anthropic key and never uses project credentials. This keeps
		// the builder usable before any user credential has been configured.
		const envAnthropicKey = readEnvAnthropicKey();
		if (!envAnthropicKey) {
			throw new Error(
				'Builder agent is not configured. Set N8N_AI_ANTHROPIC_KEY (preferred) or ANTHROPIC_API_KEY to enable it.',
			);
		}

		const builderCredentialName = ENV_BUILDER_CREDENTIAL_NAME;
		const builderModel = 'anthropic/claude-sonnet-4-5';
		const builderProvider: CredentialProvider = {
			async resolve(name) {
				if (name === ENV_BUILDER_CREDENTIAL_NAME) {
					return { apiKey: envAnthropicKey };
				}
				return await credentialProvider.resolve(name);
			},
			async list() {
				return await credentialProvider.list();
			},
		};

		const currentConfig = agent.schema as unknown as AgentJsonConfig | null;
		const currentToolsMap = agent.tools ?? {};
		const toolList =
			Object.entries(currentToolsMap)
				.map(([id, t]) => `- ${id}: ${t.descriptor.name} -- ${t.descriptor.description}`)
				.join('\n') || '(none)';

		const configJson = currentConfig ? JSON.stringify(currentConfig, null, 2) : '(no config yet)';

		const instructions = buildBuilderPrompt({ configJson, toolList, builderModel });

		const tools = this.agentsBuilderToolsService.getTools(agentId, projectId, credentialProvider);

		const builderMemory = new Memory().storage(this.n8nMemory).lastMessages(40);

		const builder = new Agent('agent-builder')
			.model(builderModel)
			.credential(builderCredentialName)
			.credentialProvider(builderProvider)
			.instructions(instructions)
			.memory(builderMemory);

		for (const tool of [...tools.json, ...tools.shared]) {
			builder.tool(tool);
		}

		this.logger.debug('Starting builder agent stream', { agentId, projectId });

		const threadId = builderThreadId(agentId);
		const resourceId = _userId ?? agentId;
		const resultStream = await builder.stream(message, {
			persistence: { threadId, resourceId },
		});
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
}
