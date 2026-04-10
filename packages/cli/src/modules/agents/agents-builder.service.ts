import { Agent } from '@n8n/agents';
import type { CredentialListItem, CredentialProvider, StreamChunk } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { AgentJsonConfig } from './agent-json-config';
import { buildBuilderPrompt } from './agents-builder-prompts';
import { AgentsBuilderToolsService } from './agents-builder-tools.service';
import { AgentsService } from './agents.service';

@Service()
export class AgentsBuilderService {
	constructor(
		private readonly logger: Logger,
		private readonly agentsService: AgentsService,
		private readonly agentsBuilderToolsService: AgentsBuilderToolsService,
	) {}

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

		const builder = new Agent('agent-builder')
			.model(builderModel)
			.credential(builderCredential.name)
			.credentialProvider(credentialProvider)
			.instructions(instructions);

		for (const tool of [...tools.json, ...tools.shared]) {
			builder.tool(tool);
		}

		this.logger.debug('Starting builder agent stream', { agentId, projectId });

		const resultStream = await builder.stream(message);
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
	 * Validate the node configurations for any ToolFromNode tools in an agent schema.
	 *
	 * The sandbox only has a mock node() function, so validateNodeConfig() must run
	 * on the host where the real Zod schemas are available.
	 *
	 * @returns A formatted error string if any node config is invalid, or null if all pass.
	 */
	private validateNodeToolConfigs(
		tools: Array<{ name: string; metadata: Record<string, unknown> | null }>,
	): string | null {
		const nodeTools = tools.filter((t) => t.metadata?.nodeTool === true);
		if (nodeTools.length === 0) return null;

		const dirs = resolveBuiltinNodeDefinitionDirs();
		if (dirs.length > 0) setSchemaBaseDirs(dirs);

		const errors: string[] = [];

		for (const tool of nodeTools) {
			const meta = tool.metadata as Record<string, unknown>;
			const nodeType = meta.nodeType as string;
			const nodeTypeVersion = meta.nodeTypeVersion as number;
			const nodeParameters = (meta.nodeParameters ?? {}) as Record<string, unknown>;

			const result: SchemaValidationResult = validateNodeConfig(
				nodeType,
				nodeTypeVersion,
				{ parameters: nodeParameters },
				{ isToolNode: true },
			);

			if (!result.valid) {
				const messages = result.errors
					.map((e: { path: string; message: string }) => e.message)
					.join('; ');
				errors.push(`ToolFromNode "${tool.name}" (${nodeType}@${nodeTypeVersion}): ${messages}`);
			}
		}

		return errors.length > 0 ? errors.join('\n') : null;
	}
}
