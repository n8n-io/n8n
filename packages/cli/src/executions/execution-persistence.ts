import { parseFlatted } from '@n8n/backend-common';
import { DatabaseConfig, ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type {
	CreateExecutionPayload,
	ExecutionDataStorageLocation,
	ExecutionDeletionCriteria,
	FindManyOptions,
	FindOptionsWhere,
	IExecutionBase,
	IExecutionFlattedDb,
	IExecutionResponse,
	UpdateExecutionConditions,
} from '@n8n/db';
import { ExecutionData, ExecutionEntity, ExecutionRepository, In, Not } from '@n8n/db';
import { Service } from '@n8n/di';
import { stringify } from 'flatted';
import { BinaryDataService, ErrorReporter, StorageConfig } from 'n8n-core';
import type { IRunExecutionData, IRunExecutionDataAll } from 'n8n-workflow';
import { migrateRunExecutionData, UnexpectedError } from 'n8n-workflow';

import { CorruptedExecutionDataError } from './execution-data/corrupted-execution-data.error';
import { DbStore } from './execution-data/db-store';
import { FsStore } from './execution-data/fs-store';
import { MissingExecutionDataError } from './execution-data/missing-execution-data.error';
import type {
	ExecutionDataBundle,
	ExecutionDataStore,
	ExecutionRef,
	WorkflowSnapshot,
} from './execution-data/types';
import { DuplicateExecutionError } from '../errors/duplicate-execution.error';
import { EventService } from '../events/event.service';

type DeletionTarget = ExecutionRef & { storedAt: ExecutionDataStorageLocation };

type FoundExecution = IExecutionFlattedDb | IExecutionResponse | IExecutionBase;

type UpdatableEntityColumns = Omit<
	Partial<IExecutionResponse>,
	| 'id'
	| 'data'
	| 'workflowId'
	| 'workflowData'
	| 'workflowVersionId'
	| 'createdAt'
	| 'startedAt'
	| 'customData'
>;

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
		private readonly errorReporter: ErrorReporter,
		private readonly eventService: EventService,
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
		const workflowVersionId = workflowData.versionId ?? null;

		try {
			return await this.executionRepository.manager.transaction(async (tx) => {
				const { identifiers } = await tx.insert(ExecutionEntity, executionEntity);
				const executionId = String(identifiers[0].id);
				const ref = { workflowId: id, executionId };
				const store = this.getStoreFor(storedAt);

				await this.trackWrite(storedAt, async () => {
					const bundle = {
						data: stringify(rawData),
						workflowData: workflowSnapshot,
						workflowVersionId,
					};
					await store.write(ref, bundle, tx);
				});

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
			where: this.buildEntityWhereCondition(executionId, conditions),
			select: ['id', 'workflowId', 'storedAt'],
		});

		if (!entity) return false;

		const ref = { workflowId: entity.workflowId, executionId };
		const store = this.getStoreFor(entity.storedAt);

		return await this.applyDataUpdate(ref, store, entity.storedAt, execution, conditions);
	}

	/**
	 * Find a single execution by id, dispatching data reads to the store matching its `storedAt`.
	 * - In `db` mode, we load entity, metadata, optional annotation, and data via `DbStore`.
	 * - In `fs` mode, we load entity, metadata, optional annotation from the DB, and data via `FsStore`.
	 *
	 * A missing data bundle is handled differently per store. In `db` mode the entity and its data
	 * share one database, so an absent data row means a known-corrupt record we report and skip
	 * (soft). In `fs` mode the entity lives in the DB while its data lives on disk, so a missing
	 * file points at an out-of-band loss (deletion, unmounted volume) that a single-execution read
	 * should surface loudly rather than silently swallow (hard).
	 */
	async findSingleExecution(
		id: string,
		options?: {
			includeData: true;
			includeAnnotation?: boolean;
			unflattenData: true;
			where?: FindOptionsWhere<ExecutionEntity>;
		},
	): Promise<IExecutionResponse | undefined>;
	async findSingleExecution(
		id: string,
		options?: {
			includeData: true;
			includeAnnotation?: boolean;
			unflattenData?: false | undefined;
			where?: FindOptionsWhere<ExecutionEntity>;
		},
	): Promise<IExecutionFlattedDb | undefined>;
	async findSingleExecution(
		id: string,
		options?: {
			includeData?: boolean;
			includeAnnotation?: boolean;
			unflattenData?: boolean;
			where?: FindOptionsWhere<ExecutionEntity>;
		},
	): Promise<IExecutionBase | undefined>;
	async findSingleExecution(
		id: string,
		options?: {
			includeData?: boolean;
			includeAnnotation?: boolean;
			unflattenData?: boolean;
			where?: FindOptionsWhere<ExecutionEntity>;
		},
	): Promise<FoundExecution | undefined> {
		if (!options?.includeData) {
			return await this.executionRepository.findSingleExecution(id, options);
		}

		const entity = await this.executionRepository.findOne({
			where: { id, ...options.where },
			relations: {
				metadata: true,
				...(options.includeAnnotation ? { annotation: { tags: true } } : {}),
			},
		});

		if (!entity) return undefined;

		const store = this.getStoreFor(entity.storedAt);
		const ref = { workflowId: entity.workflowId, executionId: entity.id };

		const start = Date.now();
		let success = false;
		let unreadableBundles = 0;
		try {
			const bundle = await store.read(ref);
			if (!bundle) {
				unreadableBundles = 1;
				if (entity.storedAt === 'db') {
					this.executionRepository.reportInvalidExecutions([entity]);
					return undefined;
				}
				throw new MissingExecutionDataError(ref);
			}
			const assembled = await this.assembleExecution(entity, bundle, options);
			success = true;
			return assembled as FoundExecution;
		} catch (error) {
			if (error instanceof CorruptedExecutionDataError) unreadableBundles = 1;
			throw error;
		} finally {
			this.eventService.emit('execution-data-read', {
				mode: entity.storedAt,
				durationMs: Date.now() - start,
				success,
				unreadableBundles,
			});
		}
	}

	/**
	 * Find multiple executions matching `queryParams`. With `includeData: true`, partitions
	 * entities by `storedAt` and batch-fetches bundles from each store to avoid n+1 reads.
	 * - In `db` mode, we issue one `In(ids)` query against `execution_data` per batch.
	 * - In `fs` mode, we fan out reads across the filesystem.
	 */
	async findMultipleExecutions(
		queryParams: FindManyOptions<ExecutionEntity>,
		options?: {
			unflattenData: true;
			includeData?: true;
		},
	): Promise<IExecutionResponse[]>;
	async findMultipleExecutions(
		queryParams: FindManyOptions<ExecutionEntity>,
		options?: {
			unflattenData?: false | undefined;
			includeData?: true;
		},
	): Promise<IExecutionFlattedDb[]>;
	async findMultipleExecutions(
		queryParams: FindManyOptions<ExecutionEntity>,
		options?: {
			unflattenData?: boolean;
			includeData?: boolean;
		},
	): Promise<IExecutionBase[]>;
	async findMultipleExecutions(
		queryParams: FindManyOptions<ExecutionEntity>,
		options?: {
			unflattenData?: boolean;
			includeData?: boolean;
		},
	): Promise<IExecutionFlattedDb[] | IExecutionResponse[] | IExecutionBase[]> {
		if (!options?.includeData) {
			return await this.executionRepository.findMultipleExecutions(queryParams, options);
		}

		queryParams.relations ??= [];
		if (Array.isArray(queryParams.relations)) {
			if (!queryParams.relations.includes('metadata')) queryParams.relations.push('metadata');
		} else {
			queryParams.relations.metadata = true;
		}

		// A narrowing `select` must still include the fields we route and read by: `storedAt` (else
		// every execution defaults to the fs store) and `id`/`workflowId` (else no bundle resolves).
		// An undefined `select` loads all columns, so no action needed.
		if (queryParams.select) {
			if (Array.isArray(queryParams.select)) {
				for (const field of ['id', 'workflowId', 'storedAt'] as const) {
					if (!queryParams.select.includes(field)) queryParams.select.push(field);
				}
			} else {
				queryParams.select.id = true;
				queryParams.select.workflowId = true;
				queryParams.select.storedAt = true;
			}
		}

		const entities = await this.executionRepository.find(queryParams);
		if (entities.length === 0) return [];

		// Group by storage location and batch-fetch each group from its store.
		const entitiesByLocation = new Map<ExecutionDataStorageLocation, ExecutionEntity[]>();
		for (const entity of entities) {
			const group = entitiesByLocation.get(entity.storedAt) ?? [];
			group.push(entity);
			entitiesByLocation.set(entity.storedAt, group);
		}

		const assembledById = new Map<string, Awaited<ReturnType<typeof this.assembleExecution>>>();
		await Promise.all(
			[...entitiesByLocation].map(async ([location, group]) => {
				const refs = group.map((e) => ({ workflowId: e.workflowId, executionId: e.id }));
				const store = this.getStoreFor(location);
				const start = Date.now();
				let success = false;
				let unreadableBundles = 0;
				try {
					const bundles = await store.readMany(refs);
					const missing = group.filter((e) => !bundles.has(e.id));
					if (missing.length > 0) this.executionRepository.reportInvalidExecutions(missing);
					unreadableBundles = missing.length;

					const settled = await Promise.allSettled(
						group.map(async (entity) => {
							const bundle = bundles.get(entity.id);
							if (!bundle) return;
							assembledById.set(entity.id, await this.assembleExecution(entity, bundle, options));
						}),
					);
					const corrupt = group.filter((_, i) => {
						const outcome = settled[i];
						return (
							outcome.status === 'rejected' && outcome.reason instanceof CorruptedExecutionDataError
						);
					});
					unreadableBundles += corrupt.length;
					if (corrupt.length > 0) this.executionRepository.reportInvalidExecutions(corrupt);

					for (const outcome of settled) {
						if (
							outcome.status === 'rejected' &&
							!(outcome.reason instanceof CorruptedExecutionDataError)
						) {
							throw outcome.reason;
						}
					}

					success = true;
				} finally {
					this.eventService.emit('execution-data-read', {
						mode: location,
						durationMs: Date.now() - start,
						success,
						unreadableBundles,
					});
				}
			}),
		);

		return entities
			.map((e) => assembledById.get(e.id))
			.filter((e): e is NonNullable<typeof e> => e !== undefined) as
			| IExecutionFlattedDb[]
			| IExecutionResponse[]
			| IExecutionBase[];
	}

	/** Find an execution scoped to accessible workflows, with unflattened data and annotation. */
	async findWithUnflattenedData(executionId: string, accessibleWorkflowIds: string[]) {
		return await this.findSingleExecution(executionId, {
			where: { workflowId: In(accessibleWorkflowIds) },
			includeData: true,
			unflattenData: true,
			includeAnnotation: true,
		});
	}

	/** Find an execution scoped to shared workflows, with unflattened data and annotation. */
	async findIfSharedUnflatten(executionId: string, sharedWorkflowIds: string[]) {
		return await this.findSingleExecution(executionId, {
			where: { workflowId: In(sharedWorkflowIds) },
			includeData: true,
			unflattenData: true,
			includeAnnotation: true,
		});
	}

	/** Find an execution scoped to the given workflows for the public API. */
	async getExecutionInWorkflowsForPublicApi(
		id: string,
		workflowIds: string[],
		includeData?: boolean,
	): Promise<IExecutionBase | undefined> {
		return await this.findSingleExecution(id, {
			where: { workflowId: In(workflowIds) },
			includeData,
			unflattenData: true,
		});
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

	private async updateEntityOnly(
		executionId: string,
		execution: Partial<IExecutionResponse>,
		conditions?: UpdateExecutionConditions,
	): Promise<boolean> {
		const updatableColumns = this.pickUpdatableEntityColumns(execution);
		if (Object.keys(updatableColumns).length === 0) return true;

		const whereCondition = this.buildEntityWhereCondition(executionId, conditions);
		const result = await this.executionRepository.update(whereCondition, updatableColumns);
		return (result.affected ?? 0) > 0;
	}

	private async applyDataUpdate(
		ref: ExecutionRef,
		store: ExecutionDataStore,
		mode: ExecutionDataStorageLocation,
		execution: Partial<IExecutionResponse>,
		conditions?: UpdateExecutionConditions,
	): Promise<boolean> {
		const { data, workflowData } = execution;
		const updatableColumns = this.pickUpdatableEntityColumns(execution);

		return await this.executionRepository.manager.transaction(async (tx) => {
			const whereCondition = this.buildEntityWhereCondition(ref.executionId, conditions);

			if (Object.keys(updatableColumns).length > 0) {
				const result = await tx.update(ExecutionEntity, whereCondition, updatableColumns);
				if ((result.affected ?? 0) === 0) return false;
			} else if (conditions) {
				// No entity columns to update, but the caller still requested a guarded write.
				const lock =
					this.databaseConfig.type === 'postgresdb'
						? { mode: 'pessimistic_write' as const }
						: undefined;
				const matchingRow = await tx.findOne(ExecutionEntity, {
					where: whereCondition,
					select: ['id'],
					lock,
				});
				if (!matchingRow) return false;
			}

			if (data !== undefined && workflowData !== undefined && store === this.dbStore) {
				await this.trackWrite(mode, async () => {
					const result = await tx.update(
						ExecutionData,
						{ executionId: ref.executionId },
						{ data: stringify(data), workflowData: this.toWorkflowSnapshot(workflowData) },
					);
					if ((result.affected ?? 0) === 0) throw new MissingExecutionDataError(ref);
				});
				return true;
			}

			const existing = await this.trackRead(mode, async () => await store.read(ref, tx));
			if (!existing) throw new MissingExecutionDataError(ref);

			await this.trackWrite(
				mode,
				async () =>
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
					),
			);

			return true;
		});
	}

	/**
	 * Narrow an {@link IExecutionResponse} payload to the subset of {@link UpdatableEntityColumns} that
	 * can be written directly to the `ExecutionEntity` row on update.
	 *
	 * Stripped fields fall into three categories:
	 * - **Identity / routing**: `id`, `workflowId` — never updated here.
	 * - **Stored elsewhere**: `data`, `workflowData` — persisted via the
	 *   configured {@link ExecutionDataStore} (DB or filesystem), not as columns
	 *   on the entity row.
	 * - **Immutable after creation**: `workflowVersionId`, `createdAt`,
	 *   `startedAt` — set once at insert time and never overwritten.
	 * - **Not persisted on the entity**: `customData` — handled separately.
	 */
	private pickUpdatableEntityColumns(
		execution: Partial<IExecutionResponse>,
	): UpdatableEntityColumns {
		const {
			id: _id,
			data: _data,
			workflowId: _workflowId,
			workflowData: _workflowData,
			workflowVersionId: _workflowVersionId,
			createdAt: _createdAt,
			startedAt: _startedAt,
			customData: _customData,
			...updatableColumns
		} = execution;
		return updatableColumns;
	}

	private buildEntityWhereCondition(
		executionId: string,
		conditions?: UpdateExecutionConditions,
	): FindOptionsWhere<ExecutionEntity> {
		if (conditions?.requireStatus && conditions?.requireNotCanceled) {
			throw new UnexpectedError('`requireStatus` and `requireNotCanceled` cannot be combined');
		}

		const where: FindOptionsWhere<ExecutionEntity> = { id: executionId };
		if (conditions?.requireStatus) where.status = conditions.requireStatus;
		// TODO(CAT-3214): `ExecutionEntity.finished` is deprecated and we should rely on statuses
		// only, but for now we still use it to filter out finished executions for parity with
		// ExecutionRepository.
		if (conditions?.requireNotFinished) where.finished = false;
		if (conditions?.requireNotCanceled) where.status = Not('canceled');
		return where;
	}

	private async trackRead<T>(mode: ExecutionDataStorageLocation, op: () => Promise<T>): Promise<T> {
		const start = Date.now();
		let success = false;
		let unreadableBundles = 0;
		try {
			const result = await op();
			success = result !== null && result !== undefined;
			if (!success) unreadableBundles = 1;
			return result;
		} catch (error) {
			if (error instanceof CorruptedExecutionDataError) unreadableBundles = 1;
			throw error;
		} finally {
			this.eventService.emit('execution-data-read', {
				mode,
				durationMs: Date.now() - start,
				success,
				unreadableBundles,
			});
		}
	}

	private async trackWrite(
		mode: ExecutionDataStorageLocation,
		op: () => Promise<void>,
	): Promise<void> {
		const start = Date.now();
		let success = false;
		try {
			await op();
			success = true;
		} finally {
			this.eventService.emit('execution-data-write', {
				mode,
				durationMs: Date.now() - start,
				success,
			});
		}
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

	private async assembleExecution(
		entity: ExecutionEntity,
		bundle: ExecutionDataBundle,
		options: { unflattenData?: boolean; includeAnnotation?: boolean },
	) {
		const { metadata, annotation, ...rest } = entity;
		const ref = { workflowId: entity.workflowId, executionId: entity.id };
		const data = await this.parseExecutionData(ref, bundle.data, options);
		const serializedAnnotation = this.serializeAnnotation(annotation);

		if (entity.status === 'success' && bundle.data === '[]') {
			this.errorReporter.error('Found successful execution where data is empty stringified array', {
				extra: { executionId: entity.id, workflowId: bundle.workflowData.id },
			});
		}

		return {
			...rest,
			data,
			workflowData: bundle.workflowData,
			workflowVersionId: bundle.workflowVersionId ?? null,
			customData: Object.fromEntries(metadata.map((m) => [m.key, m.value])),
			...(options.includeAnnotation && serializedAnnotation
				? { annotation: serializedAnnotation }
				: {}),
		};
	}

	private async parseExecutionData(
		ref: ExecutionRef,
		data: string,
		options: { unflattenData?: boolean },
	): Promise<IRunExecutionData | string | undefined> {
		if (!options.unflattenData) return data;

		try {
			const deserialized: unknown = await parseFlatted(data);
			if (!deserialized) return undefined;
			return migrateRunExecutionData(deserialized as IRunExecutionDataAll);
		} catch (error) {
			throw new CorruptedExecutionDataError(ref, error);
		}
	}

	private serializeAnnotation(annotation: ExecutionEntity['annotation']) {
		if (!annotation) return null;
		const { id, vote, tags } = annotation;
		return {
			id,
			vote,
			tags: tags?.map(({ id, name }) => ({ id, name })) ?? [],
		};
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
}
