import {
	N8N_CHAT_INTEGRATION_TYPE,
	isCredentialAgentIntegration,
	isDraftIntegration,
	type AgentConfigValidationResponse,
	type AgentJsonConfig,
	type AgentSkill,
	type AgentVersionListItemDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import {
	TransactionRunner,
	isUniqueConstraintError,
	type OperationContext,
	type User,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import isEqual from 'lodash/isEqual';
import { deepCopy, UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { getMissingSkillIds } from '@/modules/agents/utils/agent-missing-skill-ids';
import { Telemetry } from '@/telemetry';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { AgentDefinitionService } from './agent-definition.service';
import { AgentSaveCompletionService } from './agent-save-completion.service';
import type { AgentDefinition } from './utils/agent-definition';
import { AgentCustomToolsService } from './agent-custom-tools.service';
import { buildAgentCapabilityTelemetryProperties } from './agent-telemetry';
import {
	diffAgentConfigParts,
	type AgentActor,
	type AgentMutationTelemetryContext,
} from './agent-modification-telemetry.service';
import { AgentPolicyService } from './agent-policy.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentSetupCompletionService } from './agent-setup-completion.service';
import { AgentUpdateBroadcaster } from './agent-update-broadcaster';
import { AgentValidationService } from './agent-validation.service';
import type { AgentHistory } from './entities/agent-history.entity';
import { AgentTask } from './entities/agent-task.entity';
import type { Agent, ProjectAgent } from './entities/agent.entity';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentHistoryRepository } from './repositories/agent-history.repository';
import { AgentTaskSnapshotRepository } from './repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { getAgentOrThrow } from './utils/get-agent-or-throw';

export type AgentPublishTrigger = 'explicit' | 'republish';

/**
 * Who published and why. `republish` is absent because the caller cannot know
 * it: `publishAgent` derives it from a `versionId` activating an older
 * snapshot, so a caller can't claim an explicit publish that is really a
 * rollback.
 */
export interface AgentPublishEmitter {
	by: AgentActor;
	trigger: Exclude<AgentPublishTrigger, 'republish'>;
}

export type ValidAgentConfigValidationResponse = AgentConfigValidationResponse & {
	status: 'valid';
};

function requireValidValidation(
	validation: AgentConfigValidationResponse,
): asserts validation is ValidAgentConfigValidationResponse {
	if (validation.status !== 'valid') {
		const unpublishedWorkflows = validation.issues
			.filter((issue) => issue.reason === 'not_published')
			.map(({ capability }) => `workflow "${capability.id}" is not published`);
		if (unpublishedWorkflows.length > 0) {
			throw new UserError(
				`Cannot publish agent: ${unpublishedWorkflows.join('; ')}. Publish these workflows first.`,
			);
		}
		throw new UserError('Agent configuration has errors that must be resolved before publishing');
	}
}

function draftSchemaFromVersion(schema: AgentJsonConfig | null): AgentJsonConfig | null {
	if (!schema) return null;
	const draft = { ...schema };
	delete draft.integrations;
	return draft;
}

export interface PublishAgentResult {
	agent: ProjectAgent;
	/**
	 * The draft validation `assertPublishable` already computed while
	 * guarding this publish call — only present when the current draft (not
	 * a historical `versionId`, and not an idempotent no-op) was validated.
	 * Callers can pass this into `AgentRunnableStateService.addRunnableState`
	 * to avoid re-validating the same draft a second time in the same
	 * request. Never reuse this for a historical-version publish: it
	 * describes the draft, not the published snapshot.
	 */
	draftValidation?: ValidAgentConfigValidationResponse;
}

@Service()
export class AgentPublishService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly agentHistoryRepository: AgentHistoryRepository,
		private readonly agentTaskSnapshotRepository: AgentTaskSnapshotRepository,
		private readonly agentTaskRepository: AgentTaskRepository,
		private readonly customToolsService: AgentCustomToolsService,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
		private readonly agentValidationService: AgentValidationService,
		private readonly credentialsService: CredentialsService,
		private readonly telemetry: Telemetry,
		private readonly eventService: EventService,
		private readonly setupCompletionService: AgentSetupCompletionService,
		private readonly agentUpdateBroadcaster: AgentUpdateBroadcaster,
		private readonly transactionRunner: TransactionRunner,
		private readonly saveCompletion: AgentSaveCompletionService,
		private readonly definitionService: AgentDefinitionService,
		private readonly agentPolicyService: AgentPolicyService,
	) {}

	/** `pushRef`: push connection of the tab that made the change; excluded from the `agentUpdated` broadcast. */
	async publishAgent(
		agentId: string,
		projectId: string,
		user: User,
		emitter: AgentPublishEmitter,
		versionId?: string,
		pushRef?: string,
	): Promise<PublishAgentResult> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);

		const expectedRevision = agent.revision;

		if (!versionId && agent.versionId !== null && agent.versionId === agent.activeVersionId) {
			return { agent };
		}

		if (versionId !== undefined && versionId === agent.activeVersionId) {
			return { agent };
		}

		const targetHistory = await this.findPublishTarget(versionId, agent.id);

		const tasks = versionId
			? new Map<string, AgentTask>()
			: new Map(
					(await this.agentTaskRepository.findByAgentId(agentId)).map((task) => [task.id, task]),
				);

		const validation = await this.assertPublishable(agent, projectId, user, tasks, targetHistory);

		// Backstop: explicit publish can be the first path to observe a complete
		// setup. Marking here keeps "setup completed" a superset of "published".
		const emitSetupCompleted = this.setupCompletionService.recordPublishedSetupComplete(
			agent,
			projectId,
			user,
			targetHistory ? targetHistory.schema : agent.schema,
		);

		await this.commitPublication(agent, expectedRevision, user, tasks, targetHistory);
		this.eventService.emit('agent-saved', { agentId });
		this.agentUpdateBroadcaster.notify({ projectId, agentId, source: emitter.by }, pushRef);

		this.runtimeCacheService.clearRuntimes(agentId);

		this.trackPublished(agent, projectId, user, emitter, targetHistory);
		await emitSetupCompleted?.();

		await this.startPublishedServices(agent);

		this.logger.debug('Published SDK agent', { agentId, projectId, userId: user.id });

		return versionId ? { agent } : { agent, draftValidation: validation };
	}

	/**
	 * Authoritative pre-publish guard: re-validates the configuration that is
	 * about to become live, independent of any frontend check. Validating the
	 * current draft is not enough when a specific historical `versionId` is
	 * being republished — that snapshot's schema/tool/skill bodies must be
	 * checked instead. Credential-backed integrations use the current draft.
	 * The n8n Chat entry is saved in the published schema.
	 */
	private async assertPublishable(
		agent: ProjectAgent,
		projectId: string,
		user: User,
		tasks: ReadonlyMap<string, AgentTask>,
		targetHistory?: AgentHistory,
	): Promise<ValidAgentConfigValidationResponse> {
		// Before validation, so a refusal names the violations instead of a generic error.
		const schema = targetHistory ? targetHistory.schema : agent.schema;
		if (schema) {
			await this.agentPolicyService.enforcePublish(projectId, agent.id, schema, {
				kind: 'user',
				user,
			});
		}

		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			user,
			agent.id,
		);

		const validation = targetHistory
			? await this.agentValidationService.validateAgentHistoryConfiguration(
					agent.id,
					projectId,
					targetHistory,
					agent.integrations ?? [],
					credentialProvider,
				)
			: await this.agentValidationService.validateAgentEntityConfiguration(
					agent,
					projectId,
					tasks,
					credentialProvider,
				);

		requireValidValidation(validation);
		await this.assertChannelsStartable(agent, projectId);
		return validation;
	}

	/**
	 * Reject a publish whose channels cannot start for a reason only the user can
	 * fix — today, a credential another agent already claims.
	 *
	 * This runs before the version is written, so a rejection leaves nothing
	 * behind: the agent stays unpublished and there is no partial state to roll
	 * back. Only deterministic checks belong here — startup failures that a retry
	 * can clear are reported per channel and healed by the reconciler instead, so
	 * an unreachable platform never blocks a publish.
	 *
	 * Draft entries carry no credential to check; validation has already rejected
	 * them by this point, and skipping them keeps that the single place that owns
	 * the rule.
	 */
	private async assertChannelsStartable(agent: ProjectAgent, projectId: string): Promise<void> {
		const chatIntegrationService = Container.get(ChatIntegrationService);
		for (const integration of agent.integrations ?? []) {
			if (!isCredentialAgentIntegration(integration)) continue;
			if (isDraftIntegration(integration)) continue;
			await chatIntegrationService.assertStartupPreconditions(agent.id, integration, projectId);
		}
	}

	async unpublishAgent(
		agentId: string,
		projectId: string,
		user: User,
		by: AgentActor,
		pushRef?: string,
	): Promise<ProjectAgent> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);

		// Same optimistic revision fence as publish: a concurrent edit that bumped
		// `revision` after this load makes the unpublish lose the fence and surface
		// a user-retryable conflict instead of rolling back a newer active version.
		const expectedRevision = agent.revision;

		await this.commitUnpublication(agent, expectedRevision);
		this.eventService.emit('agent-saved', { agentId });
		this.agentUpdateBroadcaster.notify({ projectId, agentId, source: by }, pushRef);

		this.runtimeCacheService.clearRuntimes(agentId);

		this.trackUnpublished(agentId, projectId, user, by);

		const chatIntegrationService = Container.get(ChatIntegrationService);
		for (const integration of agent.integrations ?? []) {
			await chatIntegrationService.disconnectChannel(agentId, integration, {
				deleteSubscriptions: false,
			});
		}

		const { AgentTaskService } = await import('./agent-task.service.js');
		await Container.get(AgentTaskService)
			.requestReconcile(agentId)
			.catch((error) =>
				this.logger.warn('Failed to stop agent tasks on unpublish', { agentId, error }),
			);

		this.logger.debug('Unpublished SDK agent', { agentId, projectId });
		return agent;
	}

	/**
	 * One event per surface rather than one event with a `by` property, matching
	 * the creation and modification events. Written as a switch because
	 * `Telemetry.track` types its payload against the specific event passed, so
	 * a lookup map would widen the event to a union its payload cannot satisfy.
	 */
	private trackPublished(
		agent: ProjectAgent,
		projectId: string,
		user: User,
		emitter: AgentPublishEmitter,
		targetHistory: AgentHistory | undefined,
	): void {
		// The snapshot that actually went live, which for a republish is the
		// version's schema rather than the draft.
		const published = targetHistory ? targetHistory.schema : agent.schema;
		const properties = {
			agent_id: agent.id,
			project_id: projectId,
			user_id: user.id,
			// Activating an older snapshot is a rollback, whatever the caller
			// asked for — and only this method knows which branch ran.
			trigger: targetHistory ? ('republish' as const) : emitter.trigger,
			// Set by the transaction above to either targetHistory.versionId or
			// agent.versionId, so it is never null on this path.
			version_id: agent.activeVersionId!,
			...buildAgentCapabilityTelemetryProperties(published, agent.integrations),
		} as const;

		switch (emitter.by) {
			case 'user':
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.USER_PUBLISHED_AGENT, {
					...properties,
					event_version: '2',
				});
				return;
			case 'builder':
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.BUILDER_PUBLISHED_AGENT, {
					...properties,
					event_version: '1',
				});
				return;
			case 'mcp':
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.MCP_PUBLISHED_AGENT, {
					...properties,
					event_version: '1',
				});
		}
	}

	private trackUnpublished(agentId: string, projectId: string, user: User, by: AgentActor): void {
		const properties = { agent_id: agentId, project_id: projectId, user_id: user.id } as const;

		switch (by) {
			case 'user':
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.USER_UNPUBLISHED_AGENT, {
					...properties,
					event_version: '2',
				});
				return;
			case 'builder':
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.BUILDER_UNPUBLISHED_AGENT, {
					...properties,
					event_version: '1',
				});
				return;
			case 'mcp':
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.MCP_UNPUBLISHED_AGENT, {
					...properties,
					event_version: '1',
				});
		}
	}

	async revertToPublishedAgent(
		agentId: string,
		projectId: string,
		user: User,
		modifiedBy: AgentActor,
		pushRef?: string,
	): Promise<ProjectAgent> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);

		const activeVersion = agent.activeVersion;
		if (!activeVersion) {
			throw new ConflictError(`Agent "${agentId}" is not published`);
		}

		await this.restoreVersion(agent, activeVersion, activeVersion.versionId, {
			user,
			modifiedBy,
			pushRef,
		});

		this.logger.debug('Reverted SDK agent to published version', { agentId, projectId });
		return agent;
	}

	async revertToVersion(
		agentId: string,
		projectId: string,
		versionId: string,
		user: User,
		modifiedBy: AgentActor,
		pushRef?: string,
	): Promise<ProjectAgent> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);

		const version = await this.agentHistoryRepository.findByVersionAndAgentId(versionId, agentId);
		if (!version) throw new NotFoundError(`Version "${versionId}" not found`);
		await this.restoreVersion(agent, version, uuid(), { user, modifiedBy, pushRef });

		this.logger.debug('Reverted SDK agent to a specific version', {
			agentId,
			projectId,
			versionId,
		});
		return agent;
	}

	/** A revert writes an old version back as the draft, so it is policed as a save. */
	private async enforceRevertPolicy(agent: ProjectAgent, user: User, schema: Agent['schema']) {
		if (!schema) return;
		await this.agentPolicyService.enforceSave(agent.projectId, agent.id, schema, agent.schema, {
			kind: 'user',
			user,
		});
	}

	/** Restore versioned content and keep current credential-backed integrations. */
	private async restoreVersion(
		agent: ProjectAgent,
		version: AgentHistory,
		nextVersionId: string,
		context: AgentMutationTelemetryContext,
	): Promise<void> {
		await this.enforceRevertPolicy(agent, context.user, version.schema);

		const previousSchema = agent.schema;
		const previousTools = agent.tools ?? {};
		const previousSkills = agent.skills ?? {};
		const tasksChanged = await this.transactionRunner.run({}, async (ctx) => {
			const definition = await this.definitionService.readVersion(version, ctx);
			definition.schema = draftSchemaFromVersion(definition.schema);
			agent.versionId = nextVersionId;
			return await this.definitionService.replaceDraft(agent, definition, ctx);
		});
		const integrations = agent.integrations ?? [];
		await this.saveCompletion.configurationSaved(
			{
				agent,
				projectId: agent.projectId,
				user: context.user,
				by: context.modifiedBy,
				changedParts: diffAgentConfigParts(
					previousSchema,
					agent.schema,
					integrations,
					integrations,
					{
						tools: !isEqual(previousTools, agent.tools),
						skills: !isEqual(previousSkills, agent.skills),
						tasks: tasksChanged,
					},
				),
				wasUnconfigured: false,
			},
			context.pushRef,
			null,
		);
	}

	/**
	 * Cheap existence check used by the editor to gate the version-history
	 * panel button. Survives unpublish, unlike `agent.activeVersionId`.
	 */
	async hasPublishHistory(agentId: string): Promise<boolean> {
		return await this.agentHistoryRepository.existsForAgent(agentId);
	}

	/**
	 * Load one published version snapshot (schema, tools, skills) plus its
	 * frozen task rows, for read-only inspection.
	 */
	async getVersion(
		agentId: string,
		projectId: string,
		versionId: string,
	): Promise<{ agent: ProjectAgent; version: AgentHistory; definition: AgentDefinition }> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);

		const version = await this.agentHistoryRepository.findByVersionAndAgentId(versionId, agentId);
		if (!version) {
			throw new NotFoundError(`Version "${versionId}" not found for agent "${agentId}"`);
		}

		const definition = await this.definitionService.readVersion(version);
		return { agent, version, definition };
	}

	async listPublishHistory(
		agentId: string,
		projectId: string,
		take: number,
		skip: number,
	): Promise<AgentVersionListItemDto[]> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);

		const versions = await this.agentHistoryRepository.findByAgentId(agentId, take, skip);

		return versions.map((v) => ({
			versionId: v.versionId,
			agentId: v.agentId,
			createdAt: v.createdAt.toISOString(),
			updatedAt: v.updatedAt.toISOString(),
			author: v.author,
			isActive: v.versionId === agent.activeVersionId,
		}));
	}

	/**
	 * Freeze the referenced task bodies (enabled/name/objective/cron) into
	 * published snapshot rows so scheduled runs read publish-time content, not
	 * live draft edits. Takes the same in-memory task map that was already
	 * used to validate the draft, rather than re-reading task bodies here, so
	 * the snapshot can never diverge from what was just validated.
	 */
	private async snapshotConfiguredTasks(
		ctx: OperationContext,
		versionId: string,
		config: AgentJsonConfig | null,
		tasks: ReadonlyMap<string, AgentTask>,
	): Promise<void> {
		if (!config) return;
		const refs = config.tasks ?? [];
		if (refs.length === 0) return;

		const missing = refs.filter((ref) => !tasks.has(ref.id)).map((ref) => ref.id);
		if (missing.length > 0) {
			throw new UserError(`Cannot publish agent with missing task bodies: ${missing.join(', ')}`);
		}

		await this.agentTaskSnapshotRepository.saveForVersion(
			refs.map((ref) => {
				const body = tasks.get(ref.id);
				if (!body) {
					throw new UserError(`Cannot publish agent with missing task body: ${ref.id}`);
				}
				return {
					versionId,
					taskId: ref.id,
					enabled: ref.enabled,
					name: body.name,
					objective: body.objective,
					cronExpression: body.cronExpression,
					timezone: body.timezone,
				};
			}),
			ctx,
		);
	}

	private pickConfiguredSkillBodies(
		config: AgentJsonConfig | null,
		skills: Record<string, AgentSkill>,
	): Record<string, AgentSkill> | null {
		if (!config) return null;

		const missing = getMissingSkillIds(config, skills);
		if (missing.length > 0) {
			throw new UserError(`Cannot publish agent with missing skill bodies: ${missing.join(', ')}`);
		}

		const snapshot: Record<string, AgentSkill> = {};
		for (const ref of config.skills ?? []) {
			const skill = skills[ref.id];
			if (skill) snapshot[ref.id] = deepCopy(skill);
		}

		return snapshot;
	}

	private async startPublishedServices(agent: ProjectAgent): Promise<void> {
		const agentId = agent.id;
		const credentialIntegrations = (agent.integrations ?? []).filter(isCredentialAgentIntegration);
		if (credentialIntegrations.length > 0) {
			await Container.get(ChatIntegrationService)
				.syncToConfig(agent, [], credentialIntegrations)
				.catch((error) =>
					this.logger.warn('Failed to connect integrations on publish', {
						agentId,
						error,
					}),
				);
		}

		const { AgentTaskService } = await import('./agent-task.service.js');
		await Container.get(AgentTaskService)
			.requestReconcile(agentId)
			.catch((error) =>
				this.logger.warn('Failed to register agent tasks on publish', { agentId, error }),
			);
	}

	private async commitUnpublication(agent: ProjectAgent, expectedRevision: number): Promise<void> {
		await this.transactionRunner.run({}, async (ctx) => {
			const nextVersionId = uuid();

			// Fence first: only mutate the in-memory entity once the row is ours,
			// so a losing caller never sees phantom unpublished state on the
			// entity instance it still holds.
			const won = await this.agentRepository.setActiveVersionFenced(
				agent.id,
				expectedRevision,
				{ activeVersionId: null, versionId: nextVersionId },
				ctx,
			);
			if (!won) {
				throw new ConflictError('Agent was modified concurrently while unpublishing; please retry');
			}

			agent.activeVersionId = null;
			agent.activeVersion = null;
			agent.versionId = nextVersionId;
			agent.revision = expectedRevision + 1;
		});
	}

	private async findPublishTarget(
		versionId: string | undefined,
		agentId: string,
	): Promise<AgentHistory | undefined> {
		if (!versionId) return undefined;
		const target = await this.agentHistoryRepository.findByVersionAndAgentId(versionId, agentId);
		if (!target) throw new NotFoundError(`Version "${versionId}" not found for agent "${agentId}"`);
		return target;
	}

	private async commitPublication(
		agent: ProjectAgent,
		expectedRevision: number,
		user: User,
		tasks: ReadonlyMap<string, AgentTask>,
		targetHistory?: AgentHistory,
	): Promise<void> {
		await this.transactionRunner.run({}, async (ctx) => {
			const next = await this.preparePublishedVersion(ctx, agent, user, tasks, targetHistory);
			const won = await this.agentRepository.setActiveVersionFenced(
				agent.id,
				expectedRevision,
				{ activeVersionId: next.activeVersionId, versionId: next.versionId },
				ctx,
			);
			if (!won)
				throw new ConflictError('Agent was modified concurrently while publishing; please retry');
			// Update the caller's entity only after the revision fence succeeds.
			agent.activeVersionId = next.activeVersionId;
			agent.activeVersion = next.activeVersion;
			agent.versionId = next.versionId;
			agent.revision = expectedRevision + 1;
		});
	}

	private async preparePublishedVersion(
		ctx: OperationContext,
		agent: ProjectAgent,
		user: User,
		tasks: ReadonlyMap<string, AgentTask>,
		targetHistory?: AgentHistory,
	) {
		if (targetHistory) {
			return {
				activeVersionId: targetHistory.versionId,
				activeVersion: targetHistory,
				versionId: uuid(),
			};
		}
		const versionId = agent.versionId ?? uuid();
		const activeVersion = await this.saveDraftHistory(ctx, agent, user, versionId);
		await this.snapshotConfiguredTasks(ctx, versionId, agent.schema, tasks);
		return { activeVersionId: versionId, activeVersion, versionId };
	}

	private async saveDraftHistory(
		ctx: OperationContext,
		agent: ProjectAgent,
		user: User,
		versionId: string,
	) {
		try {
			return await this.agentHistoryRepository.saveVersion(
				{
					versionId,
					agentId: agent.id,
					schema: agent.schema
						? {
								...agent.schema,
								integrations: (agent.integrations ?? []).filter(
									(integration) => integration.type === N8N_CHAT_INTEGRATION_TYPE,
								),
							}
						: null,
					tools: this.customToolsService.snapshotConfiguredTools(agent.schema, agent.tools ?? {}),
					skills: this.pickConfiguredSkillBodies(agent.schema, agent.skills ?? {}),
					publishedBy: user,
				},
				ctx,
			);
		} catch (error) {
			// Concurrent publishes of one draft can collide before they reach the revision fence.
			if (isUniqueConstraintError(error)) {
				throw new ConflictError('Agent was modified concurrently while publishing; please retry');
			}
			throw error;
		}
	}
}
