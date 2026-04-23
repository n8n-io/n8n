import { Agent, Memory, providerTools } from '@n8n/agents';
import type { CredentialProvider, ModelConfig, StreamChunk } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { AgentsService } from '../agents.service';
import { buildBuilderPrompt } from './agents-builder-prompts';
import { AgentsBuilderSettingsService } from './agents-builder-settings.service';
import { AgentsBuilderToolsService } from './agents-builder-tools.service';
import { N8nMemory } from '../integrations/n8n-memory';
import type { AgentJsonConfig } from '../json-config/agent-json-config';

/** Derive a stable thread ID for the builder chat of a given agent. */
function builderThreadId(agentId: string): string {
	return `builder:${agentId}`;
}

function isAnthropicModel(modelConfig: ModelConfig): boolean {
	if (typeof modelConfig === 'string') {
		return modelConfig.includes('anthropic');
	}
	if (typeof modelConfig === 'object' && 'id' in modelConfig) {
		return modelConfig.id.includes('anthropic');
	}
	if (typeof modelConfig === 'object' && 'provider' in modelConfig) {
		return modelConfig.provider === 'anthropic';
	}
	return false;
}

@Service()
export class AgentsBuilderService {
	constructor(
		private readonly logger: Logger,
		private readonly agentsService: AgentsService,
		private readonly agentsBuilderToolsService: AgentsBuilderToolsService,
		private readonly n8nMemory: N8nMemory,
		private readonly builderSettings: AgentsBuilderSettingsService,
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
		await this.n8nMemory.deleteMessagesByThread(threadId);
		await this.n8nMemory.deleteThread(threadId);
	}

	async *buildAgent(
		agentId: string,
		projectId: string,
		message: string,
		credentialProvider: CredentialProvider,
		user: User,
	): AsyncGenerator<StreamChunk> {
		const agent = await this.agentsService.findById(agentId, projectId);

		if (!agent) {
			throw new Error(`Agent "${agentId}" not found`);
		}

		// Resolve the model the builder should run on. Throws
		// `BuilderNotConfiguredError` when none of custom-credential / proxy /
		// env-var fallback is available.
		const modelConfig = await this.builderSettings.resolveModelConfig(user);

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
			builderModel: 'anthropic/claude-sonnet-4-5',
		});

		const tools = this.agentsBuilderToolsService.getTools(agentId, projectId, credentialProvider);

		const builderMemory = new Memory().storage(this.n8nMemory).lastMessages(40);

		const builder = new Agent('agent-builder')
			.model(modelConfig)
			.instructions(instructions)
			.memory(builderMemory);

		if (isAnthropicModel(modelConfig)) {
			builder.providerTool(providerTools.anthropicWebSearch({ maxUses: 5 }));
		}

		for (const tool of [...tools.json, ...tools.shared]) {
			builder.tool(tool);
		}

		this.logger.debug('Starting builder agent stream', { agentId, projectId });

		const threadId = builderThreadId(agentId);
		const resourceId = user.id ?? agentId;
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
