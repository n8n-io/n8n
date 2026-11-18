import type { SelfHealingAgentTrigger } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { TransactionRunner, type User } from '@n8n/db';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { runInTransaction } from '../../after-commit';
import {
	SelfHealingConfigurationRepository,
	type SelfHealingAgentCoverage,
} from '../database/self-healing-configuration.repository';
import { SelfHealingConfigurationService } from '../self-healing-configuration.service';
import { SelfHealingAgentInvestigationRepository } from './database/self-healing-agent-investigation.repository';
import { SelfHealingAgentResultRepository } from './database/self-healing-agent-result.repository';
import {
	agentTraceWindowStart,
	isOutdatedAgentProposal,
	SelfHealingAgentInvestigationService,
} from './self-healing-agent-investigation.service';
import {
	getAgentEvalProposals,
	getAgentServices,
	type SelfHealingAgentServices,
} from './self-healing-agent-modules';

/** One sweep starts this number of investigations at most, to limit the Assistant load. */
export const SELF_HEALING_AGENT_SWEEP_MAX_STARTS = 5;

/** The sweep does not start an agent again for this time after a failed investigation. */
export const SELF_HEALING_AGENT_FAILURE_COOLDOWN_MS = Time.hours.toMilliseconds;

/** Start the agent investigations that a schedule or a trace count makes due. */
@SystemTask()
export class SelfHealingAgentSweepTask implements SystemTask {
	readonly name = 'self-healing-agent-sweep';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(5 * Time.minutes.toSeconds);

	// No retry: a retry runs the full sweep again, and the next occurrence does the same work.
	readonly target = clusterTarget({
		scheduler: { retryOnFailure: false },
		leaderTimer: { runOnTakeover: true, retryDelaySeconds: 30 },
	});

	constructor(
		private readonly investigationService: SelfHealingAgentInvestigationService,
		private readonly investigations: SelfHealingAgentInvestigationRepository,
		private readonly results: SelfHealingAgentResultRepository,
		private readonly configurations: SelfHealingConfigurationRepository,
		private readonly configurationService: SelfHealingConfigurationService,
		private readonly txRunner: TransactionRunner,
		private readonly logger: Logger,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		if (signal.aborted) return;
		await this.investigationService.reconcile(signal);

		// An instance that cannot test a proposal starts no investigation.
		const agents = await getAgentServices();
		if (!agents) return;
		if ((await getAgentEvalProposals())?.availability() !== 'ok') return;

		let started = 0;
		for (const configuration of await this.configurations.listEnabledWithAgentCoverage()) {
			// A saved configuration has a trigger. This check covers a row from before that rule.
			if (
				configuration.agentScheduleIntervalHours === null &&
				configuration.agentTraceThreshold === null
			) {
				continue;
			}

			let actor: User;
			let agentIds: string[];
			try {
				const resolved = await this.resolveActor(configuration);
				if (!resolved) continue;
				actor = resolved;
				agentIds = await this.coveredAgentIds(configuration, agents);
			} catch (error) {
				this.logger.warn('Could not check a self-healing configuration for due agents.', {
					configurationId: configuration.id,
					error,
				});
				continue;
			}

			for (const agentId of agentIds) {
				if (signal.aborted || started >= SELF_HEALING_AGENT_SWEEP_MAX_STARTS) return;
				try {
					const trigger = await this.dueTrigger(configuration, actor, agentId, agents);
					if (!trigger) continue;
					// `start` returns when the run is admitted. It does not wait for the run.
					const { status } = await this.investigationService.start({
						configurationId: configuration.id,
						projectId: configuration.projectId,
						agentId,
						trigger,
					});
					if (status === 'started') started++;
				} catch (error) {
					this.logger.warn('Could not start a due agent investigation.', {
						configurationId: configuration.id,
						agentId,
						error,
					});
				}
			}
		}
	}

	private async resolveActor({ id, projectId }: SelfHealingAgentCoverage) {
		return await runInTransaction(this.txRunner, {}, async (ctx) => {
			const configuration = await this.configurations.findForUpdate(id, projectId, ctx);
			if (!configuration) return null;
			return await this.configurationService.resolveAgentActorOrPause(configuration, ctx);
		});
	}

	private async coveredAgentIds(
		{ agentScope, agentIds, projectId }: SelfHealingAgentCoverage,
		agents: SelfHealingAgentServices,
	) {
		if (agentScope === 'selected') return agentIds;
		const projectAgents = await agents.context.listProjectAgents(projectId);
		return projectAgents.filter(({ published }) => published).map(({ id }) => id);
	}

	/** The trigger that is due for the agent, or null when the agent must not start now. */
	private async dueTrigger(
		configuration: SelfHealingAgentCoverage,
		actor: User,
		agentId: string,
		agents: SelfHealingAgentServices,
	): Promise<SelfHealingAgentTrigger | null> {
		const { projectId } = configuration;
		// An explicit selection in another configuration wins over all-agent coverage.
		const covering = await this.configurations.findForAgent(projectId, agentId);
		if (covering?.id !== configuration.id) return null;

		const published = await agents.context.getPublishedVersion(projectId, agentId);
		if (!published?.clean) return null;

		if (await this.investigations.getUnfinishedForAgent(agentId)) return null;
		// `start` closes an outdated proposal, so only a proposal that can be applied blocks.
		const open = await this.results.getOpenForAgent(agentId);
		if (open && !isOutdatedAgentProposal(open, published.versionId)) return null;

		const now = new Date();
		const lastFailedAt = await this.investigations.getLastFailedAt(agentId);
		if (
			lastFailedAt &&
			now.getTime() - lastFailedAt.getTime() < SELF_HEALING_AGENT_FAILURE_COOLDOWN_MS
		) {
			return null;
		}

		const last = await this.investigations.getLastConsuming(agentId);
		const lastWindowEnd = last?.traceWindowEnd ?? null;
		const { agentScheduleIntervalHours: intervalHours, agentTraceThreshold: threshold } =
			configuration;

		// A new configuration and a new version each start the schedule again.
		const scheduleStart = Math.max(
			lastWindowEnd?.getTime() ?? 0,
			configuration.updatedAt.getTime(),
			published.publishedAt.getTime(),
		);
		const intervalPassed =
			intervalHours !== null &&
			now.getTime() - scheduleStart >= intervalHours * Time.hours.toMilliseconds;
		// The schedule needs the count only for a version that an investigation already read.
		const investigatedVersion = last?.agentVersionId === published.versionId;
		const newSessions =
			threshold !== null || (intervalPassed && investigatedVersion)
				? await agents.context.countProductionTraces(actor, projectId, agentId, {
						after: agentTraceWindowStart(lastWindowEnd, published.publishedAt, now),
						until: now,
					})
				: null;

		// The same version with no new session gives the same result. Do not start again.
		const scheduleDue = intervalPassed && !(investigatedVersion && newSessions === 0);
		const tracesDue = threshold !== null && newSessions !== null && newSessions >= threshold;

		if (scheduleDue && tracesDue) return 'both';
		if (scheduleDue) return 'schedule';
		return tracesDue ? 'traces' : null;
	}
}
