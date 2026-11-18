import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { GeneratedFromSourceType } from 'n8n-workflow';

import type { DeterminismResult, DeterminismSource } from '../agent-determinism.contracts';
import { DeterminismSourceEntity } from './determinism-source.entity';

class DeterminismSourceTable extends BaseRepository<DeterminismSourceEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(DeterminismSourceEntity, dataSource.manager, transactionRunner);
	}
}

export type RunCount = {
	runsSinceAnalysis: number;
	versionChanged: boolean;
	analyzedVersionHash: string | null;
};

export type DeterminismSourceRow = Pick<
	DeterminismSourceEntity,
	| 'sourceType'
	| 'sourceId'
	| 'projectId'
	| 'versionHash'
	| 'analysisStatus'
	| 'analyzedVersionHash'
	| 'draftWorkflowId'
	| 'result'
	| 'dismissedAt'
>;

@Service()
export class DeterminismSourceRepository {
	private readonly table: DeterminismSourceTable;

	constructor(
		dataSource: DataSource,
		private readonly txRunner: TransactionRunner,
	) {
		this.table = new DeterminismSourceTable(dataSource, txRunner);
	}

	async recordSuccessfulRun(source: DeterminismSource): Promise<RunCount> {
		return await this.txRunner.run({}, async (ctx) => {
			const manager = this.table.managerFor(ctx);
			const key = { sourceType: source.type, sourceId: source.id };
			const row = await manager.findOneBy(DeterminismSourceEntity, key);

			if (!row) {
				await manager.save(
					manager.create(DeterminismSourceEntity, {
						...key,
						projectId: source.projectId,
						versionHash: source.versionHash,
						runsSinceAnalysis: 1,
						analysisStatus: 'idle',
					}),
				);
				return { runsSinceAnalysis: 1, versionChanged: false, analyzedVersionHash: null };
			}

			const versionChanged = row.versionHash !== source.versionHash;
			const runsSinceAnalysis = versionChanged ? 1 : row.runsSinceAnalysis + 1;
			await manager.update(DeterminismSourceEntity, key, {
				versionHash: source.versionHash,
				runsSinceAnalysis,
			});
			return { runsSinceAnalysis, versionChanged, analyzedVersionHash: row.analyzedVersionHash };
		});
	}

	async tryClaimForAnalysis(sourceType: GeneratedFromSourceType, sourceId: string) {
		const result = await this.table
			.managerFor({})
			.createQueryBuilder()
			.update(DeterminismSourceEntity)
			.set({ analysisStatus: 'running', runsSinceAnalysis: 0 })
			.where('"sourceType" = :sourceType AND "sourceId" = :sourceId', { sourceType, sourceId })
			.andWhere('"analysisStatus" <> :running', { running: 'running' })
			.execute();
		return result.affected === 1;
	}

	async saveResult(
		source: DeterminismSource,
		draftWorkflowId: string,
		result: DeterminismResult | null,
	): Promise<void> {
		await this.table.managerFor({}).update(
			DeterminismSourceEntity,
			{ sourceType: source.type, sourceId: source.id },
			{
				analysisStatus: 'idle',
				analyzedVersionHash: source.versionHash,
				draftWorkflowId,
				result,
				dismissedAt: null,
			},
		);
	}

	async markFailed(sourceType: GeneratedFromSourceType, sourceId: string): Promise<void> {
		await this.table
			.managerFor({})
			.update(DeterminismSourceEntity, { sourceType, sourceId }, { analysisStatus: 'failed' });
	}

	async dismiss(sourceType: GeneratedFromSourceType, sourceId: string): Promise<void> {
		await this.table
			.managerFor({})
			.update(DeterminismSourceEntity, { sourceType, sourceId }, { dismissedAt: new Date() });
	}

	async findByProject(
		projectId: string,
		sourceType: GeneratedFromSourceType,
	): Promise<DeterminismSourceRow[]> {
		return await this.table
			.managerFor({})
			.findBy(DeterminismSourceEntity, { projectId, sourceType });
	}

	async findBySource(
		sourceType: GeneratedFromSourceType,
		sourceId: string,
	): Promise<DeterminismSourceRow | null> {
		return await this.table
			.managerFor({})
			.findOneBy(DeterminismSourceEntity, { sourceType, sourceId });
	}

	async resetInterrupted(): Promise<void> {
		await this.table
			.managerFor({})
			.update(DeterminismSourceEntity, { analysisStatus: 'running' }, { analysisStatus: 'failed' });
	}
}
