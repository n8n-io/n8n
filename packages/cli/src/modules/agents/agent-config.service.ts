import { reconcileNativeWebSearch } from '@n8n/ai-utilities/agent-config';
import { extractFromAIParameters } from '@n8n/ai-utilities/fromai-helpers';
import {
	AgentJsonConfigSchema,
	findAgentToolNameCollisions,
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
import { isAgentToolNodeType } from './agents-tools.service';
import type { Agent } from './entities/agent.entity';
import {
	AgentConfigNodeValidationError,
	type AgentConfigNodeValidationIssue,
} from './errors/agent-config-node-validation.error';
import {
	AgentConfigReferenceValidationError,
	type AgentConfigReferenceIssue,
} from './errors/agent-config-reference-validation.error';
import { syncAgentIntegrations } from './integrations/integrations-sync';
import { composeJsonConfig, decomposeJsonConfig } from './json-config/agent-config-composition';
import { sanitizeUnknownAgentCredentials } from './json-config/sanitize-unknown-agent-credentials';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { markAgentDraftDirty } from './utils/agent-draft.utils';
import { resolveUniqueSubAgents, type ResolvedSubAgentRef } from './utils/sub-agent-resolver';

export interface AgentConfigUpdateOptions {
	missingReferencePolicy?: 'drop' | 'error';
}

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
	): Promise<
		| { valid: true; config: AgentJsonConfig }
		| { valid: false; error: string }
		| { valid: false; error: string; nodeIssues: AgentConfigNodeValidationIssue[] }
	> {
		if (hasNodeToolInputSchema(raw)) {
			return { valid: false, error: 'Node tool configs must not include inputSchema.' };
		}

		const parsed = AgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(raw));
		if (!parsed.success) {
			return { valid: false, error: parsed.error.message };
		}

		const config = parsed.data;
		const duplicateToolNames = findAgentToolNameCollisions(config);
		if (duplicateToolNames.length > 0) {
			return {
				valid: false,
				error: `Agent tool names collide after provider normalization: ${duplicateToolNames.join(', ')}`,
			};
		}

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

		const nodeIssues = await this.validateNodeToolConfigs(config);
		if (nodeIssues.length > 0) {
			return {
				valid: false,
				error: nodeIssues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'),
				nodeIssues,
			};
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
		options: AgentConfigUpdateOptions = {},
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
			if ('nodeIssues' in result) {
				throw new AgentConfigNodeValidationError(result.nodeIssues);
			}
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
			options.missingReferencePolicy ?? 'drop',
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

	private async validateNodeToolConfigs(
		config: AgentJsonConfig,
	): Promise<AgentConfigNodeValidationIssue[]> {
		const nodeTools: Array<{
			tool: Extract<AgentJsonToolConfig, { type: 'node' }>;
			index: number;
		}> = [];
		for (const [index, tool] of (config.tools ?? []).entries()) {
			if (tool.type === 'node') nodeTools.push({ tool, index });
		}

		if (nodeTools.length === 0) return [];

		const { setSchemaBaseDirs, validateNodeConfig } = await import('@n8n/workflow-sdk');

		const dirs = resolveBuiltinNodeDefinitionDirs();
		if (dirs.length > 0) {
			setSchemaBaseDirs(dirs);
		}

		const issues: AgentConfigNodeValidationIssue[] = [];

		for (const { tool, index } of nodeTools) {
			const nodeType: string = tool.node.nodeType;
			const nodeTypeVersion: number = tool.node.nodeTypeVersion;
			const nodeParameters = tool.node.nodeParameters ?? {};
			if (!isAgentToolNodeType(nodeType)) {
				issues.push({
					code: 'NODE_NOT_AGENT_TOOL',
					path: `tools.${index}.node.nodeType`,
					message: `Node tool "${tool.name}" uses "${nodeType}", which is not available as an Agent tool.`,
					toolName: tool.name,
					nodeType,
					nodeTypeVersion,
				});
				continue;
			}

			const result = validateNodeConfig(
				nodeType,
				nodeTypeVersion,
				{ parameters: nodeParameters },
				{ isToolNode: true },
			);

			if (!result.valid) {
				for (const error of result.errors) {
					const parameterPath = error.path
						.replace(/^\/?parameters(?:\.|\/)?/, '')
						.replaceAll('/', '.');
					issues.push({
						code: 'INVALID_NODE_PARAMETERS',
						path: `tools.${index}.node.nodeParameters${parameterPath ? `.${parameterPath}` : ''}`,
						message: error.message,
						toolName: tool.name,
						nodeType,
						nodeTypeVersion,
					});
				}
			}
		}

		return issues;
	}

	private async removeMissingConfigRefs(
		config: AgentJsonConfig,
		entity: Agent,
		existingTaskIds: ReadonlySet<string>,
		missingReferencePolicy: 'drop' | 'error',
	): Promise<ResolvedSubAgentRef[]> {
		const issues: AgentConfigReferenceIssue[] = [];

		if (config.skills !== undefined) {
			const skills = entity.skills ?? {};
			config.skills.forEach((ref, index) => {
				if (!skills[ref.id]) {
					issues.push({
						path: `skills.${index}.id`,
						message: `Skill "${ref.id}" does not exist on this agent.`,
					});
				}
			});
			if (missingReferencePolicy === 'drop') {
				config.skills = config.skills.filter((ref) => Boolean(skills[ref.id]));
			}
		}

		if (config.tools !== undefined) {
			const tools = entity.tools ?? {};
			config.tools.forEach((ref, index) => {
				if (ref.type === 'custom' && !tools[ref.id]) {
					issues.push({
						path: `tools.${index}.id`,
						message: `Custom tool "${ref.id}" does not exist on this agent.`,
					});
				}
			});
			if (missingReferencePolicy === 'drop') {
				config.tools = config.tools.filter(
					(ref) => ref.type !== 'custom' || Boolean(tools[ref.id]),
				);
			}
		}

		if (config.tasks !== undefined) {
			config.tasks.forEach((ref, index) => {
				if (!existingTaskIds.has(ref.id)) {
					issues.push({
						path: `tasks.${index}.id`,
						message: `Task "${ref.id}" does not exist on this agent.`,
					});
				}
			});
			if (missingReferencePolicy === 'drop') {
				config.tasks = config.tasks.filter((ref) => existingTaskIds.has(ref.id));
			}
		}

		let resolvedSubAgents: ResolvedSubAgentRef[] = [];
		if (config.subAgents?.agents !== undefined) {
			resolvedSubAgents = await resolveUniqueSubAgents({
				refs: config.subAgents.agents,
				projectId: entity.projectId,
				agentRepository: this.agentRepository,
			});
			for (const { agentId, agent } of resolvedSubAgents) {
				if (agent) continue;
				const index = config.subAgents.agents.findIndex((ref) => ref.agentId === agentId);
				issues.push({
					path: `subAgents.agents.${index}.agentId`,
					message: `Sub-agent "${agentId}" is not available in this project.`,
				});
			}

			if (missingReferencePolicy === 'error' && issues.length > 0) {
				throw new AgentConfigReferenceValidationError(issues);
			}

			config.subAgents.agents = resolvedSubAgents
				.filter(({ agent }) => agent !== null)
				.map(({ agentId, useWhen }) => ({
					agentId,
					...(useWhen ? { useWhen } : {}),
				}));
		}

		if (missingReferencePolicy === 'error' && issues.length > 0) {
			throw new AgentConfigReferenceValidationError(issues);
		}

		return resolvedSubAgents;
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
