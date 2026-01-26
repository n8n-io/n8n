import { ExecutionDataRepository } from '@n8n/db';
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

	async write({ executionId }: ExecutionRef, payload: ExecutionDataPayload) {
		await this.repository.upsert({ ...payload, executionId }, ['executionId']);
	}

	async read({ executionId }: ExecutionRef): Promise<ExecutionDataBundle | null> {
		const result = await this.repository.findOne({
			where: { executionId },
			select: ['data', 'workflowData', 'workflowVersionId'],
		});

		if (!result) return null;

		return { ...result, version: EXECUTION_DATA_BUNDLE_VERSION };
	}

	async delete(ref: ExecutionRef | ExecutionRef[]) {
		const ids = (Array.isArray(ref) ? ref : [ref]).map((r) => r.executionId);

		await this.repository.deleteMany(ids);
	}
}
