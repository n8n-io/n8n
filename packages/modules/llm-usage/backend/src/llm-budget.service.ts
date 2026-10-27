import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';

import { LlmBudgetSpendService } from './llm-budget-spend.service';
import { LlmBudgetRepository, type LlmBudgetFields } from './llm-budget.repository';

export type { LlmBudgetFields } from './llm-budget.repository';

/** Reads and writes budgets. A write reloads the spend cache on this main at once. */
@Service()
export class LlmBudgetService {
	constructor(
		private readonly repository: LlmBudgetRepository,
		private readonly spend: LlmBudgetSpendService,
	) {}

	async list(offset: number, limit: number) {
		return await this.repository.listPage(offset, limit);
	}

	async get(id: string) {
		const budget = await this.repository.findById(id);
		if (!budget) throw new NotFoundError(`LLM budget "${id}" not found`);
		return budget;
	}

	async create(fields: LlmBudgetFields) {
		const budget = await this.repository.create(fields);
		await this.spend.refresh();
		return budget;
	}

	/** Writes only when `version` is the stored version, so two writers cannot overwrite each other. */
	async update(id: string, version: number, fields: LlmBudgetFields) {
		const updated = await this.repository.updateIfVersion(id, version, fields);
		if (!updated) {
			const stored = await this.get(id);
			throw new ConflictError(
				`LLM budget "${id}" has changed since it was last read (expected version ${version}, found ${stored.version})`,
			);
		}
		await this.spend.refresh();
		return updated;
	}

	async delete(id: string) {
		if (!(await this.repository.deleteById(id))) {
			throw new NotFoundError(`LLM budget "${id}" not found`);
		}
		await this.spend.refresh();
	}

	/**
	 * The counters of one budget, highest spend first, from the cache of this main. A disabled
	 * budget has none.
	 */
	async status(id: string, offset: number, limit: number) {
		const budget = await this.get(id);
		const counters = this.spend
			.countersOf(id)
			.sort((a, b) => b.costUsd - a.costUsd)
			.map((counter) => ({
				...counter,
				percent: (counter.costUsd / budget.limitAmount) * 100,
			}));
		return { budget, counters: counters.slice(offset, offset + limit), count: counters.length };
	}
}
