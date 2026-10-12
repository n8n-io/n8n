import {
	selfHealingResultContentSchema,
	type InboxSelfHealingItem,
	type SelfHealingExecutionReference,
	type SelfHealingResultContent,
	type SelfHealingResultDetail,
	type SelfHealingResultActionResponse,
	type WorkflowSuggestionAppliedVersion,
	type WorkflowSuggestionProposalDetail,
} from '@n8n/api-types';
import { RoleService } from '@n8n/backend-services';
import {
	SharedWorkflowRepository,
	TransactionRunner,
	UserRepository,
	type OperationContext,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { z } from 'zod';

import type { InboxSourceQuery } from '../../inbox/inbox-source.registry';
import { WorkflowSuggestionActionsService } from '../workflow-suggestions/workflow-suggestion-actions.service';
import { WorkflowSuggestionRepository } from '../workflow-suggestions/database/workflow-suggestion.repository';
import {
	WorkflowSuggestionService,
	type PreparedWorkflowSuggestion,
} from '../workflow-suggestions/workflow-suggestion.service';
import type { SelfHealingResult } from './database/self-healing-result.entity';
import { SelfHealingResultRepository } from './database/self-healing-result.repository';
import { SelfHealingExecutionReferenceService } from './self-healing-execution-reference.service';
import { SelfHealingChatService } from './self-healing-chat.service';

const referenceSchema = z.object({
	workflowId: z.string().min(1).max(36),
	projectId: z.string().min(1).max(36),
	backgroundUserId: z.string().uuid(),
	executionId: z.string().min(1).max(36),
	completedAt: z
		.date()
		.optional()
		.default(() => new Date()),
});

export type CompleteSelfHealingResult = SelfHealingResultContent & {
	workflowId: string;
	projectId: string;
	backgroundUserId: string;
	executionId: string;
	completedAt?: Date;
	suggestion?: PreparedWorkflowSuggestion;
};

export function getSelfHealingReviewState(
	result: Pick<SelfHealingResult, 'dismissedAt' | 'continuedAt'>,
	suggestion: Pick<WorkflowSuggestionProposalDetail, 'closedReason'> | null,
): SelfHealingResultDetail['reviewState'] {
	if (suggestion?.closedReason === 'applied') return 'applied';
	if (result.dismissedAt) return 'dismissed';
	if (suggestion?.closedReason) return suggestion.closedReason;
	return result.continuedAt ? 'continued' : 'open';
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
		private readonly users: UserRepository,
		private readonly roles: RoleService,
		private readonly proposalRecords: WorkflowSuggestionRepository,
		private readonly chat: SelfHealingChatService,
	) {}

	private async getInboxAccess(userId: string) {
		const user = await this.users.findByIdWithRole(userId);
		if (!user || user.disabled) {
			throw new ForbiddenError('Workflow edit access is required.');
		}
		const scopes: Scope[] = ['workflow:read', 'workflow:update'];
		const [projectRoles, workflowRoles] = await Promise.all([
			this.roles.rolesWithScope('project', scopes),
			this.roles.rolesWithScope('workflow', scopes),
		]);
		return { user, globalScopes: scopes, projectRoles, workflowRoles };
	}

	async listForInbox(user: User, query: InboxSourceQuery): Promise<InboxSelfHealingItem[]> {
		const rows = await this.results.listForInbox(await this.getInboxAccess(user.id), query);
		return rows.map((row) => ({
			...row,
			type: 'self_healing_result',
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
			completedAt: row.completedAt.toISOString(),
		}));
	}

	async countForInbox(user: User) {
		return await this.results.countForInbox(await this.getInboxAccess(user.id));
	}

	private async prepare(input: CompleteSelfHealingResult) {
		const references = referenceSchema.parse(input);
		const content = selfHealingResultContentSchema.parse({
			outcome: input.outcome,
			summary: input.summary,
			report: input.report,
			usage: input.usage,
		});
		const prepared = input.suggestion;
		if (
			(content.outcome === 'fix_ready' && !prepared) ||
			(content.outcome === 'could_not_fix' && prepared)
		) {
			throw new BadRequestError('The suggestion does not match the result outcome.');
		}
		if (
			prepared &&
			(prepared.resultKind !== content.outcome ||
				prepared.baseline.workflowId !== references.workflowId ||
				prepared.baseline.projectId !== references.projectId ||
				prepared.baseline.backgroundUserId !== references.backgroundUserId)
		) {
			throw new BadRequestError('The suggestion does not belong to this result.');
		}
		const actor = await this.suggestions.requireEditor(
			references.backgroundUserId,
			references.workflowId,
		);
		await this.executionReferences.validateReference(
			actor,
			references.workflowId,
			references.executionId,
		);
		return { references, content, suggestion: prepared };
	}

	async complete(input: CompleteSelfHealingResult) {
		// Validate execution evidence before opening the completion transaction.
		const prepared = await this.prepare(input);
		const { references, content } = prepared;
		return await this.txRunner.run({}, async (ctx) => {
			await this.suggestions.requireEditor(references.backgroundUserId, references.workflowId, ctx);
			await this.requireCurrentProject(references.workflowId, references.projectId, ctx);
			const suggestion = prepared.suggestion
				? await this.suggestions.createSuggestion(prepared.suggestion, ctx)
				: null;
			return await this.results.createResult(
				{
					...references,
					...content,
					suggestionId: suggestion?.id ?? null,
				},
				ctx,
			);
		});
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
		return await this.toDetail(result, suggestion, execution, reviewer.id);
	}

	private async toDetail(
		result: SelfHealingResult,
		suggestion: WorkflowSuggestionProposalDetail | null,
		execution: SelfHealingExecutionReference,
		viewerId: string,
	): Promise<SelfHealingResultDetail> {
		return {
			resultId: result.id,
			workflowId: result.workflowId,
			projectId: result.projectId,
			backgroundUserId: result.backgroundUserId,
			outcome: result.outcome,
			summary: result.summary,
			report: result.report,
			usage: result.usage,
			createdAt: result.createdAt.toISOString(),
			updatedAt: result.updatedAt.toISOString(),
			completedAt: result.completedAt.toISOString(),
			dismissedAt: result.dismissedAt?.toISOString() ?? null,
			dismissedById: result.dismissedById,
			continuedAt: result.continuedAt?.toISOString() ?? null,
			continuedById: result.continuedById,
			chatThreadId: await this.chat.findThreadId(result.id, viewerId),
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
		let publishError: string | undefined;
		if (action === 'approve-and-publish') {
			if (!result.suggestionId || result.outcome !== 'fix_ready') {
				throw new ConflictError("This fix isn't ready to apply. Review the report for next steps.");
			}
			({ publishError } = await this.actions.approveAndPublish(
				reviewer,
				projectId,
				workflowId,
				result.suggestionId,
				clientId,
			));
		} else if (result.suggestionId && !result.dismissedAt) {
			const proposal = await this.proposalRecords.getSuggestion(result.suggestionId, {
				workflowId,
				projectId,
			});
			if (proposal.state === 'pending') {
				let applied: WorkflowSuggestionProposalDetail;
				try {
					applied = await this.actions.apply(
						reviewer,
						projectId,
						workflowId,
						proposal.id,
						clientId,
					);
				} catch (error) {
					if (!(error instanceof ConflictError)) throw error;
					applied = await this.suggestions.getProposal(
						reviewer,
						projectId,
						workflowId,
						proposal.id,
					);
					if (applied.closedReason !== 'applied') throw error;
				}
				if (applied.closedReason !== 'applied') {
					throw new ConflictError(
						'The suggestion is no longer available to apply. Refresh the result.',
					);
				}
			}
		} else if (!result.suggestionId) {
			await this.requireCurrentProject(workflowId, projectId);
			await this.results.recordContinuation(resultId, reviewer.id, {});
		}
		return {
			...(await this.getDetail(reviewer, projectId, workflowId, resultId)),
			...(publishError !== undefined ? { publishError } : {}),
		};
	}

	async prepareChat(
		user: User,
		projectId: string,
		workflowId: string,
		resultId: string,
		clientId?: string,
	): Promise<SelfHealingResultDetail> {
		const reviewer = await this.suggestions.requireEditor(user.id, workflowId);
		await this.chat.assertAvailable(reviewer);
		const detail = await this.act(reviewer, projectId, workflowId, resultId, 'apply', clientId);
		await this.txRunner.run({}, async (ctx) => {
			const result = await this.results.lockForContinuation(
				resultId,
				{ projectId, workflowId },
				ctx,
			);
			const actor = await this.suggestions.requireEditor(reviewer.id, workflowId, ctx);
			await this.requireCurrentProject(workflowId, projectId, ctx);
			await this.chat.prepare(actor, result, ctx, detail.execution);
		});
		return await this.getDetail(reviewer, projectId, workflowId, resultId);
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
			if (result.dismissedAt || result.continuedAt) return true;
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
