import {
	isDraftIntegration,
	type AgentConfigValidationResponse,
	type AgentJsonConfig,
	type AgentSkill,
	type AgentVersionListItemDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { isUniqueConstraintError, type User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { EntityManager } from '@n8n/typeorm';
import isEqual from 'lodash/isEqual';
import { deepCopy, UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { getMissingSkillIds } from '@/modules/agents/utils/agent-missing-skill-ids';
import { Telemetry } from '@/telemetry';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { AgentCustomToolsService } from './agent-custom-tools.service';
import { buildAgentConfigurationTelemetryFromConfig } from './agent-telemetry';
import {
	AgentModificationTelemetryService,
	diffAgentConfigParts,
	type AgentActor,
} from './agent-modification-telemetry.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentSetupCompletionService } from './agent-setup-completion.service';
import { AgentValidationService } from './agent-validation.service';
import type { AgentHistory } from './entities/agent-history.entity';
import { AgentTask } from './entities/agent-task.entity';
import type { AgentTaskSnapshot } from './entities/agent-task-snapshot.entity';
import type { Agent } from './entities/agent.entity';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentHistoryRepository } from './repositories/agent-history.repository';
import { AgentTaskSnapshotRepository } from './repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import { SubAgentCleanupService } from './sub-agents/sub-agent-cleanup.service';
import {
	configuredCapabilityKinds,
	countAgentCapabilities,
	totalAgentCapabilities,
} from './utils/agent-capabilities';
import { saveAgentDraftFenced } from './utils/agent-draft.utils';

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
		throw new UserError('Agent configuration has errors that must be resolved before publishing');
	}
}

