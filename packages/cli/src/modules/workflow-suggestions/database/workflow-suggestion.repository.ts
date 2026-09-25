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
import { DataSource, In, LessThan } from '@n8n/typeorm';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { WorkflowSuggestionActivityEntity } from './workflow-suggestion-activity.entity';
import { WorkflowSuggestion } from './workflow-suggestion.entity';

@Service()
export class WorkflowSuggestionRepository extends BaseRepository<WorkflowSuggestion> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowSuggestion, dataSource.manager, transactionRunner);
	}

	async getSuggestion(id: string, ctx: OperationContext = {}) {
		const suggestion = await this.managerFor(ctx).findOneBy(WorkflowSuggestion, { id });
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
		const workflow = await manager.findOne(WorkflowEntity, {
			where: { id: workflowId },
			...(manager.connection.options.type === 'postgres' && ctx.trx
				? { lock: { mode: 'pessimistic_write' as const } }
				: {}),
		});
		const owner = await manager.findOneBy(SharedWorkflow, { workflowId, role: 'workflow:owner' });
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

	async cleanup(now: Date, limit = 100) {
		const manager = this.managerFor({});
		const closedBefore = new Date(now.getTime() - 30 * 86400_000);
		const candidates = await manager.find(WorkflowSuggestion, {
			where: { state: 'closed', closedAt: LessThan(closedBefore) },
			select: ['id'],
			take: limit,
			order: { closedAt: 'ASC', id: 'ASC' },
		});
		if (candidates.length === 0) return;
		await manager.delete(WorkflowSuggestion, {
			id: In(candidates.map(({ id }) => id)),
			state: 'closed',
			closedAt: LessThan(closedBefore),
		});
	}
}
