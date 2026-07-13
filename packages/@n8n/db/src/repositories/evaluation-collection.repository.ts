import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { EvaluationCollection } from '../entities/evaluation-collection.ee';
import { TestRun } from '../entities/test-run.ee';

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

@Service()
export class EvaluationCollectionRepository extends Repository<EvaluationCollection> {
	constructor(dataSource: DataSource) {
		super(EvaluationCollection, dataSource.manager);
	}

	async createCollection(input: {
		id: string;
		name: string;
		description: string | null;
		workflowId: string;
		evaluationConfigId: string;
		createdById: string | null;
	}): Promise<EvaluationCollection> {
		const entity = this.create({
			id: input.id,
			name: input.name,
			description: input.description,
			workflowId: input.workflowId,
			evaluationConfigId: input.evaluationConfigId,
			createdById: input.createdById,
			insightsCache: null,
		});
		return await this.save(entity);
	}

	async findByIdAndWorkflowId(
		id: string,
		workflowId: string,
	): Promise<EvaluationCollection | null> {
		return await this.findOne({ where: { id, workflowId } });
	}

	/**
	 * Returns collections for a workflow with `runCount` populated. The list
	 * page uses this — it does not need the full run rows, just the count and
	 * the collection's own fields.
	 */
	async listByWorkflowId(workflowId: string): Promise<EvaluationCollectionListItem[]> {
		const collections = await this.find({
			where: { workflowId },
			order: { createdAt: 'DESC' },
		});

		if (collections.length === 0) return [];

		const runCounts = await this.manager
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
	): Promise<{ collection: EvaluationCollection; runs: TestRun[] } | null> {
		const collection = await this.findOne({ where: { id, workflowId } });
		if (!collection) return null;

		const runs = await this.manager.find(TestRun, {
			where: { collectionId: id },
			order: { createdAt: 'ASC' },
		});

		return { collection, runs };
	}

	async addRunsToCollection(collectionId: string, testRunIds: string[]): Promise<void> {
		if (testRunIds.length === 0) return;
		await this.manager.update(TestRun, { id: In(testRunIds) }, { collectionId });
	}

	async removeRunFromCollection(collectionId: string, testRunId: string): Promise<number> {
		const result = await this.manager.update(
			TestRun,
			{ id: testRunId, collectionId },
			{ collectionId: null },
		);
		return result.affected ?? 0;
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
	): Promise<{ deleted: boolean; runsUnlinked: number }> {
		const collection = await this.findOne({ where: { id, workflowId } });
		if (!collection) return { deleted: false, runsUnlinked: 0 };

		const runsUnlinked = await this.manager.count(TestRun, { where: { collectionId: id } });

		await this.delete({ id });

		return { deleted: true, runsUnlinked };
	}

	async updateInsightsCache(id: string, insights: IDataObject | null): Promise<void> {
		await this.update(id, { insightsCache: insights });
	}

	async updateMeta(
		id: string,
		workflowId: string,
		payload: { name?: string; description?: string | null },
	): Promise<EvaluationCollection | null> {
		const existing = await this.findByIdAndWorkflowId(id, workflowId);
		if (!existing) return null;
		if (payload.name !== undefined) existing.name = payload.name;
		if (payload.description !== undefined) existing.description = payload.description;
		return await this.save(existing);
	}
}
