import type {
	WorkflowSuggestionContent,
	WorkflowSuggestionBaseline,
	WorkflowSuggestionActivity as WorkflowSuggestionActivityDto,
	WorkflowSuggestionAppliedVersion,
} from '@n8n/api-types';
import {
	BaseRepository,
	TransactionRunner,
	isUniqueConstraintError,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

import { WorkflowSuggestionActivity } from './workflow-suggestion-activity.entity';
import { WorkflowSuggestion } from './workflow-suggestion.entity';

@Service()
export class WorkflowSuggestionRepository extends BaseRepository<WorkflowSuggestion> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowSuggestion, dataSource.manager, transactionRunner);
	}

	async getSuggestion(
		id: string,
		scope: Pick<WorkflowSuggestion, 'workflowId' | 'projectId'>,
		ctx: OperationContext = {},
	) {
		const suggestion = await this.managerFor(ctx).findOneBy(WorkflowSuggestion, {
			id,
			workflowId: scope.workflowId,
			projectId: scope.projectId,
		});
		if (!suggestion) throw new NotFoundError('Suggestion not found.');
		return suggestion;
	}

	async createPending(
		baseline: WorkflowSuggestionBaseline,
		payload: WorkflowSuggestionContent,
		ctx: OperationContext,
		resultKind: WorkflowSuggestion['resultKind'],
	) {
		const manager = this.managerFor(ctx);
		const suggestion = manager.create(WorkflowSuggestion, {
			workflowId: baseline.workflowId,
			projectId: baseline.projectId,
			backgroundUserId: baseline.backgroundUserId,
			expectedBaseline: baseline.expectedBaseline,
			state: 'pending',
			closedReason: null,
			closedAt: null,
			resultKind,
			appliedVersion: null,
			payload,
		});
		try {
			return await manager.save(suggestion);
		} catch (error) {
			if (isUniqueConstraintError(error))
				throw new ConflictError('This workflow already has a pending proposal.');
			throw error;
		}
	}

	async appendSubmittedActivity(suggestionId: string, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		await manager.save(
			manager.create(WorkflowSuggestionActivity, {
				suggestionId,
				action: 'submitted',
				author: 'assistant',
				actorId: null,
			}),
		);
	}

	async appendActivity(
		suggestionId: string,
		action: WorkflowSuggestionActivityDto['action'],
		actor: Pick<WorkflowSuggestionActivityDto, 'author' | 'actorId'>,
		ctx: OperationContext,
	) {
		const manager = this.managerFor(ctx);
		await manager
			.createQueryBuilder()
			.insert()
			.into(WorkflowSuggestionActivity)
			.values({
				id: generateNanoId(),
				suggestionId,
				action,
				author: actor.author,
				actorId: actor.actorId,
			})
			.orIgnore()
			.execute();
	}

	async closePending(
		suggestion: WorkflowSuggestion,
		reason: NonNullable<WorkflowSuggestion['closedReason']>,
		actor: Pick<WorkflowSuggestionActivityDto, 'author' | 'actorId'>,
		ctx: OperationContext,
		appliedVersion: WorkflowSuggestionAppliedVersion | null = null,
	) {
		const result = await this.managerFor(ctx).update(
			WorkflowSuggestion,
			{ id: suggestion.id, state: 'pending' },
			{ state: 'closed', closedReason: reason, closedAt: new Date(), appliedVersion },
		);
		if (result.affected !== 1) return false;
		await this.appendActivity(suggestion.id, reason, actor, ctx);
		return true;
	}

	async getPendingForWorkflow(workflowId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOneBy(WorkflowSuggestion, {
			workflowId,
			state: 'pending',
		});
	}

	async getActivity(suggestionId: string) {
		return await this.managerFor({}).find(WorkflowSuggestionActivity, {
			where: { suggestionId },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}
}
