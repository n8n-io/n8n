import { reconcileNativeWebSearch } from '@n8n/ai-utilities/agent-config';
import {
	AgentJsonConfigSchema,
	findVectorStoreToolNameCollisions,
	formatAgentConfigZodError,
	sanitizeAgentJsonConfig,
	type AgentJsonConfig,
	type AgentJsonTaskConfig,
	type AgentJsonToolConfig,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';

import {
	AgentModificationTelemetryService,
	diffAgentConfigParts,
	isUnconfiguredAgent,
	type AgentActor,
} from './agent-modification-telemetry.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentSetupCompletionService } from './agent-setup-completion.service';
import { AgentSkillsService } from './agent-skills.service';
import type { Agent } from './entities/agent.entity';
import { isValidCronExpression } from './integrations/cron-validation';
import { syncAgentIntegrations } from './integrations/integrations-sync';
import { composeJsonConfig, decomposeJsonConfig } from './json-config/agent-config-composition';
import { NodeToolAiGatewayService } from './json-config/node-tool-ai-gateway.service';
import { sanitizeUnknownAgentCredentials } from './json-config/sanitize-unknown-agent-credentials';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { normalizeWorkflowToolRefs } from './tools/workflow-tool-workflow-resolver';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { markAgentDraftDirty } from './utils/agent-draft.utils';
import { generateAgentResourceId } from './utils/agent-resource-id';
import { validateNodeToolConfigs, validateNodeToolExpressions } from './utils/node-tool-validation';
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
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeToolAiGatewayService: NodeToolAiGatewayService,
		private readonly eventService: EventService,
		private readonly setupCompletionService: AgentSetupCompletionService,
		private readonly modificationTelemetry: AgentModificationTelemetryService,
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
		return await this.embedTaskDefinitions(agentId, config);
	}

	/**
	 * Fill in each task ref's body (name/objective/cronExpression) from
	 * `agent_task_definition` so the composed config — and anything exported
	 * from it, like the builder's "Export JSON" — is a portable, self-contained
	 * definition rather than a reference that only resolves on this agent.
	 */
	private async embedTaskDefinitions(
		agentId: string,
		config: AgentJsonConfig,
	): Promise<AgentJsonConfig> {
		if (!config.tasks?.length) return config;

		const tasks = await this.agentTaskRepository.findByAgentId(agentId);
		const bodyById = new Map(tasks.map((task) => [task.id, task]));

		return {
			...config,
			tasks: config.tasks.map((ref) => {
				const body = bodyById.get(ref.id);
				return body
					? {
							...ref,
							name: body.name,
							objective: body.objective,
							cronExpression: body.cronExpression,
						}
					: ref;
			}),
		};
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
		options: { clearOmittedOptionalFields?: boolean; modifiedBy: AgentActor },
	): Promise<{ config: AgentJsonConfig; updatedAt: string; versionId: string | null }> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

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
			await normalizeWorkflowToolRefs(this.workflowRepository, validatedConfig.tools, projectId);
		}

		const tasksProvided = validatedConfig.tasks !== undefined;
		const existingTaskIds = new Set(
			tasksProvided
				? (await this.agentTaskRepository.findByAgentId(agentId)).map((task) => task.id)
				: [],
		);
		// Snapshot before backfilling: used below to find rows that are no
		// longer referenced, without newly-created ids ever counting as orphans.
		const preUpdateTaskIds = [...existingTaskIds];

		if (tasksProvided) {
			await this.createMissingTaskDefinitions(agentId, validatedConfig.tasks, existingTaskIds);
		}

		const resolvedSubAgents = await this.removeMissingConfigRefs(
			validatedConfig,
			entity,
			existingTaskIds,
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
		// Under clearOmittedOptionalFields an omitted gradient is a deliberate
		// removal, so the schema default wins instead of the previous gradient.
		const nextPersonalisation = personalisationProvided
			? options?.clearOmittedOptionalFields
				? decomposedSchema.personalisation
				: mergePersonalisationWithPreviousGradient(
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
			// Strip any embedded body back to a bare ref — the schema only ever
			// stores membership + enabled; the body lives in `agent_task_definition`.
			...(tasksProvided ? { tasks: decomposedSchema.tasks?.map(toBareTaskRef) } : {}),
			...(providerToolsProvided ? { providerTools: decomposedSchema.providerTools } : {}),
			...(configBlockProvided ? { config: decomposedSchema.config } : {}),
			...(mcpServersProvided ? { mcpServers: decomposedSchema.mcpServers } : {}),
			...(vectorStoresProvided ? { vectorStores: decomposedSchema.vectorStores } : {}),
		};

		if (options?.clearOmittedOptionalFields) {
			clearOmittedOptionalFields(nextSchema, validatedConfig);
		}

		// Diffed against what is about to be written, before `entity` is mutated.
		const changedParts = diffAgentConfigParts(
			previousSchema,
			nextSchema,
			previousIntegrations,
			nextIntegrations,
		);

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

		// Gate evaluated against the state about to be written; the marker is
		// claimed and reported only once that write succeeded.
		const emitSetupCompleted = await this.setupCompletionService.recordIfSetupComplete(
			entity,
			projectId,
			credentialProvider,
			user,
		);

		const saved = await this.agentRepository.save(entity);
		this.eventService.emit('agent-saved', { agentId });
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

		if (tasksProvided) {
			const referencedTaskIds = new Set((validatedConfig.tasks ?? []).map((ref) => ref.id));
			const orphanTaskIds = preUpdateTaskIds.filter((id) => !referencedTaskIds.has(id));
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

	/**
	 * Backfill `agent_task_definition` rows for task refs that carry a full
	 * embedded body (name/objective/cronExpression) but have no matching row —
	 * e.g. a task deleted after export, or an exported JSON applied to a
	 * different agent. Mutates `existingTaskIds` and the refs' `id` in place so
	 * `removeMissingConfigRefs` keeps them and the caller persists the right id.
	 * Refs without an embedded body are left for `removeMissingConfigRefs` to
	 * drop, same as a stale ref to a task deleted out from under a config that
	 * was never re-exported.
	 */
	private async createMissingTaskDefinitions(
		agentId: string,
		tasks: AgentJsonTaskConfig[] | undefined,
		existingTaskIds: Set<string>,
	): Promise<void> {
		const candidates = (tasks ?? [])
			.filter(hasEmbeddedTaskBody)
			.filter((ref) => !existingTaskIds.has(ref.id) && isValidCronExpression(ref.cronExpression));
		if (candidates.length === 0) return;

		// `id` is a global primary key, not scoped to the agent, so an id
		// re-imported into a different agent than the one it was exported from
		// can collide with a still-live row; regenerate the id in that case.
		const takenIds = await this.agentTaskRepository.findExistingIds(
			candidates.map((ref) => ref.id),
		);

		const rows = candidates.map((ref) => {
			const id = takenIds.has(ref.id) ? generateAgentResourceId('task', existingTaskIds) : ref.id;
			ref.id = id;
			existingTaskIds.add(id);
			return this.agentTaskRepository.create({
				id,
				agentId,
				name: ref.name,
				objective: ref.objective,
				cronExpression: ref.cronExpression,
			});
		});

		await this.agentTaskRepository.save(rows);
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

function hasEmbeddedTaskBody(
	ref: AgentJsonTaskConfig,
): ref is AgentJsonTaskConfig & { name: string; objective: string; cronExpression: string } {
	return ref.name !== undefined && ref.objective !== undefined && ref.cronExpression !== undefined;
}

/** Persisted schema refs are membership + enabled only; the body lives in `agent_task_definition`. */
function toBareTaskRef(ref: AgentJsonTaskConfig): AgentJsonTaskConfig {
	return { type: 'task', id: ref.id, enabled: ref.enabled };
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
