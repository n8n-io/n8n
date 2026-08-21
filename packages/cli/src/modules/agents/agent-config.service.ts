import { reconcileNativeWebSearch } from '@n8n/ai-utilities/agent-config';
import {
	ExportedAgentJsonConfigSchema,
	agentSkillSchema,
	findVectorStoreToolNameCollisions,
	formatAgentConfigZodError,
	sanitizeAgentJsonConfig,
	type AgentJsonConfig,
	type AgentJsonToolConfig,
	type AgentSkill,
	type ExportedAgentJsonConfig,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, WorkflowRepository, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError, UserError } from 'n8n-workflow';

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
import { markAgentDraftDirty, saveAgentDraftFenced } from './utils/agent-draft.utils';
import { generateAgentResourceId } from './utils/agent-resource-id';
import {
	findHttpRequestToolUrlFromAiViolations,
	validateNodeToolConfigs,
	validateNodeToolExpressions,
} from './utils/node-tool-validation';
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
		private readonly txRunner: TransactionRunner,
	) {}

	/**
	 * Get the JSON config for an agent. All refs are bare.
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
	 * Validate an agent JSON config. The method does Zod schema validation and
	 * validates node tool configurations against their JSON-Schema definitions.
	 * It uses the exported-config schema, because the write path also accepts
	 * imported agent JSON whose refs carry inline definition bodies.
	 */
	async validateConfig(
		raw: unknown,
	): Promise<{ valid: true; config: ExportedAgentJsonConfig } | { valid: false; error: string }> {
		if (hasNodeToolInputSchema(raw)) {
			return { valid: false, error: 'Node tool configs must not include inputSchema.' };
		}

		const parsed = ExportedAgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(raw));
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

		// Prepare the task definitions that arrived inline with the config (for
		// example, an imported agent JSON) and have no row on this agent yet.
		// Without this step, `removeMissingConfigRefs` drops their refs as
		// orphans. The agent-save transaction claims and writes the prepared
		// rows.
		const importedTasks = tasksProvided
			? this.prepareImportedTaskDefinitions(
					agentId,
					validatedConfig.tasks ?? [],
					new Set(existingTaskIds),
				)
			: [];
		const importedTaskIds = importedTasks.map((task) => task.id);

		// Do the same for skill and custom tool definitions, which live on the
		// agent's `skills` and `tools` columns. Recreate them on the entity
		// before `removeMissingConfigRefs` filters refs against those columns.
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

		// One transaction claims the imported task rows and saves the agent,
		// with the same all-or-nothing coupling as
		// `AgentTaskService.createTasksBatch`. Thus the `agent_task_definition`
		// table and the schema refs stay in agreement. Both paths write through
		// the draft revision fence.
		const saved =
			importedTasks.length === 0
				? await saveAgentDraftFenced(this.agentRepository, entity)
				: await this.txRunner.run({}, async (ctx) => {
						await this.claimImportedTaskDefinitions(entity, validatedConfig, importedTasks, ctx);
						return await saveAgentDraftFenced(this.agentRepository, entity, ctx);
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
		// Each block keeps only the refs that have a definition, and removes any
		// inline body. The schema column stores the bare ref. Bodies live in the
		// `skills` and `tools` columns and in the `agent_task_definition` table.
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
	 * Prepare the task definitions that arrived inline on the config (an
	 * imported agent JSON) and have no row for this agent yet. The agent-save
	 * transaction claims and persists the prepared rows
	 * (`claimImportedTaskDefinitions`). The method skips a task when its inline
	 * body is incomplete or its cron expression is invalid.
	 * `removeMissingConfigRefs` then drops the skipped ref as an orphan.
	 */
	private prepareImportedTaskDefinitions(
		agentId: string,
		tasks: NonNullable<ExportedAgentJsonConfig['tasks']>,
		existingTaskIds: ReadonlySet<string>,
	): AgentTask[] {
		return tasks.flatMap((ref) => {
			if (existingTaskIds.has(ref.id)) return [];
			const { id, name, objective, cronExpression } = ref;
			if (name === undefined || objective === undefined || cronExpression === undefined) return [];
			if (!isValidCronExpression(cronExpression)) {
				this.logger.warn('Skipping imported agent task: invalid cron expression', {
					taskId: id,
				});
				return [];
			}
			return [this.agentTaskRepository.create({ id, agentId, name, objective, cronExpression })];
		});
	}

	/**
	 * Claim and insert the imported task rows inside the agent-save
	 * transaction. The task id is the only primary key of the table, so a
	 * claim fails when another agent owns the id. This occurs on every import
	 * of an export whose source agent lives on the same instance, and when a
	 * concurrent import claims the id first. On a failed claim, the method
	 * mints a fresh id, rewrites the config refs, and claims again.
	 */
	private async claimImportedTaskDefinitions(
		entity: Agent,
		config: AgentJsonConfig,
		importedTasks: AgentTask[],
		ctx: OperationContext,
	): Promise<void> {
		const takenIds = new Set([
			...(config.tasks ?? []).map((ref) => ref.id),
			...importedTasks.map((task) => task.id),
		]);

		for (const task of importedTasks) {
			const originalId = task.id;
			let claimed = await this.agentTaskRepository.claimTaskDefinition(task, ctx);
			for (let attempt = 0; !claimed && attempt < 5; attempt++) {
				task.id = generateAgentResourceId('task', takenIds);
				takenIds.add(task.id);
				claimed = await this.agentTaskRepository.claimTaskDefinition(task, ctx);
			}
			if (!claimed) {
				throw new UnexpectedError('Could not claim a unique id for an imported agent task');
			}
			if (task.id === originalId) continue;

			this.logger.warn('Imported agent task id already taken: assigned a new id', {
				taskId: originalId,
				newTaskId: task.id,
			});
			// The schema refs are already built at this point, so the new id
			// must be written into both the persisted schema and the validated
			// config that feeds the update response.
			for (const refs of [entity.schema?.tasks, config.tasks]) {
				const ref = refs?.find((entry) => entry.id === originalId);
				if (ref) ref.id = task.id;
			}
		}
	}

	/**
	 * Write the skill bodies that arrived inline on the config (an imported
	 * agent JSON) and are missing from the agent's `skills` column. Without
	 * this step, `removeMissingConfigRefs` drops their refs as orphans. The
	 * method skips a skill when its inline body is incomplete, when the body
	 * fails skill validation, or when its name collides with a retained skill.
	 * The collision scope contains only the skills that the update keeps:
	 * skills without a ref in the incoming config are removed later in the
	 * same update by `removeUnreferencedSkills`, so they must not block an
	 * imported skill that reuses their name. When the agent already has a
	 * skill under the same id, the method keeps that skill and ignores the
	 * imported body.
	 */
	private recreateImportedSkillDefinitions(
		entity: Agent,
		refs: NonNullable<ExportedAgentJsonConfig['skills']>,
	): void {
		const skills = { ...(entity.skills ?? {}) };
		const refIds = new Set(refs.map((ref) => ref.id));
		const retainedSkills = Object.fromEntries(
			Object.entries(skills).filter(([id]) => refIds.has(id)),
		);
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
			if (this.agentSkillsService.isSkillNameTaken(retainedSkills, body.name)) {
				this.logger.warn('Skipping imported agent skill: name already in use', {
					skillId: ref.id,
				});
				continue;
			}

			skills[ref.id] = parsed.data;
			retainedSkills[ref.id] = parsed.data;
			changed = true;
		}

		if (changed) entity.skills = skills;
	}

	/**
	 * Compile the custom tools whose source code arrived inline on the config
	 * (an imported agent JSON) and have no entry in the agent's `tools` column.
	 * Without this step, `removeMissingConfigRefs` drops their refs as orphans.
	 * The secure runtime derives the descriptor from the code. The method never
	 * reads the descriptor from the imported JSON. The method skips a tool when
	 * its code does not compile or declares a name that differs from the ref
	 * id. When the agent already has a tool under the same id, the method keeps
	 * that tool and ignores the imported code.
	 */
	private async recreateImportedCustomToolDefinitions(
		entity: Agent,
		refs: NonNullable<ExportedAgentJsonConfig['tools']>,
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

			// The tools column is keyed by the name that the code declares
			// (see `AgentCustomToolsService.buildCustomTool`). If the ref id
			// differs from that name, the ref cannot resolve the created entry.
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
