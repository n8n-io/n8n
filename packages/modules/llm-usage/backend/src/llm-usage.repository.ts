import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { LlmUsage } from './llm-usage.entity';

/** Three parameters for each call keep a statement far below SQLite's parameter limit. */
const SET_PRICES_CHUNK = 200;
/** A row has 24 columns, so 500 rows stay below the parameter limits of SQLite and Postgres. */
const INSERT_CHUNK = 500;

@Service()
export class LlmUsageRepository extends Repository<LlmUsage> {
	constructor(dataSource: DataSource) {
		super(LlmUsage, dataSource.manager);
	}

	/** Duplicates (same `callId`) are ignored, so a retried batch is safe. */
	async insertIgnoringDuplicates(rows: Array<Partial<LlmUsage>>) {
		for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
			const chunk = rows.slice(start, start + INSERT_CHUNK).map((row) => this.fitToColumns(row));
			// No read-back of the generated columns: nothing uses them, and on SQLite it is an
			// extra query inside the write.
			await this.createQueryBuilder()
				.insert()
				.values(chunk)
				.orIgnore()
				.updateEntity(false)
				.execute();
		}
	}

	/**
	 * One page of the calls stored without a price since `since`, with the fields that pricing
	 * needs, in call ID order. Pass the last call ID of a page to read the next one.
	 */
	async findUnpriced(since: Date, limit: number, afterCallId?: string) {
		const query = this.createQueryBuilder('usage')
			.select([
				'usage.callId',
				'usage.provider',
				'usage.model',
				'usage.inputTokens',
				'usage.outputTokens',
				'usage.cacheReadTokens',
				'usage.cacheWriteTokens',
			])
			// A literal, not a parameter: only then can the databases use the partial index on
			// unpriced calls. Without it, each page walks the whole table.
			.where('usage.priced = false')
			.andWhere('usage.finishedAt >= :since', { since })
			.orderBy('usage.callId', 'ASC')
			.limit(limit);
		if (afterCallId !== undefined) query.andWhere('usage.callId > :afterCallId', { afterCallId });
		return await query.getMany();
	}

	/**
	 * Stores the prices of calls stored without one, with one statement for each chunk.
	 * A priced call is never changed, also when another process prices it first.
	 */
	async setPrices(prices: Array<{ callId: string; estimatedCostUsd: number }>) {
		// An UPDATE has no alias, so the camelCase columns are quoted by hand.
		const callId = this.manager.connection.driver.escape('callId');
		const priced = this.manager.connection.driver.escape('priced');
		for (let start = 0; start < prices.length; start += SET_PRICES_CHUNK) {
			const chunk = prices.slice(start, start + SET_PRICES_CHUNK);
			// The cast types the parameters on Postgres, which would read them as text.
			const cases = chunk
				.map((_, index) => `WHEN :id${index} THEN CAST(:cost${index} AS DOUBLE PRECISION)`)
				.join(' ');
			const parameters = Object.fromEntries(
				chunk.flatMap((price, index) => [
					[`id${index}`, price.callId],
					[`cost${index}`, price.estimatedCostUsd],
				]),
			);
			await this.createQueryBuilder()
				.update()
				.set({ estimatedCostUsd: () => `CASE ${callId} ${cases} END`, priced: true })
				.where(`${callId} IN (:...callIds)`, { callIds: chunk.map((price) => price.callId) })
				.andWhere(`${priced} = :unpriced`, { unpriced: false })
				.setParameters(parameters)
				.execute();
		}
	}

	/**
	 * Cuts strings to their column length. Postgres rejects a longer value, and one such row
	 * would fail its whole batch. A cut ID no longer matches its target, which only loses a name.
	 */
	private fitToColumns(row: Partial<LlmUsage>) {
		const fitted = { ...row };
		for (const column of this.metadata.columns) {
			const value: unknown = column.getEntityValue(fitted);
			const maxLength = Number(column.length);
			if (typeof value === 'string' && maxLength > 0 && value.length > maxLength) {
				column.setEntityValue(fitted, value.slice(0, maxLength));
			}
		}
		return fitted;
	}
}
