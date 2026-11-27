import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { BaseRepository } from './base-repository';
import { EvaluationCollection } from '../entities/evaluation-collection.ee';
import { TestRun } from '../entities/test-run.ee';
import { type OperationContext, TransactionRunner } from '../services/transaction';

export type EvaluationCollectionListItem = {
	id: EvaluationCollection['id'];
	name: EvaluationCollection['name'];
	description: EvaluationCollection['description'];
	workflowId: EvaluationCollection['workflowId'];
	evaluationConfigId: EvaluationCollection['evaluationConfigId'];
	createdById: EvaluationCollection['createdById'];
	insightsCache: EvaluationCollection['insightsCache'];
	createdAt: EvaluationCollection['createdAt'];
	updatedAt: EvaluationCollection['updatedAt'];
	runCount: number;
};

class EvaluationCollectionTable extends BaseRepository<EvaluationCollection> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(EvaluationCollection, dataSource.manager, transactionRunner);
	}
}

@Service()
export class EvaluationCollectionRepository {
	private readonly table: EvaluationCollectionTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new EvaluationCollectionTable(dataSource, transactionRunner);
	}

	async createCollection(
		input: {
			id: string;
			name: string;
			description: string | null;
			workflowId: string;
			evaluationConfigId: string;
			createdById: string | null;
		},
		ctx: OperationContext,
	): Promise<EvaluationCollection> {
		const manager = this.table.managerFor(ctx);
		const entity = manager.create(EvaluationCollection, {
			id: input.id,
			name: input.name,
			description: input.description,
			workflowId: input.workflowId,
			evaluationConfigId: input.evaluationConfigId,
			createdById: input.createdById,
			insightsCache: null,
		});
		return await manager.save(EvaluationCollection, entity);
	}

	async findByIdAndWorkflowId(
		id: string,
		workflowId: string,
		ctx: OperationContext,
	): Promise<EvaluationCollection | null> {
		return await this.table
			.managerFor(ctx)
			.findOne(EvaluationCollection, { where: { id, workflowId } });
	}

	/**
	 * Returns collections for a workflow with `runCount` populated. The list
	 * page uses this — it does not need the full run rows, just the count and
	 * the collection's own fields.
	 */
	async listByWorkflowId(
		workflowId: string,
		ctx: OperationContext,
	): Promise<EvaluationCollectionListItem[]> {
		const manager = this.table.managerFor(ctx);
		const collections = await manager.find(EvaluationCollection, {
			where: { workflowId },
			order: { createdAt: 'DESC' },
		});

		if (collections.length === 0) return [];

		const runCounts = await manager
			.createQueryBuilder(TestRun, 'tr')
			.select('tr.collectionId', 'collectionId')
			.addSelect('COUNT(tr.id)', 'count')
			.where('tr.collectionId IN (:...ids)', { ids: collections.map((c) => c.id) })
			.groupBy('tr.collectionId')
			.getRawMany<{ collectionId: string; count: string }>();

		const countByCollectionId = new Map(
			runCounts.map(({ collectionId, count }) => [collectionId, Number(count)]),
		);

		return collections.map((collection) => ({
			...collection,
			runCount: countByCollectionId.get(collection.id) ?? 0,
		}));
	}

	/**
	 * Returns the collection plus its runs ordered by createdAt ascending so
	 * the compare view can render versions left-to-right by run order.
	 */
	async getDetailByIdAndWorkflowId(
		id: string,
		workflowId: string,
		ctx: OperationContext,
	): Promise<{ collection: EvaluationCollection; runs: TestRun[] } | null> {
		const manager = this.table.managerFor(ctx);
		const collection = await manager.findOne(EvaluationCollection, { where: { id, workflowId } });
		if (!collection) return null;

		const runs = await manager.find(TestRun, {
			where: { collectionId: id },
			order: { createdAt: 'ASC' },
		});

		return { collection, runs };
	}

	async addRunsToCollection(
		collectionId: string,
		testRunIds: string[],
		ctx: OperationContext,
	): Promise<void> {
		if (testRunIds.length === 0) return;
		await this.table.managerFor(ctx).update(TestRun, { id: In(testRunIds) }, { collectionId });
	}

	async removeRunFromCollection(
		collectionId: string,
		testRunId: string,
		ctx: OperationContext,
	): Promise<number> {
		const result = await this.table
			.managerFor(ctx)
			.update(TestRun, { id: testRunId, collectionId }, { collectionId: null });
		return result.affected ?? 0;
	}

	/**
	 * Unlink several runs in one statement so a multi-run membership change
	 * (e.g. replacing a collection's runs on re-run) applies atomically rather
	 * than leaving a partial mix if it fails midway.
	 */
	async removeRunsFromCollection(
		collectionId: string,
		testRunIds: string[],
		ctx: OperationContext,
	): Promise<void> {
		if (testRunIds.length === 0) return;
		await this.table
			.managerFor(ctx)
			.update(TestRun, { id: In(testRunIds), collectionId }, { collectionId: null });
	}

	/**
	 * Returns how many runs were unlinked (set to `collectionId = null`) by
	 * the delete. Callers feed this into the `runs_unlinked` telemetry field.
	 *
	 * The FK on `test_run.collectionId` is `SET NULL`, so we'd technically
	 * get the unlink for free — but counting runs first lets the caller
	 * surface the number in the response and telemetry without an extra
	 * round-trip.
	 */
	async deleteByIdAndWorkflowId(
		id: string,
		workflowId: string,
		ctx: OperationContext,
	): Promise<{ deleted: boolean; runsUnlinked: number }> {
		const manager = this.table.managerFor(ctx);
		const collection = await manager.findOne(EvaluationCollection, { where: { id, workflowId } });
		if (!collection) return { deleted: false, runsUnlinked: 0 };

		const runsUnlinked = await manager.count(TestRun, { where: { collectionId: id } });

		await manager.delete(EvaluationCollection, { id });

		return { deleted: true, runsUnlinked };
	}

	async updateInsightsCache(
		id: string,
		insights: IDataObject | null,
		ctx: OperationContext,
	): Promise<void> {
		await this.table.managerFor(ctx).update(EvaluationCollection, id, { insightsCache: insights });
	}

	async updateMeta(
		id: string,
		workflowId: string,
		payload: { name?: string; description?: string | null },
		ctx: OperationContext,
	): Promise<EvaluationCollection | null> {
		const existing = await this.findByIdAndWorkflowId(id, workflowId, ctx);
		if (!existing) return null;
		if (payload.name !== undefined) existing.name = payload.name;
		if (payload.description !== undefined) existing.description = payload.description;
		return await this.table.managerFor(ctx).save(EvaluationCollection, existing);
	}
}
