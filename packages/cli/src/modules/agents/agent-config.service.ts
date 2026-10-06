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
import { TransactionRunner, WorkflowRepository, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@n8n/errors';

import {
	type AgentConfigPart,
	diffAgentConfigParts,
	isUnconfiguredAgent,
	type AgentActor,
} from './agent-modification-telemetry.service';
import { AgentSaveCompletionService } from './agent-save-completion.service';
import { AgentSetupCompletionService } from './agent-setup-completion.service';
import { AgentSkillsService } from './agent-skills.service';
import type { Agent } from './entities/agent.entity';
import { syncAgentIntegrations } from './integrations/integrations-sync';
import { composeJsonConfig, decomposeJsonConfig } from './json-config/agent-config-composition';
import { pruneMissingConfigReferences } from './json-config/prune-missing-config-references';
import { NodeToolAiGatewayService } from './json-config/node-tool-ai-gateway.service';
import { sanitizeUnknownAgentCredentials } from './json-config/sanitize-unknown-agent-credentials';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { getAgentOrThrow } from './utils/get-agent-or-throw';
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
		private readonly credentialsService: CredentialsService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeToolAiGatewayService: NodeToolAiGatewayService,
		private readonly setupCompletionService: AgentSetupCompletionService,
		private readonly transactionRunner: TransactionRunner,
		private readonly saveCompletion: AgentSaveCompletionService,
	) {}

	/**
	 * Get the JSON config for an agent.
	 */
	async getConfig(agentId: string, projectId: string): Promise<AgentJsonConfig> {
		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);
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
		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);
		if (options.baseConfigHash !== getAgentConfigHash(composeJsonConfig(entity))) {
			throw new ConflictError(
				'Agent config was changed elsewhere; reload to get the latest version',
			);
		}

		const clearOmitted = options.clearOmittedOptionalFields === true;
		const { validatedConfig, credentialProvider } = await this.prepareConfig(
			config,
			projectId,
			user,
		);
		const existingTaskIds = await this.reconcileConfigReferences(
			entity,
			validatedConfig,
			clearOmitted,
		);
		const replacement = this.buildConfigReplacement(entity, validatedConfig, config, clearOmitted);
		entity.schema = replacement.nextSchema;
		entity.name = validatedConfig.name;
		entity.integrations = replacement.nextIntegrations;
		markAgentDraftDirty(entity);
		this.removeUnreferencedResources(entity, validatedConfig, clearOmitted);

		const saved = await this.saveConfig(
			entity,
			credentialProvider,
			user,
			options,
			replacement,
			existingTaskIds,
		);
		return await this.finishConfigUpdate(saved, validatedConfig, replacement, clearOmitted);
	}

	private async finishConfigUpdate(
		saved: Agent,
		validatedConfig: AgentJsonConfig,
		replacement: ConfigReplacement,
		clearOmitted: boolean,
	): Promise<AgentConfigMutationResponse> {
		if (writesField(validatedConfig, 'integrations', clearOmitted)) {
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
		agent: Agent,
		existingTaskIds: string[],
		ctx: OperationContext,
	): Promise<void> {
		const referencedTaskIds = new Set((agent.schema?.tasks ?? []).map((ref) => ref.id));
		const orphanTaskIds = existingTaskIds.filter((id) => !referencedTaskIds.has(id));
		if (orphanTaskIds.length > 0) {
			await this.agentTaskRepository.deleteForAgent(agent.id, orphanTaskIds, ctx);
		}
	}

	private async saveConfig(
		entity: Agent,
		credentialProvider: AgentsCredentialProvider,
		user: User,
		options: AgentConfigUpdateOptions,
		replacement: ConfigReplacement,
		existingTaskIds: string[],
	) {
		const { id: agentId, projectId } = entity;
		const { changedParts, previousSchema, previousIntegrations } = replacement;

		// Gate evaluated against the state about to be written; the marker is
		// claimed and reported only once that write succeeded.
		const emitSetupCompleted = await this.setupCompletionService.recordIfSetupComplete(
			entity,
			projectId,
			credentialProvider,
			user,
		);

		const saved = await this.transactionRunner.run({}, async (ctx) => {
			await saveAgentDraftFenced(this.agentRepository, entity, ctx);
			await this.removeUnreferencedTasks(entity, existingTaskIds, ctx);
			return entity;
		});
		await this.saveCompletion.configurationSaved(
			{
				agent: saved,
				projectId,
				user,
				by: options.modifiedBy,
				changedParts,
				wasUnconfigured: isUnconfiguredAgent(previousSchema, previousIntegrations),
			},
			options.pushRef,
			emitSetupCompleted,
		);
		this.logger.debug('Updated agent JSON config', { agentId, projectId });
		return saved;
	}

	private removeUnreferencedResources(
		entity: Agent,
		config: AgentJsonConfig,
		clearOmitted: boolean,
	): void {
		if (writesField(config, 'tools', clearOmitted)) {
			this.removeUnreferencedCustomTools(entity, config);
		}
		if (writesField(config, 'skills', clearOmitted)) {
			this.agentSkillsService.removeUnreferencedSkills(entity, config);
		}
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
		clearOmitted: boolean,
	): ConfigReplacement {
		const previousIntegrations = entity.integrations ?? [];
		const previousSchema = entity.schema ?? null;
		const { schemaConfig, integrations } = decomposeJsonConfig(validatedConfig);
		const nextIntegrations = writesField(validatedConfig, 'integrations', clearOmitted)
			? integrations
			: previousIntegrations;
		const nextSchema = this.mergeConfigSchema(
			schemaConfig,
			previousSchema,
			rawConfig,
			clearOmitted,
		);
		// Compare before the entity is changed.
		const changedParts = diffAgentConfigParts(
			previousSchema,
			nextSchema,
			previousIntegrations,
			nextIntegrations,
		);
		return {
			nextSchema,
			nextIntegrations,
			previousSchema,
			previousIntegrations,
			changedParts,
		};
	}

	private mergeConfigSchema(
		decomposedSchema: AgentJsonConfig,
		previousSchema: AgentJsonConfig | null,
		config: unknown,
		clearOmitted: boolean,
	): AgentJsonConfig {
		const nextSchema: AgentJsonConfig = {
			...previousSchema,
			name: decomposedSchema.name,
			model: decomposedSchema.model,
			instructions: decomposedSchema.instructions,
		};
		for (const field of OPTIONAL_SCHEMA_FIELDS) {
			applyOptionalField(nextSchema, decomposedSchema, field, clearOmitted);
		}

		// Under clearOmittedOptionalFields an omitted gradient is a deliberate
		// removal, so the schema default wins instead of the previous gradient.
		if (decomposedSchema.personalisation !== undefined && !clearOmitted) {
			nextSchema.personalisation = mergePersonalisationWithPreviousGradient(
				decomposedSchema.personalisation,
				previousSchema,
				config,
			);
		}

		// Both are trimmed by the schema; an empty string clears the stored value.
		for (const field of ['description', 'modelDeploymentName'] as const) {
			if (decomposedSchema[field] === '') delete nextSchema[field];
		}
		return nextSchema;
	}

	private async prepareConfig(config: unknown, projectId: string, user: User) {
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
				validatedConfig.tools.filter((tool) => tool.enabled !== false),
				new Set(accessibleCredentials.map((credential) => credential.type)),
			);
		}
		await normalizeWorkflowToolRefs(this.workflowRepository, validatedConfig, projectId);

		return { validatedConfig, credentialProvider };
	}

	private async reconcileConfigReferences(
		entity: Agent,
		config: AgentJsonConfig,
		clearOmitted: boolean,
	) {
		const existingTaskIds = writesField(config, 'tasks', clearOmitted)
			? (await this.agentTaskRepository.findByAgentId(entity.id)).map((task) => task.id)
			: [];
		pruneMissingConfigReferences(config, entity.schema, {
			tools: entity.tools ?? {},
			skills: entity.skills ?? {},
			taskIds: new Set(existingTaskIds),
		});
		const resolvedSubAgents = await this.reconcileSubAgentReferences(config, entity);
		this.validateSubAgentRefs(resolvedSubAgents, entity);
		return existingTaskIds;
	}

	private async reconcileSubAgentReferences(
		config: AgentJsonConfig,
		entity: Agent,
	): Promise<ResolvedSubAgentRef[]> {
		if (config.subAgents?.agents !== undefined) {
			const existingAgentIds = new Set(
				(entity.schema?.subAgents?.agents ?? []).map((ref) => ref.agentId),
			);
			const resolvedSubAgents = await resolveUniqueSubAgents({
				refs: config.subAgents.agents,
				projectId: entity.projectId,
				agentRepository: this.agentRepository,
			});
			config.subAgents.agents = resolvedSubAgents
				.filter(({ agentId, agent }) => existingAgentIds.has(agentId) || agent !== null)
				.map(({ agent: _agent, ...ref }) => ref);
			return resolvedSubAgents;
		}

		return [];
	}

	private validateSubAgentRefs(resolvedSubAgents: ResolvedSubAgentRef[], entity: Agent) {
		for (const { agentId } of resolvedSubAgents) {
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

const OPTIONAL_SCHEMA_FIELDS = [
	'credential',
	'description',
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

/**
 * Whether a write decides `field`. A sent value always does. An omitted field
 * does only when the write clears omitted fields; otherwise it keeps the stored value.
 */
function writesField(
	config: AgentJsonConfig,
	field: keyof AgentJsonConfig,
	clearOmitted: boolean,
): boolean {
	return config[field] !== undefined || clearOmitted;
}

function applyOptionalField<K extends keyof AgentJsonConfig>(
	target: AgentJsonConfig,
	submitted: AgentJsonConfig,
	field: K,
	clearOmitted: boolean,
): void {
	if (!writesField(submitted, field, clearOmitted)) return;
	if (submitted[field] === undefined) delete target[field];
	else target[field] = submitted[field];
}
