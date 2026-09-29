import type { WorkflowSuggestionContent, WorkflowSuggestionBaseline } from '@n8n/api-types';
import {
	BaseRepository,
	SharedWorkflow,
	TransactionRunner,
	WorkflowEntity,
	isUniqueConstraintError,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';

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
		return { workflow, projectId: owner?.projectId };
	}

	async appendSubmittedActivity(suggestionId: string, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		await manager.save(
			manager.create(WorkflowSuggestionActivityEntity, {
				suggestionId,
				action: 'submitted',
				author: 'assistant',
			}),
		);
	}

	async getActivity(suggestionId: string) {
		return await this.managerFor({}).find(WorkflowSuggestionActivityEntity, {
			where: { suggestionId },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}
}
