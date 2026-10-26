import {
	type InboxSelfHealingItem,
	type SelfHealingResultUsage,
	type WorkflowSuggestionGraph,
	selfHealingResultContentSchema,
	type SelfHealingExecutionReference,
	type SelfHealingResultDetail,
	type SelfHealingResultActionResponse,
	type WorkflowSuggestionActionResult,
	type WorkflowSuggestionAppliedVersion,
	type WorkflowSuggestionBaseline,
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
import type { SelfHealingOutput } from '@n8n/instance-ai';
import { ConflictError, ForbiddenError, NotFoundError, UnexpectedError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import isEqual from 'lodash/isEqual';

import type { InboxSourceQuery } from '../../inbox/inbox-source.registry';
import { WorkflowSuggestionActionsService } from '../workflow-suggestions/workflow-suggestion-actions.service';
import {
	WorkflowSuggestionService,
	type PreparedWorkflowSuggestion,
} from '../workflow-suggestions/workflow-suggestion.service';
import type { SelfHealingResult } from './database/self-healing-result.entity';
import type { SelfHealingInvestigation } from './database/self-healing-investigation.entity';
import { SelfHealingConfigurationRepository } from './database/self-healing-configuration.repository';
import { SelfHealingInvestigationRepository } from './database/self-healing-investigation.repository';
import { SelfHealingResultRepository } from './database/self-healing-result.repository';
import { SelfHealingConfigurationService } from './self-healing-configuration.service';
import { SelfHealingExecutionReferenceService } from './self-healing-execution-reference.service';

export type SelfHealingResultInput = {
	output: SelfHealingOutput;
	usage: SelfHealingResultUsage;
	candidate?: {
		graph: WorkflowSuggestionGraph;
	};
	completedAt: string;
};

export function getSelfHealingReviewState(
	result: Pick<SelfHealingResult, 'dismissedAt' | 'outcome'>,
	suggestion: Pick<WorkflowSuggestionProposalDetail, 'closedReason'> | null,
): SelfHealingResultDetail['reviewState'] {
	if (result.dismissedAt) return 'dismissed';
	if (result.outcome === 'could_not_fix') return 'closed';
	return suggestion?.closedReason ?? 'open';
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
		private readonly users: UserRepository,
		private readonly roles: RoleService,
		private readonly configurations: SelfHealingConfigurationRepository,
		private readonly configurationService: SelfHealingConfigurationService,
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
		const access = await this.getInboxAccess(user.id);
		const rows = await this.results.listForInbox(access, query);

		return rows.map((row) => ({
			...row,
			type: 'self_healing_result',
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
			completedAt: row.completedAt.toISOString(),
		}));
	}

	async countForInbox(user: User) {
		const access = await this.getInboxAccess(user.id);
		return await this.results.countForInbox(access);
	}

	async complete({
		investigationId,
		baseline,
		signal,
		...input
	}: SelfHealingResultInput & {
		investigationId: string;
		baseline: WorkflowSuggestionBaseline;
		signal?: AbortSignal;
	}) {
		signal?.throwIfAborted();
		const investigation = await this.investigations.findInvestigation(investigationId);
		if (!investigation) return null;
		if (investigation.resultId) {
			return await this.results.getResult(investigation.resultId, investigation);
		}
		if (
			baseline.workflowId !== investigation.workflowId ||
			baseline.projectId !== investigation.projectId ||
			baseline.backgroundUserId !== investigation.backgroundUserId ||
			baseline.expectedBaseline.publishedVersionId !== investigation.publishedVersionId
		) {
			throw new UnexpectedError('The baseline does not belong to the investigation.');
		}

		const {
			content,
			completedAt,
			suggestion: prepared,
		} = await this.prepareResult(investigation, baseline, input);
		signal?.throwIfAborted();

		return await this.txRunner.run({}, async (ctx) => {
			const configuration = await this.configurations.findForUpdate(
				investigation.configurationId,
				investigation.projectId,
				ctx,
			);
			if (!configuration) return null;

			const current = await this.investigations.findInvestigation(investigationId, ctx);
			if (!current) return null;
			if (current.resultId) {
				return await this.results.getResult(current.resultId, current, ctx);
			}
			if (current.finishedAt) {
				throw new ConflictError('The self-healing investigation has already finished.');
			}

			const actor = await this.configurationService.resolveActorOrPause(
				configuration,
				current.workflowId,
				ctx,
			);
			if (!actor) {
				await this.investigations.finishWithoutResult(investigationId, ctx);
				return null;
			}

			await this.suggestions.readWorkflowTargetForApply(investigation.workflowId, ctx);
			await this.suggestions.requireCurrentBaseline(baseline, ctx);
			signal?.throwIfAborted();

			let suggestionId: string | null = null;
			if (prepared) {
				const suggestion = await this.suggestions.createSuggestion(prepared, ctx);
				suggestionId = suggestion.id;
			}

			const result = await this.results.createResult(
				{
					configurationId: current.configurationId,
					workflowId: current.workflowId,
					projectId: current.projectId,
					backgroundUserId: current.backgroundUserId,
					executionId: current.executionId,
					suggestionId,
					...content,
					completedAt,
				},
				ctx,
			);

			await this.investigations.completeWithResult(investigationId, result.id, ctx);
			// Abort before commit so the result and suggestion roll back together.
			signal?.throwIfAborted();
			return result;
		});
	}

	private async prepareResult(
		investigation: SelfHealingInvestigation,
		baseline: WorkflowSuggestionBaseline,
		input: SelfHealingResultInput,
	) {
		if (investigation.finishedAt) {
			throw new ConflictError('The self-healing investigation has already finished.');
		}

		const { output, candidate } = input;

		const content = selfHealingResultContentSchema.parse({
			outcome: output.outcome,
			summary: output.summary,
			report: output.report,
			usage: input.usage,
		});

		const needsYouWithoutChanges =
			output.outcome === 'needs_you' &&
			candidate !== undefined &&
			isEqual(baseline.original.nodes, candidate.graph.nodes) &&
			isEqual(baseline.original.connections, candidate.graph.connections);

		let suggestion: PreparedWorkflowSuggestion | undefined;
		if (candidate && !needsYouWithoutChanges) {
			suggestion = await this.suggestions.prepareSuggestion(baseline, {
				graph: candidate.graph,
				explanation: output.summary,
				resultKind: output.outcome === 'fix_ready' ? 'fix_ready' : 'needs_you',
			});
		}

		const actor = await this.suggestions.requireEditor(
			investigation.backgroundUserId,
			investigation.workflowId,
		);
		await this.executionReferences.validateReference(
			actor,
			investigation.workflowId,
			investigation.executionId,
		);

		return { content, completedAt: new Date(input.completedAt), suggestion };
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

		const suggestionId = result.suggestionId;
		let suggestion: WorkflowSuggestionProposalDetail | null = null;
		if (suggestionId) {
			suggestion = await this.suggestions.getProposal(
				reviewer,
				projectId,
				workflowId,
				suggestionId,
			);
		}

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
			usage: result.usage,
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
		const suggestionId = result.suggestionId;
		const allowedOutcomes = action === 'apply' ? ['fix_ready', 'needs_you'] : ['fix_ready'];
		if (!suggestionId || !allowedOutcomes.includes(result.outcome)) {
			throw new ConflictError("This fix isn't ready to apply. Review the report for next steps.");
		}

		let actionResult: WorkflowSuggestionActionResult;
		if (action === 'approve-and-publish') {
			actionResult = await this.actions.approveAndPublish(
				reviewer,
				projectId,
				workflowId,
				suggestionId,
				clientId,
			);
		} else {
			actionResult = await this.actions.apply(
				reviewer,
				projectId,
				workflowId,
				suggestionId,
				clientId,
			);
		}

		const { publishError, ...suggestion } = actionResult;
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
		const outcome = await this.txRunner.run({}, async (ctx) => {
			const { result, reviewer } = await this.getResultForEditor(
				user,
				projectId,
				workflowId,
				resultId,
				ctx,
			);
			if (result.dismissedAt) return 'already_closed';

			const suggestionId = result.suggestionId;
			if (suggestionId) {
				const discardOutcome = await this.actions.discardPending(
					reviewer,
					projectId,
					workflowId,
					suggestionId,
					ctx,
				);
				if (discardOutcome !== 'discarded') return discardOutcome;
			} else {
				await this.requireCurrentProject(workflowId, projectId, ctx);
			}

			if (
				result.outcome === 'needs_you' &&
				!(await this.results.dismissResult(result.id, user.id, ctx))
			) {
				throw new ConflictError('This result is already closed.');
			}
			return 'dismissed';
		});

		// Commit outdated reconciliation before rejecting a stale project route.
		if (outcome === 'unavailable') {
			throw new NotFoundError(
				'This result is no longer available in this project. Refresh the page.',
			);
		}
		if (outcome === 'already_closed') {
			throw new ConflictError('This result is already closed.');
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
		const isReviewer = await this.configurations.isReviewer(result.configurationId, user.id, ctx);
		if (!isReviewer) {
			throw new NotFoundError('Self-healing result not found.');
		}
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
