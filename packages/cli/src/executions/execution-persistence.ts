import type {
	CreateExecutionPayload,
	ExecutionDataStorageLocation,
	ExecutionDeletionCriteria,
} from '@n8n/db';
import { ExecutionData, ExecutionEntity, ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { stringify } from 'flatted';
import { BinaryDataService, StorageConfig } from 'n8n-core';

import { FsStore } from './execution-data/fs-store';
import type { ExecutionRef, WorkflowSnapshot } from './execution-data/types';

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
		private readonly storageConfig: StorageConfig,
	) {}

	/**
	 * Create an execution entity and persist its data to the configured storage.
	 * - In `db` mode, we write both entity and data to the DB in a transaction.
	 * - In `fs` mode, we write the entity to the DB and its data to the filesystem.
	 */
	async create(payload: CreateExecutionPayload) {
		const { data: rawData, workflowData, ...rest } = payload;
		const { connections, nodes, name, settings, id } = workflowData;
		const workflowSnapshot: WorkflowSnapshot = { connections, nodes, name, settings, id };
		const storedAt = this.storageConfig.modeTag;
		const executionEntity = { ...rest, createdAt: new Date(), storedAt };
		const data = stringify(rawData);
		const workflowVersionId = workflowData.versionId ?? null;

		return await this.executionRepository.manager.transaction(async (tx) => {
			const { identifiers } = await tx.insert(ExecutionEntity, executionEntity);
			const executionId = String(identifiers[0].id);

			if (storedAt === 'db') {
				await tx.insert(ExecutionData, {
					executionId,
					workflowData: workflowSnapshot,
					data,
					workflowVersionId,
				});
				return executionId;
			}

			await this.fsStore.write(
				{ workflowId: id, executionId },
				{ data, workflowData: workflowSnapshot, workflowVersionId },
			);
			return executionId;
		});
	}

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
