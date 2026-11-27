import { BaseRepository, type OperationContext, Project, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { DataSource, type ObjectLiteral } from '@n8n/typeorm';

import { InsightsMetadata } from './insights-metadata.entity';
import { InsightsRaw } from './insights-raw.entity';
import type { TypeToNumber } from './insights-shared';

class InsightsTable<Entity extends ObjectLiteral> extends BaseRepository<Entity> {}

export type InsightsLedgerEntry = {
	workflowId: string;
	workflowName: string;
	projectId: string;
	type: keyof typeof TypeToNumber;
	value: number;
	timestamp: Date;
};

/** Writes `insights_metadata` and `insights_raw` in the transaction of the ledger fold. */
@Service()
export class InsightsLedgerRepository {
	private readonly metadata: InsightsTable<InsightsMetadata>;

	private readonly raw: InsightsTable<InsightsRaw>;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.metadata = new InsightsTable(InsightsMetadata, dataSource.manager, transactionRunner);
		this.raw = new InsightsTable(InsightsRaw, dataSource.manager, transactionRunner);
	}

	async insert(entries: InsightsLedgerEntry[], ctx: OperationContext): Promise<void> {
		if (!ctx.trx) throw new UnexpectedError('Insights from the ledger need an active transaction');
		if (entries.length === 0) return;

		const workflows = new Map(entries.map((entry) => [entry.workflowId, entry]));
		const projectNames = await this.projectNames(
			[...new Set(entries.map((entry) => entry.projectId))],
			ctx,
		);
		const metadata = [...workflows.values()].map(({ workflowId, workflowName, projectId }) =>
			this.metadata.create({
				workflowId,
				workflowName,
				projectId,
				projectName: projectNames.get(projectId) ?? '',
			}),
		);
		const manager = this.metadata.managerFor(ctx);
		await manager.upsert(InsightsMetadata, metadata, ['workflowId']);
		const stored = await manager
			.createQueryBuilder(InsightsMetadata, 'metadata')
			.where('metadata.workflowId IN (:...ids)', { ids: [...workflows.keys()] })
			.getMany();
		const metaIdByWorkflow = new Map(stored.map((row) => [row.workflowId, row.metaId]));

		const rows = entries.map((entry) => {
			const row = new InsightsRaw();
			row.metaId = metaIdByWorkflow.get(entry.workflowId)!;
			row.type = entry.type;
			row.value = Math.round(entry.value);
			row.timestamp = entry.timestamp;
			return row;
		});
		await this.raw.managerFor(ctx).insert(InsightsRaw, rows);
	}

	private async projectNames(ids: string[], ctx: OperationContext) {
		const rows: Array<{ id: string; name: string }> = await this.metadata
			.managerFor(ctx)
			.createQueryBuilder()
			.select(['project.id AS id', 'project.name AS name'])
			.from(Project, 'project')
			.where('project.id IN (:...ids)', { ids })
			.getRawMany();
		return new Map(rows.map((row) => [row.id, row.name]));
	}
}
