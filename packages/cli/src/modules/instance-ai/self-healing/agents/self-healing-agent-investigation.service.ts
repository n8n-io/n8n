import type {
	SelfHealingAgentGoal,
	SelfHealingAgentIneligibleReason,
	SelfHealingAgentTrigger,
	StartSelfHealingAgentInvestigationResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { InstanceAiConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	isUniqueConstraintError,
	TransactionRunner,
	type OperationContext,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { randomUUID } from 'node:crypto';

import type { AgentProposalBase } from '@/modules/agents/agent-proposal.contracts';

import { runInTransaction } from '../../after-commit';
import { DurableEventLog } from '../../event-bus/durable-event-log';
import { InterruptedRunSweeper } from '../../event-bus/interrupted-run-sweeper';
import { InstanceAiRunLimitError } from '../../instance-ai-run-limit.error';
import { InstanceAiService } from '../../instance-ai.service';
import { InstanceAiEventLogRepository } from '../../repositories/instance-ai-event-log.repository';
import { SelfHealingConfigurationRepository } from '../database/self-healing-configuration.repository';
import { SelfHealingConfigurationService } from '../self-healing-configuration.service';
import type { SelfHealingAgentInvestigation } from './database/self-healing-agent-investigation.entity';
import { SelfHealingAgentInvestigationRepository } from './database/self-healing-agent-investigation.repository';
import type { SelfHealingAgentResult } from './database/self-healing-agent-result.entity';
import { SelfHealingAgentResultRepository } from './database/self-healing-agent-result.repository';
import type { AgentImprovementRunResult } from './self-healing-agent-investigator.service';
import {
	getAgentEvalProposals,
	getAgentServices,
	type SelfHealingAgentServices,
} from './self-healing-agent-modules';
import {
	SELF_HEALING_AGENT_APPLY_LEASE_MS,
	SelfHealingAgentResultService,
} from './self-healing-agent-result.service';

/** An investigation reads the production traces of this number of days at most. */
export const SELF_HEALING_AGENT_MAX_TRACE_WINDOW_MS = 30 * Time.days.toMilliseconds;

const MAX_FAILURE_REASON_LENGTH = 64;

type StartAgentInvestigation = {
	configurationId: number;
	projectId: string;
	agentId: string;
	trigger: SelfHealingAgentTrigger;
};

type OpenProposal = Pick<SelfHealingAgentResult, 'id' | 'baseVersionId' | 'applyProgress'>;

/**
 * The start of the trace window: the newest of the end of the last window that an
 * investigation used, the publication of the current version, and the window limit.
 */
export function agentTraceWindowStart(
	lastWindowEnd: Date | null,
	publishedAt: Date,
	now: Date,
): Date {
	return new Date(
		Math.max(
			lastWindowEnd?.getTime() ?? 0,
			publishedAt.getTime(),
			now.getTime() - SELF_HEALING_AGENT_MAX_TRACE_WINDOW_MS,
		),
	);
}

/**
 * True for an open proposal that nobody can apply: no part of it is applied, and the version
 * that it changes is not the published version.
 */
export function isOutdatedAgentProposal(
	{ baseVersionId, applyProgress }: Pick<OpenProposal, 'baseVersionId' | 'applyProgress'>,
	publishedVersionId: string | null,
): boolean {
	const partlyApplied =
		applyProgress.evalsApplied ||
		applyProgress.agentPublished ||
		applyProgress.savedVersionId !== null ||
		applyProgress.savedSkillIds.length > 0;
	return !partlyApplied && publishedVersionId !== baseVersionId;
}

/** A code that says why a run has no proposal. Never an error message. */
function failureReason(run?: AgentImprovementRunResult) {
	if (!run) return 'not_started';
	if (run.status !== 'completed') return run.status;
	if (run.finishReason !== 'stop') return run.finishReason ?? 'unknown';
	if (!run.output) return 'invalid_output';
	// The run gave a valid answer, and an error stopped the save.
	return 'save_failed';
}

@Service()
export class SelfHealingAgentInvestigationService {
	constructor(
		private readonly investigations: SelfHealingAgentInvestigationRepository,
		private readonly results: SelfHealingAgentResultService,
		private readonly resultRepository: SelfHealingAgentResultRepository,
		private readonly configurations: SelfHealingConfigurationRepository,
		private readonly configurationService: SelfHealingConfigurationService,
		private readonly runtime: InstanceAiService,
		private readonly events: InstanceAiEventLogRepository,
		private readonly eventLog: DurableEventLog,
		private readonly sweeper: InterruptedRunSweeper,
		private readonly txRunner: TransactionRunner,
		private readonly config: InstanceAiConfig,
		private readonly logger: Logger,
	) {}

	/** Start an investigation of one agent. The run continues after this method returns. */
	async start(input: StartAgentInvestigation): Promise<StartSelfHealingAgentInvestigationResponse> {
		if (!this.config.workflowSuggestionsEnabled) {
			throw new BadRequestError('Self-healing investigations are disabled.');
		}
		const { configurationId, projectId, agentId } = input;
		const notEligible = (
			reason: SelfHealingAgentIneligibleReason,
		): StartSelfHealingAgentInvestigationResponse => ({ status: 'not_eligible', reason });

		const agents = await getAgentServices();
		if (!agents) return notEligible('testing_unavailable');

		const configuration = await this.configurations.findForAgent(projectId, agentId);
		if (configuration?.id !== configurationId || !configuration.enabled) {
			return notEligible('not_covered');
		}

		const actor = await this.resolveActor(configurationId, projectId);
		if (typeof actor === 'string') return notEligible(actor);

		const evals = await getAgentEvalProposals();
		if (evals?.availability() !== 'ok') return notEligible('testing_unavailable');

		// Check existing work before the agent state, so that an agent with an open proposal
		// gets that answer also when its draft has changes.
		const existing = await this.findExisting(input, agents);
		if (existing) return existing;

		const now = new Date();
		let base: AgentProposalBase;
		let after: Date;
		let traceCount: number;
		try {
			const read = await agents.proposals.readBase(actor, projectId, agentId);
			if ('unavailable' in read) {
				return notEligible(
					read.unavailable === 'unpublished_changes' ? 'unpublished_changes' : 'not_published',
				);
			}
			base = read.base;
			after = agentTraceWindowStart(
				await this.investigations.getLastConsumingWindowEnd(agentId),
				base.publishedAt,
				now,
			);
			traceCount = await agents.context.countProductionTraces(actor, projectId, agentId, {
				after,
				until: now,
			});
		} catch (error) {
			if (!(error instanceof ForbiddenError)) throw error;
			await this.resolveActor(configurationId, projectId);
			return notEligible('no_access');
		}

		let claimed: StartSelfHealingAgentInvestigationResponse | SelfHealingAgentInvestigation;
		try {
			claimed = await runInTransaction(this.txRunner, {}, async (ctx) => {
				const current = await this.resolveActor(configurationId, projectId, ctx);
				if (typeof current === 'string') return notEligible(current);
				// The base was read with the access of the first actor.
				if (current.id !== actor.id) return notEligible('no_access');

				const existingNow = await this.findExisting(input, agents, ctx);
				if (existingNow) return existingNow;

				return await this.investigations.createInvestigation(
					{
						configurationId,
						projectId,
						agentId,
						backgroundUserId: actor.id,
						trigger: input.trigger,
						agentVersionId: base.versionId,
						traceWindowStart: after,
						traceWindowEnd: now,
						traceCount,
						threadId: randomUUID(),
						runId: randomUUID(),
					},
					ctx,
				);
			});
		} catch (error) {
			// The unique index is the claim. Another start took it first.
			if (isUniqueConstraintError(error)) return { status: 'already_running' };
			throw error;
		}
		if ('status' in claimed) return claimed;
		const investigation = claimed;

		let completedRun: AgentImprovementRunResult | undefined;
		let execution: Promise<AgentImprovementRunResult>;
		try {
			// A refusal throws before the method returns its promise.
			execution = this.runtime.startAgentImprovementRun(
				{
					user: actor,
					threadId: investigation.threadId,
					investigationId: investigation.id,
					projectId,
					agentId,
					goals: configuration.agentGoals,
					base,
					traceWindow: { after, until: now },
					traceCount,
				},
				{
					runId: investigation.runId,
					onComplete: async (run, signal) => {
						completedRun = run;
						await this.handleRunCompletion(
							investigation,
							{ agentName: base.agentName, goals: configuration.agentGoals },
							run,
							signal,
						);
					},
				},
			);
		} catch (error) {
			await this.finishFailed(investigation, 'not_started');
			if (error instanceof InstanceAiRunLimitError) return notEligible('busy');
			throw error;
		}

		// Do not wait for the run.
		void execution.catch(async (error: unknown) => {
			this.logger.error('Agent improvement investigation failed.', {
				investigationId: investigation.id,
				error,
			});
			try {
				await this.finishFailed(investigation, failureReason(completedRun), completedRun);
				// Pause the configuration when the actor lost the access during the run.
				if (error instanceof ForbiddenError) await this.resolveActor(configurationId, projectId);
			} catch (finishError) {
				this.logger.error('Could not finish an agent improvement investigation.', {
					investigationId: investigation.id,
					error: finishError,
				});
			}
		});
		return { status: 'started' };
	}

	/**
	 * Resolve the user whose access the investigation uses. This pauses the configuration when
	 * that user lost the access. Returns the reason when the investigation cannot start.
	 */
	private async resolveActor(
		configurationId: number,
		projectId: string,
		ctx: OperationContext = {},
	): Promise<User | 'not_covered' | 'no_access'> {
		return await runInTransaction(this.txRunner, ctx, async (trx) => {
			const configuration = await this.configurations.findForUpdate(
				configurationId,
				projectId,
				trx,
			);
			if (!configuration?.enabled || configuration.agentScope === 'none') {
				return 'not_covered';
			}
			const actor = await this.configurationService.resolveAgentActorOrPause(configuration, trx);
			return actor ?? 'no_access';
		});
	}

	/**
	 * The work that blocks a new investigation of the agent. The order of the two reads is
	 * necessary: a completion changes an unfinished investigation into an open proposal.
	 */
	private async findExisting(
		{ projectId, agentId }: StartAgentInvestigation,
		agents: SelfHealingAgentServices,
		ctx: OperationContext = {},
	): Promise<StartSelfHealingAgentInvestigationResponse | null> {
		if (await this.investigations.getUnfinishedForAgent(agentId, ctx)) {
			return { status: 'already_running' };
		}

		const open = await this.resultRepository.getOpenForAgent(agentId, ctx);
		if (!open) return null;

		// No person is told about an open proposal, so close one that cannot be applied.
		const published = await agents.context.getPublishedVersion(projectId, agentId);
		if (isOutdatedAgentProposal(open, published?.versionId ?? null)) {
			const closed = await this.resultRepository.close(
				open.id,
				'outdated',
				{
					closedById: null,
					claimStaleBefore: new Date(Date.now() - SELF_HEALING_AGENT_APPLY_LEASE_MS),
				},
				ctx,
			);
			if (closed) return null;
		}
		return { status: 'open_proposal', resultId: open.id };
	}

	private async handleRunCompletion(
		investigation: SelfHealingAgentInvestigation,
		snapshot: { agentName: string; goals: SelfHealingAgentGoal[] },
		run: AgentImprovementRunResult,
		signal: AbortSignal,
	) {
		if (run.status !== 'completed' || run.finishReason !== 'stop' || !run.output) {
			await this.finishFailed(investigation, failureReason(run), run);
			return;
		}
		if (run.output.outcome === 'no_change') {
			await this.investigations.finish(investigation.id, {
				outcome: 'no_change',
				failureReason: null,
				usage: run.usage,
			});
			return;
		}
		// The proposal is the input of the last successful test. Without a test, there is none.
		if (!run.lastTested) {
			await this.finishFailed(investigation, 'untested_proposal', run);
			return;
		}

		signal.throwIfAborted();
		const saved = await this.results.complete({
			investigationId: investigation.id,
			...snapshot,
			output: run.output,
			lastTested: run.lastTested,
			usage: run.usage,
			signal,
		});
		if (saved?.publicationMode !== 'auto') return;

		// The proposal is saved. A failed automatic apply leaves it open for the reviewers.
		try {
			await this.results.applyAutomatically(saved.actor, saved.result);
		} catch (error) {
			this.logger.warn('Could not apply an agent proposal automatically.', {
				resultId: saved.result.id,
				error,
			});
		}
	}

	/** Close the claims of runs that a crash or a restart interrupted. */
	async reconcile(signal?: AbortSignal): Promise<void> {
		for (const investigation of await this.investigations.listUnfinished()) {
			if (signal?.aborted) return;
			try {
				await this.reconcileInvestigation(investigation);
			} catch (error) {
				this.logger.warn('Could not reconcile an agent improvement investigation.', {
					investigationId: investigation.id,
					error,
				});
			}
		}
	}

	private async reconcileInvestigation(investigation: SelfHealingAgentInvestigation) {
		const { threadId, runId } = investigation;
		if (this.runtime.isRunLive(threadId, runId)) return;
		// Allow the admission to finish before its first run event is saved.
		if (Date.now() - investigation.createdAt.getTime() < InterruptedRunSweeper.LIVENESS_GRACE_MS) {
			return;
		}
		if (!(await this.events.lastFactAt(threadId, runId))) {
			await this.finishFailed(investigation, 'crash_interrupted');
			return;
		}
		await this.sweeper.sweepRun(threadId, runId);
		await this.eventLog.flush(threadId);
		if (await this.events.getRunFinish(threadId, runId)) {
			await this.finishFailed(investigation, 'crash_interrupted');
		}
	}

	/** Finish an investigation that has no accepted outcome. A finished one does not change. */
	private async finishFailed(
		investigation: SelfHealingAgentInvestigation,
		reason: string,
		run?: AgentImprovementRunResult,
	) {
		await this.investigations.finish(investigation.id, {
			outcome: 'failed',
			failureReason: reason.slice(0, MAX_FAILURE_REASON_LENGTH),
			usage: run?.usage ?? null,
		});
	}
}
