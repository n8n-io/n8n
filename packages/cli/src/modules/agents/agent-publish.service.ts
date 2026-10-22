import {
	isCredentialAgentIntegration,
	isDraftIntegration,
	type AgentConfigValidationResponse,
	type AgentJsonConfig,
	type AgentVersionListItemDto,
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

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { AgentDefinitionService } from './agent-definition.service';
import { AgentSaveCompletionService } from './agent-save-completion.service';
import { AgentSkillRefsService } from './agent-skill-refs.service';
import type { AgentDefinition } from './utils/agent-definition';
import { buildAgentCapabilityTelemetryProperties } from './agent-telemetry';
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
import type { AgentHistory } from './entities/agent-history.entity';
import type { Agent, ProjectAgent } from './entities/agent.entity';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { toAgentDocument } from './json-config/agent-document';
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
	): Promise<PublishAgentResult> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);

		const expectedRevision = agent.publicationRevision;

		if (!versionId && agent.versionId !== null && agent.versionId === agent.activeVersionId) {
			return { agent };
		}

		if (versionId !== undefined && versionId === agent.activeVersionId) {
			return { agent };
		}

		const targetHistory = await this.findPublishTarget(agent, versionId, user);
		const wasPublished = await this.publishHistory.hasPublication(
			agent.id,
			targetHistory.versionId,
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

		await this.commitPublication(agent, expectedRevision, user, targetHistory);
		this.eventService.emit('agent-saved', { agentId });
		this.agentUpdateBroadcaster.notify({ projectId, agentId, source: emitter.by }, pushRef);

		this.runtimeCacheService.clearRuntimes(agentId);

		this.trackPublished(agent, projectId, user, emitter, wasPublished, published);
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
	): Promise<ProjectAgent> {
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);

		if (!agent.activeVersionId) return agent;
		const expectedRevision = agent.publicationRevision;

		await this.commitUnpublication(agent, expectedRevision, user);
		this.eventService.emit('agent-saved', { agentId });
		this.agentUpdateBroadcaster.notify({ projectId, agentId, source: by }, pushRef);

		this.runtimeCacheService.clearRuntimes(agentId);

		this.trackUnpublished(agentId, projectId, user, by);

		await this.reconcilePublishedServices(agentId);

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
		wasPublished: boolean,
		published: AgentJsonConfig | null,
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

		const previousSkillRefs = await this.agentSkillRefs.refsForDraft(agent, {});
		// With the hub on, the refs carry their pins. With it off, a revert can keep the ids
		// and change the bodies, so compare the bodies too.
		const previousSkills = structuredClone(agent.skills ?? {});
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
					skills:
						!isEqual(previousSkillRefs, nextSkillRefs) ||
						(!this.agentSkillRefs.usesSkillsHub && !isEqual(previousSkills, agent.skills ?? {})),
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
		return await this.publishHistory.hasPublication(agentId);
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

	private async readPublishTargetDocument(version: AgentHistory): Promise<AgentJsonConfig | null> {
		return version.schema
			? toAgentDocument(version.schema, await this.agentSkillRefs.refsForVersion(version, {}))
			: null;
	}

	private async reconcilePublishedServices(agentId: string): Promise<void> {
		const channels = Container.get(ChatIntegrationService);
		for (let attempt = 0; attempt < 5; attempt++) {
			const current = await this.agentRepository.findById(agentId);
			if (!current) break;
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
			const latest = await this.agentRepository.findById(agentId);
			if (!latest || latest.publicationRevision === current.publicationRevision) break;
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
			const target = await this.agentHistoryRepository.findByVersionAndAgentId(id, agent.id);
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

			await this.agentHistoryRepository.recordPublisher(target.versionId, user.id, ctx);
			await this.publishHistory.record(agent.id, target.versionId, 'activated', user, ctx);

			agent.activeVersionId = target.versionId;
			agent.activeVersion = target;
			agent.publicationRevision = expectedRevision + 1;
		});
	}
}
