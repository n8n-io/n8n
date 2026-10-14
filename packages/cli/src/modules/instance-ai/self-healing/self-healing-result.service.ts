import {
	selfHealingResultContentSchema,
	type SelfHealingExecutionReference,
	type SelfHealingResultDetail,
	type SelfHealingResultActionResponse,
	type WorkflowSuggestionAppliedVersion,
	type WorkflowSuggestionProposalDetail,
} from '@n8n/api-types';
import {
	SharedWorkflowRepository,
	TransactionRunner,
	type OperationContext,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';

import { WorkflowSuggestionActionsService } from '../workflow-suggestions/workflow-suggestion-actions.service';
import { WorkflowSuggestionService } from '../workflow-suggestions/workflow-suggestion.service';
import type { SelfHealingResult } from './database/self-healing-result.entity';
import type { SelfHealingInvestigation } from './database/self-healing-investigation.entity';
import { SelfHealingInvestigationRepository } from './database/self-healing-investigation.repository';
import { SelfHealingResultRepository } from './database/self-healing-result.repository';
import { SelfHealingExecutionReferenceService } from './self-healing-execution-reference.service';

export function getSelfHealingReviewState(
	result: Pick<SelfHealingResult, 'dismissedAt'>,
	suggestion: Pick<WorkflowSuggestionProposalDetail, 'closedReason'> | null,
): SelfHealingResultDetail['reviewState'] {
	return result.dismissedAt ? 'dismissed' : (suggestion?.closedReason ?? 'open');
}

@Service()
export class SelfHealingResultService {
	constructor(
		private readonly results: SelfHealingResultRepository,
		private readonly suggestions: WorkflowSuggestionService,
		private readonly actions: WorkflowSuggestionActionsService,
		private readonly ownership: SharedWorkflowRepository,
		private readonly executionReferences: SelfHealingExecutionReferenceService,
		private readonly txRunner: TransactionRunner,
		private readonly investigations: SelfHealingInvestigationRepository,
	) {}

	async complete({ investigationId }: { investigationId: string }) {
		const investigation = await this.investigations.get(investigationId);
		if (investigation.resultId) {
			return await this.results.getResult(investigation.resultId, investigation);
		}
		const {
			content,
			completedAt,
			suggestion: prepared,
		} = await this.prepareInvestigation(investigation);
		return await this.txRunner.run({}, async (ctx) => {
			await this.suggestions.readWorkflowTargetForApply(investigation.workflowId, ctx);
			const current = await this.investigations.get(investigationId, ctx);
			if (current.resultId) {
				return await this.results.getResult(current.resultId, current, ctx);
			}
			if (current.finishedAt) {
				throw new ConflictError('The self-healing investigation has already finished.');
			}
			await this.suggestions.requireCurrentBaseline(current.baseline, ctx);
			const suggestion = prepared ? await this.suggestions.createSuggestion(prepared, ctx) : null;
			const result = await this.results.createResult(
				{
					workflowId: current.workflowId,
					projectId: current.projectId,
					backgroundUserId: current.backgroundUserId,
					executionId: current.executionId,
					...content,
					completedAt,
					suggestionId: suggestion?.id ?? null,
				},
				ctx,
			);
			await this.investigations.completeWithResult(investigationId, result.id, ctx);
			return result;
		});
	}

	private async prepareInvestigation(investigation: SelfHealingInvestigation) {
		if (investigation.finishedAt || !investigation.acceptedOutput) {
			throw new ConflictError('The investigation has no accepted output to complete.');
		}
		const { baseline, acceptedOutput: accepted } = investigation;
		const { output, candidate } = accepted;
		const content = selfHealingResultContentSchema.parse({
			outcome: output.outcome,
			summary: output.summary,
			report: output.report,
			usage: accepted.usage,
		});
		const suggestion = candidate
			? await this.suggestions.prepareSuggestion(baseline, {
					graph: candidate.graph,
					explanation: output.summary,
					resultKind: output.outcome === 'fix_ready' ? 'fix_ready' : 'needs_you',
				})
			: undefined;
		const actor = await this.suggestions.requireEditor(
			investigation.backgroundUserId,
			investigation.workflowId,
		);
		await this.executionReferences.validateReference(
			actor,
			investigation.workflowId,
			investigation.executionId,
		);
		return { content, completedAt: new Date(accepted.completedAt), suggestion };
	}

	async getDetail(
		user: User,
		projectId: string,
		workflowId: string,
		resultId: string,
	): Promise<SelfHealingResultDetail> {
		const authorized = await this.getResultForEditor(user, projectId, workflowId, resultId);
		const reviewer = authorized.reviewer;
		let result = authorized.result;
		await this.requireCurrentProject(workflowId, projectId);
		let suggestion = result.suggestionId
			? await this.suggestions.getProposal(reviewer, projectId, workflowId, result.suggestionId)
			: null;
		if (suggestion) {
			// A concurrent dismissal commits the result and suggestion together.
			result = await this.results.getResult(resultId, { projectId, workflowId });
			if (result.dismissedAt && suggestion.state === 'pending') {
				suggestion = await this.suggestions.getProposal(
					reviewer,
					projectId,
					workflowId,
					suggestion.suggestionId,
				);
			}
		}
		const execution = await this.executionReferences.getReference(
			reviewer,
			workflowId,
			result.executionId,
		);
		return this.toDetail(result, suggestion, execution);
	}

	private toDetail(
		result: SelfHealingResult,
		suggestion: WorkflowSuggestionProposalDetail | null,
		execution: SelfHealingExecutionReference,
	): SelfHealingResultDetail {
		return {
			resultId: result.id,
			workflowId: result.workflowId,
			projectId: result.projectId,
			backgroundUserId: result.backgroundUserId,
			outcome: result.outcome,
			summary: result.summary,
			report: result.report,
			usage: {
				credits: result.usage.credits,
				turns: result.usage.turns,
				durationSeconds: result.usage.durationSeconds,
			},
			createdAt: result.createdAt.toISOString(),
			updatedAt: result.updatedAt.toISOString(),
			completedAt: result.completedAt.toISOString(),
			dismissedAt: result.dismissedAt?.toISOString() ?? null,
			dismissedById: result.dismissedById,
			reviewState: getSelfHealingReviewState(result, suggestion),
			suggestion,
			execution,
		};
	}

	async act(
		user: User,
		projectId: string,
		workflowId: string,
		resultId: string,
		action: WorkflowSuggestionAppliedVersion['action'],
		clientId?: string,
	): Promise<SelfHealingResultActionResponse> {
		const { result, reviewer } = await this.getResultForEditor(
			user,
			projectId,
			workflowId,
			resultId,
		);
		if (result.outcome !== 'fix_ready' || !result.suggestionId) {
			throw new ConflictError("This fix isn't ready to apply. Review the report for next steps.");
		}
		const { publishError, ...suggestion } =
			action === 'approve-and-publish'
				? await this.actions.approveAndPublish(
						reviewer,
						projectId,
						workflowId,
						result.suggestionId,
						clientId,
					)
				: await this.actions.apply(reviewer, projectId, workflowId, result.suggestionId, clientId);
		const execution = await this.executionReferences.getReference(
			reviewer,
			workflowId,
			result.executionId,
		);
		return {
			...this.toDetail(result, suggestion, execution),
			...(publishError !== undefined ? { publishError } : {}),
		};
	}

	async dismiss(user: User, projectId: string, workflowId: string, resultId: string) {
		const found = await this.txRunner.run({}, async (ctx) => {
			const { result, reviewer } = await this.getResultForEditor(
				user,
				projectId,
				workflowId,
				resultId,
				ctx,
			);
			if (result.dismissedAt) return true;
			if (result.suggestionId) {
				const outcome = await this.actions.discardPending(
					reviewer,
					projectId,
					workflowId,
					result.suggestionId,
					ctx,
				);
				if (outcome === 'unavailable') return false;
				if (outcome === 'already_closed') return true;
			} else {
				await this.requireCurrentProject(workflowId, projectId, ctx);
			}
			if (result.outcome !== 'fix_ready') {
				await this.results.dismissResult(result.id, user.id, ctx);
			}
			return true;
		});
		// Commit outdated reconciliation before rejecting a stale project route.
		if (!found) {
			throw new NotFoundError(
				'This result is no longer available in this project. Refresh the page.',
			);
		}
		return await this.getDetail(user, projectId, workflowId, resultId);
	}

	private async getResultForEditor(
		user: User,
		projectId: string,
		workflowId: string,
		resultId: string,
		ctx: OperationContext = {},
	) {
		const reviewer = await this.suggestions.requireEditor(user.id, workflowId, ctx);
		const result = await this.results.getResult(resultId, { projectId, workflowId }, ctx);
		return { result, reviewer };
	}

	private async requireCurrentProject(
		workflowId: string,
		projectId: string,
		ctx: OperationContext = {},
	) {
		const owner = await this.ownership.getWorkflowOwningProject(workflowId, ctx);
		if (owner?.id !== projectId) {
			throw new NotFoundError(
				'This result is no longer available in this project. Refresh the page.',
			);
		}
	}
}
