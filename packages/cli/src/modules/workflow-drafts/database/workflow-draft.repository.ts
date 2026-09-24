import type { WorkflowDraftContent, WorkflowDraftSource } from '@n8n/api-types';
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

import { WorkflowDraftActivityEntity } from './workflow-draft-activity.entity';
import { WorkflowDraft } from './workflow-draft.entity';
import { assertSameSource } from '../workflow-draft.contracts';

@Service()
export class WorkflowDraftRepository extends BaseRepository<WorkflowDraft> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowDraft, dataSource.manager, transactionRunner);
	}

	async getDraft(id: string, ctx: OperationContext = {}) {
		const draft = await this.managerFor(ctx).findOneBy(WorkflowDraft, { id });
		if (!draft) throw new NotFoundError('Draft not found.');
		return draft;
	}

	async findBySourceKey(sourceKey: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOneBy(WorkflowDraft, { sourceKey });
	}

	async createOnce(source: WorkflowDraftSource, projectId: string, payload: WorkflowDraftContent) {
		const draft = this.create({
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
			return await this.save(draft);
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

	async reviseIfCurrent(id: string, revision: number, payload: WorkflowDraftContent) {
		return await this.runInTransaction({}, async (manager, ctx) => {
			// Bind the JSON column as one value, without TypeORM's nested update shape.
			const result = await manager
				.createQueryBuilder()
				.update(WorkflowDraft)
				.set({ revision: revision + 1, payload: () => ':payload' })
				.setParameter('payload', JSON.stringify(payload))
				.where({ id, revision, state: 'preparing', payload: Not(IsNull()) })
				.execute();
			if (result.affected !== 1) throw new ConflictError('Draft revision has changed.');
			return await this.getDraft(id, ctx);
		});
	}

	async loadForSubmission(id: string, workflowId: string, ctx: OperationContext) {
		// Keep workflow-before-draft order for all submission and later apply operations.
		const target = await this.readWorkflowTarget(workflowId, ctx);
		const manager = this.managerFor(ctx);
		const draft = await manager.findOne(WorkflowDraft, {
			where: { id },
			...(manager.connection.options.type === 'postgres'
				? { lock: { mode: 'pessimistic_write' as const } }
				: {}),
		});
		if (!draft) throw new NotFoundError('Draft not found.');
		return { draft, ...target };
	}

	async closeAsOutdated(id: string, ctx: OperationContext) {
		await this.managerFor(ctx).update(
			WorkflowDraft,
			{ id, state: 'preparing' },
			{
				state: 'closed',
				closedReason: 'outdated',
				closedAt: new Date(),
			},
		);
		return await this.getDraft(id, ctx);
	}

	async markPendingIfCurrent(id: string, revision: number, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		try {
			const result = await manager.update(
				WorkflowDraft,
				{ id, revision, state: 'preparing' },
				{
					state: 'pending',
					submittedRevision: revision,
				},
			);
			if (result.affected !== 1) throw new ConflictError('Draft revision has changed.');
		} catch (error) {
			if (isUniqueConstraintError(error))
				throw new ConflictError('This workflow already has a pending proposal.');
			throw error;
		}
		return await this.getDraft(id, ctx);
	}

	async appendSubmittedActivity(draftId: string, revision: number, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		await manager.save(
			manager.create(WorkflowDraftActivityEntity, {
				draftId,
				revision,
				action: 'submitted',
				author: 'assistant',
			}),
		);
	}

	async getActivity(draftId: string) {
		return await this.manager.find(WorkflowDraftActivityEntity, {
			where: { draftId },
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
