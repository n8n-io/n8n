import {
	isCredentialAgentIntegration,
	isDraftIntegration,
	type AgentConfigValidationResponse,
	type AgentJsonConfig,
	type AgentVersionListItemDto,
	type AgentPublishHistoryItemDto,
	type UpdateAgentVersionDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { TransactionRunner, isUniqueConstraintError, type User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import isEqual from 'lodash/isEqual';
import { UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { Telemetry } from '@/telemetry';

import { AgentDefinitionService } from './agent-definition.service';
import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { AgentSaveCompletionService } from './agent-save-completion.service';
import { AgentSkillRefsService } from './agent-skill-refs.service';
import type { AgentDefinition } from './utils/agent-definition';
import { buildAgentCapabilityTelemetryProperties } from './agent-telemetry';
import { builderTelemetrySessionProperties } from './builder/builder-telemetry-session';
import {
	diffAgentConfigParts,
	diffAgentConfigSettings,
	type AgentActor,
	type AgentMutationTelemetryContext,
} from './agent-modification-telemetry.service';
import { AgentPolicyService } from './agent-policy.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentSetupCompletionService } from './agent-setup-completion.service';
import { AgentUpdateBroadcaster } from './agent-update-broadcaster';
import { AgentValidationService } from './agent-validation.service';
import type { AgentPublishHistory } from './entities/agent-publish-history.entity';
import type { AgentHistory } from './entities/agent-history.entity';
import type { Agent, ProjectAgent } from './entities/agent.entity';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { toAgentDocument } from './json-config/agent-document';
import {
	AgentFileRepository,
	type AgentKnowledgeTotals,
} from './repositories/agent-file.repository';
import { AgentPublishHistoryRepository } from './repositories/agent-publish-history.repository';
import { AgentHistoryRepository } from './repositories/agent-history.repository';
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
		private readonly agentSkillRefs: AgentSkillRefsService,
		private readonly agentFileRepository: AgentFileRepository,
		private readonly publishHistory: AgentPublishHistoryRepository,
	) {}

	/** `pushRef`: push connection of the tab that made the change; excluded from the `agentUpdated` broadcast. */
	async publishAgent(
		agentId: string,
		projectId: string,
		user: User,
		emitter: AgentPublishEmitter,
		versionId?: string,
		pushRef?: string,
		expectedRevision?: number,
		metadata?: UpdateAgentVersionDto,
	): Promise<PublishAgentResult> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);

		if (expectedRevision !== undefined && agent.revision !== expectedRevision) {
			throw new ConflictError('Agent was modified concurrently while publishing; please retry');
		}
		const expectedPublicationRevision = agent.publicationRevision;

		const selectedVersionId = versionId ?? agent.versionId;
		if (selectedVersionId && selectedVersionId === agent.activeVersionId) {
			if (metadata)
				await this.updateVersionMetadata(agentId, projectId, selectedVersionId, metadata);
			return { agent };
		}

		const targetHistory = await this.findPublishTarget(agent, versionId, user);
		const wasPublished = await this.publishHistory.hasPublication(
			agent.id,
			targetHistory.versionId,
			{},
		);
		await this.assertPublishable(agent, projectId, user, targetHistory);

		// The document that goes live: for a republish, the version's config, not the draft.
		const published = await this.readPublishTargetDocument(targetHistory);

		// Backstop: explicit publish can be the first path to observe a complete
		// setup. Marking here keeps "setup completed" a superset of "published".
		const emitSetupCompleted = this.setupCompletionService.recordPublishedSetupComplete(
			agent,
			projectId,
			user,
			published,
		);

		const knowledgeTotals = await this.readKnowledgeTotalsForTelemetry(agent.id);

		await this.commitPublication(agent, expectedPublicationRevision, user, targetHistory, metadata);
		this.eventService.emit('agent-saved', { agentId });
		this.agentUpdateBroadcaster.notify({ projectId, agentId, source: emitter.by }, pushRef);

		this.runtimeCacheService.clearRuntimes(agentId);

		this.trackPublished(agent, projectId, user, emitter, wasPublished, published, knowledgeTotals);
		await emitSetupCompleted?.();

		await this.reconcilePublishedServices(agent.id);

		this.logger.debug('Published SDK agent', { agentId, projectId, userId: user.id });

		return { agent: await getAgentOrThrow(this.agentRepository, agentId, projectId) };
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
		targetHistory: AgentHistory,
	): Promise<ValidAgentConfigValidationResponse> {
		// Before validation, so a refusal names the violations instead of a generic error.
		const schema = targetHistory.schema;
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

		const validation = await this.agentValidationService.validateAgentHistoryConfiguration(
			agent.id,
			projectId,
			targetHistory,
			agent.integrations ?? [],
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
		expectedRevision?: number,
	): Promise<ProjectAgent> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);

		if (expectedRevision !== undefined && agent.revision !== expectedRevision) {
			throw new ConflictError('Agent was modified concurrently while unpublishing; please retry');
		}
		if (!agent.activeVersionId) return agent;
		const expectedPublicationRevision = agent.publicationRevision;

		await this.commitUnpublication(agent, expectedPublicationRevision, user);
		this.eventService.emit('agent-saved', { agentId });
		this.agentUpdateBroadcaster.notify({ projectId, agentId, source: by }, pushRef);

		this.runtimeCacheService.clearRuntimes(agentId);

		this.trackUnpublished(agentId, projectId, user, by);

		await this.reconcilePublishedServices(agentId);

		this.logger.debug('Unpublished SDK agent', { agentId, projectId });
		return agent;
	}

	/** Make sure a failed read for the publish event never stops the publication. */
	private async readKnowledgeTotalsForTelemetry(
		agentId: string,
	): Promise<AgentKnowledgeTotals | undefined> {
		try {
			return await this.agentFileRepository.getKnowledgeTotals(agentId);
		} catch (error) {
			this.logger.warn('Failed to read knowledge totals for the publish event', {
				agentId,
				error,
			});
			return undefined;
		}
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
		wasPublished: boolean,
		published: AgentJsonConfig | null,
		knowledgeTotals: AgentKnowledgeTotals | undefined,
	): void {
		const properties = {
			agent_id: agent.id,
			project_id: projectId,
			user_id: user.id,
			trigger: wasPublished ? ('republish' as const) : emitter.trigger,
			// Set by the transaction above to either targetHistory.versionId or
			// agent.versionId, so it is never null on this path.
			version_id: agent.activeVersionId!,
			...buildAgentCapabilityTelemetryProperties(published, agent.integrations),
			...(knowledgeTotals && {
				knowledge_file_count: knowledgeTotals.fileCount,
				knowledge_total_bytes: knowledgeTotals.totalBytes,
			}),
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
					...builderTelemetrySessionProperties(),
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
					...builderTelemetrySessionProperties(),
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

		await this.restoreVersion(agent, activeVersion, uuid(), {
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

		const version = await this.agentHistoryRepository.findByVersionAndAgentId(
			versionId,
			agentId,
			{},
		);
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

		// The refs carry their pins, so comparing the refs is enough.
		const previousSkillRefs = await this.agentSkillRefs.refsForDraft(agent, {});
		const previousSchema = agent.schema ? toAgentDocument(agent.schema, previousSkillRefs) : null;
		const previousTools = agent.tools ?? {};
		const { tasksChanged, nextSchema, nextSkillRefs } = await this.transactionRunner.run(
			{},
			async (ctx) => {
				const definition = await this.definitionService.readVersion(version, ctx);
				definition.schema = draftSchemaFromVersion(definition.schema);
				agent.versionId = nextVersionId;
				// Each skill ref is pinned to the version that the published version ran.
				// No skill row is written, so this needs no skill permission.
				const changed = await this.definitionService.replaceDraft(agent, definition, ctx, version);
				await this.definitionService.captureVersion(agent, context.user, ctx, context.modifiedBy);
				return {
					tasksChanged: changed,
					nextSchema: definition.schema,
					nextSkillRefs: await this.agentSkillRefs.refsForDraft(agent, ctx),
				};
			},
		);
		const integrations = agent.integrations ?? [];
		await this.saveCompletion.configurationSaved(
			{
				agent,
				config: nextSchema,
				projectId: agent.projectId,
				user: context.user,
				by: context.modifiedBy,
				changedParts: diffAgentConfigParts(previousSchema, nextSchema, integrations, integrations, {
					tools: !isEqual(previousTools, agent.tools),
					skills: !isEqual(previousSkillRefs, nextSkillRefs),
					tasks: tasksChanged,
				}),
				changedSettings: diffAgentConfigSettings(previousSchema, nextSchema),
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
		return await this.publishHistory.hasPublication(agentId, undefined, {});
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

		const version = await this.agentHistoryRepository.findByVersionAndAgentId(
			versionId,
			agentId,
			{},
		);
		if (!version) {
			throw new NotFoundError(`Version "${versionId}" not found for agent "${agentId}"`);
		}

		const definition = await this.definitionService.readVersion(version);
		return { agent, version, definition };
	}

	async listVersions(
		agentId: string,
		projectId: string,
		take: number,
		skip: number,
	): Promise<AgentVersionListItemDto[]> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);

		const versions = await this.agentHistoryRepository.findByAgentId(agentId, take, skip, {});

		const publications = await this.publishHistory.findLatestForVersions(
			agentId,
			versions.map(({ versionId }) => versionId),
			{},
		);
		return versions.map((version) =>
			this.versionSummary(agent, version, publications.get(version.versionId)),
		);
	}

	private versionSummary(
		agent: Agent,
		version: AgentHistory,
		publication?: AgentPublishHistory,
	): AgentVersionListItemDto {
		return {
			versionId: version.versionId,
			agentId: version.agentId,
			createdAt: version.createdAt.toISOString(),
			updatedAt: version.updatedAt.toISOString(),
			author: version.author,
			isActive: version.versionId === agent.activeVersionId,
			isCurrent: version.versionId === agent.versionId,
			name: version.name ?? null,
			description: version.description ?? null,
			...(publication
				? {
						lastPublished: {
							author: publication.author,
							createdAt: publication.createdAt.toISOString(),
							isLegacy: publication.isLegacy,
						},
					}
				: {}),
		};
	}

	async getVersionSummary(
		agentId: string,
		projectId: string,
		versionId: string,
	): Promise<AgentVersionListItemDto> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);
		const version = await this.agentHistoryRepository.findSummary(agentId, versionId, {});
		if (!version) throw new NotFoundError(`Version "${versionId}" not found`);
		const publications = await this.publishHistory.findLatestForVersions(agentId, [versionId], {});
		return this.versionSummary(agent, version, publications.get(versionId));
	}

	async hasVersionHistory(agentId: string): Promise<boolean> {
		return await this.agentHistoryRepository.existsForAgent(agentId, {});
	}

	async updateVersionMetadata(
		agentId: string,
		projectId: string,
		versionId: string,
		metadata: UpdateAgentVersionDto,
	): Promise<void> {
		await getAgentOrThrow(this.agentRepository, agentId, projectId);
		const version = await this.agentHistoryRepository.findByVersionAndAgentId(
			versionId,
			agentId,
			{},
		);
		if (!version) throw new NotFoundError(`Version "${versionId}" not found`);
		await this.agentHistoryRepository.updateMetadata(agentId, versionId, metadata, {});
	}

	async listPublishHistory(
		agentId: string,
		projectId: string,
		take: number,
		skip: number,
	): Promise<AgentPublishHistoryItemDto[]> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);
		// Include the preceding event so durations remain correct across page boundaries.
		const offset = skip > 0 ? 1 : 0;
		const rows = await this.publishHistory.list(agentId, take + offset, skip - offset, {});
		const latest = skip === 0 ? rows[0] : (await this.publishHistory.list(agentId, 1, 0, {}))[0];
		return rows.slice(offset).map((row, index) => ({
			id: row.id,
			versionId: row.versionId,
			name: row.version?.name ?? null,
			description: row.version?.description ?? null,
			event: row.event,
			author: row.author,
			createdAt: row.createdAt.toISOString(),
			endedAt: row.isLegacy ? null : (rows[index + offset - 1]?.createdAt.toISOString() ?? null),
			isLegacy: row.isLegacy,
			isActive:
				row.event === 'activated' &&
				row.versionId === agent.activeVersionId &&
				(row.isLegacy ? Boolean(latest?.isLegacy) : row.id === latest?.id),
		}));
	}

	private async readPublishTargetDocument(version: AgentHistory): Promise<AgentJsonConfig | null> {
		return version.schema
			? toAgentDocument(version.schema, await this.agentSkillRefs.refsForVersion(version, {}))
			: null;
	}

	private async reconcilePublishedServices(agentId: string): Promise<void> {
		const channels = Container.get(ChatIntegrationService);
		const current = await this.agentRepository.findById(agentId);

		if (current) {
			const integrations = (current.integrations ?? []).filter(isCredentialAgentIntegration);
			if (current.activeVersionId) {
				await channels
					.syncToConfig(current, [], integrations)
					.catch((error) =>
						this.logger.warn('Failed to connect integrations on publish', { agentId, error }),
					);
			} else {
				for (const integration of integrations) {
					await channels.disconnectChannel(agentId, integration, { deleteSubscriptions: false });
				}
			}
		}

		const { AgentTaskService } = await import('./agent-task.service.js');
		await Container.get(AgentTaskService)
			.requestReconcile(agentId)
			.catch((error) => this.logger.warn('Failed to reconcile agent tasks', { agentId, error }));
	}

	private async commitUnpublication(
		agent: ProjectAgent,
		expectedRevision: number,
		user: User,
	): Promise<void> {
		await this.transactionRunner.run({}, async (ctx) => {
			const won = await this.agentRepository.setActiveVersionFenced(
				agent.id,
				expectedRevision,
				null,
				ctx,
			);
			if (!won) throw new ConflictError('Agent publication changed concurrently; please retry');
			await this.publishHistory.record(agent.id, agent.activeVersionId, 'deactivated', user, ctx);
			agent.activeVersionId = null;
			agent.activeVersion = null;
			agent.publicationRevision = expectedRevision + 1;
		});
	}

	private async findPublishTarget(
		agent: ProjectAgent,
		versionId: string | undefined,
		user: User,
	): Promise<AgentHistory> {
		const id = versionId ?? agent.versionId;
		if (id) {
			const target = await this.agentHistoryRepository.findByVersionAndAgentId(id, agent.id, {});
			if (target) return target;
		}
		if (versionId && versionId !== agent.versionId)
			throw new NotFoundError(`Version "${versionId}" not found for agent "${agent.id}"`);
		// Older callers can publish a draft that predates saved versions.
		return await this.transactionRunner.run({}, async (ctx) => {
			const current = await this.agentRepository.lockForVersionCapture(agent.id, ctx);
			if (
				!current ||
				current.revision !== agent.revision ||
				(agent.versionId !== null && current.versionId !== agent.versionId)
			)
				throw new ConflictError('Agent draft changed concurrently; please retry');
			try {
				return await this.definitionService.captureVersion(current, user, ctx);
			} catch (error) {
				if (isUniqueConstraintError(error))
					throw new ConflictError('Agent publication changed concurrently; please retry');
				throw error;
			}
		});
	}

	private async commitPublication(
		agent: ProjectAgent,
		expectedRevision: number,
		user: User,
		target: AgentHistory,
		metadata?: UpdateAgentVersionDto,
	): Promise<void> {
		await this.transactionRunner.run({}, async (ctx) => {
			await this.agentSkillRefs.assertVersionAccess(agent, target, ctx);
			const won = await this.agentRepository.setActiveVersionFenced(
				agent.id,
				expectedRevision,
				target.versionId,
				ctx,
			);
			if (!won) {
				throw new ConflictError('Agent publication changed concurrently; please retry');
			}

			if (metadata)
				await this.agentHistoryRepository.updateMetadata(agent.id, target.versionId, metadata, ctx);
			await this.agentHistoryRepository.recordPublisher(target.versionId, user.id, ctx);
			await this.publishHistory.record(agent.id, target.versionId, 'activated', user, ctx);

			agent.activeVersionId = target.versionId;
			agent.activeVersion = target;
			agent.publicationRevision = expectedRevision + 1;
		});
	}
}
