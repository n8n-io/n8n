import { reconcileNativeWebSearch } from '@n8n/ai-utilities/agent-config';
import { extractFromAIParameters } from '@n8n/ai-utilities/fromai-helpers';
import {
	AgentJsonConfigSchema,
	findVectorStoreToolNameCollisions,
	sanitizeAgentJsonConfig,
	type AgentJsonConfig,
	type AgentJsonToolConfig,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError, type INodeParameters } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { resolveBuiltinNodeDefinitionDirs } from '@/modules/instance-ai/node-definition-resolver';

import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentSkillsService } from './agent-skills.service';
import type { Agent } from './entities/agent.entity';
import { syncAgentIntegrations } from './integrations/integrations-sync';
import { composeJsonConfig, decomposeJsonConfig } from './json-config/agent-config-composition';
import { sanitizeUnknownAgentCredentials } from './json-config/sanitize-unknown-agent-credentials';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { markAgentDraftDirty } from './utils/agent-draft.utils';
import { resolveUniqueSubAgents, type ResolvedSubAgentRef } from './utils/sub-agent-resolver';

@Service()
export class AgentConfigService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly agentTaskRepository: AgentTaskRepository,
		private readonly agentSkillsService: AgentSkillsService,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
		private readonly credentialsService: CredentialsService,
	) {}

	/**
	 * Get the JSON config for an agent.
	 */
	async getConfig(agentId: string, projectId: string): Promise<AgentJsonConfig> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');
		const config = composeJsonConfig(entity);
		if (!config) {
			throw new UserError('Agent has no JSON config yet.');
		}
		return config;
	}

	/**
	 * Validate an AgentJsonConfig: runs Zod schema validation and checks any
	 * node tool configurations against their JSON-Schema definitions.
	 */
	async validateConfig(
		raw: unknown,
	): Promise<{ valid: true; config: AgentJsonConfig } | { valid: false; error: string }> {
		if (hasNodeToolInputSchema(raw)) {
			return { valid: false, error: 'Node tool configs must not include inputSchema.' };
		}

		const parsed = AgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(raw));
		if (!parsed.success) {
			return { valid: false, error: parsed.error.message };
		}

		const config = parsed.data;

		const toolNameCollisions = findVectorStoreToolNameCollisions(config);
		if (toolNameCollisions.length > 0) {
			return {
				valid: false,
				error: `Vector store tool name collides with an existing tool: ${toolNameCollisions.join(', ')}`,
			};
		}

		try {
			this.validateNodeToolExpressions(config);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				valid: false,
				error: `Invalid $fromAI expression in node tool config: ${message}`,
			};
		}

		const nodeError = await this.validateNodeToolConfigs(config);
		if (nodeError) {
			return { valid: false, error: nodeError };
		}

		return { valid: true, config };
	}

	private validateNodeToolExpressions(config: AgentJsonConfig): void {
		for (const tool of config.tools ?? []) {
			if (tool.type !== 'node') continue;

			extractFromAIParameters((tool.node.nodeParameters ?? {}) as INodeParameters);
		}
	}

	/**
	 * Persist a new AgentJsonConfig (full replace).
	 */
	async updateConfig(
		agentId: string,
		projectId: string,
		config: unknown,
	): Promise<{ config: AgentJsonConfig; updatedAt: string; versionId: string | null }> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		const credentialProvider = createAgentCredentialProvider(this.credentialsService, projectId);
		const accessibleCredentialIds = new Set(
			(await credentialProvider.list()).map((credential) => credential.id),
		);
		const sanitizedBaseConfig = sanitizeAgentJsonConfig(config);
		const sanitizedConfig = sanitizeUnknownAgentCredentials(
			sanitizedBaseConfig,
			accessibleCredentialIds,
		);

		const result = await this.validateConfig(sanitizedConfig);
		if (!result.valid) {
			throw new UserError(`Invalid agent config: ${result.error}`);
		}

		// Reconcile native web-search provider tools with the config's explicit
		// `webSearch` state. This is the single write path, so persisted config
		// always agrees with read/compose paths.
		const validatedConfig = reconcileNativeWebSearch(result.config);

		const tasksProvided = validatedConfig.tasks !== undefined;
		const existingTaskIds = tasksProvided
			? (await this.agentTaskRepository.findByAgentId(agentId)).map((task) => task.id)
			: [];

		const resolvedSubAgents = await this.removeMissingConfigRefs(
			validatedConfig,
			entity,
			new Set(existingTaskIds),
		);
		this.validateSubAgentRefs(resolvedSubAgents, entity);

		const previousIntegrations = entity.integrations ?? [];
		const previousSchema = entity.schema ?? null;

		const integrationsProvided = validatedConfig.integrations !== undefined;
		const toolsProvided = validatedConfig.tools !== undefined;
		const skillsProvided = validatedConfig.skills !== undefined;
		const credentialProvided = validatedConfig.credential !== undefined;
		const personalisationProvided = validatedConfig.personalisation !== undefined;
		const memoryProvided = validatedConfig.memory !== undefined;
		const subAgentsProvided = validatedConfig.subAgents !== undefined;
		const providerToolsProvided = validatedConfig.providerTools !== undefined;
		const configBlockProvided = validatedConfig.config !== undefined;
		const mcpServersProvided = validatedConfig.mcpServers !== undefined;
		const vectorStoresProvided = validatedConfig.vectorStores !== undefined;

		const { schemaConfig: decomposedSchema, integrations: decomposedIntegrations } =
			decomposeJsonConfig(validatedConfig);

		const nextIntegrations = integrationsProvided ? decomposedIntegrations : previousIntegrations;
		const nextPersonalisation = personalisationProvided
			? mergePersonalisationWithPreviousGradient(
					decomposedSchema.personalisation,
					previousSchema,
					config,
				)
			: undefined;

		const nextSchema: AgentJsonConfig = {
			...omitLegacyAgentDescription(previousSchema),
			name: decomposedSchema.name,
			model: decomposedSchema.model,
			instructions: decomposedSchema.instructions,
			...(credentialProvided ? { credential: decomposedSchema.credential } : {}),
			...(personalisationProvided ? { personalisation: nextPersonalisation } : {}),
			...(memoryProvided ? { memory: decomposedSchema.memory } : {}),
			...(subAgentsProvided ? { subAgents: decomposedSchema.subAgents } : {}),
			...(toolsProvided ? { tools: decomposedSchema.tools } : {}),
			...(skillsProvided ? { skills: decomposedSchema.skills } : {}),
			...(tasksProvided ? { tasks: decomposedSchema.tasks } : {}),
			...(providerToolsProvided ? { providerTools: decomposedSchema.providerTools } : {}),
			...(configBlockProvided ? { config: decomposedSchema.config } : {}),
			...(mcpServersProvided ? { mcpServers: decomposedSchema.mcpServers } : {}),
			...(vectorStoresProvided ? { vectorStores: decomposedSchema.vectorStores } : {}),
		};

		entity.schema = nextSchema;
		entity.name = validatedConfig.name;
		entity.integrations = nextIntegrations;
		markAgentDraftDirty(entity);

		if (toolsProvided) {
			const referencedIds = new Set(
				(validatedConfig.tools ?? [])
					.filter((t): t is Extract<AgentJsonToolConfig, { type: 'custom' }> => t.type === 'custom')
					.map((t) => t.id),
			);
			const orphanIds = Object.keys(entity.tools).filter((id) => !referencedIds.has(id));
			if (orphanIds.length > 0) {
				const tools = { ...entity.tools };
				for (const id of orphanIds) {
					delete tools[id];
				}
				entity.tools = tools;
			}
		}

		if (skillsProvided) {
			this.agentSkillsService.removeUnreferencedSkills(entity, validatedConfig);
		}

		this.runtimeCacheService.clearRuntimes(agentId);

		const saved = await this.agentRepository.save(entity);
		this.logger.debug('Updated agent JSON config', { agentId, projectId });

		if (tasksProvided) {
			const referencedTaskIds = new Set((validatedConfig.tasks ?? []).map((ref) => ref.id));
			const orphanTaskIds = existingTaskIds.filter((id) => !referencedTaskIds.has(id));
			if (orphanTaskIds.length > 0) {
				await this.agentTaskRepository.delete(orphanTaskIds);
			}
		}

		if (integrationsProvided) {
			await syncAgentIntegrations(saved, previousIntegrations, nextIntegrations, this.logger);
		}

		return {
			config: composeJsonConfig(saved) ?? validatedConfig,
			updatedAt: saved.updatedAt.toISOString(),
			versionId: saved.versionId,
		};
	}

	private async validateNodeToolConfigs(config: AgentJsonConfig): Promise<string | null> {
		const nodeTools = (config.tools ?? []).filter(
			(t): t is Extract<AgentJsonToolConfig, { type: 'node' }> => t.type === 'node',
		);

		if (nodeTools.length === 0) return null;

		const { setSchemaBaseDirs, validateNodeConfig } = await import('@n8n/workflow-sdk');

		const dirs = resolveBuiltinNodeDefinitionDirs();
		if (dirs.length > 0) {
			setSchemaBaseDirs(dirs);
		}

		const errors: string[] = [];

		for (const tool of nodeTools) {
			const nodeType: string = tool.node.nodeType;
			const nodeTypeVersion: number = tool.node.nodeTypeVersion;
			const nodeParameters = tool.node.nodeParameters ?? {};

			const result = validateNodeConfig(
				nodeType,
				nodeTypeVersion,
				{ parameters: nodeParameters },
				{ isToolNode: true },
			);

			if (!result.valid) {
				const messages = result.errors
					.map((e: { path: string; message: string }) => e.message)
					.join('; ');
				errors.push(`Node tool "${tool.name}" (${nodeType}@${nodeTypeVersion}): ${messages}`);
			}
		}

		return errors.length > 0 ? errors.join('\n') : null;
	}

	private async removeMissingConfigRefs(
		config: AgentJsonConfig,
		entity: Agent,
		existingTaskIds: ReadonlySet<string>,
	): Promise<ResolvedSubAgentRef[]> {
		if (config.skills !== undefined) {
			const skills = entity.skills ?? {};
			config.skills = config.skills.filter((ref) => Boolean(skills[ref.id]));
		}

		if (config.tools !== undefined) {
			const tools = entity.tools ?? {};
			config.tools = config.tools.filter((ref) => ref.type !== 'custom' || Boolean(tools[ref.id]));
		}

		if (config.tasks !== undefined) {
			config.tasks = config.tasks.filter((ref) => existingTaskIds.has(ref.id));
		}

		if (config.subAgents?.agents !== undefined) {
			const resolvedSubAgents = await resolveUniqueSubAgents({
				refs: config.subAgents.agents,
				projectId: entity.projectId,
				agentRepository: this.agentRepository,
			});
			config.subAgents.agents = resolvedSubAgents
				.filter(({ agent }) => agent !== null)
				.map(({ agentId, useWhen }) => ({
					agentId,
					...(useWhen ? { useWhen } : {}),
				}));
			return resolvedSubAgents;
		}

		return [];
	}

	private validateSubAgentRefs(resolvedSubAgents: ResolvedSubAgentRef[], entity: Agent) {
		for (const { agentId, agent } of resolvedSubAgents) {
			if (!agent) continue;
			if (agentId === entity.id) {
				throw new UserError('Invalid agent config: An agent cannot use itself as a subagent');
			}
			if (!agent.activeVersionId) {
				throw new UserError(`Invalid agent config: Subagent "${agentId}" must be published`);
			}
		}
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergePersonalisationWithPreviousGradient(
	personalisation: AgentJsonConfig['personalisation'],
	previousSchema: AgentJsonConfig | null,
	rawConfig: unknown,
): AgentJsonConfig['personalisation'] {
	if (!personalisation || !isRecord(rawConfig) || !isRecord(rawConfig.personalisation)) {
		return personalisation;
	}

	if (rawConfig.personalisation.gradient !== undefined) return personalisation;

	const previousGradient = previousSchema?.personalisation?.gradient;
	if (!previousGradient) return personalisation;

	return {
		...personalisation,
		gradient: previousGradient,
	};
}

function hasNodeToolInputSchema(raw: unknown): boolean {
	if (!isRecord(raw) || !Array.isArray(raw.tools)) return false;

	return raw.tools.some((tool) => isRecord(tool) && tool.type === 'node' && 'inputSchema' in tool);
}

function omitLegacyAgentDescription(config: AgentJsonConfig | null): Partial<AgentJsonConfig> {
	if (!config) return {};

	const { description: _description, ...rest } = config as AgentJsonConfig & {
		description?: unknown;
	};
	return rest;
}
