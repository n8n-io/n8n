import {
	AGENT_SCHEDULE_TRIGGER_TYPE,
	DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
	type AgentScheduleConfig,
	type AgentScheduleIntegration,
	isAgentScheduleIntegration,
} from '@n8n/api-types';
import { ProjectRelationRepository } from '@n8n/db';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { CronJob } from 'cron';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';

import { AgentsService } from '../agents.service';
import type { Agent } from '../entities/agent.entity';
import { AgentRepository } from '../repositories/agent.repository';
import { isValidCronExpression } from './cron-validation';

@Service()
export class AgentScheduleService {
	private readonly jobs = new Map<string, CronJob>();

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly agentRepository: AgentRepository,
		private readonly agentsService: AgentsService,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	getConfig(agent: Agent): AgentScheduleConfig {
		const integration = this.getScheduleIntegration(agent);

		return {
			active: integration?.active ?? false,
			cronExpression: integration?.cronExpression ?? '',
			wakeUpPrompt: integration?.wakeUpPrompt ?? DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
		};
	}

	async saveConfig(
		agent: Agent,
		cronExpression: string,
		wakeUpPrompt?: string,
	): Promise<AgentScheduleConfig> {
		const existing = this.getScheduleIntegration(agent);
		const normalizedCronExpression = cronExpression.trim();
		const nextWakeUpPrompt =
			wakeUpPrompt ?? existing?.wakeUpPrompt ?? DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT;

		if (normalizedCronExpression !== '') {
			this.assertCronExpressionIsValid(normalizedCronExpression);
		} else if (existing?.active) {
			throw new BadRequestError('Cron expression is required while the schedule is active');
		}

		const saved = await this.saveScheduleIntegration(agent, {
			type: AGENT_SCHEDULE_TRIGGER_TYPE,
			active: existing?.active ?? false,
			cronExpression: normalizedCronExpression,
			wakeUpPrompt: nextWakeUpPrompt,
		});

		if (this.getScheduleIntegration(saved)?.active) {
			await this.registerOrRefresh(saved);
		}

		this.logger.debug('[AgentScheduleService] Saved schedule config', {
			agentId: agent.id,
			projectId: agent.projectId,
			active: saved.integrations.find(isAgentScheduleIntegration)?.active ?? false,
			cronExpression: normalizedCronExpression || null,
		});

		return this.getConfig(saved);
	}

	async activate(agent: Agent): Promise<AgentScheduleConfig> {
		if (!agent.publishedVersion) {
			throw new ConflictError(
				`Agent "${agent.id}" must be published before activating the schedule trigger`,
			);
		}

		const existing = this.getScheduleIntegration(agent);
		const cronExpression = existing?.cronExpression.trim() ?? '';
		if (cronExpression === '') {
			throw new BadRequestError('Cron expression is required before activation');
		}

		this.assertCronExpressionIsValid(cronExpression);

		const saved = await this.saveScheduleIntegration(agent, {
			type: AGENT_SCHEDULE_TRIGGER_TYPE,
			active: true,
			cronExpression,
			wakeUpPrompt: existing?.wakeUpPrompt ?? DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT,
		});

		await this.registerOrRefresh(saved);
		this.logger.info('[AgentScheduleService] Activated schedule trigger', {
			agentId: agent.id,
			projectId: agent.projectId,
			cronExpression,
		});

		return this.getConfig(saved);
	}

	async deactivate(agent: Agent): Promise<AgentScheduleConfig> {
		const existing = this.getScheduleIntegration(agent);
		if (!existing) {
			this.deregister(agent.id);
			return this.getConfig(agent);
		}

		const saved = await this.saveScheduleIntegration(agent, {
			...existing,
			active: false,
		});

		this.deregister(agent.id);
		this.logger.info('[AgentScheduleService] Deactivated schedule trigger', {
			agentId: agent.id,
			projectId: agent.projectId,
		});

		return this.getConfig(saved);
	}

