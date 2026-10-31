import {
	type InboxSelfHealingItem,
	type SelfHealingResultUsage,
	type WorkflowSuggestionGraph,
	selfHealingResultContentSchema,
	type SelfHealingExecutionReference,
	type SelfHealingResultDetail,
	type SelfHealingResultActionResponse,
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
import isEqual from 'lodash/isEqual';
import sortBy from 'lodash/sortBy';
import uniqBy from 'lodash/uniqBy';

import type { InboxSourceQuery } from '../../inbox/inbox-source.registry';
import { WorkflowSuggestionRepository } from '../workflow-suggestions/database/workflow-suggestion.repository';
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
import {
	REVIEWER_SCOPES,
	SelfHealingConfigurationService,
} from './self-healing-configuration.service';
import { SelfHealingExecutionReferenceService } from './self-healing-execution-reference.service';

export type SelfHealingResultInput = {
	output: SelfHealingOutput;
	usage: SelfHealingResultUsage;
	candidates?: Array<{
		baseline: WorkflowSuggestionBaseline;
		graph: WorkflowSuggestionGraph;
	}>;
	completedAt: string;
};

@Service()
export class SelfHealingResultService {
	constructor(
		private readonly results: SelfHealingResultRepository,
		private readonly suggestions: WorkflowSuggestionService,
		private readonly suggestionRepository: WorkflowSuggestionRepository,
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
		const [projectRoles, workflowRoles] = await Promise.all([
			this.roles.rolesWithScope('project', REVIEWER_SCOPES),
			this.roles.rolesWithScope('workflow', REVIEWER_SCOPES),
		]);
		return { user, globalScopes: REVIEWER_SCOPES, projectRoles, workflowRoles };
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

		const { content, completedAt, suggestions } = await this.prepareResult(investigation, input);
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

			const targets = [baseline, ...suggestions.map((suggestion) => suggestion.baseline)];
			for (const target of sortBy(uniqBy(targets, 'workflowId'), 'workflowId')) {
				await this.suggestions.readWorkflowTargetForApply(target.workflowId, ctx);
				await this.suggestions.requireCurrentBaseline(target, ctx);
			}
			signal?.throwIfAborted();

			const result = await this.results.createResult(
				{
					configurationId: current.configurationId,
					workflowId: current.workflowId,
					projectId: current.projectId,
					backgroundUserId: current.backgroundUserId,
					executionId: current.executionId,
					...content,
					completedAt,
				},
				ctx,
			);
			for (const prepared of suggestions) {
				await this.suggestions.createSuggestion(prepared, result.id, ctx);
			}

			await this.investigations.completeWithResult(investigationId, result.id, ctx);
			// Abort before commit so the result and its suggestions roll back together.
			signal?.throwIfAborted();
			return result;
		});
	}

	private async prepareResult(
		investigation: SelfHealingInvestigation,
		input: SelfHealingResultInput,
	) {
		if (investigation.finishedAt) {
			throw new ConflictError('The self-healing investigation has already finished.');
		}

		const { output, candidates = [] } = input;

		const content = selfHealingResultContentSchema.parse({
			outcome: output.outcome,
			summary: output.summary,
			report: output.report,
			usage: input.usage,
		});

		const changed = candidates.filter(
			({ baseline: { original }, graph }) =>
				!isEqual(original.nodes, graph.nodes) || !isEqual(original.connections, graph.connections),
		);
		if (output.outcome === 'fix_ready' && changed.length === 0) {
			throw new ConflictError('The suggestion has no workflow changes.');
		}

		const suggestions: PreparedWorkflowSuggestion[] = [];
		for (const candidate of changed) {
			suggestions.push(
				await this.suggestions.prepareSuggestion(candidate.baseline, {
					graph: candidate.graph,
					explanation: output.summary,
					resultKind: output.outcome === 'fix_ready' ? 'fix_ready' : 'needs_you',
				}),
			);
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

		return { content, completedAt: new Date(input.completedAt), suggestions };
	}

	async getDetail(
		user: User,
		projectId: string,
		workflowId: string,
		resultId: string,
	): Promise<SelfHealingResultDetail> {
		const authorized = await this.getResultForEditor(user, projectId, workflowId, resultId);
		const { reviewer, suggestions } = authorized;
		let result = authorized.result;
		await this.requireCurrentProject(workflowId, projectId);

		let proposals = await this.suggestions.getProposals(reviewer, projectId, suggestions);
		if (proposals.length > 0) {
			// A concurrent closure commits the result and its suggestions together.
			result = await this.results.getResult(resultId, { projectId, workflowId });
			if (result.reviewState !== 'open' && proposals.some(({ state }) => state === 'pending')) {
				const current = await this.getSuggestions(result);
				proposals = await this.suggestions.getProposals(reviewer, projectId, current);
			}
		}

		const execution = await this.executionReferences.getReference(
			reviewer,
			workflowId,
			result.executionId,
		);
		return this.toDetail(result, proposals, execution);
	}

	private toDetail(
		result: SelfHealingResult,
		suggestions: WorkflowSuggestionProposalDetail[],
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
			reviewState: result.reviewState,
			suggestions,
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
		const { result, reviewer, suggestions } = await this.getResultForEditor(
			user,
			projectId,
			workflowId,
			resultId,
		);
		const allowedOutcomes = action === 'apply' ? ['fix_ready', 'needs_you'] : ['fix_ready'];
		if (suggestions.length === 0 || !allowedOutcomes.includes(result.outcome)) {
			throw new ConflictError("This fix isn't ready to apply. Review the report for next steps.");
		}
		const { suggestions: proposals, ...publication } = await this.actions.apply(
			reviewer,
			projectId,
			suggestions,
			action,
			clientId,
		);

		const execution = await this.executionReferences.getReference(
			reviewer,
			workflowId,
			result.executionId,
		);
		const current = await this.results.getResult(resultId, { projectId, workflowId });
		return {
			...this.toDetail(current, proposals, execution),
			...publication,
		};
	}

	async dismiss(user: User, projectId: string, workflowId: string, resultId: string) {
		const outcome = await this.txRunner.run({}, async (ctx) => {
			const { result, reviewer, suggestions } = await this.getResultForEditor(
				user,
				projectId,
				workflowId,
				resultId,
				ctx,
			);
			if (result.reviewState === 'dismissed') return 'already_closed';

			if (!suggestions.some((suggestion) => suggestion.workflowId === workflowId)) {
				await this.requireCurrentProject(workflowId, projectId, ctx);
			}
			if (suggestions.length > 0) {
				return await this.actions.discardPending(reviewer, projectId, suggestions, ctx);
			}
			if (result.reviewState !== 'closed' && !(await this.results.dismissResult(result.id, ctx))) {
				return 'already_closed';
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
		return { result, reviewer, suggestions: await this.getSuggestions(result, ctx) };
	}

	private async getSuggestions(result: SelfHealingResult, ctx: OperationContext = {}) {
		const suggestions = await this.suggestionRepository.getForResult(result.id, ctx);
		return suggestions.sort(
			(a, b) =>
				Number(b.workflowId === result.workflowId) - Number(a.workflowId === result.workflowId),
		);
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
