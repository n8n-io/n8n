import { ExecutionData, ExecutionDataRepository, In } from '@n8n/db';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import chunk from 'lodash/chunk';

import { EXECUTION_DATA_BUNDLE_VERSION } from './constants';
import type {
	ExecutionDataStore,
	ExecutionRef,
	ExecutionDataPayload,
	ExecutionDataBundle,
} from './types';

// Max number of ids per IN-clause. Conservative, as some databases cap near 1000.
const MAX_READ_BATCH_SIZE = 900;

@Service()
export class DbStore implements ExecutionDataStore {
	constructor(private readonly repository: ExecutionDataRepository) {}

	async write({ executionId }: ExecutionRef, payload: ExecutionDataPayload, tx?: EntityManager) {
		const repo = this.getRepository(tx);
		await repo.upsert({ ...payload, executionId }, ['executionId']);
	}

	async read(
		{ executionId }: ExecutionRef,
		tx?: EntityManager,
	): Promise<ExecutionDataBundle | null> {
		const repo = this.getRepository(tx);
		const result = await repo.findOne({
			where: { executionId },
			select: ['data', 'workflowData', 'workflowVersionId'],
		});

		if (!result) return null;

		return { ...result, version: EXECUTION_DATA_BUNDLE_VERSION };
	}

	async readMany(refs: ExecutionRef[]) {
		const bundles = new Map<string, ExecutionDataBundle>();
		if (refs.length === 0) return bundles;

		const ids = refs.map((r) => r.executionId);

		// Batch the IN-clause so an unbounded set of ids cannot exceed the DB's
		// limit on bound parameters (SQLite caps near 1000).
		for (const batch of chunk(ids, MAX_READ_BATCH_SIZE)) {
			const rows = await this.repository.find({
				where: { executionId: In(batch) },
				select: ['executionId', 'data', 'workflowData', 'workflowVersionId'],
			});

			for (const row of rows) {
				bundles.set(row.executionId, {
					data: row.data,
					workflowData: row.workflowData,
					workflowVersionId: row.workflowVersionId,
					version: EXECUTION_DATA_BUNDLE_VERSION,
				});
			}
		}

		return bundles;
	}

	async delete(ref: ExecutionRef | ExecutionRef[]) {
		const ids = (Array.isArray(ref) ? ref : [ref]).map((r) => r.executionId);

		await this.repository.deleteMany(ids);
	}

	private getRepository(tx?: EntityManager) {
		return tx ? tx.getRepository(ExecutionData) : this.repository;
	}
}
