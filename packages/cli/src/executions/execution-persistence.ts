import { DatabaseConfig, ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type {
	CreateExecutionPayload,
	ExecutionDataStorageLocation,
	ExecutionDeletionCriteria,
	FindOptionsWhere,
	IExecutionResponse,
	UpdateExecutionConditions,
} from '@n8n/db';
import { ExecutionEntity, ExecutionRepository, Not } from '@n8n/db';
import { Service } from '@n8n/di';
import { stringify } from 'flatted';
import { BinaryDataService, StorageConfig } from 'n8n-core';

import { DbStore } from './execution-data/db-store';
import { FsStore } from './execution-data/fs-store';
import { MissingExecutionDataError } from './execution-data/missing-execution-data.error';
import type { ExecutionDataStore, ExecutionRef, WorkflowSnapshot } from './execution-data/types';
import { DuplicateExecutionError } from '../errors/duplicate-execution.error';

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
		private readonly dbStore: DbStore,
		private readonly storageConfig: StorageConfig,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly databaseConfig: DatabaseConfig,
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

		try {
			return await this.executionRepository.manager.transaction(async (tx) => {
				const { identifiers } = await tx.insert(ExecutionEntity, executionEntity);
				const executionId = String(identifiers[0].id);
				const ref = { workflowId: id, executionId };
				const bundle = { data, workflowData: workflowSnapshot, workflowVersionId };

				await this.getStoreFor(storedAt).write(ref, bundle, tx);

				return executionId;
			});
		} catch (error) {
			if (executionEntity.deduplicationKey && this.isDuplicateExecutionError(error)) {
				throw new DuplicateExecutionError(executionEntity.deduplicationKey, error);
			}
			throw error;
		}
	}

	/**
	 * Update an existing execution and, if the payload includes data fields, its data in the configured storage.
	 * - In `db` mode, we update both entity and data in the DB in a transaction.
	 * - In `fs` mode, we update the entity in the DB and write its data to the filesystem in a transaction.
	 */
	async updateExistingExecution(
		executionId: string,
		execution: Partial<IExecutionResponse>,
		conditions?: UpdateExecutionConditions,
	): Promise<boolean> {
		const hasDataField = execution.data !== undefined || execution.workflowData !== undefined;

		if (!hasDataField) {
			return await this.updateEntityOnly(executionId, execution, conditions);
		}

		const entity = await this.executionRepository.findOne({
			where: { id: executionId },
			select: ['id', 'workflowId', 'storedAt'],
		});

		if (!entity) return false;

		const ref = { workflowId: entity.workflowId, executionId };
		const store = this.getStoreFor(entity.storedAt);

		return await this.applyDataUpdate(ref, store, execution, conditions);
	}

	private async updateEntityOnly(
		executionId: string,
		execution: Partial<IExecutionResponse>,
		conditions?: UpdateExecutionConditions,
	): Promise<boolean> {
		const executionInformation = this.extractEntityFields(execution);
		if (Object.keys(executionInformation).length === 0) return true;

		const whereCondition = this.buildEntityWhereCondition(executionId, conditions);
		const result = await this.executionRepository.update(whereCondition, executionInformation);
		return (result.affected ?? 0) > 0;
	}

	private async applyDataUpdate(
		ref: ExecutionRef,
		store: ExecutionDataStore,
		execution: Partial<IExecutionResponse>,
		conditions?: UpdateExecutionConditions,
	): Promise<boolean> {
		const { data, workflowData } = execution;
		const executionInformation = this.extractEntityFields(execution);

		return await this.executionRepository.manager.transaction(async (tx) => {
			if (Object.keys(executionInformation).length > 0) {
				const whereCondition = this.buildEntityWhereCondition(ref.executionId, conditions);
				const result = await tx.update(ExecutionEntity, whereCondition, executionInformation);
				if ((result.affected ?? 0) === 0) return false;
			}

			const existing = await store.read(ref, tx);
			if (!existing) throw new MissingExecutionDataError(ref);

			await store.write(
				ref,
				{
					data: data !== undefined ? stringify(data) : existing.data,
					workflowData: workflowData
						? this.toWorkflowSnapshot(workflowData)
						: existing.workflowData,
					workflowVersionId: existing.workflowVersionId,
				},
				tx,
			);

			return true;
		});
	}

	private extractEntityFields(execution: Partial<IExecutionResponse>) {
		const {
			id: _id,
			data: _data,
			workflowId: _workflowId,
			workflowData: _workflowData,
			workflowVersionId: _workflowVersionId, // immutable, never updated
			createdAt: _createdAt, // immutable, never updated
			startedAt: _startedAt, // immutable, never updated
			customData: _customData,
			...rest
		} = execution;
		return rest;
	}

	private buildEntityWhereCondition(
		executionId: string,
		conditions?: UpdateExecutionConditions,
	): FindOptionsWhere<ExecutionEntity> {
		const where: FindOptionsWhere<ExecutionEntity> = { id: executionId };
		if (conditions?.requireStatus) where.status = conditions.requireStatus;
		// TODO: `ExecutionEntity.finished` is deprecated and we should only rely on statuses here,
		// but for now we still use it to filter out finished executions for parity with ExecutionRepository.
		if (conditions?.requireNotFinished) where.finished = false;
		if (conditions?.requireNotCanceled) where.status = Not('canceled');
		return where;
	}

	private getStoreFor(location: ExecutionDataStorageLocation): ExecutionDataStore {
		switch (location) {
			case 'db':
				return this.dbStore;
			case 'fs':
				return this.fsStore;
		}
		const _exhaustive: never = location;
		throw new Error(`Unknown storage location: ${String(_exhaustive)}`);
	}

	private toWorkflowSnapshot(
		workflowData: NonNullable<IExecutionResponse['workflowData']>,
	): WorkflowSnapshot {
		const { id, name, nodes, connections, settings } = workflowData;
		return { id, name, nodes, connections, settings };
	}

	/**
	 * Detect whether the DB rejected the insert because of the unique index on
	 * `execution_entity.deduplicationKey`. We expect TypeORM to surface the
	 * driver's error code at `error.driverError.code` as a string, with the
	 * code's exact value depending on the configured DB.
	 */
	private isDuplicateExecutionError(error: unknown): error is Error {
		if (!(error instanceof Error) || !('driverError' in error)) return false;
		const { driverError } = error;
		if (typeof driverError !== 'object' || driverError === null || !('code' in driverError)) {
			return false;
		}
		const { code } = driverError;
		if (typeof code !== 'string') return false;
		if (!error.message.includes('deduplicationKey')) return false;

		if (this.databaseConfig.type === 'postgresdb') {
			return code === '23505';
		}
		// SQLite reports `SQLITE_CONSTRAINT_UNIQUE` when extended result codes are
		// enabled, and falls back to the base `SQLITE_CONSTRAINT` otherwise.
		return (
			code === 'SQLITE_CONSTRAINT_UNIQUE' ||
			(code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE constraint failed'))
		);
	}

	/**
	 * Delete an in-flight execution that is not meant to be saved.
	 *
	 * - When pruning is enabled, soft-deletes with a backdated `deletedAt` so the
	 * execution is immediately eligible for the next pruning hard-delete batch.
	 * - When pruning is disabled, hard-deletes immediately so the execution
	 * is not persisted indefinitely.
	 */
	async deleteInFlightExecution(target: DeletionTarget) {
		if (this.executionsConfig.pruneData) {
			const bufferMs = this.executionsConfig.pruneDataHardDeleteBuffer * Time.hours.toMilliseconds;
			const deletedAt = new Date(Date.now() - bufferMs);
			await this.executionRepository.update(target.executionId, { deletedAt });
		} else {
			await this.hardDelete(target);
		}
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
