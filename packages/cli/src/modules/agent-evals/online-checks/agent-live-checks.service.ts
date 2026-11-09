import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { AgentContextService } from '@/modules/agents/agent-context.service';
import type { FinishedAgentExecution } from '@/modules/agents/agent-execution.service';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentLiveCheckFailureRepository } from '@/modules/agents/repositories/agent-live-check-failure.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { isMoreOften } from './live-check-counts';
import { generateToolChecks, replyIssues } from './tool-checks';
import { profileAgentTools } from './tool-profile';
import type { TimelineEvent } from './types';

/** Counts look back this far at most, for this version and the last one alike. */
export const LIVE_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface LiveCheckCount {
	checkId: string;
	question: string;
	/** Sessions of this version where the check failed at least once. */
	failed: number;
	/** The same for the last version. Null when no other version ran in the window. */
	prevFailed: number | null;
	/** True only when the "More often" test holds (see `live-check-counts`). */
	moreOften: boolean;
}

export interface LiveChecksReport {
	/** Null before the published version ran a live session in the window. */
	current: { versionId: string; sessions: number; since: string } | null;
	previous: { versionId: string; sessions: number } | null;
	checks: LiveCheckCount[];
}

function replyText(timeline: TimelineEvent[]): string {
	return timeline
		.flatMap((event) => (event.type === 'text' ? [event.content] : []))
		.join('\n')
		.trim();
}

/**
 * The code checks on live sessions of a published agent (phase 4 of the plan).
 * After a run of the published version finishes, the checks read its timeline,
 * and each failure is saved with the version that ran. No model is called, so
 * nothing here costs tokens. The report counts failed sessions per check for
 * this version, beside the last version's count.
 */
@Service()
export class AgentLiveChecksService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly historyRepository: AgentHistoryRepository,
		private readonly failureRepository: AgentLiveCheckFailureRepository,
		private readonly agentContextService: AgentContextService,
	) {}

	/**
	 * The checks that failed on each live run of one session, for the line under
	 * each reply in the Sessions view. The session must be one the user can read.
	 */
	async failuresForSession(
		user: User,
		projectId: string,
		agentId: string,
		threadId: string,
	): Promise<{ executions: Record<string, Array<{ checkId: string; reason: string }>> }> {
		const session = await this.agentContextService.readSession(user, projectId, agentId, threadId);
		if (!session) throw new NotFoundError('Session not found');
		const rows = await this.failureRepository.forExecutions(
			session.executions.map((execution) => execution.id),
		);
		const executions: Record<string, Array<{ checkId: string; reason: string }>> = {};
		for (const row of rows) {
			(executions[row.executionId] ??= []).push({ checkId: row.checkId, reason: row.reason });
		}
		return { executions };
	}

	async checkFinishedExecution(execution: FinishedAgentExecution): Promise<void> {
		if (execution.runType !== 'production') return;
		// A run paused for approval has not finished its reply. The run that
		// resumes it is checked on its own.
		if (execution.hitlStatus === 'suspended') return;
		if (execution.status !== 'success' && execution.status !== 'error') return;

		// The version active when the run finished. A publish during the run
		// would credit it to the new version.
		const agent = await this.agentRepository.findOne({
			where: { id: execution.agentId },
			select: { id: true, activeVersionId: true },
		});
		const versionId = agent?.activeVersionId;
		if (!versionId) return;
		const version = await this.historyRepository.findOneBy({ versionId });
		if (!version?.schema) return;

		await this.failureRepository.stampVersion(execution.executionId, versionId);
		const issues = replyIssues(profileAgentTools(version.schema), {
			userMessage: execution.userMessage,
			reply: replyText(execution.timeline),
			timeline: execution.timeline,
		});
		await this.failureRepository.saveFailures(
			issues.map((issue) => ({
				executionId: execution.executionId,
				checkId: issue.checkId,
				agentId: execution.agentId,
				agentVersionId: versionId,
				reason: issue.reason,
			})),
		);
		this.logger.debug('Checked a live agent run', {
			executionId: execution.executionId,
			failed: issues.map((issue) => issue.checkId),
		});
	}

	async report(projectId: string, agentId: string, now = new Date()): Promise<LiveChecksReport> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) throw new NotFoundError('Agent not found');
		const currentId = agent.activeVersionId;
		const version = currentId
			? await this.historyRepository.findOneBy({ versionId: currentId })
			: null;
		const checks = version?.schema ? generateToolChecks(profileAgentTools(version.schema)) : [];

		const since = new Date(now.getTime() - LIVE_WINDOW_DAYS * DAY_MS);
		const versions = await this.failureRepository.sessionsPerVersion(agentId, since);
		const current = versions.find((v) => v.versionId === currentId) ?? null;
		// The newest other version that ran in the window.
		const previous = versions.find((v) => v.versionId !== currentId) ?? null;
		const failed = await this.failureRepository.failedSessions(
			agentId,
			[current, previous].flatMap((v) => (v ? [v.versionId] : [])),
			since,
		);
		const failedFor = (versionId: string | undefined, checkId: string) =>
			failed.find((row) => row.versionId === versionId && row.checkId === checkId)?.sessions ?? 0;

		return {
			current: current
				? {
						versionId: current.versionId,
						sessions: current.sessions,
						since: current.firstAt.toISOString(),
					}
				: null,
			previous: previous ? { versionId: previous.versionId, sessions: previous.sessions } : null,
			checks: checks.map((check) => {
				const count = failedFor(current?.versionId, check.id);
				const prevFailed = previous ? failedFor(previous.versionId, check.id) : null;
				return {
					checkId: check.id,
					question: check.question,
					failed: count,
					prevFailed,
					moreOften:
						current !== null &&
						previous !== null &&
						prevFailed !== null &&
						isMoreOften(count, current.sessions, prevFailed, previous.sessions),
				};
			}),
		};
	}
}
