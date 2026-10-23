import { reconcileNativeWebSearch } from '@n8n/ai-utilities/agent-config';
import {
	AgentJsonConfigSchema,
	findVectorStoreToolNameCollisions,
	formatAgentConfigZodError,
	sanitizeAgentJsonConfig,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import type { PolicyActor } from '@/policy/policy-enforcement-backend';

import {
	diffAgentConfigParts,
	diffAgentConfigSettings,
	type AgentConfigPart,
	type AgentConfigSetting,
} from './agent-modification-telemetry.service';
import { AgentPolicyService } from './agent-policy.service';
import { AgentSkillRefsService } from './agent-skill-refs.service';
import type { Agent, ProjectAgent } from './entities/agent.entity';
import { decomposeJsonConfig } from './json-config/agent-config-composition';
import { toAgentDocument, type AgentSkillRefs } from './json-config/agent-document';
import { pruneMissingConfigReferences } from './json-config/prune-missing-config-references';
import { AgentRepository } from './repositories/agent.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { resolveUniqueSubAgents, type ResolvedSubAgentRef } from './utils/sub-agent-resolver';

import { NodeToolAiGatewayService } from './json-config/node-tool-ai-gateway.service';
import { sanitizeUnknownAgentCredentials } from './json-config/sanitize-unknown-agent-credentials';
import { normalizeWorkflowToolRefs } from './tools/workflow-tool-workflow-resolver';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import {
	findHttpRequestToolUrlFromAiViolations,
	validateNodeToolConfigs,
	validateNodeToolExpressions,
} from './utils/node-tool-validation';

export interface ConfigReplacement {
	nextSchema: AgentJsonConfig;
	nextIntegrations: NonNullable<Agent['integrations']>;
	previousIntegrations: NonNullable<Agent['integrations']>;
	changedParts: AgentConfigPart[];
	changedSettings: AgentConfigSetting[];
}

@Service()
export class AgentConfigPreparationService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeToolAiGatewayService: NodeToolAiGatewayService,
		private readonly agentRepository: AgentRepository,
		private readonly agentTaskRepository: AgentTaskRepository,
		private readonly agentSkillRefs: AgentSkillRefsService,
		private readonly agentPolicyService: AgentPolicyService,
	) {}

	async prepareForSave(
		entity: ProjectAgent,
		rawConfig: unknown,
		user: User,
		{
			previousSkillRefs,
			clearOmitted = false,
			isNew = false,
			actor = { kind: 'user', user },
		}: {
			previousSkillRefs: AgentSkillRefs;
			clearOmitted?: boolean;
			isNew?: boolean;
			actor?: PolicyActor;
		},
	) {
		const { validatedConfig, credentialProvider } = await this.prepareConfig(
			rawConfig,
			entity.projectId,
			user,
		);
		const previousSchema = entity.schema ? toAgentDocument(entity.schema, previousSkillRefs) : null;
		const existingTaskIds = await this.reconcileConfigReferences(
			entity,
			previousSchema,
			validatedConfig,
			clearOmitted,
		);
		const replacement = await this.buildConfigReplacement(
			entity,
			previousSchema,
			validatedConfig,
			rawConfig,
			clearOmitted,
		);
		await this.agentPolicyService.enforceSave(
			entity.projectId,
			isNew ? null : entity.id,
			replacement.nextSchema,
			isNew ? null : previousSchema,
			actor,
		);
		return { validatedConfig, credentialProvider, replacement, existingTaskIds };
	}

	async prepareConfig(config: unknown, projectId: string, user: User) {
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

		// Keep persisted provider tools consistent with the web-search settings.
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

	/** Validate the config shape and the node tool schemas. */
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

		const urlViolations = findHttpRequestToolUrlFromAiViolations(config.tools).filter(
			({ toolIndex }) => config.tools?.[toolIndex].enabled !== false,
		);
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

	private async buildConfigReplacement(
		entity: ProjectAgent,
		previousSchema: AgentJsonConfig | null,
		validatedConfig: AgentJsonConfig,
		rawConfig: unknown,
		clearOmitted: boolean,
	): Promise<ConfigReplacement> {
		const previousIntegrations = entity.integrations ?? [];
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
		if (nextSchema.skills !== undefined) {
			nextSchema.skills = await this.agentSkillRefs.effectiveDraftRefs(
				entity,
				nextSchema.skills,
				{},
			);
		}
		const changedParts = diffAgentConfigParts(
			previousSchema,
			nextSchema,
			previousIntegrations,
			nextIntegrations,
		);
		const changedSettings = diffAgentConfigSettings(previousSchema, nextSchema);
		return {
			nextSchema,
			nextIntegrations,
			previousIntegrations,
			changedParts,
			changedSettings,
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

	private async reconcileConfigReferences(
		entity: ProjectAgent,
		previousSchema: AgentJsonConfig | null,
		config: AgentJsonConfig,
		clearOmitted: boolean,
	) {
		const existingTaskIds = writesField(config, 'tasks', clearOmitted)
			? (await this.agentTaskRepository.findByAgentId(entity.id)).map((task) => task.id)
			: [];
		pruneMissingConfigReferences(config, previousSchema, {
			tools: entity.tools ?? {},
			taskIds: new Set(existingTaskIds),
		});
		const resolvedSubAgents = await this.reconcileSubAgentReferences(config, entity);
		this.validateSubAgentRefs(resolvedSubAgents, entity);
		return existingTaskIds;
	}

	private async reconcileSubAgentReferences(
		config: AgentJsonConfig,
		entity: ProjectAgent,
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

	private validateSubAgentRefs(resolvedSubAgents: ResolvedSubAgentRef[], entity: ProjectAgent) {
		for (const { agentId } of resolvedSubAgents) {
			if (agentId === entity.id) {
				throw new UserError('Invalid agent config: An agent cannot use itself as a subagent');
			}
		}
	}
}

function hasNodeToolInputSchema(raw: unknown): boolean {
	if (!isRecord(raw) || !Array.isArray(raw.tools)) return false;

	return raw.tools.some((tool) => isRecord(tool) && tool.type === 'node' && 'inputSchema' in tool);
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
export function writesField(
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
