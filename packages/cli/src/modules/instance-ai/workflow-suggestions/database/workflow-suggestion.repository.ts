import type {
	WorkflowSuggestionContent,
	WorkflowSuggestionBaseline,
	WorkflowSuggestionActivity,
	WorkflowSuggestionAppliedVersion,
	WorkflowSuggestionPublication,
} from '@n8n/api-types';
import {
	BaseRepository,
	SharedWorkflow,
	TransactionRunner,
	WorkflowEntity,
	WorkflowPublishHistory,
	isUniqueConstraintError,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

import { WorkflowSuggestionActivityEntity } from './workflow-suggestion-activity.entity';
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
		const manager = this.managerFor(ctx);
		const suggestion = await manager.findOne(WorkflowSuggestion, {
			where: { id, workflowId: scope.workflowId, projectId: scope.projectId },
			...(ctx.trx && manager.connection.options.type === 'postgres'
				? { lock: { mode: 'pessimistic_write' as const } }
				: {}),
		});
		if (!suggestion) throw new NotFoundError('Suggestion not found.');
		return suggestion;
	}

	async createPending(
		baseline: WorkflowSuggestionBaseline,
		payload: WorkflowSuggestionContent,
		ctx: OperationContext,
		resultKind: WorkflowSuggestion['resultKind'] = null,
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
			publication: null,
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

	async readWorkflowTarget(workflowId: string, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		const lockRows = manager.connection.options.type === 'postgres' && !!ctx.trx;
		const workflow = await manager.findOne(WorkflowEntity, {
			where: { id: workflowId },
			// Allow transfer FK checks while the transfer holds the owner row.
			...(lockRows ? { lock: { mode: 'for_no_key_update' as const } } : {}),
		});
		const owner = await manager.findOne(SharedWorkflow, {
			where: { workflowId, role: 'workflow:owner' },
			...(lockRows ? { lock: { mode: 'pessimistic_read' as const } } : {}),
		});
		const publication = await manager.findOne(WorkflowPublishHistory, {
			where: { workflowId },
			order: { id: 'DESC' },
		});
		return { workflow, projectId: owner?.projectId, publicationId: publication?.id ?? null };
	}

	async appendSubmittedActivity(suggestionId: string, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		await manager.save(
			manager.create(WorkflowSuggestionActivityEntity, {
				suggestionId,
				action: 'submitted',
				author: 'assistant',
				actorId: null,
			}),
		);
	}

	async appendActivity(
		suggestionId: string,
		action: WorkflowSuggestionActivity['action'],
		actorId: string | null,
		ctx: OperationContext,
	) {
		const manager = this.managerFor(ctx);
		await manager
			.createQueryBuilder()
			.insert()
			.into(WorkflowSuggestionActivityEntity)
			.values({
				id: generateNanoId(),
				suggestionId,
				action,
				actorId,
				author: action === 'submitted' ? 'assistant' : actorId ? 'human' : 'system',
			})
			.orIgnore()
			.execute();
	}

	async closePending(
		suggestion: WorkflowSuggestion,
		reason: NonNullable<WorkflowSuggestion['closedReason']>,
		actorId: string | null,
		ctx: OperationContext,
		appliedVersion: WorkflowSuggestionAppliedVersion | null = null,
	) {
		const result = await this.managerFor(ctx).update(
			WorkflowSuggestion,
			{ id: suggestion.id, state: 'pending' },
			{ state: 'closed', closedReason: reason, closedAt: new Date(), appliedVersion },
		);
		if (result.affected !== 1) throw new ConflictError('The suggestion has already closed.');
		await this.appendActivity(suggestion.id, reason, actorId, ctx);
	}

	async recordPublication(
		suggestionId: string,
		publication: WorkflowSuggestionPublication,
		actorId: string | null,
		ctx: OperationContext,
	) {
		const manager = this.managerFor(ctx);
		const current = await manager.findOne(WorkflowSuggestion, {
			where: { id: suggestionId, closedReason: 'applied' },
			select: ['id', 'publication'],
			...(ctx.trx && manager.connection.options.type === 'postgres'
				? { lock: { mode: 'pessimistic_write' as const } }
				: {}),
		});
		if (!current) throw new NotFoundError('Applied suggestion not found.');
		// A later status read cannot undo a confirmed publication result.
		if (
			current.publication?.status === 'published' ||
			(current.publication?.status === 'partial' && publication.status !== 'published')
		) {
			return current.publication;
		}
		if (publication.status === 'unpublished' && current.publication?.status === 'failed') {
			return current.publication;
		}
		await manager.update(
			WorkflowSuggestion,
			{ id: suggestionId, closedReason: 'applied' },
			{ publication },
		);
		if (publication.status === 'published' || publication.status === 'failed') {
			await this.appendActivity(
				suggestionId,
				publication.status === 'published' ? 'published' : 'publish_failed',
				actorId,
				ctx,
			);
		}
		return publication;
	}

	async getPendingForWorkflow(workflowId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOneBy(WorkflowSuggestion, {
			workflowId,
			state: 'pending',
		});
	}

	async getActivity(suggestionId: string) {
		return await this.managerFor({}).find(WorkflowSuggestionActivityEntity, {
			where: { suggestionId },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}
}
