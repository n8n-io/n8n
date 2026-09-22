import { reconcileNativeWebSearch } from '@n8n/ai-utilities/agent-config';
import {
	AgentJsonConfigSchema,
	findVectorStoreToolNameCollisions,
	formatAgentConfigZodError,
	sanitizeAgentJsonConfig,
	type AgentConfigMutationResponse,
	type AgentJsonConfig,
	type AgentJsonToolConfig,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';

import {
	type AgentConfigPart,
	AgentModificationTelemetryService,
	diffAgentConfigParts,
	isUnconfiguredAgent,
	type AgentActor,
} from './agent-modification-telemetry.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentSetupCompletionService } from './agent-setup-completion.service';
import { AgentSkillsService } from './agent-skills.service';
import { AgentUpdateBroadcaster } from './agent-update-broadcaster';
import type { Agent } from './entities/agent.entity';
import { syncAgentIntegrations } from './integrations/integrations-sync';
import { composeJsonConfig, decomposeJsonConfig } from './json-config/agent-config-composition';
import { NodeToolAiGatewayService } from './json-config/node-tool-ai-gateway.service';
import { sanitizeUnknownAgentCredentials } from './json-config/sanitize-unknown-agent-credentials';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { normalizeWorkflowToolRefs } from './tools/workflow-tool-workflow-resolver';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { getAgentConfigHash } from './utils/agent-config-hash';
import { markAgentDraftDirty, saveAgentDraftFenced } from './utils/agent-draft.utils';
import {
	findHttpRequestToolUrlFromAiViolations,
	validateNodeToolConfigs,
	validateNodeToolExpressions,
} from './utils/node-tool-validation';
import { resolveUniqueSubAgents, type ResolvedSubAgentRef } from './utils/sub-agent-resolver';
import type { AgentsCredentialProvider } from './adapters/agents-credential-provider';

interface AgentConfigUpdateOptions {
	/** Hash of the config the caller read before editing; `null` when the agent had none. */
	baseConfigHash: string | null;
	clearOmittedOptionalFields?: boolean;
	modifiedBy: AgentActor;
	/** Push connection of the tab that made the change; excluded from the `agentUpdated` broadcast. */
	pushRef?: string;
}

interface ConfigReplacement {
	nextSchema: AgentJsonConfig;
	nextIntegrations: NonNullable<Agent['integrations']>;
	previousSchema: AgentJsonConfig | null;
	previousIntegrations: NonNullable<Agent['integrations']>;
	changedParts: AgentConfigPart[];
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
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeToolAiGatewayService: NodeToolAiGatewayService,
		private readonly eventService: EventService,
		private readonly setupCompletionService: AgentSetupCompletionService,
		private readonly modificationTelemetry: AgentModificationTelemetryService,
		private readonly agentUpdateBroadcaster: AgentUpdateBroadcaster,
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
			return { valid: false, error: formatAgentConfigZodError(parsed.error) };
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
			validateNodeToolExpressions(config.tools);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				valid: false,
				error: `Invalid $fromAI expression in node tool config: ${message}`,
			};
		}

		const urlViolations = findHttpRequestToolUrlFromAiViolations(config.tools);
		if (urlViolations.length > 0) {
			return {
				valid: false,
				error: urlViolations
					.map(
						({ toolName, path }) =>
							`HTTP Request tool "${toolName}" cannot use $fromAI in ${path}. Enter a fixed URL.`,
					)
					.join('\n'),
			};
		}

		const nodeError = await validateNodeToolConfigs(config.tools);
		if (nodeError) {
			return { valid: false, error: nodeError };
		}

		return { valid: true, config };
	}

	/**
	 * Persist a new AgentJsonConfig (full replace).
	 *
	 * By default an optional field absent from `config` retains its previous
	 * value. With `clearOmittedOptionalFields`, absence removes the field
	 * instead — true replace semantics for callers whose clients submit the
	 * complete config (e.g. MCP config.replace / config.patch, where an RFC
	 * 6902 `remove` op must actually remove the field).
	 */
	async updateConfig(
		agentId: string,
		projectId: string,
		config: unknown,
		user: User,
		options: AgentConfigUpdateOptions,
	): Promise<AgentConfigMutationResponse> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');
		if (options.baseConfigHash !== getAgentConfigHash(composeJsonConfig(entity))) {
			throw new ConflictError(
				'Agent config was changed elsewhere; reload to get the latest version',
			);
		}

		const { validatedConfig, credentialProvider, existingTaskIds } = await this.prepareConfig(
			entity,
			config,
			user,
		);
		const replacement = this.buildConfigReplacement(entity, validatedConfig, config, options);
		entity.schema = replacement.nextSchema;
		entity.name = validatedConfig.name;
		entity.integrations = replacement.nextIntegrations;
		markAgentDraftDirty(entity);
		this.removeUnreferencedResources(entity, validatedConfig);

		const saved = await this.saveConfig(entity, credentialProvider, user, options, replacement);
		return await this.finishConfigUpdate(saved, validatedConfig, existingTaskIds, replacement);
	}

	private async finishConfigUpdate(
		saved: Agent,
		validatedConfig: AgentJsonConfig,
		existingTaskIds: string[],
		replacement: ConfigReplacement,
	): Promise<AgentConfigMutationResponse> {
		await this.removeUnreferencedTasks(validatedConfig, existingTaskIds);
		if (validatedConfig.integrations !== undefined) {
			await syncAgentIntegrations(
				saved,
				replacement.previousIntegrations,
				replacement.nextIntegrations,
				this.logger,
			);
		}
		const savedConfig = composeJsonConfig(saved) ?? validatedConfig;
		return {
			config: savedConfig,
			configHash: getAgentConfigHash(savedConfig),
			updatedAt: saved.updatedAt.toISOString(),
			versionId: saved.versionId,
		};
	}

	private async removeUnreferencedTasks(
		config: AgentJsonConfig,
		existingTaskIds: string[],
	): Promise<void> {
		if (config.tasks === undefined) return;
		const referencedTaskIds = new Set(config.tasks.map((ref) => ref.id));
		const orphanTaskIds = existingTaskIds.filter((id) => !referencedTaskIds.has(id));
		if (orphanTaskIds.length > 0) await this.agentTaskRepository.delete(orphanTaskIds);
	}

	private async saveConfig(
		entity: Agent,
		credentialProvider: AgentsCredentialProvider,
		user: User,
		options: AgentConfigUpdateOptions,
		replacement: ConfigReplacement,
	) {
		const { id: agentId, projectId } = entity;
		const { changedParts, previousSchema, previousIntegrations } = replacement;
		this.runtimeCacheService.clearRuntimes(agentId);

		// Gate evaluated against the state about to be written; the marker is
		// claimed and reported only once that write succeeded.
		const emitSetupCompleted = await this.setupCompletionService.recordIfSetupComplete(
			entity,
			projectId,
			credentialProvider,
			user,
		);

		const saved = await saveAgentDraftFenced(this.agentRepository, entity);
		this.eventService.emit('agent-saved', { agentId });
		// Every config writer (editor, builder, MCP) lands here, so this is where
		// other open Agent Builder tabs learn that their loaded config is stale.
		this.agentUpdateBroadcaster.notify(
			{ projectId, agentId, source: options.modifiedBy },
			options.pushRef,
		);
		this.logger.debug('Updated agent JSON config', { agentId, projectId });

		this.modificationTelemetry.record({
			agent: saved,
			projectId,
			user,
			by: options.modifiedBy,
			changedParts,
			wasUnconfigured: isUnconfiguredAgent(previousSchema, previousIntegrations),
		});
		await emitSetupCompleted?.();
		return saved;
	}

	private removeUnreferencedResources(entity: Agent, config: AgentJsonConfig): void {
		if (config.tools !== undefined) this.removeUnreferencedCustomTools(entity, config);
		if (config.skills !== undefined)
			this.agentSkillsService.removeUnreferencedSkills(entity, config);
	}

	private removeUnreferencedCustomTools(entity: Agent, config: AgentJsonConfig): void {
		const referencedIds = new Set(
			(config.tools ?? [])
				.filter(
					(tool): tool is Extract<AgentJsonToolConfig, { type: 'custom' }> =>
						tool.type === 'custom',
				)
				.map((tool) => tool.id),
		);
		const orphanIds = Object.keys(entity.tools).filter((id) => !referencedIds.has(id));
		if (orphanIds.length === 0) return;
		const tools = { ...entity.tools };
		for (const id of orphanIds) delete tools[id];
		entity.tools = tools;
	}

	private buildConfigReplacement(
		entity: Agent,
		validatedConfig: AgentJsonConfig,
		rawConfig: unknown,
		options: AgentConfigUpdateOptions,
	): ConfigReplacement {
		const previousIntegrations = entity.integrations ?? [];
		const previousSchema = entity.schema ?? null;
		const { schemaConfig, integrations } = decomposeJsonConfig(validatedConfig);
		const nextIntegrations =
			validatedConfig.integrations !== undefined ? integrations : previousIntegrations;
		const nextSchema = this.mergeConfigSchema(
			schemaConfig,
			previousSchema,
			rawConfig,
			options.clearOmittedOptionalFields,
		);
		// Compare before the entity is changed.
		const changedParts = diffAgentConfigParts(
			previousSchema,
			nextSchema,
			previousIntegrations,
			nextIntegrations,
		);
		return { nextSchema, nextIntegrations, previousSchema, previousIntegrations, changedParts };
	}

	private mergeConfigSchema(
		decomposedSchema: AgentJsonConfig,
		previousSchema: AgentJsonConfig | null,
		config: unknown,
		clearOmitted: boolean | undefined,
	): AgentJsonConfig {
		// Under clearOmittedOptionalFields an omitted gradient is a deliberate
		// removal, so the schema default wins instead of the previous gradient.
		let nextPersonalisation = decomposedSchema.personalisation;
		if (decomposedSchema.personalisation !== undefined && !clearOmitted) {
			nextPersonalisation = mergePersonalisationWithPreviousGradient(
				decomposedSchema.personalisation,
				previousSchema,
				config,
			);
		}

		const nextSchema: AgentJsonConfig = {
			...omitLegacyAgentDescription(previousSchema),
			name: decomposedSchema.name,
			model: decomposedSchema.model,
			instructions: decomposedSchema.instructions,
			...(decomposedSchema.credential !== undefined
				? { credential: decomposedSchema.credential }
				: {}),
			...(decomposedSchema.personalisation !== undefined
				? { personalisation: nextPersonalisation }
				: {}),
			...(decomposedSchema.memory !== undefined ? { memory: decomposedSchema.memory } : {}),
			...(decomposedSchema.subAgents !== undefined
				? { subAgents: decomposedSchema.subAgents }
				: {}),
			...(decomposedSchema.tools !== undefined ? { tools: decomposedSchema.tools } : {}),
			...(decomposedSchema.skills !== undefined ? { skills: decomposedSchema.skills } : {}),
			...(decomposedSchema.tasks !== undefined ? { tasks: decomposedSchema.tasks } : {}),
			...(decomposedSchema.providerTools !== undefined
				? { providerTools: decomposedSchema.providerTools }
				: {}),
			...(decomposedSchema.config !== undefined ? { config: decomposedSchema.config } : {}),
			...(decomposedSchema.mcpServers !== undefined
				? { mcpServers: decomposedSchema.mcpServers }
				: {}),
			...(decomposedSchema.vectorStores !== undefined
				? { vectorStores: decomposedSchema.vectorStores }
				: {}),
		};
		this.normalizeOptionalConfigFields(nextSchema, decomposedSchema, clearOmitted);
		return nextSchema;
	}

	private normalizeOptionalConfigFields(
		nextSchema: AgentJsonConfig,
		validatedConfig: AgentJsonConfig,
		clearOmitted: boolean | undefined,
	): void {
		if (validatedConfig.modelDeploymentName !== undefined) {
			const deploymentName = validatedConfig.modelDeploymentName?.trim();
			if (deploymentName) {
				nextSchema.modelDeploymentName = deploymentName;
			} else {
				delete nextSchema.modelDeploymentName;
			}
		}

		if (clearOmitted) {
			clearOmittedOptionalFields(nextSchema, validatedConfig);
		}
	}

	private async prepareConfig(entity: Agent, config: unknown, user: User) {
		const { id: agentId, projectId } = entity;
		const credentialProvider = createAgentCredentialProvider(
			this.credentialsService,
			projectId,
			user,
		);
		const accessibleCredentials = await credentialProvider.list();
		const accessibleCredentialIds = new Set(
			accessibleCredentials.map((credential) => credential.id),
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

		if (validatedConfig.tools !== undefined) {
			await this.nodeToolAiGatewayService.assignManagedCredentials(
				validatedConfig.tools,
				new Set(accessibleCredentials.map((credential) => credential.type)),
			);
		}
		await normalizeWorkflowToolRefs(this.workflowRepository, validatedConfig, projectId);

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
		return { validatedConfig, credentialProvider, existingTaskIds };
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
		}
	}
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

/** Drop optional fields the submitted config omitted instead of retaining the previous value. */
function clearOmittedOptionalFields(schema: AgentJsonConfig, submitted: AgentJsonConfig): void {
	const optionalFields = [
		'credential',
		'modelDeploymentName',
		'personalisation',
		'memory',
		'subAgents',
		'tools',
		'skills',
		'tasks',
		'providerTools',
		'config',
		'mcpServers',
		'vectorStores',
	] as const;
	for (const field of optionalFields) {
		if (submitted[field] === undefined) delete schema[field];
	}
}

function omitLegacyAgentDescription(config: AgentJsonConfig | null): Partial<AgentJsonConfig> {
	if (!config) return {};

	const { description: _description, ...rest } = config as AgentJsonConfig & {
		description?: unknown;
	};
	return rest;
}
