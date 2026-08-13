import { reconcileNativeWebSearch } from '@n8n/ai-utilities/agent-config';
import {
	AgentJsonConfigSchema,
	agentSkillSchema,
	findVectorStoreToolNameCollisions,
	formatAgentConfigZodError,
	sanitizeAgentJsonConfig,
	type AgentJsonConfig,
	type AgentJsonToolConfig,
	type AgentSkill,
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
import { toBareCustomToolRef, toBareSkillRef, toBareTaskRef } from './json-config/bare-config-refs';
import { NodeToolAiGatewayService } from './json-config/node-tool-ai-gateway.service';
import { sanitizeUnknownAgentCredentials } from './json-config/sanitize-unknown-agent-credentials';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { AgentSecureRuntime } from './runtime/agent-secure-runtime';
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
		private readonly secureRuntime: AgentSecureRuntime,
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
		await this.hydrateDefinitions(entity, config);
		return config;
	}

	/**
	 * Inline the definition body of each task, skill, and custom tool ref so
	 * the config is self-contained when exported. Without this the config
	 * carries only bare refs and the bodies are lost when it is downloaded and
	 * imported elsewhere.
	 */
	private async hydrateDefinitions(entity: Agent, config: AgentJsonConfig): Promise<void> {
		await this.hydrateTaskDefinitions(entity.id, config);
		hydrateSkillDefinitions(entity, config);
		hydrateCustomToolDefinitions(entity, config);
	}

	/**
	 * Inline each task ref's body (name/objective/cronExpression) from the
	 * `agent_task_definition` table so the exported config is self-contained.
	 * Without this the export carries only `{ type, id, enabled }` refs and the
	 * task body is lost when the config is downloaded and imported elsewhere.
	 */
	private async hydrateTaskDefinitions(agentId: string, config: AgentJsonConfig): Promise<void> {
		if (!config.tasks?.length) return;

		const definitions = await this.agentTaskRepository.findByAgentId(agentId);
		const definitionById = new Map(definitions.map((task) => [task.id, task]));

		config.tasks = config.tasks.map((ref) => {
			const definition = definitionById.get(ref.id);
			if (!definition) return ref;
			return {
				...ref,
				name: definition.name,
				objective: definition.objective,
				cronExpression: definition.cronExpression,
			};
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
		const validatedConfig = reconcileNativeWebSearch(result.config);

		if (validatedConfig.tools !== undefined) {
			await this.nodeToolAiGatewayService.assignManagedCredentials(
				validatedConfig.tools,
				new Set(accessibleCredentials.map((credential) => credential.type)),
			);
			await normalizeWorkflowToolRefs(this.workflowRepository, validatedConfig.tools, projectId);
		}

		const tasksProvided = validatedConfig.tasks !== undefined;
		const existingTaskIds = tasksProvided
			? (await this.agentTaskRepository.findByAgentId(agentId)).map((task) => task.id)
			: [];

		// Prepare task definitions that arrived inline with the config (e.g. an
		// imported agent JSON) but have no row on this agent yet, so their refs
		// survive instead of being dropped as orphans by `removeMissingConfigRefs`.
		// The rows are written later, in the same transaction as the agent save.
		const importedTasks = tasksProvided
			? await this.prepareImportedTaskDefinitions(
					agentId,
					validatedConfig.tasks ?? [],
					new Set(existingTaskIds),
				)
			: [];
		const importedTaskIds = importedTasks.map((task) => task.id);

		// Same for skill and custom tool definitions, which live on the agent's
		// `skills`/`tools` columns: recreate them on the entity before
		// `removeMissingConfigRefs` filters refs against those columns.
		if (validatedConfig.skills !== undefined) {
			this.recreateImportedSkillDefinitions(entity, validatedConfig.skills);
		}
		if (validatedConfig.tools !== undefined) {
			await this.recreateImportedCustomToolDefinitions(entity, validatedConfig.tools);
		}

		const resolvedSubAgents = await this.removeMissingConfigRefs(
			validatedConfig,
			entity,
			new Set([...existingTaskIds, ...importedTaskIds]),
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

		// Imported task rows and the agent are saved in one transaction — the
		// same all-or-nothing coupling `AgentTaskService.createTasksBatch` uses —
		// so the `agent_task_definition` table and schema refs can't diverge.
		const saved =
			importedTasks.length === 0
				? await this.agentRepository.save(entity)
				: await this.agentRepository.manager.transaction(async (em) => {
						for (const task of importedTasks) {
							await em.save(task);
						}
						return await em.save(entity);
					});
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
			const orphanTaskIds = existingTaskIds.filter((id) => !referencedTaskIds.has(id));
			if (orphanTaskIds.length > 0) {
				await this.agentTaskRepository.delete(orphanTaskIds);
			}
		}

		if (integrationsProvided) {
			await syncAgentIntegrations(saved, previousIntegrations, nextIntegrations, this.logger);
		}

		// Hydrated like `getConfig`, so a client that keeps working from the
		// update response (e.g. the builder UI exporting right after an
		// autosave) still sees a self-contained config.
		const responseConfig = composeJsonConfig(saved) ?? validatedConfig;
		await this.hydrateDefinitions(saved, responseConfig);

		return {
			config: responseConfig,
			updatedAt: saved.updatedAt.toISOString(),
			versionId: saved.versionId,
		};
	}

	private async removeMissingConfigRefs(
		config: AgentJsonConfig,
		entity: Agent,
		existingTaskIds: ReadonlySet<string>,
	): Promise<ResolvedSubAgentRef[]> {
		// Each block keeps only refs backed by a definition, and strips any
		// inline body: the schema column stores just the bare ref; bodies live
		// in the `skills`/`tools` columns and the `agent_task_definition` table.
		if (config.skills !== undefined) {
			const skills = entity.skills ?? {};
			config.skills = config.skills
				.filter((ref) => Object.hasOwn(skills, ref.id))
				.map(toBareSkillRef);
		}

		if (config.tools !== undefined) {
			const tools = entity.tools ?? {};
			config.tools = config.tools
				.filter((ref) => ref.type !== 'custom' || Object.hasOwn(tools, ref.id))
				.map((ref) => (ref.type === 'custom' ? toBareCustomToolRef(ref) : ref));
		}

		if (config.tasks !== undefined) {
			config.tasks = config.tasks.filter((ref) => existingTaskIds.has(ref.id)).map(toBareTaskRef);
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
	 * Prepare task definitions that arrived inline on the config but have no row
	 * for this agent yet (an imported agent JSON), for persistence alongside the
	 * agent save. A task is skipped — and its ref later dropped as an orphan —
	 * when the inline body is missing or incomplete or the cron expression is
	 * invalid. The task id is the table's sole primary key, so an id already
	 * taken by another agent (importing an export whose source lives on the same
	 * instance) is replaced with a fresh one, on both the row and the config
	 * ref, instead of hijacking that agent's row.
	 */
	private async prepareImportedTaskDefinitions(
		agentId: string,
		tasks: NonNullable<AgentJsonConfig['tasks']>,
		existingTaskIds: ReadonlySet<string>,
	): Promise<AgentTask[]> {
		const inlineTasks = tasks.flatMap((ref) => {
			if (existingTaskIds.has(ref.id)) return [];
			const { id, name, objective, cronExpression } = ref;
			if (name === undefined || objective === undefined || cronExpression === undefined) return [];
			return [{ ref, id, name, objective, cronExpression }];
		});
		if (inlineTasks.length === 0) return [];

		const owningAgentIds = await this.agentTaskRepository.findOwningAgentIds(
			inlineTasks.map((task) => task.id),
		);

		const takenIds = new Set([...existingTaskIds, ...tasks.map((ref) => ref.id)]);
		const prepared: AgentTask[] = [];
		for (const task of inlineTasks) {
			if (!isValidCronExpression(task.cronExpression)) {
				this.logger.warn('Skipping imported agent task: invalid cron expression', {
					taskId: task.id,
				});
				continue;
			}

			let taskId = task.id;
			if (owningAgentIds.get(taskId) !== undefined && owningAgentIds.get(taskId) !== agentId) {
				taskId = generateAgentResourceId('task', takenIds);
				// The ref is part of the config being persisted, so the rename
				// carries through to the schema and the update response.
				task.ref.id = taskId;
				this.logger.warn('Imported agent task id already taken: assigned a new id', {
					taskId: task.id,
					newTaskId: taskId,
				});
			}
			takenIds.add(taskId);

			prepared.push(
				this.agentTaskRepository.create({
					id: taskId,
					agentId,
					name: task.name,
					objective: task.objective,
					cronExpression: task.cronExpression,
				}),
			);
		}
		return prepared;
	}

	/**
	 * Write skill bodies that arrived inline on the config but are missing from
	 * the agent's `skills` column (an imported agent JSON), so their refs are
	 * kept instead of dropped as orphans. A ref is skipped — and its ref later
	 * dropped — when the inline body is incomplete, fails skill validation, or
	 * its name collides with a skill already on the agent. An existing skill
	 * under the same id always wins over the imported body.
	 */
	private recreateImportedSkillDefinitions(
		entity: Agent,
		refs: NonNullable<AgentJsonConfig['skills']>,
	): void {
		const skills = { ...(entity.skills ?? {}) };
		let changed = false;

		for (const ref of refs) {
			if (Object.hasOwn(skills, ref.id)) continue;
			if (
				ref.name === undefined ||
				ref.description === undefined ||
				ref.instructions === undefined
			) {
				continue;
			}

			const body: AgentSkill = {
				name: ref.name,
				description: ref.description,
				instructions: ref.instructions,
				...(ref.allowedTools !== undefined ? { allowedTools: ref.allowedTools } : {}),
				...(ref.references !== undefined ? { references: ref.references } : {}),
			};

			const parsed = agentSkillSchema.safeParse(body);
			if (!parsed.success) {
				this.logger.warn('Skipping imported agent skill: invalid body', { skillId: ref.id });
				continue;
			}
			if (this.agentSkillsService.isSkillNameTaken(skills, body.name)) {
				this.logger.warn('Skipping imported agent skill: name already in use', {
					skillId: ref.id,
				});
				continue;
			}

			skills[ref.id] = parsed.data;
			changed = true;
		}

		if (changed) entity.skills = skills;
	}

	/**
	 * Compile custom tools whose source arrived inline on the config but have
	 * no entry in the agent's `tools` column (an imported agent JSON), so their
	 * refs are kept instead of dropped as orphans. The descriptor is re-derived
	 * from the code in the secure runtime — never taken from the imported JSON —
	 * and a tool is skipped when its code fails to compile or declares a name
	 * different from the ref id. An existing tool under the same id always wins.
	 */
	private async recreateImportedCustomToolDefinitions(
		entity: Agent,
		refs: NonNullable<AgentJsonConfig['tools']>,
	): Promise<void> {
		const tools = { ...(entity.tools ?? {}) };
		let changed = false;

		for (const ref of refs) {
			if (ref.type !== 'custom') continue;
			if (Object.hasOwn(tools, ref.id) || ref.code === undefined) continue;

			let descriptor;
			try {
				descriptor = await this.secureRuntime.describeToolSecurely(ref.code);
			} catch (error) {
				this.logger.warn('Skipping imported custom tool: code failed to compile', {
					toolId: ref.id,
					error: error instanceof Error ? error.message : String(error),
				});
				continue;
			}

			// The tools column is keyed by the name the code declares
			// (see `AgentCustomToolsService.buildCustomTool`), so a mismatched
			// ref id would create an entry the ref still can't resolve.
			if (descriptor.name !== ref.id) {
				this.logger.warn('Skipping imported custom tool: declared name does not match ref id', {
					toolId: ref.id,
					declaredName: descriptor.name,
				});
				continue;
			}

			tools[ref.id] = { code: ref.code, descriptor };
			changed = true;
		}

		if (changed) entity.tools = tools;
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

/**
 * Inline each skill ref's body from the agent's `skills` column so the
 * exported config is self-contained.
 */
function hydrateSkillDefinitions(entity: Agent, config: AgentJsonConfig): void {
	if (!config.skills?.length) return;

	const skills = entity.skills ?? {};

	config.skills = config.skills.map((ref) => {
		const body = Object.hasOwn(skills, ref.id) ? skills[ref.id] : undefined;
		if (!body) return ref;
		return {
			...ref,
			name: body.name,
			description: body.description,
			instructions: body.instructions,
			...(body.allowedTools !== undefined ? { allowedTools: body.allowedTools } : {}),
			...(body.references !== undefined ? { references: body.references } : {}),
		};
	});
}

/**
 * Inline each custom tool ref's source code from the agent's `tools` column
 * so the exported config is self-contained. The descriptor is not exported —
 * it is re-derived from the code on import.
 */
function hydrateCustomToolDefinitions(entity: Agent, config: AgentJsonConfig): void {
	if (!config.tools?.length) return;

	const tools = entity.tools ?? {};

	config.tools = config.tools.map((ref) => {
		if (ref.type !== 'custom') return ref;
		const stored = Object.hasOwn(tools, ref.id) ? tools[ref.id] : undefined;
		if (!stored) return ref;
		return { ...ref, code: stored.code };
	});
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
