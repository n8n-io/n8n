import { Logger, parseFlatted } from '@n8n/backend-common';
import { DatabaseConfig, ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type {
	CreateExecutionPayload,
	EntityManager,
	ExecutionDataStorageLocation,
	ExecutionDeletionCriteria,
	FindManyOptions,
	FindOptionsWhere,
	IExecutionBase,
	IExecutionFlattedDb,
	IExecutionResponse,
	UpdateExecutionConditions,
} from '@n8n/db';
import { ExecutionEntity, ExecutionRepository, In, Not } from '@n8n/db';
import { Service } from '@n8n/di';
import { stringify } from 'flatted';
import { BinaryDataService, ErrorReporter, StorageConfig } from 'n8n-core';
import type { ExecutionStatus, IRunExecutionData, IRunExecutionDataAll } from 'n8n-workflow';
import {
	createEmptyRunExecutionData,
	migrateRunExecutionData,
	UnexpectedError,
} from 'n8n-workflow';

import { CorruptedExecutionDataError } from './execution-data/corrupted-execution-data.error';
import { DbStore } from './execution-data/db-store';
import { FsStore } from './execution-data/fs-store';
import { MissingExecutionDataError } from './execution-data/missing-execution-data.error';
import type {
	BlobStorageLocation,
	BundleWorkflowSnapshot,
	ExecutionDataPayload,
	ExecutionDataStore,
	ExecutionRef,
	WorkflowSnapshot,
} from './execution-data/types';
import { sumBinaryDataBytes } from './sum-binary-data-bytes';
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
	private s3Store: ExecutionDataStore | undefined;

	private azStore: ExecutionDataStore | undefined;

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
		private readonly logger: Logger,
	) {}

	setS3Store(store: ExecutionDataStore) {
		this.s3Store = store;
	}

	setAzStore(store: ExecutionDataStore) {
		this.azStore = store;
	}

	/**
	 * Create an execution entity and persist its data to the configured storage.
	 * - In `db` mode, we write both entity and data to the DB in a transaction.
	 * - In `fs` mode, we write the entity to the DB and its data to the filesystem.
	 */
	async create(payload: CreateExecutionPayload) {
		const { data: rawData, workflowData, ...rest } = payload;
		const { connections, nodes, name, settings, id, nodeGroups } = workflowData;
		const workflowSnapshot: WorkflowSnapshot = {
			connections,
			nodes,
			name,
			settings,
			id,
			nodeGroups,
		};
		const storedAt = this.storageConfig.modeTag;
		const workflowVersionId = workflowData.versionId ?? null;
		const executionEntity = { ...rest, createdAt: new Date(), storedAt, workflowVersionId };

		try {
			return await this.executionRepository.manager.transaction(async (tx) => {
				const { identifiers } = await tx.insert(ExecutionEntity, executionEntity);
				const executionId = String(identifiers[0].id);
				const ref = { workflowId: id, executionId };

				const jsonSizeBytes = await this.trackWrite(storedAt, async () => {
					const bundle: ExecutionDataPayload = {
						data: stringify(rawData),
						workflowData: workflowSnapshot,
						workflowVersionId,
					};
					return await this.writeData(storedAt, ref, bundle, tx);
				});
				const binaryDataSizeBytes = sumBinaryDataBytes(rawData);
				await tx.update(
					ExecutionEntity,
					{ id: executionId },
					{ jsonSizeBytes, binaryDataSizeBytes },
				);

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
			select: ['id', 'workflowId', 'storedAt', 'workflowVersionId'],
		});

		if (!entity) return false;

		const ref = { workflowId: entity.workflowId, executionId };

		return await this.applyDataUpdate(
			ref,
			entity.storedAt,
			entity.workflowVersionId,
			execution,
			conditions,
		);
	}

	/**
	 * Find a single execution by id, dispatching data reads to the store matching its `storedAt`.
	 * - In `db` mode, we load entity, metadata, optional annotation, and data via `DbStore`.
	 * - In `fs` mode, we load entity, metadata, optional annotation from the DB, and data via `FsStore`.
	 *
	 * A missing data bundle is handled differently per store. In `db` mode the entity and its data
	 * share one database, so an absent data row means a known-corrupt record we report and skip
	 * (soft). In `fs` and `s3` modes the entity lives in the DB while its data lives out of band on
	 * disk or in object storage, so a missing bundle points at an out-of-band loss (deletion,
	 * unmounted volume, expired object) that a single-execution read should surface loudly rather
	 * than silently swallow (hard).
	 */
	async findSingleExecution(
		id: string,
		options?: {
			includeData: true;
			includeAnnotation?: boolean;
			unflattenData: true;
			where?: FindOptionsWhere<ExecutionEntity>;
			/** Above this byte size, return empty `data` + `dataTooLargeToDisplay` instead of loading it. `0`/omit loads unconditionally. */
			maxDataSizeBytes?: number;
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
			maxDataSizeBytes?: number;
		},
	): Promise<IExecutionBase | undefined>;
	async findSingleExecution(
		id: string,
		options?: {
			includeData?: boolean;
			includeAnnotation?: boolean;
			unflattenData?: boolean;
			where?: FindOptionsWhere<ExecutionEntity>;
			maxDataSizeBytes?: number;
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

		const max = this.maxDisplayDataSize(options);
		const ref = { workflowId: entity.workflowId, executionId: entity.id };

		// Over the limit: skip reading run data, loading only the workflow snapshot. Size is known
		// from `jsonSizeBytes`, or (legacy db rows where it's 0) queried cheaply from the DB. Blob
		// stores can't size without loading, so their legacy rows are measured after read instead.
		if (this.isKnownOversize(entity, max)) {
			return (await this.assembleSkippedExecution(entity, ref, options)) as FoundExecution;
		}
		if (max > 0 && entity.jsonSizeBytes === 0 && entity.storedAt === 'db') {
			const size = await this.dbStore.getDataByteSize(ref);
			if (size !== null && size > max) {
				return (await this.assembleSkippedExecution(entity, ref, options)) as FoundExecution;
			}
		}

		const start = Date.now();
		let success = false;
		let unreadableBundles = 0;
		try {
			const bundle = await this.readData(entity.storedAt, ref);
			if (!bundle) {
				unreadableBundles = 1;
				if (entity.storedAt === 'db') {
					this.executionRepository.reportInvalidExecutions([entity]);
					return undefined;
				}
				throw new MissingExecutionDataError(ref);
			}
			const assembled = await this.assembleReadExecution(entity, bundle, options, max);
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
			maxDataSizeBytes?: number;
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
			maxDataSizeBytes?: number;
		},
	): Promise<IExecutionBase[]>;
	async findMultipleExecutions(
		queryParams: FindManyOptions<ExecutionEntity>,
		options?: {
			unflattenData?: boolean;
			includeData?: boolean;
			maxDataSizeBytes?: number;
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

		const max = this.maxDisplayDataSize(options);

		// A narrowing `select` must still include the fields we route and read by: `storedAt` (else
		// every execution defaults to the fs store) and `id`/`workflowId` (else no bundle resolves).
		// With the guard active also `jsonSizeBytes` (to decide) and `workflowVersionId` (for the
		// skipped response). An undefined `select` loads all columns, so no action.
		if (queryParams.select) {
			const guardFields = max > 0 ? (['jsonSizeBytes', 'workflowVersionId'] as const) : [];
			if (Array.isArray(queryParams.select)) {
				for (const field of ['id', 'workflowId', 'storedAt', ...guardFields] as const) {
					if (!queryParams.select.includes(field)) queryParams.select.push(field);
				}
			} else {
				queryParams.select.id = true;
				queryParams.select.workflowId = true;
				queryParams.select.storedAt = true;
				for (const field of guardFields) queryParams.select[field] = true;
			}
		}

		const entities = await this.executionRepository.find(queryParams);
		if (entities.length === 0) return [];

		const assembledById = new Map<string, Awaited<ReturnType<typeof this.assembleExecution>>>();

		const entitiesToRead = await this.skipOversizedEntities(entities, max, assembledById);

		// Group by storage location and batch-fetch each group from its store.
		const entitiesByLocation = new Map<ExecutionDataStorageLocation, ExecutionEntity[]>();
		for (const entity of entitiesToRead) {
			const group = entitiesByLocation.get(entity.storedAt) ?? [];
			group.push(entity);
			entitiesByLocation.set(entity.storedAt, group);
		}
		await Promise.all(
			[...entitiesByLocation].map(async ([location, group]) => {
				const refs = group.map((e) => ({ workflowId: e.workflowId, executionId: e.id }));
				const start = Date.now();
				let success = false;
				let unreadableBundles = 0;
				try {
					const bundles =
						location === 'db'
							? await this.dbStore.readMany(refs)
							: await this.getStoreFor(location).readMany(refs);
					const missing = group.filter((e) => !bundles.has(e.id));
					if (missing.length > 0) this.executionRepository.reportInvalidExecutions(missing);
					unreadableBundles = missing.length;

					const settled = await Promise.allSettled(
						group.map(async (entity) => {
							const bundle = bundles.get(entity.id);
							if (!bundle) return;
							assembledById.set(
								entity.id,
								await this.assembleReadExecution(entity, bundle, options, max),
							);
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

	/** Find an execution scoped to shared workflows, with unflattened data and annotation (a display read). */
	async findIfSharedUnflatten(
		executionId: string,
		sharedWorkflowIds: string[],
		maxDataSizeBytes?: number,
	) {
		return await this.findSingleExecution(executionId, {
			where: { workflowId: In(sharedWorkflowIds) },
			includeData: true,
			unflattenData: true,
			includeAnnotation: true,
			maxDataSizeBytes,
		});
	}

	/** Find an execution scoped to the given workflows for the public API (a display read). */
	async getExecutionInWorkflowsForPublicApi(
		id: string,
		workflowIds: string[],
		includeData?: boolean,
		maxDataSizeBytes?: number,
	): Promise<IExecutionBase | undefined> {
		return await this.findSingleExecution(id, {
			where: { workflowId: In(workflowIds) },
			includeData,
			unflattenData: true,
			maxDataSizeBytes,
		});
	}

	/** Find executions scoped to the given workflows for the public API, with data per `storedAt`. */
	async getExecutionsForPublicApi(
		params: {
			limit: number;
			includeData?: boolean;
			lastId?: string;
			workflowIds?: string[];
			status?: ExecutionStatus;
			excludedExecutionsIds?: string[];
		},
		maxDataSizeBytes?: number,
	): Promise<IExecutionBase[]> {
		return await this.findMultipleExecutions(
			{
				select: [
					'id',
					'mode',
					'retryOf',
					'retrySuccessId',
					'startedAt',
					'stoppedAt',
					'workflowId',
					'waitTill',
					'finished',
					'status',
				],
				where: this.executionRepository.getFindExecutionsForPublicApiCondition(params),
				order: { id: 'DESC' },
				take: params.limit,
			},
			{ includeData: params.includeData, unflattenData: true, maxDataSizeBytes },
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

		await Promise.all([
			this.executionRepository.deleteByIds(targets.map((t) => t.executionId)),
			this.binaryDataService.deleteMany(targets.map((t) => ({ type: 'execution' as const, ...t }))),
			this.deleteFsData(targets.filter((t) => t.storedAt === 'fs')),
			this.deleteS3Data(targets.filter((t) => t.storedAt === 's3')),
			this.deleteAzData(targets.filter((t) => t.storedAt === 'az')),
		]);
	}

	async hardDeleteBy(criteria: ExecutionDeletionCriteria) {
		const refs = await this.executionRepository.deleteExecutionsByFilter(criteria);

		await this.deleteFsData(refs.filter((r) => r.storedAt === 'fs'));
		await this.deleteS3Data(refs.filter((r) => r.storedAt === 's3'));
		await this.deleteAzData(refs.filter((r) => r.storedAt === 'az'));
	}

	private async deleteFsData(refs: ExecutionRef[]) {
		if (refs.length === 0) return;

		await this.fsStore.delete(refs);
	}

	/**
	 * Delete S3-stored execution data. If the S3 store is unavailable, e.g. external
	 * storage was unconfigured after S3-stored executions were created, we skip data
	 * deletion rather than block entity deletion.
	 */
	private async deleteS3Data(refs: ExecutionRef[]) {
		if (refs.length === 0) return;

		if (!this.s3Store) {
			this.logger.warn('Skipped deleting S3 execution data - S3 store is not initialized', {
				executionIds: refs.map((r) => r.executionId),
			});
			return;
		}

		await this.s3Store.delete(refs);
	}

	private async deleteAzData(refs: ExecutionRef[]) {
		if (refs.length === 0) return;

		if (!this.azStore) {
			this.logger.warn('Skipped deleting Azure execution data - Azure store is not initialized', {
				executionIds: refs.map((r) => r.executionId),
			});
			return;
		}

		await this.azStore.delete(refs);
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
		mode: ExecutionDataStorageLocation,
		workflowVersionId: string | null,
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

			// Skip the read on a full overwrite. Safe only with a known version id, except in db mode:
			// the DB overwrite leaves that column untouched, whereas a blob write would clobber it with null.
			if (
				data !== undefined &&
				workflowData !== undefined &&
				(workflowVersionId !== null || mode === 'db')
			) {
				const binaryDataSizeBytes = sumBinaryDataBytes(data);
				const jsonSizeBytes = await this.trackWrite(mode, async () => {
					const bundle: ExecutionDataPayload = {
						data: stringify(data),
						workflowData: this.toWorkflowSnapshot(workflowData),
						workflowVersionId,
					};

					return mode === 'db'
						? await this.dbStore.overwrite(ref, bundle, tx)
						: await this.getStoreFor(mode).write(ref, bundle);
				});

				await tx.update(
					ExecutionEntity,
					{ id: ref.executionId },
					{ jsonSizeBytes, binaryDataSizeBytes },
				);
				return true;
			}

			// Read the existing bundle to merge the field the caller didn't supply (or to recover the
			// version id when the entity row doesn't have it).
			const existing = await this.trackRead(mode, async () => await this.readData(mode, ref, tx));
			if (!existing) throw new MissingExecutionDataError(ref);

			const jsonSizeBytes = await this.trackWrite(mode, async () => {
				const bundle: ExecutionDataPayload = {
					data: data !== undefined ? stringify(data) : existing.data,
					workflowData: workflowData
						? this.toWorkflowSnapshot(workflowData)
						: existing.workflowData,
					workflowVersionId: existing.workflowVersionId,
				};

				return await this.writeData(mode, ref, bundle, tx);
			});
			// Binary size is derived from the in-memory run data, so only recompute it when the
			// caller supplied `data`. A workflowData-only update leaves the column untouched (and
			// doesn't affect binary anyway), mirroring when `jsonSizeBytes` would have changed.
			const sizeColumns =
				data !== undefined
					? { jsonSizeBytes, binaryDataSizeBytes: sumBinaryDataBytes(data) }
					: { jsonSizeBytes };
			await tx.update(ExecutionEntity, { id: ref.executionId }, sizeColumns);

			return true;
		});
	}

	/**
	 * Narrow an {@link IExecutionResponse} payload to the subset of {@link UpdatableEntityColumns} that
	 * can be written directly to the `ExecutionEntity` row on update.
	 *
	 * Stripped fields fall into three categories:
	 * - **Identity / routing**: `id`, `workflowId` — never updated here.
	 * - **Stored elsewhere**: `data`, `workflowData` — persisted per the execution's
	 *   storage location (DB rows or a blob store), not as columns on the entity row.
	 * - **Immutable after creation**: `workflowVersionId`, `createdAt`,
	 *   `startedAt` — set once at insert time and never overwritten.
	 * - **Not persisted on the entity**: `customData` — handled separately.
	 * - **Computed locally**: `jsonSizeBytes` and `binaryDataSizeBytes` — derived from
	 *   the persisted bundle / run data, never trusted from the caller.
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
			jsonSizeBytes: _jsonSizeBytes,
			binaryDataSizeBytes: _binaryDataSizeBytes,
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

	/**
	 * Time and emit a metric for a data write. `op` serializes and writes the bundle — both counted
	 * in the duration — and returns the written byte size, which rides the event (`0` on failure).
	 */
	private async trackWrite(
		mode: ExecutionDataStorageLocation,
		op: () => Promise<number>,
	): Promise<number> {
		const start = Date.now();
		let success = false;
		let jsonSizeBytes = 0;
		try {
			jsonSizeBytes = await op();
			success = true;
			return jsonSizeBytes;
		} finally {
			this.eventService.emit('execution-data-write', {
				mode,
				durationMs: Date.now() - start,
				success,
				jsonSizeBytes,
			});
		}
	}

	/** Write execution data to `mode` storage. In `db` mode, the write participates in `tx`. */
	private async writeData(
		mode: ExecutionDataStorageLocation,
		ref: ExecutionRef,
		payload: ExecutionDataPayload,
		tx: EntityManager,
	): Promise<number> {
		return mode === 'db'
			? await this.dbStore.write(ref, payload, tx)
			: await this.getStoreFor(mode).write(ref, payload);
	}

	/** Read execution data from `mode` storage. In `db` mode, the read participates in `tx` when given. */
	private async readData(
		mode: ExecutionDataStorageLocation,
		ref: ExecutionRef,
		tx?: EntityManager,
	): Promise<ExecutionDataPayload | null> {
		if (mode !== 'db') return await this.getStoreFor(mode).read(ref);

		return tx ? await this.dbStore.read(ref, tx) : await this.dbStore.read(ref);
	}

	private getStoreFor(location: BlobStorageLocation): ExecutionDataStore {
		switch (location) {
			case 'fs':
				return this.fsStore;
			case 's3':
				if (!this.s3Store) {
					throw new UnexpectedError(
						'Execution data is stored on S3 but the S3 store is not initialized. Check that S3 is configured.',
					);
				}
				return this.s3Store;
			case 'az':
				if (!this.azStore) {
					throw new UnexpectedError(
						'Execution data is stored on Azure Blob Storage but the Azure store is not initialized. Check that Azure is configured.',
					);
				}
				return this.azStore;
		}
		const _exhaustive: never = location;
		throw new Error(`Unknown storage location: ${String(_exhaustive)}`);
	}

	private toWorkflowSnapshot(
		workflowData: NonNullable<IExecutionResponse['workflowData']>,
	): WorkflowSnapshot {
		const { id, name, nodes, connections, settings, nodeGroups } = workflowData;
		return { id, name, nodes, connections, settings, nodeGroups };
	}

	private async assembleExecution(
		entity: ExecutionEntity,
		bundle: ExecutionDataPayload,
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

	/**
	 * Build a display response for an oversized execution: empty `data` + `dataTooLargeToDisplay`,
	 * without parsing the run data (`jsonSizeBytes` keeps the real size). Uses the workflow snapshot
	 * when available, else a stub from the entity.
	 */
	/** The byte size above which display reads skip run data, or `0` when the guard doesn't apply. */
	private maxDisplayDataSize(options: { unflattenData?: boolean; maxDataSizeBytes?: number }) {
		return options.unflattenData ? (options.maxDataSizeBytes ?? 0) : 0;
	}

	/** Whether the entity's recorded data size is known and exceeds `max` (so the read can be skipped). */
	private isKnownOversize(entity: ExecutionEntity, max: number) {
		return max > 0 && entity.jsonSizeBytes > 0 && entity.jsonSizeBytes > max;
	}

	/**
	 * Assemble an oversized execution, loading only the workflow snapshot (never the run data).
	 * Only the DB keeps the snapshot separately from the run data; for blob-stored executions
	 * we fall back to a stub built from the entity.
	 */
	private async assembleSkippedExecution(
		entity: ExecutionEntity,
		ref: ExecutionRef,
		options: { includeAnnotation?: boolean },
	) {
		const snapshot =
			entity.storedAt === 'db'
				? ((await this.dbStore.readWorkflowData(ref)) ?? undefined)
				: undefined;
		return this.assembleOversizedExecution(
			entity,
			{ includeAnnotation: options.includeAnnotation },
			snapshot,
		);
	}

	private assembleOversizedExecution(
		entity: ExecutionEntity,
		options: { includeAnnotation?: boolean },
		snapshot?: BundleWorkflowSnapshot,
	) {
		const { metadata, annotation, ...rest } = entity;
		const serializedAnnotation = this.serializeAnnotation(annotation);
		const workflowData = snapshot?.workflowData ?? {
			id: entity.workflowId,
			name: '',
			nodes: [],
			connections: {},
			settings: {},
		};

		return {
			...rest,
			data: createEmptyRunExecutionData(),
			workflowData,
			workflowVersionId: snapshot?.workflowVersionId ?? entity.workflowVersionId ?? null,
			customData: Object.fromEntries(metadata.map((m) => [m.key, m.value])),
			dataTooLargeToDisplay: true,
			...(options.includeAnnotation && serializedAnnotation
				? { annotation: serializedAnnotation }
				: {}),
		};
	}

	/**
	 * Partition entities by known data size: oversized ones are assembled here (run-data read
	 * skipped, only the workflow snapshot loaded) into `assembledById`; the rest are returned to
	 * be read normally.
	 */
	private async skipOversizedEntities(
		entities: ExecutionEntity[],
		max: number,
		assembledById: Map<string, Awaited<ReturnType<typeof this.assembleExecution>>>,
	) {
		if (max <= 0) return entities;

		const entitiesToRead: ExecutionEntity[] = [];
		const oversized: ExecutionEntity[] = [];
		for (const entity of entities) {
			if (this.isKnownOversize(entity, max)) oversized.push(entity);
			else entitiesToRead.push(entity);
		}
		await Promise.all(
			oversized.map(async (entity) => {
				const ref = { workflowId: entity.workflowId, executionId: entity.id };
				assembledById.set(entity.id, await this.assembleSkippedExecution(entity, ref, {}));
			}),
		);
		return entitiesToRead;
	}

	/**
	 * Assemble a freshly-read bundle, refusing it (empty data + flag) when the size was unknown
	 * up front (`jsonSizeBytes === 0`) but the raw bytes exceed `max`.
	 */
	private async assembleReadExecution(
		entity: ExecutionEntity,
		bundle: ExecutionDataPayload,
		options: { unflattenData?: boolean; includeAnnotation?: boolean },
		max: number,
	) {
		if (max > 0 && entity.jsonSizeBytes === 0 && Buffer.byteLength(bundle.data, 'utf8') > max) {
			return this.assembleOversizedExecution(
				entity,
				{ includeAnnotation: options.includeAnnotation },
				{ workflowData: bundle.workflowData, workflowVersionId: bundle.workflowVersionId },
			);
		}
		return await this.assembleExecution(entity, bundle, options);
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
