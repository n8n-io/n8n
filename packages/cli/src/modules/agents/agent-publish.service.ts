import {
	type AgentJsonConfig,
	type AgentSkill,
	type AgentVersionListItemDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { deepCopy, UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentCustomToolsService } from './agent-custom-tools.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentTask } from './entities/agent-task.entity';
import type { Agent } from './entities/agent.entity';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentHistoryRepository } from './repositories/agent-history.repository';
import { AgentTaskSnapshotRepository } from './repositories/agent-task-snapshot.repository';
import { AgentRepository } from './repositories/agent.repository';
import { getMissingSkillIds } from '@/modules/agents/utils/agent-missing-skill-ids';

export interface PublishAgentOptions {
	syncIntegrations?: boolean;
}

@Service()
export class AgentPublishService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly agentHistoryRepository: AgentHistoryRepository,
		private readonly agentTaskSnapshotRepository: AgentTaskSnapshotRepository,
		private readonly customToolsService: AgentCustomToolsService,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
	) {}

	async publishAgent(
		agentId: string,
		projectId: string,
		user: User,
		versionId?: string,
		options: PublishAgentOptions = {},
	): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		if (!versionId && agent.versionId !== null && agent.versionId === agent.activeVersionId) {
			return agent;
		}

		if (versionId !== undefined && versionId === agent.activeVersionId) {
			return agent;
		}

		await this.agentRepository.manager.transaction(async (trx) => {
			if (versionId) {
				const existing = await this.agentHistoryRepository.findByVersionAndAgentId(
					versionId,
					agentId,
					trx,
				);
				if (!existing) {
					throw new NotFoundError(`Version "${versionId}" not found for agent "${agentId}"`);
				}
				agent.activeVersionId = existing.versionId;
				agent.activeVersion = existing;
				agent.versionId = uuid();
			} else {
				agent.versionId ??= uuid();

				agent.activeVersion = await this.agentHistoryRepository.saveVersion(
					{
						versionId: agent.versionId,
						agentId: agent.id,
						schema: agent.schema,
						tools: this.customToolsService.snapshotConfiguredTools(agent.schema, agent.tools ?? {}),
						skills: this.pickConfiguredSkillBodies(agent.schema, agent.skills ?? {}),
						publishedBy: user,
					},
					trx,
				);
				await this.snapshotConfiguredTasks(trx, agent.versionId, agent.id, agent.schema);
				agent.activeVersionId = agent.versionId;
			}

			await trx.save(agent);
		});

		this.runtimeCacheService.clearRuntimes(agentId);

		const credentialIntegrations = agent.integrations ?? [];
		if (credentialIntegrations.length > 0 && options.syncIntegrations !== false) {
			await Container.get(ChatIntegrationService)
				.syncToConfig(agent, [], credentialIntegrations)
				.catch((error) =>
					this.logger.warn('Failed to connect integrations on publish', {
						agentId,
						error,
					}),
				);
		}

		const { AgentTaskService } = await import('./agent-task.service');
		await Container.get(AgentTaskService)
			.requestReconcile(agentId)
			.catch((error) =>
				this.logger.warn('Failed to register agent tasks on publish', { agentId, error }),
			);

		this.logger.debug('Published SDK agent', { agentId, projectId, userId: user.id });

		return agent;
	}

	async unpublishAgent(agentId: string, projectId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		await this.agentRepository.manager.transaction(async (trx) => {
			agent.activeVersionId = null;
			agent.activeVersion = null;
			agent.versionId = uuid();

			await trx.save(agent);
		});

		this.runtimeCacheService.clearRuntimes(agentId);

		await Container.get(ChatIntegrationService).disconnect(agentId);

		const { AgentTaskService } = await import('./agent-task.service');
		await Container.get(AgentTaskService)
			.requestReconcile(agentId)
			.catch((error) =>
				this.logger.warn('Failed to stop agent tasks on unpublish', { agentId, error }),
			);

		this.logger.debug('Unpublished SDK agent', { agentId, projectId });
		return agent;
	}

	async revertToPublishedAgent(agentId: string, projectId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

		const activeVersion = agent.activeVersion;
		if (!activeVersion) {
			throw new ConflictError(`Agent "${agentId}" is not published`);
		}

		await this.agentRepository.manager.transaction(async (trx) => {
			agent.schema = activeVersion.schema ? deepCopy(activeVersion.schema) : null;
			agent.tools = deepCopy(activeVersion.tools ?? {});
			agent.skills = deepCopy(activeVersion.skills ?? {});
			agent.versionId = activeVersion.versionId;

			if (agent.schema) {
				agent.name = agent.schema.name;
			}

			await trx.save(agent);
			await this.restoreTasksFromSnapshot(trx, agentId, activeVersion.versionId);
		});

		this.runtimeCacheService.clearRuntimes(agentId);

		this.logger.debug('Reverted SDK agent to published version', { agentId, projectId });
		return agent;
	}

	async revertToVersion(agentId: string, projectId: string, versionId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}

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

			await trx.save(agent);
			await this.restoreTasksFromSnapshot(trx, agentId, target.versionId);
		});

		this.runtimeCacheService.clearRuntimes(agentId);

		this.logger.debug('Reverted SDK agent to a specific version', {
			agentId,
			projectId,
			versionId,
		});
		return agent;
	}

	/**
	 * Cheap existence check used by the editor to gate the version-history
	 * panel button. Survives unpublish, unlike `agent.activeVersionId`.
	 */
	async hasPublishHistory(agentId: string): Promise<boolean> {
		return await this.agentHistoryRepository.existsForAgent(agentId);
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
	 * live draft edits.
	 */
	private async snapshotConfiguredTasks(
		trx: EntityManager,
		versionId: string,
		agentId: string,
		config: AgentJsonConfig | null,
	): Promise<void> {
		if (!config) return;
		const refs = config.tasks ?? [];
		if (refs.length === 0) return;

		const bodies = await trx.getRepository(AgentTask).findBy({ agentId });
		const byId = new Map(bodies.map((body) => [body.id, body]));
		const missing = refs.filter((ref) => !byId.has(ref.id)).map((ref) => ref.id);
		if (missing.length > 0) {
			throw new UserError(`Cannot publish agent with missing task bodies: ${missing.join(', ')}`);
		}

		await this.agentTaskSnapshotRepository.saveForVersion(
			refs.map((ref) => {
				const body = byId.get(ref.id);
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
	 * on revert.
	 */
	private async restoreTasksFromSnapshot(
		trx: EntityManager,
		agentId: string,
		versionId: string,
	): Promise<void> {
		const repo = trx.getRepository(AgentTask);
		const existing = await repo.findBy({ agentId });
		const snapshots = await this.agentTaskSnapshotRepository.findByVersionId(versionId, trx);
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
				});
			} else {
				await repo.insert({
					id: snapshot.taskId,
					agentId,
					name: snapshot.name,
					objective: snapshot.objective,
					cronExpression: snapshot.cronExpression,
				});
			}
		}
	}
}
