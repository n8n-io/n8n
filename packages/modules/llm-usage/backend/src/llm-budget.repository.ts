import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { LlmBudget } from './llm-budget.entity';

class LlmBudgetTable extends BaseRepository<LlmBudget> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(LlmBudget, dataSource.manager, transactionRunner);
	}
}

/** The fields that a budget write sets. The ID, version and timestamps are managed here. */
export type LlmBudgetFields = Pick<
	LlmBudget,
	| 'name'
	| 'enabled'
	| 'target'
	| 'timeWindow'
	| 'metric'
	| 'limitAmount'
	| 'action'
	| 'warnAtPercent'
	| 'managedBy'
	| 'externalId'
>;

@Service()
export class LlmBudgetRepository {
	private readonly table: LlmBudgetTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new LlmBudgetTable(dataSource, transactionRunner);
	}

	/** One page, oldest first, so that a cursor stays stable while budgets are added. */
	async listPage(offset: number, limit: number) {
		const [rows, count] = await this.table.findAndCount({
			order: { createdAt: 'ASC', id: 'ASC' },
			skip: offset,
			take: limit,
		});
		return { rows, count };
	}

	async listEnabled() {
		return await this.table.findBy({ enabled: true });
	}

	async findById(id: string) {
		return await this.table.findOneBy({ id });
	}

	async create(fields: LlmBudgetFields) {
		return await this.table.save(this.table.create({ ...fields, version: 1 }));
	}

	/** Writes only when the stored version is `version`. Returns the new row, else `null`. */
	async updateIfVersion(id: string, version: number, fields: LlmBudgetFields) {
		const { affected } = await this.table.update(
			{ id, version },
			{ ...fields, version: version + 1 },
		);
		return affected ? await this.findById(id) : null;
	}

	/** Returns `false` when no budget has this ID. */
	async deleteById(id: string) {
		const { affected } = await this.table.delete({ id });
		return Boolean(affected);
	}
}
