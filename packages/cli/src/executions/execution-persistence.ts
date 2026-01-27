import type { ExecutionDataStorageLocation, ExecutionDeletionCriteria } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { BinaryDataService } from 'n8n-core';

import { FsStore } from './execution-data/fs-store';
import type { ExecutionRef } from './execution-data/types';

type DeletionTarget = ExecutionRef & { storedAt: ExecutionDataStorageLocation };

/**
 * Performs a persistence operation on an execution and its blob of data.
 * Writes per the configured storage mode. Reads per the recorded `storedAt` value.
 */
@Service()
export class ExecutionPersistence {
	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly binaryDataService: BinaryDataService,
		private readonly fsStore: FsStore,
	) {}

	async hardDelete(target: DeletionTarget | DeletionTarget[]) {
		const targets = Array.isArray(target) ? target : [target];
		if (targets.length === 0) return;

		const fsTargets = targets.filter((t) => t.storedAt === 'fs');

		await Promise.all([
			this.executionRepository.deleteByIds(targets.map((t) => t.executionId)),
			this.binaryDataService.deleteMany(targets.map((t) => ({ type: 'execution' as const, ...t }))),
			fsTargets.length > 0 ? this.fsStore.delete(fsTargets) : Promise.resolve(),
		]);
	}

	async hardDeleteBy(criteria: ExecutionDeletionCriteria) {
		const refs = await this.executionRepository.deleteExecutionsByFilter(criteria);

		const fsRefs = refs.filter((r) => r.storedAt === 'fs');
		if (fsRefs.length > 0) await this.fsStore.delete(fsRefs);
	}
}
