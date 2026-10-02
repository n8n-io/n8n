import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Not, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';

import { chunkIds } from '../utils/chunk-ids';
import { WorkflowPublishHistory } from '../entities';

@Service()
export class WorkflowPublishHistoryRepository extends Repository<WorkflowPublishHistory> {
	constructor(dataSource: DataSource) {
		super(WorkflowPublishHistory, dataSource.manager);
	}

	async addRecord(
		{
			workflowId,
			versionId,
			event,
			userId,
		}: Pick<WorkflowPublishHistory, 'event' | 'workflowId' | 'versionId' | 'userId'>,
		trx?: EntityManager,
	) {
		const repository = trx ? trx.getRepository(WorkflowPublishHistory) : this;
		await repository.insert({
			workflowId,
			versionId,
			event,
			userId,
		});
	}

	async getPublishedVersions(
		workflowId: string,
	): Promise<Array<Pick<WorkflowPublishHistory, 'versionId'>>> {
		return await this.manager
			.createQueryBuilder(WorkflowPublishHistory, 'wph')
			.select('wph.versionId')
			.distinct(true)
			.where('wph.workflowId = :workflowId', { workflowId })
			.getMany();
	}

	/**
	 * The newest publish and unpublish events per workflow that still name their user,
	 * newest first and at most `perWorkflow` each, keyed by workflow id. Workflows
	 * without one are absent from the result.
	 */
	async findRecentAttributedByWorkflowIds(
		workflowIds: string[],
		perWorkflow: number,
	): Promise<Map<string, Array<{ userId: string; at: Date }>>> {
		const recent = new Map<string, Array<{ userId: string; at: Date }>>();
		if (workflowIds.length === 0 || perWorkflow <= 0) return recent;

		for (const chunk of chunkIds([...new Set(workflowIds)])) {
			const rows = await this.find({
				select: ['id', 'workflowId', 'userId', 'createdAt'],
				where: { workflowId: In(chunk), userId: Not(IsNull()) },
				order: { createdAt: 'DESC', id: 'DESC' },
			});
			for (const row of rows) {
				if (row.userId === null) continue;
				const entries = recent.get(row.workflowId) ?? [];
				if (entries.length >= perWorkflow) continue;
				entries.push({ userId: row.userId, at: row.createdAt });
				recent.set(row.workflowId, entries);
			}
		}
		return recent;
	}

	async findActivatedByUserId(workflowId: string): Promise<string | undefined> {
		const record = await this.findOne({
			select: ['userId'],
			where: { workflowId, event: 'activated' },
			order: { createdAt: 'DESC' },
		});
		return record?.userId ?? undefined;
	}

	/**
	 * Who published the workflow's currently active version, so a triggered run
	 * can be attributed to them.
	 *
	 * Prefers the activation of `versionId`: republishing an older version means
	 * the most recent activation is not necessarily the live one. Only when that
	 * version has no activation at all does it fall back to the latest activation
	 * of any version, which covers a version whose history row was pruned.
	 *
	 * Returns `undefined` when the publisher was deleted (the FK nulls the
	 * column) or the workflow never recorded an activation.
	 */
	async findPublisherUserId(
		workflowId: string,
		versionId?: string | null,
	): Promise<string | undefined> {
		if (versionId) {
			const forVersion = await this.findOne({
				// `id` keeps the row distinguishable from no row at all: selecting only
				// a null column makes TypeORM hydrate the result as `null`.
				select: ['id', 'userId'],
				where: { workflowId, versionId, event: 'activated' },
				order: { createdAt: 'DESC' },
			});
			// An activation row answers the question on its own. A null column means
			// the publisher was deleted, which is "nobody" — not "ask someone else",
			// which would attribute the run to whoever published a different version.
			if (forVersion) return forVersion.userId ?? undefined;
		}

		return await this.findActivatedByUserId(workflowId);
	}
}
