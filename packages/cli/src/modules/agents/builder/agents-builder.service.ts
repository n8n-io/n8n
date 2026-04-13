import { Agent, Memory } from '@n8n/agents';
import type { CredentialListItem, CredentialProvider, StreamChunk } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { AgentJsonConfig } from '../json-config/agent-json-config';
import { buildBuilderPrompt } from './agents-builder-prompts';
import { AgentsBuilderToolsService } from './agents-builder-tools.service';
import { AgentsService } from '../agents.service';
import { N8nMemory } from '../integrations/n8n-memory';

/** Derive a stable thread ID for the builder chat of a given agent. */
function builderThreadId(agentId: string): string {
	return `builder:${agentId}`;
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

		const availableCredentials = await credentialProvider.list();
		const LLM_CREDENTIAL_TYPES = ['anthropicApi', 'openAiApi'];
		const builderCredential =
			availableCredentials.find((c: CredentialListItem) => c.type === 'anthropicApi') ??
			availableCredentials.find((c: CredentialListItem) => LLM_CREDENTIAL_TYPES.includes(c.type));

		if (!builderCredential) {
			throw new Error(
				'No LLM credentials available. Add an Anthropic or OpenAI credential in n8n to use the builder agent.',
			);
		}

		let builderModel: string;
		switch (builderCredential.type) {
			case 'openAiApi':
				builderModel = 'openai/gpt-4o';
				break;
			case 'anthropicApi':
			default:
				builderModel = 'anthropic/claude-sonnet-4-5';
				break;
		}

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
			.credential(builderCredential.name)
			.credentialProvider(credentialProvider)
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