export interface PublishAgentResult {
	agent: Agent;
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
		private readonly subAgentCleanupService: SubAgentCleanupService,
		private readonly agentValidationService: AgentValidationService,
		private readonly credentialsService: CredentialsService,
		private readonly telemetry: Telemetry,
		private readonly eventService: EventService,
		private readonly setupCompletionService: AgentSetupCompletionService,
		private readonly modificationTelemetry: AgentModificationTelemetryService,
	) {}

	async publishAgent(
		agentId: string,
		projectId: string,
		user: User,
		emitter: AgentPublishEmitter,
		versionId?: string,
	): Promise<PublishAgentResult> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		const expectedRevision = agent.revision;

		if (!versionId && agent.versionId !== null && agent.versionId === agent.activeVersionId) {
			return { agent };
		}

		if (versionId !== undefined && versionId === agent.activeVersionId) {
			return { agent };
		}

		let targetHistory: AgentHistory | undefined;
		if (versionId) {
			const target = await this.agentHistoryRepository.findByVersionAndAgentId(versionId, agent.id);
			if (!target) {
				throw new NotFoundError(`Version "${versionId}" not found for agent "${agent.id}"`);
			}
			targetHistory = target;
		}

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

		await this.agentRepository.manager.transaction(async (trx) => {
			let nextActiveVersionId: string;
			let nextVersionId: string;
			let nextActiveVersion: AgentHistory | null | undefined;

			if (targetHistory) {
				nextActiveVersionId = targetHistory.versionId;
				nextActiveVersion = targetHistory;
				nextVersionId = uuid();
			} else {
				nextVersionId = agent.versionId ?? uuid();
				try {
					nextActiveVersion = await this.agentHistoryRepository.saveVersion(
						{
							versionId: nextVersionId,
							agentId: agent.id,
							schema: agent.schema,
							tools: this.customToolsService.snapshotConfiguredTools(
								agent.schema,
								agent.tools ?? {},
							),
							skills: this.pickConfiguredSkillBodies(agent.schema, agent.skills ?? {}),
							publishedBy: user,
						},
						trx,
					);
				} catch (error) {
					// Two concurrent publishes of the same draft share this
					// versionId, so the loser collides on the history primary
					// key before it can reach the revision fence. Surface the
					// same retryable conflict the fence would have produced.
					if (isUniqueConstraintError(error)) {
						throw new ConflictError(
							'Agent was modified concurrently while publishing; please retry',
						);
					}
					throw error;
				}
				await this.snapshotConfiguredTasks(trx, nextVersionId, agent.schema, tasks);
				nextActiveVersionId = nextVersionId;
			}

			const won = await this.agentRepository.setActiveVersionFenced(
				agent.id,
				expectedRevision,
				{ activeVersionId: nextActiveVersionId, versionId: nextVersionId },
				trx,
			);
			if (!won) {
				throw new ConflictError('Agent was modified concurrently while publishing; please retry');
			}

			// Fence first: only mutate the in-memory entity once the row is ours,
			// so a losing caller never sees phantom published state on the entity
			// instance it still holds.
			agent.activeVersionId = nextActiveVersionId;
			agent.activeVersion = nextActiveVersion;
			agent.versionId = nextVersionId;
			agent.revision = expectedRevision + 1;
		});
		this.eventService.emit('agent-saved', { agentId });

		this.runtimeCacheService.clearRuntimes(agentId);

		this.trackPublished(agent, projectId, user, emitter, targetHistory);
		await emitSetupCompleted?.();

		const credentialIntegrations = agent.integrations ?? [];
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

		this.logger.debug('Published SDK agent', { agentId, projectId, userId: user.id });

		return versionId ? { agent } : { agent, draftValidation: validation };
	}

	/**
	 * Authoritative pre-publish guard: re-validates the configuration that is
	 * about to become live, independent of any frontend check. Validating the
	 * current draft is not enough when a specific historical `versionId` is
	 * being republished — that snapshot's schema/tool/skill bodies must be
	 * checked instead. Integrations are never versioned, so the agent's
	 * *current* integrations are always part of the check.
	 */
	private async assertPublishable(
		agent: Agent,
		projectId: string,
		user: User,
		tasks: ReadonlyMap<string, AgentTask>,
		targetHistory?: AgentHistory,
	): Promise<ValidAgentConfigValidationResponse> {
		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			user,
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
	private async assertChannelsStartable(agent: Agent, projectId: string): Promise<void> {
		const chatIntegrationService = Container.get(ChatIntegrationService);
		for (const integration of agent.integrations ?? []) {
			if (isDraftIntegration(integration)) continue;
			await chatIntegrationService.assertStartupPreconditions(agent.id, integration, projectId);
		}
	}

	async unpublishAgent(
		agentId: string,
		projectId: string,
		user: User,
		by: AgentActor,
	): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		// Same optimistic revision fence as publish: a concurrent edit that bumped
		// `revision` after this load makes the unpublish lose the fence and surface
		// a user-retryable conflict instead of rolling back a newer active version.
		const expectedRevision = agent.revision;

		await this.agentRepository.manager.transaction(async (trx) => {
			const nextVersionId = uuid();

			// Fence first: only mutate the in-memory entity once the row is ours,
			// so a losing caller never sees phantom unpublished state on the
			// entity instance it still holds.
			const won = await this.agentRepository.setActiveVersionFenced(
				agent.id,
				expectedRevision,
				{ activeVersionId: null, versionId: nextVersionId },
				trx,
			);
			if (!won) {
				throw new ConflictError('Agent was modified concurrently while unpublishing; please retry');
			}

			agent.activeVersionId = null;
			agent.activeVersion = null;
			agent.versionId = nextVersionId;
			agent.revision = expectedRevision + 1;
		});
		this.eventService.emit('agent-saved', { agentId });

		this.runtimeCacheService.clearRuntimes(agentId);

		this.trackUnpublished(agentId, projectId, user, by);

		await this.subAgentCleanupService.removeSubAgentFromParents(agentId, projectId);

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
		agent: Agent,
		projectId: string,
		user: User,
		emitter: AgentPublishEmitter,
		targetHistory: AgentHistory | undefined,
	): void {
		// The snapshot that actually went live, which for a republish is the
		// version's schema rather than the draft.
		const published = targetHistory ? targetHistory.schema : agent.schema;
		const counts = countAgentCapabilities(published, agent.integrations);
		// Only model and tool_types: this helper's own tool_count folds in MCP
		// servers, provider tools, web search and sub-agents, which would
		// disagree with the per-kind counts above.
		const { model, tool_types } = buildAgentConfigurationTelemetryFromConfig(
			published,
			agent.integrations,
		);

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
			capability_kinds: configuredCapabilityKinds(counts),
			capability_count: totalAgentCapabilities(counts),
			tool_count: counts.tool,
			skill_count: counts.skill,
			sub_agent_count: counts.subAgent,
			mcp_server_count: counts.mcpServer,
			vector_store_count: counts.vectorStore,
			task_count: counts.task,
			trigger_count: counts.channel,
			model,
			tool_types,
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
	): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		const activeVersion = agent.activeVersion;
		if (!activeVersion) {
			throw new ConflictError(`Agent "${agentId}" is not published`);
		}

		const previousSchema = agent.schema;
		const previousTools = agent.tools ?? {};
		const previousSkills = agent.skills ?? {};

		let tasksChanged = false;
		await this.agentRepository.manager.transaction(async (trx) => {
			agent.schema = activeVersion.schema ? deepCopy(activeVersion.schema) : null;
			agent.tools = deepCopy(activeVersion.tools ?? {});
			agent.skills = deepCopy(activeVersion.skills ?? {});
			agent.versionId = activeVersion.versionId;

			if (agent.schema) {
				agent.name = agent.schema.name;
			}

			await saveAgentDraftFenced(this.agentRepository, agent, trx);
			tasksChanged = await this.restoreTasksFromSnapshot(trx, agentId, activeVersion.versionId);
		});
		this.eventService.emit('agent-saved', { agentId });

		this.runtimeCacheService.clearRuntimes(agentId);
		await this.recordRevert(agent, projectId, user, modifiedBy, previousSchema, {
			tools: !isEqual(previousTools, agent.tools ?? {}),
			skills: !isEqual(previousSkills, agent.skills ?? {}),
			tasks: tasksChanged,
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
	): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		const previousSchema = agent.schema;
		const previousTools = agent.tools ?? {};
		const previousSkills = agent.skills ?? {};

		let tasksChanged = false;
		await this.agentRepository.manager.transaction(async (trx) => {
			const target = await this.agentHistoryRepository.findByVersionAndAgentId(
				versionId,
				agentId,
				trx,
			);
			if (!target) {
				throw new NotFoundError(`Version "${versionId}" not found`);
			}

			agent.schema = target.schema ? deepCopy(target.schema) : null;
			agent.tools = deepCopy(target.tools ?? {});
			agent.skills = deepCopy(target.skills ?? {});
			agent.versionId = uuid();

			if (agent.schema) {
				agent.name = agent.schema.name;
			}

			await saveAgentDraftFenced(this.agentRepository, agent, trx);
			tasksChanged = await this.restoreTasksFromSnapshot(trx, agentId, target.versionId);
		});
		this.eventService.emit('agent-saved', { agentId });

		this.runtimeCacheService.clearRuntimes(agentId);
		await this.recordRevert(agent, projectId, user, modifiedBy, previousSchema, {
			tools: !isEqual(previousTools, agent.tools ?? {}),
			skills: !isEqual(previousSkills, agent.skills ?? {}),
			tasks: tasksChanged,
		});

		this.logger.debug('Reverted SDK agent to a specific version', {
			agentId,
			projectId,
			versionId,
		});
		return agent;
	}

	/**
	 * A revert restores a stored schema wholesale, so it is a modification like
	 * any other config write. Integrations live outside the schema and survive
	 * the revert untouched, hence the same list on both sides of the diff.
	 * Sidecar body flags cover tool/skill/task bodies restored outside the schema.
	 */
	private async recordRevert(
		agent: Agent,
		projectId: string,
		user: User,
		modifiedBy: AgentActor,
		previousSchema: AgentJsonConfig | null,
		sidecarChanges: Partial<Record<'tools' | 'skills' | 'tasks', boolean>>,
	): Promise<void> {
		const integrations = agent.integrations ?? [];
		this.modificationTelemetry.record({
			agent,
			projectId,
			user,
			by: modifiedBy,
			changedParts: diffAgentConfigParts(
				previousSchema,
				agent.schema,
				integrations,
				integrations,
				sidecarChanges,
			),
			// A revert needs a published version to revert to, so the agent was
			// configured long before this.
			wasUnconfigured: false,
		});
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
	): Promise<{ agent: Agent; version: AgentHistory; tasks: AgentTaskSnapshot[] }> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		const version = await this.agentHistoryRepository.findByVersionAndAgentId(versionId, agentId);
		if (!version) {
			throw new NotFoundError(`Version "${versionId}" not found for agent "${agentId}"`);
		}

		const tasks = await this.agentTaskSnapshotRepository.findByVersionId(versionId);
		return { agent, version, tasks };
	}

	async listPublishHistory(
		agentId: string,
		projectId: string,
		take: number,
		skip: number,
	): Promise<AgentVersionListItemDto[]> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

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
		trx: EntityManager,
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
			trx,
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

	/**
	 * Bring the draft task definition rows back in line with a published snapshot
	 * on revert. Returns whether task bodies changed (name/objective/cron/timezone
	 * only).
	 */
	private async restoreTasksFromSnapshot(
		trx: EntityManager,
		agentId: string,
		versionId: string,
	): Promise<boolean> {
		const repo = trx.getRepository(AgentTask);
		const existing = await repo.findBy({ agentId });
		const snapshots = await this.agentTaskSnapshotRepository.findByVersionId(versionId, trx);

		const existingBodies = Object.fromEntries(
			existing.map((row) => [
				row.id,
				{
					name: row.name,
					objective: row.objective,
					cronExpression: row.cronExpression,
					timezone: row.timezone,
				},
			]),
		);
		const snapshotBodies = Object.fromEntries(
			snapshots.map((snapshot) => [
				snapshot.taskId,
				{
					name: snapshot.name,
					objective: snapshot.objective,
					cronExpression: snapshot.cronExpression,
					timezone: snapshot.timezone,
				},
			]),
		);
		const tasksChanged = !isEqual(existingBodies, snapshotBodies);

		const snapshotIds = new Set(snapshots.map((snapshot) => snapshot.taskId));

		const orphanIds = existing.filter((row) => !snapshotIds.has(row.id)).map((row) => row.id);
		if (orphanIds.length > 0) await repo.delete(orphanIds);

		const existingIds = new Set(existing.map((row) => row.id));
		for (const snapshot of snapshots) {
			if (existingIds.has(snapshot.taskId)) {
				await repo.update(snapshot.taskId, {
					name: snapshot.name,
					objective: snapshot.objective,
					cronExpression: snapshot.cronExpression,
					timezone: snapshot.timezone,
				});
			} else {
				await repo.insert({
					id: snapshot.taskId,
					agentId,
					name: snapshot.name,
					objective: snapshot.objective,
					cronExpression: snapshot.cronExpression,
					timezone: snapshot.timezone,
				});
			}
		}

		return tasksChanged;
	}
}
