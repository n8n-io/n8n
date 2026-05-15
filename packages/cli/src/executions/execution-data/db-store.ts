import { ExecutionData, ExecutionDataRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';

import { EXECUTION_DATA_BUNDLE_VERSION } from './constants';
import type {
	ExecutionDataStore,
	ExecutionRef,
	ExecutionDataPayload,
	ExecutionDataBundle,
} from './types';

@Service()
export class DbStore implements ExecutionDataStore {
	constructor(private readonly repository: ExecutionDataRepository) {}

	async write({ executionId }: ExecutionRef, payload: ExecutionDataPayload, tx?: EntityManager) {
		const repo = tx ? tx.getRepository(ExecutionData) : this.repository;
		await repo.upsert({ ...payload, executionId }, ['executionId']);
	}

	async read(
		{ executionId }: ExecutionRef,
		tx?: EntityManager,
	): Promise<ExecutionDataBundle | null> {
		const repo = tx ? tx.getRepository(ExecutionData) : this.repository;
		const result = await repo.findOne({
			where: { executionId },
			select: ['data', 'workflowData', 'workflowVersionId'],
		});

		if (!result) return null;

		return { ...result, version: EXECUTION_DATA_BUNDLE_VERSION };
	}

	async delete(ref: ExecutionRef | ExecutionRef[], tx?: EntityManager) {
		const ids = (Array.isArray(ref) ? ref : [ref]).map((r) => r.executionId);

		await this.repository.deleteMany(ids, tx);
	}
}