	@OnLeaderTakeover()
	async reconnectAll(): Promise<void> {
		const agents = await this.agentRepository.findPublished();
		this.logger.debug('[AgentScheduleService] Reconnecting active schedules', {
			publishedAgentCount: agents.length,
		});

		for (const agent of agents) {
			const schedule = this.getScheduleIntegration(agent);
			if (!schedule?.active) {
				continue;
			}

			try {
				await this.registerOrRefresh(agent);
			} catch (error) {
				this.logger.error('[AgentScheduleService] Failed to reconnect agent schedule', {
					agentId: agent.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	/**
	 * Idempotent apply: read the schedule integration off the agent and reconcile
	 * the cron job. Used when the JSON config writes a new schedule via the
	 * builder so the live runtime tracks the persisted config.
	 */
	async applyConfig(agent: Agent): Promise<void> {
		const schedule = this.getScheduleIntegration(agent);
		if (schedule?.active) {
			await this.registerOrRefresh(agent);
		} else {
			this.deregister(agent.id);
		}
	}

	async registerOrRefresh(agent: Agent): Promise<void> {
		const schedule = this.getScheduleIntegration(agent);
		if (!schedule?.active) {
			this.logger.debug(
				'[AgentScheduleService] Skipping schedule registration for inactive agent',
				{
					agentId: agent.id,
					projectId: agent.projectId,
				},
			);
			this.deregister(agent.id);
			return;
		}

		if (!agent.publishedVersion) {
			this.logger.warn(
				'[AgentScheduleService] Skipping schedule registration for unpublished agent',
				{
					agentId: agent.id,
					projectId: agent.projectId,
				},
			);
			this.deregister(agent.id);
			return;
		}

		this.assertCronExpressionIsValid(schedule.cronExpression);

		this.deregister(agent.id);

		const timezone = this.globalConfig.generic.timezone;
		const job = new CronJob(
			schedule.cronExpression,
			() => {
				void this.runScheduled(agent.id);
			},
			null,
			false,
			timezone,
		);

		job.start();
		this.jobs.set(agent.id, job);
		this.logger.info('[AgentScheduleService] Registered schedule trigger', {
			agentId: agent.id,
			projectId: agent.projectId,
			cronExpression: schedule.cronExpression,
			timezone,
		});
	}

	deregister(agentId: string): void {
		const existing = this.jobs.get(agentId);
		if (!existing) {
			return;
		}

		void existing.stop();
		this.jobs.delete(agentId);
		this.logger.info('[AgentScheduleService] Deregistered schedule trigger', { agentId });
	}

	@OnLeaderStepdown()
	@OnShutdown()
	stopAll(): void {
		for (const [agentId] of this.jobs) {
			this.deregister(agentId);
		}
	}

	private getScheduleIntegration(agent: Agent): AgentScheduleIntegration | undefined {
		return (agent.integrations ?? []).find(isAgentScheduleIntegration);
	}

	private async saveScheduleIntegration(
		agent: Agent,
		schedule: AgentScheduleIntegration,
	): Promise<Agent> {
		agent.integrations = [
			...(agent.integrations ?? []).filter(
				(integration) => !isAgentScheduleIntegration(integration),
			),
			schedule,
		];

		return await this.agentRepository.save(agent);
	}

	private assertCronExpressionIsValid(cronExpression: string): void {
		if (!isValidCronExpression(cronExpression)) {
			throw new BadRequestError('Invalid cron expression');
		}
	}

	private async runScheduled(agentId: string): Promise<void> {
		let projectId: string | undefined;
		let threadId: string | undefined;
		let cronExpression: string | undefined;
		const startedAt = Date.now();

		try {
			const agent = await this.agentRepository.findOne({
				where: { id: agentId },
				relations: { publishedVersion: true },
			});
			if (!agent) {
				this.logger.warn('[AgentScheduleService] Scheduled trigger fired for missing agent', {
					agentId,
				});
				this.deregister(agentId);
				return;
			}

			projectId = agent.projectId;
			const schedule = this.getScheduleIntegration(agent);
			cronExpression = schedule?.cronExpression;
			if (!agent.publishedVersion) {
				this.logger.warn('[AgentScheduleService] Scheduled trigger fired for unpublished agent', {
					agentId,
					projectId,
				});
				this.deregister(agentId);
				return;
			}

			if (!schedule?.active) {
				this.logger.warn('[AgentScheduleService] Scheduled trigger fired for inactive agent', {
					agentId,
					projectId,
				});
				this.deregister(agentId);
				return;
			}

			const executionUserId = await this.resolveExecutionUserId(agent);
			if (!executionUserId) {
				this.logger.warn('[AgentScheduleService] No project member available for scheduled run', {
					agentId,
					projectId: agent.projectId,
				});
				return;
			}

			threadId = `schedule-${agentId}-${randomUUID()}`;
			const timezone = this.globalConfig.generic.timezone;
			const timestamp = DateTime.now().setZone(timezone).toISO() ?? new Date().toISOString();
			const message = `${schedule.wakeUpPrompt}\n\nCurrent date and time: ${timestamp} (timezone: ${timezone})`;

			this.logger.info('[AgentScheduleService] Scheduled trigger fired', {
				agentId,
				projectId,
				threadId,
				cronExpression: schedule.cronExpression,
				timezone,
			});
			this.logger.debug('[AgentScheduleService] Starting scheduled agent run', {
				agentId,
				projectId,
				threadId,
				messageLength: message.length,
			});

			let chunkCount = 0;
			for await (const _chunk of this.agentsService.executeForSchedulePublished({
				agentId: agent.id,
				projectId: agent.projectId,
				message,
				memory: { threadId, resourceId: executionUserId },
			})) {
				chunkCount += 1;
			}

			this.logger.info('[AgentScheduleService] Scheduled agent run completed', {
				agentId,
				projectId,
				threadId,
				chunkCount,
				durationMs: Date.now() - startedAt,
			});
		} catch (error) {
			this.logger.error('[AgentScheduleService] Scheduled agent run failed', {
				agentId,
				projectId,
				threadId,
				cronExpression,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
		}
	}

	private async resolveExecutionUserId(agent: Agent): Promise<string | undefined> {
		const userIds = await this.projectRelationRepository.findUserIdsByProjectId(agent.projectId);
		if (userIds.length === 0) {
			return undefined;
		}

		const publishedById = agent.publishedVersion?.publishedById;
		if (publishedById && userIds.includes(publishedById)) {
			return publishedById;
		}

		return undefined;
	}
}
