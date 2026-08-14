import { reconcileNativeWebSearch } from '@n8n/ai-utilities/agent-config';
import {
	AgentJsonConfigSchema,
	extractRefDefinitions,
	findVectorStoreToolNameCollisions,
	formatAgentConfigZodError,
	inlineRefDefinitions,
	sanitizeAgentJsonConfig,
	type AgentJsonConfig,
	type AgentJsonToolConfig,
	type AgentRefDefinitions,
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
import type { AgentTask } from './entities/agent-task.entity';
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
	 *
	 * `includeDefinitions` inlines the skill and task bodies into their config
	 * refs, making the result self-contained enough to export and re-import
	 * elsewhere. It is opt-in because those bodies are large (skill
	 * instructions alone go up to 64KB each) and no other consumer of this
	 * endpoint — editor, builder LLM, MCP — needs more than membership.
	 */
	async getConfig(
		agentId: string,
		projectId: string,
		options: { includeDefinitions?: boolean } = {},
	): Promise<AgentJsonConfig> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');
		const config = composeJsonConfig(entity);
		if (!config) {
			throw new UserError('Agent has no JSON config yet.');
		}
		if (!options.includeDefinitions) return config;

		const tasks = await this.agentTaskRepository.findByAgentId(agentId);
		return inlineRefDefinitions(config, {
			skills: entity.skills ?? {},
			tasks: Object.fromEntries(
				tasks.map(({ id, name, objective, cronExpression }) => [
					id,
					{ name, objective, cronExpression },
				]),
			),
		});
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
		const reconciledConfig = reconcileNativeWebSearch(result.config);

		// An imported config carries its skill and task bodies inline. Split them
		// back out so they can be written to their own stores, leaving `agent.schema`
		// persisting refs only. A config that arrived without bodies (the ordinary
		// editor round trip) yields empty definitions and behaves exactly as before.
		const { config: validatedConfig, definitions } = extractRefDefinitions(reconciledConfig);
		this.assertValidTaskDefinitions(definitions.tasks);

		if (validatedConfig.tools !== undefined) {
			await this.nodeToolAiGatewayService.assignManagedCredentials(
				validatedConfig.tools,
				new Set(accessibleCredentials.map((credential) => credential.type)),
			);
			await normalizeWorkflowToolRefs(this.workflowRepository, validatedConfig.tools, projectId);
		}

		const tasksProvided = validatedConfig.tasks !== undefined;
		const existingTasks = tasksProvided
			? await this.agentTaskRepository.findByAgentId(agentId)
			: [];
		const existingTaskIds = existingTasks.map((task) => task.id);

		// Both applied before ref pruning, so a ref that arrived with its body is
		// treated as resolvable instead of being dropped as dangling.
		this.applySkillDefinitions(entity, definitions.skills);
		const resolvedSubAgents = await this.removeMissingConfigRefs(
			validatedConfig,
			entity,
			new Set([...existingTaskIds, ...Object.keys(definitions.tasks)]),
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
			...(tasksProvided ? { tasks: decomposedSchema.tasks } : {}),
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
			await this.persistTaskDefinitions(
				agentId,
				existingTasks,
				definitions.tasks,
				referencedTaskIds,
			);

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

	/**
	 * Cron validity is beyond the schema's reach — it only bounds the string's
	 * length — and an unparseable expression would silently never schedule.
	 */
	private assertValidTaskDefinitions(definitions: AgentRefDefinitions['tasks']): void {
		for (const [taskId, { cronExpression }] of Object.entries(definitions)) {
			if (!isValidCronExpression(cronExpression)) {
				throw new UserError(
					`Invalid agent config: task "${taskId}" has an invalid cron expression`,
				);
			}
		}
	}

	/**
	 * Upsert the bodies of skills that arrived inline. Bodies still unreferenced
	 * once the config is applied are pruned by `removeUnreferencedSkills`, so an
	 * inline body can never outlive its ref.
	 */
	private applySkillDefinitions(entity: Agent, definitions: AgentRefDefinitions['skills']): void {
		if (Object.keys(definitions).length === 0) return;
		entity.skills = { ...(entity.skills ?? {}), ...definitions };
	}

	/**
	 * Upsert the bodies of tasks that arrived inline. An id already owned by this
	 * agent is updated rather than duplicated — task ids are only unique per
	 * agent, so importing into an agent that already has tasks would otherwise
	 * collide. The inline body wins, matching the full-replace semantics of a
	 * config write.
	 */
	private async persistTaskDefinitions(
		agentId: string,
		existingTasks: AgentTask[],
		definitions: AgentRefDefinitions['tasks'],
		referencedTaskIds: ReadonlySet<string>,
	): Promise<void> {
		const existingById = new Map(existingTasks.map((task) => [task.id, task]));

		const rows = Object.entries(definitions)
			.filter(([taskId]) => referencedTaskIds.has(taskId))
			.map(([taskId, body]) => {
				const existing = existingById.get(taskId);
				return existing
					? Object.assign(existing, body)
					: this.agentTaskRepository.create({ id: taskId, agentId, ...body });
			});

		if (rows.length === 0) return;
		await this.agentTaskRepository.save(rows);
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
