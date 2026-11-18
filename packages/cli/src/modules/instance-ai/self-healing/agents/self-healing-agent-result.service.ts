import type {
	AgentProposalEdit,
	AgentProposalEvalCase,
	AgentProposalEvidence,
	InboxSelfHealingAgentItem,
	SelfHealingAgentGoal,
	SelfHealingAgentPublicationMode,
	SelfHealingAgentResultDetail,
	SelfHealingResultUsage,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { RoleService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import { TransactionRunner, UserRepository, isPerson, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ResponseError,
	UserError,
} from '@n8n/errors';
import type { AgentImprovementOutput } from '@n8n/instance-ai';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { InboxSourceQuery } from '../../../inbox/inbox-source.registry';
import { runInTransaction } from '../../after-commit';
import { SelfHealingConfigurationRepository } from '../database/self-healing-configuration.repository';
import {
	AGENT_REVIEWER_SCOPES,
	SelfHealingConfigurationService,
} from '../self-healing-configuration.service';
import { SelfHealingAgentInvestigationRepository } from './database/self-healing-agent-investigation.repository';
import type { SelfHealingAgentResult } from './database/self-healing-agent-result.entity';
import { SelfHealingAgentResultRepository } from './database/self-healing-agent-result.repository';
import { getAgentEvalProposals, getAgentServices } from './self-healing-agent-modules';

/** An apply that holds its claim for longer than this time has crashed. */
export const SELF_HEALING_AGENT_APPLY_LEASE_MS = 10 * Time.minutes.toMilliseconds;

const AUTOMATIC_APPLY_SCOPES: Scope[] = ['agent:read', 'agent:update', 'agent:publish'];
const MAX_SUMMARY_CODE_POINTS = 80;
const MAX_REPORT_LENGTH = 50_000;

export type CompleteSelfHealingAgentResult = {
	investigationId: string;
	/** The agent name and the goals that the investigation used. */
	agentName: string;
	goals: SelfHealingAgentGoal[];
	output: AgentImprovementOutput;
	/** The input and the results of the last successful proposal test. */
	lastTested: {
		edits: AgentProposalEdit[];
		evalCases: AgentProposalEvalCase[];
		evidence: AgentProposalEvidence;
	};
	usage: SelfHealingResultUsage;
	signal?: AbortSignal;
};

export type CompletedSelfHealingAgentResult = {
	result: SelfHealingAgentResult;
	/** The user whose access an automatic apply uses. */
	actor: User;
	publicationMode: SelfHealingAgentPublicationMode;
};

function claimStaleBefore() {
	return new Date(Date.now() - SELF_HEALING_AGENT_APPLY_LEASE_MS);
}

/** Only a message that is written for a user is stored and shown. */
function applyErrorMessage(error: unknown) {
	return error instanceof UserError || error instanceof ResponseError
		? error.message
		: 'The proposal was not applied because of an internal error.';
}

@Service()
export class SelfHealingAgentResultService {
	constructor(
		private readonly results: SelfHealingAgentResultRepository,
		private readonly investigations: SelfHealingAgentInvestigationRepository,
		private readonly configurations: SelfHealingConfigurationRepository,
		private readonly configurationService: SelfHealingConfigurationService,
		private readonly users: UserRepository,
		private readonly roles: RoleService,
		private readonly txRunner: TransactionRunner,
		private readonly logger: Logger,
	) {}

	private async getInboxAccess(userId: string) {
		const user = await this.users.findByIdWithRole(userId);
		if (!user || user.disabled) {
			throw new ForbiddenError('Agent edit access is required.');
		}
		return {
			userId,
			hasGlobalAccess: hasGlobalScope(user, AGENT_REVIEWER_SCOPES, { mode: 'allOf' }),
			projectRoles: await this.roles.rolesWithScope('project', AGENT_REVIEWER_SCOPES),
		};
	}

	async listForInbox(user: User, query: InboxSourceQuery): Promise<InboxSelfHealingAgentItem[]> {
		const access = await this.getInboxAccess(user.id);
		const rows = await this.results.listForInbox(access, query);
		return rows.map((row) => ({
			...row,
			type: 'self_healing_agent_result',
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		}));
	}

	async countForInbox(user: User) {
		return await this.results.countForInbox(await this.getInboxAccess(user.id));
	}

	/**
	 * Save the proposal of an investigation and finish the investigation.
	 * Returns null when no proposal is saved. The investigation is then finished or deleted.
	 */
	async complete({
		investigationId,
		agentName,
		goals,
		output,
		lastTested,
		usage,
		signal,
	}: CompleteSelfHealingAgentResult): Promise<CompletedSelfHealingAgentResult | null> {
		signal?.throwIfAborted();
		const investigation = await this.investigations.findInvestigation(investigationId);
		if (!investigation) return null;
		const { configurationId, projectId, agentId } = investigation;

		// An agent that changed during the run makes the tested edits wrong.
		if (lastTested.edits.length > 0 && !investigation.finishedAt) {
			const actor = await this.users.findByIdWithRole(investigation.backgroundUserId);
			const agents = await getAgentServices();
			const applicable =
				actor && agents
					? await agents.proposals.checkApplicable(
							actor,
							projectId,
							agentId,
							investigation.agentVersionId,
						)
					: 'not_found';
			if (applicable !== 'ok') {
				await this.investigations.finish(investigationId, {
					outcome: 'failed',
					failureReason: 'agent_changed',
					usage,
				});
				return null;
			}
		}

		const summary = Array.from(scrubSecretsInText(output.summary))
			.slice(0, MAX_SUMMARY_CODE_POINTS)
			.join('');
		const report = scrubSecretsInText(output.report).slice(0, MAX_REPORT_LENGTH);
		signal?.throwIfAborted();

		return await runInTransaction(this.txRunner, {}, async (ctx) => {
			const configuration = await this.configurations.findForUpdate(
				configurationId,
				projectId,
				ctx,
			);
			if (!configuration) return null;

			const current = await this.investigations.findInvestigation(investigationId, ctx);
			if (!current) return null;
			if (current.finishedAt && !current.resultId) {
				throw new ConflictError('The agent investigation has already finished.');
			}

			const actor = await this.configurationService.resolveAgentActorOrPause(configuration, ctx);
			const publicationMode = configuration.agentPublicationMode;
			if (current.resultId) {
				if (!actor) return null;
				const result = await this.results.getResult(current.resultId, projectId, ctx);
				return { result, actor, publicationMode };
			}
			if (!actor) {
				await this.investigations.finish(
					investigationId,
					{ outcome: 'failed', failureReason: 'configuration_paused', usage },
					ctx,
				);
				return null;
			}

			const result = await this.results.createResult(
				{
					configurationId,
					projectId,
					agentId,
					agentName,
					backgroundUserId: current.backgroundUserId,
					baseVersionId: current.agentVersionId,
					goals,
					trigger: current.trigger,
					traceWindowStart: current.traceWindowStart,
					traceWindowEnd: current.traceWindowEnd,
					traceCount: current.traceCount,
					summary,
					report,
					edits: lastTested.edits,
					evalCases: lastTested.evalCases,
					evidence: lastTested.evidence,
					usage,
				},
				ctx,
			);
			await this.investigations.completeWithResult(investigationId, result.id, usage, ctx);
			// Abort before the commit, so that the result and the finish roll back together.
			signal?.throwIfAborted();
			return { result, actor, publicationMode };
		});
	}

	async getDetail(
		user: User,
		projectId: string,
		resultId: string,
	): Promise<SelfHealingAgentResultDetail> {
		return await this.toDetail(await this.getResultForReviewer(user, projectId, resultId));
	}

	/**
	 * Apply the proposal for a reviewer. A step that fails keeps the proposal open and stores
	 * the reason in `applyError`. A later call does the remaining steps.
	 */
	async apply(
		user: User,
		projectId: string,
		resultId: string,
	): Promise<SelfHealingAgentResultDetail> {
		const result = await this.getResultForReviewer(user, projectId, resultId);
		if (
			result.edits.length > 0 &&
			!(await userHasScopes(user, ['agent:publish'], false, { projectId }))
		) {
			throw new ForbiddenError('You do not have permission to publish this agent.');
		}
		await this.applyResult(user, result, { automatic: false });
		return await this.getDetail(user, projectId, resultId);
	}

	/**
	 * Apply a new proposal of a configuration in "Publish everything" mode.
	 * The actor is the enabling user, who is not always a reviewer.
	 */
	async applyAutomatically(actor: User, result: SelfHealingAgentResult): Promise<void> {
		const { projectId } = result;
		// Without the access, the proposal stays open for the reviewers.
		if (!(await userHasScopes(actor, AUTOMATIC_APPLY_SCOPES, false, { projectId }))) return;
		await this.applyResult(actor, result, { automatic: true });
	}

	async dismiss(
		user: User,
		projectId: string,
		resultId: string,
	): Promise<SelfHealingAgentResultDetail> {
		const result = await this.getResultForReviewer(user, projectId, resultId);
		if (result.reviewState !== 'open') {
			throw new ConflictError('This proposal is already closed.');
		}
		// A dismiss does not revert the parts that an earlier apply saved.
		const closed = await this.results.close(result.id, 'dismissed', {
			closedById: user.id,
			claimStaleBefore: claimStaleBefore(),
		});
		if (!closed) throw new ConflictError('This proposal is being applied.');
		return await this.getDetail(user, projectId, resultId);
	}

	private async applyResult(
		user: User,
		result: SelfHealingAgentResult,
		{ automatic }: { automatic: boolean },
	) {
		if (result.reviewState !== 'open') {
			throw new ConflictError('This proposal is already closed.');
		}
		// The claim stops a second apply and a dismiss while the steps run.
		if (!(await this.results.claimApply(result.id, claimStaleBefore()))) {
			throw new ConflictError('This proposal is being applied.');
		}

		const { id, projectId, agentId, baseVersionId, edits, evalCases } = result;
		// Read the progress under the claim. An earlier apply can have changed it.
		let progress = (await this.results.getResult(id, projectId)).applyProgress;
		const stop = async (applyError: string) => {
			await this.results.saveApplyProgress(id, {
				applyProgress: progress,
				applyError,
				releaseClaim: true,
			});
		};
		// A system closure has no user.
		const closeOutdated = async () => {
			await this.results.close(id, 'outdated', { closedById: null, applyProgress: progress });
		};

		try {
			const agents = await getAgentServices();
			if (!agents) return await stop('Agents are disabled on this instance.');

			const nothingSaved = progress.savedSkillIds.length === 0 && progress.savedVersionId === null;
			if (edits.length > 0 && nothingSaved) {
				const applicable = await agents.proposals.checkApplicable(
					user,
					projectId,
					agentId,
					baseVersionId,
				);
				if (applicable !== 'ok') return await closeOutdated();
			}

			if (evalCases.length > 0 && !progress.evalsApplied) {
				const evals = await getAgentEvalProposals();
				if (!evals) return await stop('Agent evaluations are not available on this instance.');
				await evals.applyCases(user, { projectId, agentId, cases: evalCases });
				progress = { ...progress, evalsApplied: true };
				await this.results.saveApplyProgress(id, {
					applyProgress: progress,
					applyError: null,
					releaseClaim: false,
				});
			}

			let publishedVersionId: string | null = null;
			if (edits.length > 0) {
				const { savedSkillIds, savedVersionId } = progress;
				const applied = await agents.proposals.apply(user, {
					projectId,
					agentId,
					baseVersionId,
					edits,
					progress: { savedSkillIds, savedVersionId },
				});
				if (applied.status === 'outdated') return await closeOutdated();
				// Store the progress also when a retry cannot help: it tells what was saved.
				progress = { ...progress, ...applied.progress };
				if (applied.status === 'failed') return await stop(applied.error);
				progress = { ...progress, agentPublished: true };
				publishedVersionId = applied.publishedVersionId;
			}

			await this.results.close(id, 'applied', {
				closedById: automatic ? null : user.id,
				appliedAutomatically: automatic,
				publishedVersionId,
				applyProgress: progress,
			});
		} catch (error) {
			this.logger.error('Could not apply an agent proposal.', { resultId: id, error });
			await stop(applyErrorMessage(error));
		}
	}

	/** The reviewer rule: a reviewer of the configuration who can edit agents in the project. */
	private async getResultForReviewer(user: User, projectId: string, resultId: string) {
		if (!(await userHasScopes(user, AGENT_REVIEWER_SCOPES, false, { projectId }))) {
			throw new NotFoundError('Agent proposal not found.');
		}
		const result = await this.results.getResult(resultId, projectId);
		if (!(await this.configurations.isReviewer(result.configurationId, user.id, {}))) {
			throw new NotFoundError('Agent proposal not found.');
		}
		return result;
	}

	private async toDetail(result: SelfHealingAgentResult): Promise<SelfHealingAgentResultDetail> {
		const closedBy = result.closedById
			? await this.users.findByIdWithRole(result.closedById)
			: null;
		// The reviewer sees when the tested version was published, not its ID.
		const agents = await getAgentServices();
		const baseVersionPublishedAt =
			(await agents?.context.getVersionPublishedAt(result.agentId, result.baseVersionId)) ?? null;
		return {
			resultId: result.id,
			projectId: result.projectId,
			agentId: result.agentId,
			agentName: result.agentName,
			summary: result.summary,
			report: result.report,
			goals: result.goals,
			trigger: result.trigger,
			baseVersionId: result.baseVersionId,
			baseVersionPublishedAt: baseVersionPublishedAt?.toISOString() ?? null,
			traceWindow: {
				start: result.traceWindowStart?.toISOString() ?? null,
				end: result.traceWindowEnd.toISOString(),
				count: result.traceCount,
			},
			edits: result.edits,
			evalCases: result.evalCases,
			evidence: result.evidence,
			usage: result.usage,
			reviewState: result.reviewState,
			appliedAutomatically: result.appliedAutomatically,
			publishedVersionId: result.publishedVersionId,
			applyProgress: result.applyProgress,
			applyError: result.applyError,
			closedAt: result.closedAt?.toISOString() ?? null,
			closedBy:
				closedBy && isPerson(closedBy)
					? { id: closedBy.id, firstName: closedBy.firstName, lastName: closedBy.lastName }
					: null,
			createdAt: result.createdAt.toISOString(),
			updatedAt: result.updatedAt.toISOString(),
		};
	}
}
