import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import chunk from 'lodash/chunk';

import { ExecutionData } from '../entities';

const BATCH_SIZE = 900;

@Service()
export class ExecutionDataRepository extends Repository<ExecutionData> {
	constructor(dataSource: DataSource) {
		super(ExecutionData, dataSource.manager);
	}

	async createExecutionDataForExecution(
		data: QueryDeepPartialEntity<ExecutionData>,
		transactionManager: EntityManager,
	) {
		return await transactionManager.insert(ExecutionData, data);
	}

	/**
	 * IDs of the given executions whose stored run data contains all the fragments. The
	 * database compares the text, so run data that does not match never leaves it.
	 *
	 * @param fragments Text in the form that the stored JSON has it. A fragment with
	 * `ignoreAsciiCase` must be in lower case. It then matches without regard to the case
	 * of the letters A to Z. All other characters must be equal.
	 */
	async findIdsContaining(
		executionIds: string[],
		fragments: Array<{ text: string; ignoreAsciiCase: boolean }>,
	): Promise<string[]> {
		if (executionIds.length === 0) return [];

		const isPostgres = this.manager.connection.options.type === 'postgres';
		const position = isPostgres ? 'strpos' : 'instr';
		// The "C" collation makes `lower` change only A to Z, as it does on SQLite. It is
		// also much faster than the collation of the database.
		const lowered = isPostgres ? 'lower(ed.data COLLATE "C")' : 'lower(ed.data)';

		const qb = this.createQueryBuilder('ed')
			.select('ed.executionId', 'executionId')
			.where('ed.executionId IN (:...executionIds)', { executionIds });

		fragments.forEach(({ text, ignoreAsciiCase }, index) => {
			const haystack = ignoreAsciiCase ? lowered : 'ed.data';
			qb.andWhere(`${position}(${haystack}, :fragment${index}) > 0`, {
				[`fragment${index}`]: text,
			});
		});

		const rows = await qb.getRawMany<{ executionId: number | string }>();

		return rows.map((row) => String(row.executionId));
	}

	async deleteMany(executionIds: string[]) {
		if (executionIds.length === 0) return;

		const executionIdBatches = chunk(executionIds, BATCH_SIZE);
		await this.manager.transaction(async (transactionManager) => {
			for (const batch of executionIdBatches) {
				await transactionManager.delete(ExecutionData, { executionId: In(batch) });
			}
		});
	}
}
