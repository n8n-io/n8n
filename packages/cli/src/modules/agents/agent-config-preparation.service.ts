import { reconcileNativeWebSearch } from '@n8n/ai-utilities/agent-config';
import {
	AgentJsonConfigSchema,
	findVectorStoreToolNameCollisions,
	formatAgentConfigZodError,
	sanitizeAgentJsonConfig,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { WorkflowRepository, type User } from '@n8n/db';
import { ProjectScopeService } from '@n8n/backend-services';
import { Container, Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { getStaticSubworkflowId, UserError } from 'n8n-workflow';

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
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { assertSingleConnections } from './integrations/single-connection';
import { decomposeJsonConfig } from './json-config/agent-config-composition';
import { toAgentDocument, type AgentSkillRefs } from './json-config/agent-document';
import { pruneMissingConfigReferences } from './json-config/prune-missing-config-references';
import { AgentRepository } from './repositories/agent.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { resolveUniqueSubAgents, type ResolvedSubAgentRef } from './utils/sub-agent-resolver';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { NodeToolAiGatewayService } from './json-config/node-tool-ai-gateway.service';
import { sanitizeUnknownAgentCredentials } from './json-config/sanitize-unknown-agent-credentials';
import {
	findWorkflowToolWorkflows,
	normalizeWorkflowToolRefs,
} from './tools/workflow-tool-workflow-resolver';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import {
	findMissingAgentDefinitionBodies,
	type CompleteAgentDefinition,
	type PlannedAgentDestinations,
} from './utils/agent-definition';
import { extractAgentWorkflowRefs } from './utils/extract-agent-workflow-refs';
import { visitAgentCredentialReferences } from './utils/visit-agent-credential-references';
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

	async assertCanSaveDefinition(projectId: string, user: User, action: 'create' | 'update') {
		const projects = await Container.get(ProjectScopeService).getProjectIds(user, [
			'agent:read',
			`agent:${action}`,
		]);
		if (projects !== null && !projects.includes(projectId)) {
			throw new ForbiddenError('You do not have permission to save Agents in this project.');
		}
	}

	/** Use the same body and configuration checks for planning and complete saves. */
	async validateDefinition(
		agentId: string,
		definition: CompleteAgentDefinition,
	): Promise<CompleteAgentDefinition> {
		const [{ AgentSkillsService }, { AgentCustomToolsService }, { AgentTaskService }] =
			await Promise.all([
				import('./agent-skills.service.js'),
				import('./agent-custom-tools.service.js'),
				import('./agent-task.service.js'),
			]);
		Container.get(AgentSkillsService).validateSkills(Object.values(definition.skills));
		for (const tool of Object.values(definition.tools)) {
			Container.get(AgentCustomToolsService).validateDescriptor(tool.descriptor);
		}
		const tasks = Container.get(AgentTaskService);
		tasks.validateTasks([...definition.tasks.values()]);
		if (definition.tasks.size > 0) tasks.assertAgentHasConfig(definition.config !== null);
		const prepared = structuredClone(definition);
		if (prepared.config === null) return prepared;
		const result = await this.validateConfig(prepared.config);
		if (!result.valid) throw new UserError(result.error);
		assertSingleConnections(
			Container.get(ChatIntegrationRegistry),
			result.config.integrations ?? [],
		);
		prepared.config = reconcileNativeWebSearch(result.config);
		this.validateSubAgentRefs(prepared.config.subAgents?.agents ?? [], agentId);
		const [missingBody] = findMissingAgentDefinitionBodies(prepared);
		if (missingBody) {
			throw new UserError(
				`Agent references ${missingBody.kind} asset "${missingBody.id}" without a body.`,
			);
		}
		return prepared;
	}

	/** Complete saves reject missing references. Editor repair must not erase bound content. */
	async prepareDefinition(
		agentId: string,
		definition: CompleteAgentDefinition,
		projectId: string,
		user: User,
		planned: PlannedAgentDestinations = {},
	) {
		const prepared = await this.validateDefinition(agentId, definition);
		const credentialProvider = createAgentCredentialProvider(
			this.credentialsService,
			projectId,
			user,
		);
		if (prepared.config !== null) {
			const accessibleCredentials = await credentialProvider.list();
			const accessibleIds = new Set(accessibleCredentials.map(({ id }) => id));
			visitAgentCredentialReferences(prepared.config, ({ id, path, managedToken }) => {
				if (id && id !== managedToken && !accessibleIds.has(id)) {
					throw new UserError(
						`Credential "${id}" at ${path.join('.')} is missing or inaccessible.`,
					);
				}
			});
			if (prepared.config.tools !== undefined) {
				await this.nodeToolAiGatewayService.assignManagedCredentials(
					prepared.config.tools.filter((tool) => tool.enabled !== false),
					new Set(accessibleCredentials.map((credential) => credential.type)),
				);
			}
			await this.validateAgentDestinations(prepared.config, projectId, user, planned);
			await normalizeWorkflowToolRefs(this.workflowRepository, prepared.config, projectId);
			await this.validateWorkflowDestinations(prepared.config, projectId, user, planned);
		}
		return { definition: prepared, credentialProvider };
	}

	private async validateAgentDestinations(
		config: AgentJsonConfig,
		projectId: string,
		user: User,
		planned: PlannedAgentDestinations,
	): Promise<void> {
		const ids = (config.subAgents?.agents ?? []).map(({ agentId }) => agentId);
		if (ids.length === 0) return;
		const existing = new Map(
			(await Container.get(AgentRepository).findImportIdOwners(ids)).map((agent) => [
				agent.id,
				agent.projectId,
			]),
		);
		for (const id of ids) {
			if (existing.has(id)) {
				if (existing.get(id) === projectId) continue;
			} else if (planned.agents?.get(id) === projectId) {
				await this.assertCanSaveDefinition(projectId, user, 'create');
				continue;
			}
			throw new UserError(`Subagent "${id}" is missing or inaccessible in this project.`);
		}
	}

	private async validateWorkflowDestinations(
		config: AgentJsonConfig,
		projectId: string,
		user: User,
		planned: PlannedAgentDestinations,
	): Promise<void> {
		const refs = extractAgentWorkflowRefs(config);
		const workflows = await findWorkflowToolWorkflows(this.workflowRepository, refs, projectId);
		const localIds = refs.map(
			(ref) => workflows.get(ref.workflowId ?? ref.workflow)?.id ?? ref.workflowId,
		);
		if (localIds.some((id) => !id))
			throw new UserError('A workflow tool references a missing workflow.');
		const ids = new Set(localIds.filter((id): id is string => id !== undefined));
		for (const tool of config.tools ?? []) {
			if (tool.type !== 'node') continue;
			const id = getStaticSubworkflowId({
				type: tool.node.nodeType,
				parameters: tool.node.nodeParameters,
			});
			if (id) ids.add(id);
		}
		if (ids.size === 0) return;
		const projectLocal = new Set(ids);
		const finder = Container.get(WorkflowFinderService);
		const readable = await finder.findWorkflowIdsWithScopeForUser([...ids], user, [
			'workflow:read',
		]);
		const local = await finder.findWorkflowIdsWithScopeForUser(
			[...projectLocal],
			user,
			['workflow:read'],
			projectId,
		);
		const existing = await finder.findExistingWorkflowIds([...ids]);
		for (const id of ids) {
			if (readable.has(id) && (!projectLocal.has(id) || local.has(id))) continue;
			const destination = planned.workflows?.get(id);
			if (
				!existing.has(id) &&
				destination &&
				(!projectLocal.has(id) || destination === projectId)
			) {
				const projects = await Container.get(ProjectScopeService).getProjectIds(user, [
					'workflow:read',
					'workflow:create',
				]);
				if (projects === null || projects.includes(destination)) continue;
			}
			throw new UserError(`Workflow "${id}" is missing or inaccessible.`);
		}
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

		// Trimmed by the schema; an empty string clears the stored value.
		if (decomposedSchema.description === '') delete nextSchema.description;
		// Agents no longer use a separate deployment name. Older configs still
		// carry it, so drop it here rather than keep it from `previousSchema`.
		Reflect.deleteProperty(nextSchema, 'modelDeploymentName');
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
		this.validateSubAgentRefs(resolvedSubAgents, entity.id);
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

	validateSubAgentRefs(resolvedSubAgents: Array<{ agentId: string }>, ownerAgentId: string) {
		for (const { agentId } of resolvedSubAgents) {
			if (agentId === ownerAgentId) {
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
