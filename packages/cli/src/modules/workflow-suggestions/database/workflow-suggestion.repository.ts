import type { WorkflowSuggestionContent, WorkflowSuggestionSource } from '@n8n/api-types';
import {
	BaseRepository,
	SharedWorkflow,
	TransactionRunner,
	WorkflowEntity,
	isUniqueConstraintError,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, LessThan, Not } from '@n8n/typeorm';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { WorkflowSuggestionActivityEntity } from './workflow-suggestion-activity.entity';
import { WorkflowSuggestion } from './workflow-suggestion.entity';
import { assertSameSource } from '../workflow-suggestion.contracts';

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

	async findBySourceKey(sourceKey: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOneBy(WorkflowSuggestion, { sourceKey });
	}

	async createOnce(
		source: WorkflowSuggestionSource,
		projectId: string,
		payload: WorkflowSuggestionContent,
	) {
		const suggestion = this.create({
			sourceKey: source.sourceKey,
			workflowId: source.workflowId,
			projectId,
			backgroundUserId: source.backgroundUserId,
			expectedBaseline: source.expectedBaseline,
			state: 'preparing',
			revision: 1,
			submittedRevision: null,
			closedReason: null,
			closedAt: null,
			payload,
		});
		try {
			return await this.save(suggestion);
		} catch (error) {
			if (!isUniqueConstraintError(error)) throw error;
			const existing = await this.findBySourceKey(source.sourceKey);
			if (!existing) throw error;
			assertSameSource(existing, source);
			return existing;
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

	async reviseIfCurrent(id: string, revision: number, payload: WorkflowSuggestionContent) {
		return await this.runInTransaction({}, async (manager, ctx) => {
			// Bind the JSON column as one value, without TypeORM's nested update shape.
			const result = await manager
				.createQueryBuilder()
				.update(WorkflowSuggestion)
				.set({ revision: revision + 1, payload: () => ':payload' })
				.setParameter('payload', JSON.stringify(payload))
				.where({ id, revision, state: 'preparing', payload: Not(IsNull()) })
				.execute();
			if (result.affected !== 1) throw new ConflictError('Suggestion revision has changed.');
			return await this.getSuggestion(id, ctx);
		});
	}

	async loadForSubmission(id: string, workflowId: string, ctx: OperationContext) {
		// Keep workflow-before-suggestion order for all submission and later apply operations.
		const target = await this.readWorkflowTarget(workflowId, ctx);
		const manager = this.managerFor(ctx);
		const suggestion = await manager.findOne(WorkflowSuggestion, {
			where: { id },
			...(manager.connection.options.type === 'postgres'
				? { lock: { mode: 'pessimistic_write' as const } }
				: {}),
		});
		if (!suggestion) throw new NotFoundError('Suggestion not found.');
		return { suggestion, ...target };
	}

	async closeAsOutdated(id: string, ctx: OperationContext) {
		await this.managerFor(ctx).update(
			WorkflowSuggestion,
			{ id, state: 'preparing' },
			{
				state: 'closed',
				closedReason: 'outdated',
				closedAt: new Date(),
			},
		);
		return await this.getSuggestion(id, ctx);
	}

	async markPendingIfCurrent(id: string, revision: number, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		try {
			const result = await manager.update(
				WorkflowSuggestion,
				{ id, revision, state: 'preparing' },
				{
					state: 'pending',
					submittedRevision: revision,
				},
			);
			if (result.affected !== 1) throw new ConflictError('Suggestion revision has changed.');
		} catch (error) {
			if (isUniqueConstraintError(error))
				throw new ConflictError('This workflow already has a pending proposal.');
			throw error;
		}
		return await this.getSuggestion(id, ctx);
	}

	async appendSubmittedActivity(suggestionId: string, revision: number, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		await manager.save(
			manager.create(WorkflowSuggestionActivityEntity, {
				suggestionId,
				revision,
				action: 'submitted',
				author: 'assistant',
			}),
		);
	}

	async getActivity(suggestionId: string) {
		return await this.manager.find(WorkflowSuggestionActivityEntity, {
			where: { suggestionId },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	async cleanup(now: Date, limit = 100) {
		const abandonedBefore = new Date(now.getTime() - 7 * 86400_000);
		const closedBefore = new Date(now.getTime() - 30 * 86400_000);
		const candidates = await this.find({
			where: [
				{ state: 'preparing', updatedAt: LessThan(abandonedBefore), payload: Not(IsNull()) },
				{ state: 'closed', closedAt: LessThan(closedBefore), payload: Not(IsNull()) },
			],
			select: ['id'],
			take: limit,
			order: { updatedAt: 'ASC' },
		});
		for (const { id } of candidates) {
			await this.update(
				{ id, state: 'preparing', updatedAt: LessThan(abandonedBefore) },
				{
					state: 'closed',
					closedReason: 'abandoned',
					closedAt: now,
					payload: null,
				},
			);
			await this.update(
				{ id, state: 'closed', closedAt: LessThan(closedBefore) },
				{ payload: null },
			);
		}
	}
}
