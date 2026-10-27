import type {
	AgentConfigMutationResponse,
	AgentJsonConfig,
	AgentJsonToolConfig,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, type OperationContext, type User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';
import { UserError } from 'n8n-workflow';

import { ConflictError } from '@n8n/errors';

import { AgentDefinitionService } from './agent-definition.service';
import {
	buildAgentMutationEvent,
	diffAgentConfigParts,
	type AgentActor,
} from './agent-modification-telemetry.service';
import {
	AgentConfigPreparationService,
	writesField,
	type ConfigReplacement,
} from './agent-config-preparation.service';
import { AgentPolicyService } from './agent-policy.service';
import { AgentSaveCompletionService } from './agent-save-completion.service';
import { AgentSetupCompletionService } from './agent-setup-completion.service';
import { AgentSkillRefsService } from './agent-skill-refs.service';
import { AgentsSettingsService } from './agents-settings.service';
import type { ProjectAgent } from './entities/agent.entity';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { syncAgentIntegrations } from './integrations/integrations-sync';
import { assertSingleConnections } from './integrations/single-connection';
import { composeJsonConfig, decomposeJsonConfig } from './json-config/agent-config-composition';
import { fromAgentDocument, type AgentSkillRefs } from './json-config/agent-document';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { getAgentOrThrow } from './utils/get-agent-or-throw';
import { getAgentConfigHash, isSameAgentConfig } from './utils/agent-config-hash';
import { markAgentDraftDirty, saveAgentDraftFenced } from './utils/agent-draft.utils';
import type {
	CompleteAgentDefinition,
	AgentDefinitionMetadata,
	PlannedAgentDestinations,
} from './utils/agent-definition';
import type { AgentsCredentialProvider } from './adapters/agents-credential-provider';

interface AgentConfigUpdateOptions {
	/** Hash of the config the caller read before editing; `null` when the agent had none. */
	baseConfigHash: string | null;
	clearOmittedOptionalFields?: boolean;
	modifiedBy: AgentActor;
	/** Push connection of the tab that made the change; excluded from the `agentUpdated` broadcast. */
	pushRef?: string;
}

@Service()
export class AgentConfigService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly agentTaskRepository: AgentTaskRepository,
		private readonly configPreparation: AgentConfigPreparationService,
		private readonly setupCompletionService: AgentSetupCompletionService,
		private readonly transactionRunner: TransactionRunner,
		private readonly saveCompletion: AgentSaveCompletionService,
		private readonly agentSkillRefs: AgentSkillRefsService,
		private readonly chatIntegrationRegistry: ChatIntegrationRegistry,
		private readonly definitionService: AgentDefinitionService,
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
		const config = composeJsonConfig(entity, await this.agentSkillRefs.refsForDraft(entity, {}));
		if (!config) {
			throw new UserError('Agent has no JSON config yet.');
		}
		return config;
	}

	async validateConfig(raw: unknown) {
		return await this.configPreparation.validateConfig(raw);
	}

	async replaceDefinition(
		agentId: string,
		projectId: string,
		definition: CompleteAgentDefinition,
		user: User,
		options: {
			expectedRevision: number;
			metadata?: AgentDefinitionMetadata;
			plannedDestinations?: PlannedAgentDestinations;
		},
	): Promise<ProjectAgent> {
		await Container.get(AgentsSettingsService).assertEnabled();
		await this.configPreparation.assertCanSaveDefinition(projectId, user, 'update');
		const agent = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);
		if (agent.revision !== options.expectedRevision) {
			throw new ConflictError('Agent was modified concurrently; please retry');
		}
		const prepared = await this.configPreparation.prepareDefinition(
			agentId,
			definition,
			projectId,
			user,
			options.plannedDestinations,
		);
		const content = prepared.definition;
		const previousSkills = await this.agentSkillRefs.readDraft(agent, {});
		const previousConfig = composeJsonConfig(agent, previousSkills.skillRefs);
		const previousIntegrations = agent.integrations ?? [];
		await Container.get(AgentPolicyService).enforceSave(
			projectId,
			agentId,
			content.config ?? { name: content.name },
			agent.schema,
			{ kind: 'user', user },
		);
		const sidecarChanges = {
			skills: !isEqual(previousSkills.skills, content.skills),
			tools: !isEqual(agent.tools, content.tools),
		};
		const decomposed = content.config
			? decomposeJsonConfig(content.config)
			: { schemaConfig: null, integrations: [] };
		const { config, skillRefs: incomingSkillRefs } = decomposed.schemaConfig
			? fromAgentDocument(decomposed.schemaConfig)
			: { config: null, skillRefs: undefined };
		agent.name = content.config?.name ?? content.name;
		agent.integrations = decomposed.integrations;
		agent.schema = config;
		agent.tools = structuredClone(content.tools);
		markAgentDraftDirty(agent);
		const { skillRefs, tasksChanged } = await this.transactionRunner.run({}, async (ctx) => {
			await saveAgentDraftFenced(this.agentRepository, agent, ctx, options.metadata);
			const skillRefs = await this.agentSkillRefs.importDraftSkills(
				agent,
				incomingSkillRefs,
				content.skills,
				user,
				ctx,
			);
			const tasksChanged = await this.agentTaskRepository.replaceForAgent(
				agent.id,
				content.tasks,
				ctx,
			);
			await this.definitionService.captureVersion(agent, user, ctx);
			return { skillRefs, tasksChanged };
		});
		await this.saveCompletion.definitionSaved(
			buildAgentMutationEvent(
				agent,
				skillRefs,
				projectId,
				{ user, modifiedBy: 'user' },
				diffAgentConfigParts(
					previousConfig,
					content.config,
					previousIntegrations,
					agent.integrations,
					{
						...sidecarChanges,
						tasks: tasksChanged,
					},
				),
			),
			previousIntegrations,
			prepared.credentialProvider,
			content.tasks,
			'update',
		);
		return agent;
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
		// Load the current draft and reject edits based on an outdated config.
		const entity = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);
		const previousSkillRefs = await this.agentSkillRefs.refsForDraft(entity, {});
		if (
			options.baseConfigHash !== getAgentConfigHash(composeJsonConfig(entity, previousSkillRefs))
		) {
			throw new ConflictError(
				'Agent config was changed elsewhere; reload to get the latest version',
			);
		}

		// Validate the input and prepare the replacement config.
		const clearOmitted = options.clearOmittedOptionalFields === true;
		const { validatedConfig, credentialProvider, replacement, existingTaskIds } =
			await this.configPreparation.prepareForSave(entity, config, user, {
				previousSkillRefs,
				clearOmitted,
			});
		assertSingleConnections(this.chatIntegrationRegistry, replacement.nextIntegrations);

		// Keep the previous values to restore them if the config has no changes.
		const previous = {
			schema: entity.schema,
			name: entity.name,
			integrations: entity.integrations,
			tools: entity.tools,
		};

		// Apply the replacement and remove resources that the config no longer references.
		const next = fromAgentDocument(replacement.nextSchema);
		entity.schema = next.config;
		entity.name = validatedConfig.name;
		entity.integrations = replacement.nextIntegrations;
		this.removeUnreferencedResources(entity, validatedConfig, clearOmitted);

		// Return the existing version if the draft has no changes.
		if (
			entity.versionId !== null &&
			options.baseConfigHash !== null &&
			isSameAgentConfig(previous.tools, entity.tools) &&
			options.baseConfigHash === getAgentConfigHash(composeJsonConfig(entity, next.skillRefs)) &&
			existingTaskIds.every((id) => entity.schema?.tasks?.some((ref) => ref.id === id))
		) {
			Object.assign(entity, previous);
			return {
				config: composeJsonConfig(entity, previousSkillRefs) ?? replacement.nextSchema,
				configHash: options.baseConfigHash,
				versionId: entity.versionId,
				updatedAt: entity.updatedAt.toISOString(),
			};
		}

		// Create a new draft version and save it with its history snapshot.
		markAgentDraftDirty(entity);
		const saved = await this.saveConfig(
			entity,
			next.skillRefs,
			credentialProvider,
			user,
			options,
			replacement,
			existingTaskIds,
		);

		// Sync integrations and return the saved config.
		return await this.finishConfigUpdate(saved, validatedConfig, replacement, clearOmitted);
	}

	private async finishConfigUpdate(
		saved: ProjectAgent,
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

		const savedConfig =
			composeJsonConfig(saved, await this.agentSkillRefs.refsForDraft(saved, {})) ??
			validatedConfig;

		return {
			config: savedConfig,
			configHash: getAgentConfigHash(savedConfig),
			updatedAt: saved.updatedAt.toISOString(),
			versionId: saved.versionId,
		};
	}

	private async removeUnreferencedTasks(
		agent: ProjectAgent,
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
		entity: ProjectAgent,
		skillRefs: AgentSkillRefs,
		credentialProvider: AgentsCredentialProvider,
		user: User,
		options: AgentConfigUpdateOptions,
		replacement: ConfigReplacement,
		existingTaskIds: string[],
	) {
		const { id: agentId, projectId } = entity;
		const { changedParts, changedSettings } = replacement;

		// Gate evaluated against the state about to be written; the marker is
		// claimed and reported only once that write succeeded.
		const emitSetupCompleted = await this.setupCompletionService.recordIfSetupComplete(
			entity,
			skillRefs,
			projectId,
			credentialProvider,
			user,
		);

		const saved = await this.transactionRunner.run({}, async (ctx) => {
			await saveAgentDraftFenced(this.agentRepository, entity, ctx);
			await this.agentSkillRefs.replaceDraftRefs(entity, skillRefs, ctx);
			await this.removeUnreferencedTasks(entity, existingTaskIds, ctx);
			await this.definitionService.captureVersion(entity, user, ctx, options.modifiedBy);
			return entity;
		});
		await this.saveCompletion.configurationSaved(
			{
				agent: saved,
				config: replacement.nextSchema,
				projectId,
				user,
				by: options.modifiedBy,
				changedParts,
				changedSettings,
			},
			options.pushRef,
			emitSetupCompleted,
		);
		this.logger.debug('Updated agent JSON config', { agentId, projectId });
		return saved;
	}

	private removeUnreferencedResources(
		entity: ProjectAgent,
		config: AgentJsonConfig,
		clearOmitted: boolean,
	): void {
		if (writesField(config, 'tools', clearOmitted)) {
			this.removeUnreferencedCustomTools(entity, config);
		}
	}

	private removeUnreferencedCustomTools(entity: ProjectAgent, config: AgentJsonConfig): void {
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
}
