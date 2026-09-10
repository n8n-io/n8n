import { LockNamespace, LockService, Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { UserRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { OperationalError, UnexpectedError } from 'n8n-workflow';

import { userHasScopes } from '@/permissions.ee/check-access';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import {
	AgentExecutionOrchestratorService,
	type ExecuteForWakeConfig,
} from '../agent-execution-orchestrator.service';
import { hashAgentSandboxPrincipal, isAgentSandboxPrincipalHash } from '../agent-sandbox-principal';
import {
	AGENT_BACKGROUND_UPDATES_CLOSE_TAG,
	AGENT_BACKGROUND_UPDATES_OPEN_TAG,
	formatWakeMessage,
} from './background-job-messages';
import type { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { AgentBackgroundJobRepository } from '../repositories/agent-background-job.repository';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { AgentRepository } from '../repositories/agent.repository';
import {
	integrationTypeFromMemoryResourceId,
	userIdFromDraftChatMemoryResourceId,
} from '../utils/agent-memory-scope';

export const WAKE_DEBOUNCE_MS = 5_000;
export const MAX_CONSECUTIVE_FAILED_WAKES = 3;

const WAKE_LOCK_WAIT_MS = 250;
const WAKE_LOCK_TTL_MS = 30_000;
const HINT_TITLE_MAX_CHARS = 80;

type FailureState = { generation: string; count: number };

@Service()
export class AgentWakeService {
	private readonly timers = new Map<string, NodeJS.Timeout>();

	private readonly failures = new Map<string, FailureState>();

	/** Threads with an active wake in this process. */
	private readonly activeWakes = new Set<string>();

	constructor(
		private readonly jobRepository: AgentBackgroundJobRepository,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly agentRepository: AgentRepository,
		private readonly userRepository: UserRepository,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly integrationRegistry: ChatIntegrationRegistry,
		private readonly orchestrator: AgentExecutionOrchestratorService,
		private readonly lockService: LockService,
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('agents');
	}

	async requestWake(threadId: string): Promise<void> {
		if (!this.agentsConfig.backgroundTasksEnabled) return;
		if (this.instanceSettings.isWorker) {
			await this.publisher.publishCommand({
				command: 'wake-agent-background-job',
				payload: { threadId },
			});
			return;
		}
		this.scheduleLocal(threadId);
	}

	@OnPubSubEvent('wake-agent-background-job', { instanceType: 'main' })
	handleWakeRelay({ threadId }: { threadId: string }): void {
		if (!this.agentsConfig.backgroundTasksEnabled) return;
		this.scheduleLocal(threadId);
	}

	async drainUnconsumed(): Promise<void> {
		if (!this.agentsConfig.backgroundTasksEnabled) return;
		const threadIds = await this.jobRepository.findThreadsWithUnconsumedMail();
		for (const threadId of threadIds) this.scheduleLocal(threadId);
	}

	isWakeActive(threadId: string): boolean {
		return this.activeWakes.has(threadId);
	}

	async onParentTurnFinished(threadId: string): Promise<void> {
		this.failures.delete(threadId);
		await this.requestWake(threadId);
	}

	/**
	 * Return a hint about pending job results for the current memory resource.
	 * Authors who share a thread see only their own jobs.
	 * Wake runs already receive these results as input and need no hint.
	 */
	async getBackgroundUpdates(threadId: string, resourceId: string): Promise<string | undefined> {
		if (!this.agentsConfig.backgroundTasksEnabled) return undefined;
		if (this.activeWakes.has(threadId)) return undefined;

		const jobs = (await this.jobRepository.findWakeableUnconsumedSettled(threadId)).filter(
			(job) => job.parentResourceId === resourceId,
		);
		if (jobs.length === 0) return undefined;

		// Remove tag characters so titles cannot close the surrounding tag.
		// Quote titles to distinguish them from instructions.
		const summaries = jobs
			.map((job) => {
				const title = job.title.replace(/[<>]/g, '').slice(0, HINT_TITLE_MAX_CHARS);
				return `${JSON.stringify(title)} (${job.status})`;
			})
			.join(', ');
		return `${AGENT_BACKGROUND_UPDATES_OPEN_TAG}${jobs.length} background job(s) settled: ${summaries}. Call check_background_jobs once before you finish this turn, only if you have not already checked in this turn. Collect all relevant jobs in that call.${AGENT_BACKGROUND_UPDATES_CLOSE_TAG}`;
	}

	private scheduleLocal(threadId: string): void {
		if (this.timers.has(threadId)) return;
		const timer = setTimeout(() => {
			this.timers.delete(threadId);
			void this.attemptWake(threadId);
		}, WAKE_DEBOUNCE_MS);
		timer.unref();
		this.timers.set(threadId, timer);
	}

	async attemptWake(threadId: string): Promise<void> {
		if (!this.agentsConfig.backgroundTasksEnabled) return;

		try {
			await this.lockService.withLease(
				LockNamespace.KNOWN_LOCKS,
				`agent-background-wake:${threadId}`,
				async (signal) => await this.deliverInsideLease(threadId, signal),
				{ waitTimeoutMs: WAKE_LOCK_WAIT_MS, leaseTtlMs: WAKE_LOCK_TTL_MS },
			);
		} catch (error) {
			this.logger.warn('Failed to acquire the background job wake lease', { threadId, error });
		}
	}

	private async deliverInsideLease(threadId: string, signal: AbortSignal): Promise<void> {
		const pending = await this.jobRepository.findWakeableUnconsumedSettled(threadId);
		const first = pending[0];
		if (!first || signal.aborted) return;

		// Each wake delivers results for one author. The oldest pending job determines
		// the wake identity. Results for other authors stay pending for the next wake.
		const jobs = pending.filter((job) => this.hasSameParentIdentity(job, first));
		const generation = jobs
			.map((job) => job.id)
			.sort()
			.join(':');
		const failure = this.failures.get(threadId);
		if (failure?.generation === generation && failure.count >= MAX_CONSECUTIVE_FAILED_WAKES) {
			return;
		}

		// Execution records keep their suspended status after a resume.
		// Check the checkpoint store to determine whether the thread is still suspended.
		if (
			(await this.executionRepository.existsRunningByThread(threadId)) ||
			((await this.executionRepository.hasSuspendedRun(threadId)) &&
				(await this.checkpointStorage.findSuspendedForThread(first.parentAgentId, threadId)) !==
					null)
		) {
			return;
		}

		const agent = await this.agentRepository.findById(first.parentAgentId);
		if (!agent) {
			this.recordFailure(threadId, generation, 'Background job parent agent no longer exists');
			return;
		}

		let identity: ExecuteForWakeConfig['identity'];
		try {
			identity = await this.resolveIdentity(
				first.parentResourceId,
				first.parentPrincipalHash,
				agent.projectId,
			);
		} catch (error) {
			this.recordFailure(
				threadId,
				generation,
				error instanceof Error ? error.message : String(error),
			);
			return;
		}

		try {
			this.activeWakes.add(threadId);
			try {
				await this.orchestrator.executeForWake({
					agentId: agent.id,
					projectId: agent.projectId,
					message: formatWakeMessage(jobs),
					memory: { threadId, resourceId: first.parentResourceId },
					identity,
					abortSignal: signal,
				});
			} finally {
				this.activeWakes.delete(threadId);
			}

			if (signal.aborted) return;
			await this.jobRepository.markMailConsumed(
				threadId,
				jobs.map((job) => job.id),
			);
			this.failures.delete(threadId);

			if (jobs.length < pending.length) this.scheduleLocal(threadId);
		} catch {
			if (signal.aborted) return;
			// Keep provider and tool error details in the execution record.
			// Log only that the wake failed.
			this.recordFailure(threadId, generation, 'Wake run failed');
		}
	}

	private async resolveIdentity(
		resourceId: string,
		principalHash: string,
		projectId: string,
	): Promise<ExecuteForWakeConfig['identity']> {
		const userId = userIdFromDraftChatMemoryResourceId(resourceId);
		if (userId) {
			const expectedHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId });
			if (expectedHash !== principalHash) {
				throw new UnexpectedError('Draft wake identity does not match its principal');
			}

			// Load the current user role to verify that the user still has permission to run the agent.
			const user = await this.userRepository.findByIdWithRole(userId);
			if (!user || user.disabled) throw new OperationalError('Draft wake user is no longer active');
			if (!(await userHasScopes(user, ['agent:execute'], false, { projectId }))) {
				throw new OperationalError('Draft wake user can no longer execute this agent');
			}
			return { type: 'draft', user, principalHash: expectedHash };
		}

		const integrationType = integrationTypeFromMemoryResourceId(resourceId);
		if (
			!integrationType ||
			!this.integrationRegistry.get(integrationType) ||
			!isAgentSandboxPrincipalHash(principalHash)
		) {
			throw new UnexpectedError('Published wake identity is invalid');
		}
		return { type: 'published', integrationType, principalHash };
	}

	private hasSameParentIdentity(job: AgentBackgroundJob, other: AgentBackgroundJob): boolean {
		return (
			job.parentAgentId === other.parentAgentId &&
			job.parentResourceId === other.parentResourceId &&
			job.parentPrincipalHash === other.parentPrincipalHash
		);
	}

	private recordFailure(threadId: string, generation: string, reason: string): void {
		const previous = this.failures.get(threadId);
		const count = previous?.generation === generation ? previous.count + 1 : 1;
		this.failures.set(threadId, { generation, count });
		this.logger.warn('Failed to deliver background job results to the parent agent', {
			threadId,
			attempt: count,
			reason,
		});
	}
}
