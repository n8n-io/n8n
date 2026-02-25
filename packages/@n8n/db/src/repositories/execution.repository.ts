import { Logger, parseFlatted } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type {
	FindManyOptions,
	FindOneOptions,
	FindOperator,
	FindOptionsWhere,
	SelectQueryBuilder,
} from '@n8n/typeorm';
import {
	Brackets,
	DataSource,
	In,
	IsNull,
	LessThan,
	LessThanOrEqual,
	MoreThanOrEqual,
	Not,
	Repository,
	And,
} from '@n8n/typeorm';
import { DateUtils } from '@n8n/typeorm/util/DateUtils';
import { stringify } from 'flatted';
import pick from 'lodash/pick';
import { BinaryDataService, ErrorReporter } from 'n8n-core';
import type {
	AnnotationVote,
	ExecutionStatus,
	ExecutionSummary,
	IRunExecutionData,
	IRunExecutionDataAll,
} from 'n8n-workflow';
import {
	createEmptyRunExecutionData,
	ManualExecutionCancelledError,
	migrateRunExecutionData,
	UnexpectedError,
} from 'n8n-workflow';

import {
	AnnotationTagEntity,
	AnnotationTagMapping,
	ExecutionAnnotation,
	ExecutionData,
	ExecutionDataStorageLocation,
	ExecutionEntity,
	ExecutionMetadata,
	SharedWorkflow,
	WorkflowEntity,
} from '../entities';
import type {
	ExecutionSummaries,
	IExecutionBase,
	IExecutionFlattedDb,
	IExecutionResponse,
} from '../entities/types-db';
import { separate } from '../utils/separate';

class PostgresLiveRowsRetrievalError extends UnexpectedError {
	constructor(rows: unknown) {
		super('Failed to retrieve live execution rows in Postgres', { extra: { rows } });
	}
}

export interface UpdateExecutionConditions {
	requireStatus?: ExecutionStatus;
	requireNotFinished?: boolean;
	requireNotCanceled?: boolean;
}

export interface IGetExecutionsQueryFilter {
	id?: FindOperator<string> | string;
	finished?: boolean;
	mode?: string;
	retryOf?: string;
	retrySuccessId?: string;
	status?: ExecutionStatus[];
	workflowId?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	waitTill?: FindOperator<any> | boolean;
	metadata?: Array<{ key: string; value: string; exactMatch?: boolean }>;
	startedAfter?: string;
	startedBefore?: string;
}

export type ExecutionDeletionCriteria = {
	filters: IGetExecutionsQueryFilter | undefined;
	accessibleWorkflowIds: string[];
	deleteConditions: {
		deleteBefore?: Date;
		ids?: string[];
	};
};

function parseFiltersToQueryBuilder(
	qb: SelectQueryBuilder<ExecutionEntity>,
	filters?: IGetExecutionsQueryFilter,
) {
	if (filters?.status) {
		qb.andWhere('execution.status IN (:...workflowStatus)', {
			workflowStatus: filters.status,
		});
	}
	if (filters?.finished) {
		qb.andWhere({ finished: filters.finished });
	}
	if (filters?.metadata) {
		qb.leftJoin(ExecutionMetadata, 'md', 'md.executionId = execution.id');
		for (const md of filters.metadata) {
			if (md.exactMatch) {
				qb.andWhere('md.key = :key AND md.value = :value', md);
			} else {
				qb.andWhere('md.key = :key AND LOWER(md.value) LIKE LOWER(:value)', md);
			}
		}
	}
	if (filters?.startedAfter) {
		qb.andWhere({
			startedAt: MoreThanOrEqual(
				DateUtils.mixedDateToUtcDatetimeString(new Date(filters.startedAfter)),
			),
		});
	}
	if (filters?.startedBefore) {
		qb.andWhere({
			startedAt: LessThanOrEqual(
				DateUtils.mixedDateToUtcDatetimeString(new Date(filters.startedBefore)),
			),
		});
	}
	if (filters?.workflowId) {
		qb.andWhere({
			workflowId: filters.workflowId,
		});
	}
}

const lessThanOrEqual = (date: string): unknown => {
	return LessThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(new Date(date)));
};

const moreThanOrEqual = (date: string): unknown => {
	return MoreThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(new Date(date)));
};

// This is the max number of elements in an IN-clause.
// It's a conservative value, as some databases indicate limits around 1000.
const MAX_UPDATE_BATCH_SIZE = 900;

@Service()
export class ExecutionRepository extends Repository<ExecutionEntity> {
	private hardDeletionBatchSize = 100;

	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly binaryDataService: BinaryDataService,
	) {
		super(ExecutionEntity, dataSource.manager);
	}

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
		if (options?.includeData) {
			queryParams.relations ??= [];

			if (Array.isArray(queryParams.relations)) {
				queryParams.relations.push('executionData', 'metadata');
			} else {
				queryParams.relations.executionData = true;
				queryParams.relations.metadata = true;
			}
		}

		const executions = await this.find(queryParams);

		const [valid, invalid] = separate(executions, (e) => e.executionData !== null);
		this.reportInvalidExecutions(invalid);

		if (!options?.includeData) {
			// No data to include, so we exclude it and return early.
			return executions.map((execution) => {
				const { executionData, ...rest } = execution;
				return rest;
			}) as IExecutionFlattedDb[] | IExecutionResponse[] | IExecutionBase[];
		}

		return (await Promise.all(
			valid.map(async (execution) => {
				const { executionData, metadata, ...rest } = execution;
				const data = await this.handleExecutionRunData(executionData.data, options);
				return {
					...rest,
					data,
					workflowData: executionData.workflowData,
					customData: Object.fromEntries(metadata.map((m) => [m.key, m.value])),
				};
			}),
		)) as IExecutionFlattedDb[] | IExecutionResponse[] | IExecutionBase[];
	}

	reportInvalidExecutions(executions: ExecutionEntity[]) {
		if (executions.length === 0) return;

		this.errorReporter.error(
			new UnexpectedError('Found executions without executionData', {
				extra: {
					executionIds: executions.map(({ id }) => id),
				},
			}),
		);
	}

	private serializeAnnotation(annotation: ExecutionEntity['annotation']) {
		if (!annotation) return null;

		const { id, vote, tags } = annotation;
		return {
			id,
			vote,
			tags: tags?.map((tag) => pick(tag, ['id', 'name'])) ?? [],
		};
	}

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
	): Promise<IExecutionFlattedDb | IExecutionResponse | IExecutionBase | undefined> {
		const findOptions: FindOneOptions<ExecutionEntity> = {
			where: {
				id,
				...options?.where,
			},
		};
		if (options?.includeData) {
			findOptions.relations = { executionData: true, metadata: true };
		}

		if (options?.includeAnnotation) {
			findOptions.relations = {
				...findOptions.relations,
				annotation: {
					tags: true,
				},
			};
		}

		const execution = await this.findOne(findOptions);

		if (!execution) {
			return undefined;
		}

		const { executionData, metadata, annotation, ...rest } = execution;
		const serializedAnnotation = this.serializeAnnotation(annotation);

		if (execution.status === 'success' && executionData?.data === '[]') {
			this.errorReporter.error('Found successful execution where data is empty stringified array', {
				extra: {
					executionId: execution.id,
					workflowId: executionData?.workflowData.id,
				},
			});
		}

		if (!options?.includeData) {
			// Not including run data, so return early.
			const { executionData, ...rest } = execution;
			return {
				...rest,
				...(options?.includeAnnotation &&
					serializedAnnotation && { annotation: serializedAnnotation }),
			} as IExecutionFlattedDb | IExecutionResponse | IExecutionBase;
		}

		// Include the run data.
		const data = await this.handleExecutionRunData(executionData.data, options);
		return {
			...rest,
			data,
			workflowData: executionData.workflowData,
			customData: Object.fromEntries(metadata.map((m) => [m.key, m.value])),
			...(options?.includeAnnotation &&
				serializedAnnotation && { annotation: serializedAnnotation }),
		} as IExecutionFlattedDb | IExecutionResponse | IExecutionBase;
	}

	async markAsCrashed(executionIds: string | string[]) {
		if (!Array.isArray(executionIds)) executionIds = [executionIds];

		let processed: number = 0;
		while (processed < executionIds.length) {
			// NOTE: if a slice goes past the end of the array, it just returns up til the end.
			const batch: string[] = executionIds.slice(processed, processed + MAX_UPDATE_BATCH_SIZE);
			await this.update(
				{ id: In(batch) },
				{
					status: 'crashed',
					stoppedAt: new Date(),
				},
			);
			this.logger.info('Marked executions as `crashed`', { executionIds });
			processed += batch.length;
		}
	}

	async setRunning(executionId: string) {
		const startedAt = new Date();

		await this.update({ id: executionId }, { status: 'running', startedAt });

		return startedAt;
	}

	/**
	 * Update an existing execution in the database.
	 *
	 * @param executionId - The ID of the execution to update
	 * @param execution - Partial execution data to update
	 * @param conditions - Optional conditions that must be met for the update to proceed.
	 *   `requireStatus`: only update if execution has this exact status.
	 *   `requireNotFinished`: only update if `finished = false`.
	 *   `requireNotCanceled`: only update if `status != 'canceled'`.
	 *   Note: `requireStatus` and `requireNotCanceled` both constrain the `status` column,
	 *   so combining them is not supported.
	 * @returns true if update succeeded, false if no rows matched (execution not found or conditions not met)
	 */
	async updateExistingExecution(
		executionId: string,
		execution: Partial<IExecutionResponse>,
		conditions?: UpdateExecutionConditions,
	): Promise<boolean> {
		const {
			id,
			data,
			workflowId,
			workflowData,
			createdAt, // must never change
			startedAt, // must never change
			customData,
			...executionInformation
		} = execution;

		const executionData: Partial<ExecutionData> = {};

		if (workflowData) executionData.workflowData = workflowData;
		if (data) executionData.data = stringify(data);

		return await this.manager.transaction(async (tx) => {
			if (Object.keys(executionInformation).length > 0) {
				const whereCondition: FindOptionsWhere<ExecutionEntity> = { id: executionId };
				if (conditions?.requireStatus) whereCondition.status = conditions.requireStatus;
				if (conditions?.requireNotFinished) whereCondition.finished = false;
				if (conditions?.requireNotCanceled)
					whereCondition.status = Not('canceled') as FindOperator<ExecutionStatus>;

				const result = await tx.update(ExecutionEntity, whereCondition, executionInformation);
				const executionTableAffectedRows = result.affected ?? 0;

				// If conditions were set and the update failed, abort the
				// transaction early and return false.
				if (executionTableAffectedRows === 0) {
					return false;
				}
			}

			if (Object.keys(executionData).length > 0) {
				await tx.update(ExecutionData, { executionId }, executionData);
			}

			// Updates succeeded
			return true;
		});
	}

	async deleteExecutionsByFilter({
		filters,
		accessibleWorkflowIds,
		deleteConditions,
	}: ExecutionDeletionCriteria): Promise<
		Array<{ executionId: string; workflowId: string; storedAt: ExecutionDataStorageLocation }>
	> {
		if (!deleteConditions?.deleteBefore && !deleteConditions?.ids) {
			throw new UnexpectedError(
				'Either "deleteBefore" or "ids" must be present in the request body',
			);
		}

		const query = this.createQueryBuilder('execution')
			.select(['execution.id', 'execution.workflowId', 'execution.storedAt'])
			.andWhere('execution.workflowId IN (:...accessibleWorkflowIds)', { accessibleWorkflowIds });

		if (deleteConditions.deleteBefore) {
			// delete executions by date, if user may access the underlying workflows
			query.andWhere('execution.startedAt <= :deleteBefore', {
				deleteBefore: deleteConditions.deleteBefore,
			});
			// Filters are only used when filtering by date
			parseFiltersToQueryBuilder(query, filters);
		} else if (deleteConditions.ids) {
			// delete executions by IDs, if user may access the underlying workflows
			query.andWhere('execution.id IN (:...executionIds)', { executionIds: deleteConditions.ids });
		}

		const executions = await query.getMany();

		if (!executions.length) {
			if (deleteConditions.ids) {
				this.logger.error('Failed to delete an execution due to insufficient permissions', {
					executionIds: deleteConditions.ids,
				});
			}
			return [];
		}

		const refs = executions.map(({ id, workflowId, storedAt }) => ({
			executionId: id,
			workflowId,
			storedAt,
		}));

		const toDelete = [...refs];
		do {
			// Delete in batches to avoid "SQLITE_ERROR: Expression tree is too large (maximum depth 1000)" error
			const batch = toDelete.splice(0, this.hardDeletionBatchSize);
			await Promise.all([
				this.delete(batch.map(({ executionId }) => executionId)),
				this.binaryDataService.deleteMany(batch.map((b) => ({ type: 'execution' as const, ...b }))),
			]);
		} while (toDelete.length > 0);

		return refs;
	}

	async getIdsSince(date: Date) {
		return await this.find({
			select: ['id'],
			where: {
				startedAt: MoreThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(date)),
			},
		}).then((executions) => executions.map(({ id }) => id));
	}

	async softDeletePrunableExecutions() {
		const { pruneDataMaxAge, pruneDataMaxCount } = this.globalConfig.executions;

		// Sub-query to exclude executions having annotations
		const annotatedExecutionsSubQuery = this.manager
			.createQueryBuilder()
			.subQuery()
			.select('annotation.executionId')
			.from(ExecutionAnnotation, 'annotation');

		// Find ids of all executions that were stopped longer that pruneDataMaxAge ago
		const date = new Date();
		date.setHours(date.getHours() - pruneDataMaxAge);

		const toPrune: Array<FindOptionsWhere<ExecutionEntity>> = [
			// date reformatting needed - see https://github.com/typeorm/typeorm/issues/2286
			{ stoppedAt: LessThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(date)) },
		];

		if (pruneDataMaxCount > 0) {
			const executions = await this.createQueryBuilder('execution')
				.select('execution.id')
				.where('execution.id NOT IN ' + annotatedExecutionsSubQuery.getQuery())
				.skip(pruneDataMaxCount)
				.take(1)
				.orderBy('execution.id', 'DESC')
				.getMany();

			if (executions[0]) {
				toPrune.push({ id: LessThanOrEqual(executions[0].id) });
			}
		}

		const [timeBasedWhere, countBasedWhere] = toPrune;

		return await this.createQueryBuilder()
			.update(ExecutionEntity)
			.set({ deletedAt: new Date() })
			.where({
				deletedAt: IsNull(),
				// Only mark executions as deleted if they are in an end state
				status: Not(In(['new', 'running', 'waiting'])),
			})
			// Only mark executions as deleted if they are not annotated
			.andWhere('id NOT IN ' + annotatedExecutionsSubQuery.getQuery())
			.andWhere(
				new Brackets((qb) =>
					countBasedWhere
						? qb.where(timeBasedWhere).orWhere(countBasedWhere)
						: qb.where(timeBasedWhere),
				),
			)
			.execute();
	}

	async findSoftDeletedExecutions() {
		const date = new Date();
		date.setHours(date.getHours() - this.globalConfig.executions.pruneDataHardDeleteBuffer);

		const results = await this.find({
			select: ['workflowId', 'id', 'storedAt'],
			where: {
				deletedAt: LessThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(date)),
			},
			take: this.hardDeletionBatchSize,

			/**
			 * @important This ensures soft-deleted executions are included,
			 * else `@DeleteDateColumn()` at `deletedAt` will exclude them.
			 */
			withDeleted: true,
		});

		return results.map(({ id: executionId, workflowId, storedAt }) => ({
			workflowId,
			executionId,
			storedAt,
		}));
	}

	async deleteByIds(executionIds: string[]) {
		return await this.delete({ id: In(executionIds) });
	}

	async getWaitingExecutions() {
		// Find all the executions which should be triggered in the next 70 seconds
		const waitTill = new Date(Date.now() + 70000);
		const where: FindOptionsWhere<ExecutionEntity> = {
			waitTill: LessThanOrEqual(waitTill),
			status: Not('crashed'),
		};

		const dbType = this.globalConfig.database.type;
		if (dbType === 'sqlite') {
			// This is needed because of issue in TypeORM <> SQLite:
			// https://github.com/typeorm/typeorm/issues/2286
			where.waitTill = LessThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(waitTill));
		}

		return await this.findMultipleExecutions({
			select: ['id', 'waitTill'],
			where,
			order: {
				waitTill: 'ASC',
			},
		});
	}

	async getExecutionsCountForPublicApi(params: {
		limit: number;
		lastId?: string;
		workflowIds?: string[];
		status?: ExecutionStatus;
		excludedExecutionsIds?: string[];
	}): Promise<number> {
		const executionsCount = await this.count({
			where: this.getFindExecutionsForPublicApiCondition(params),
			take: params.limit,
		});

		return executionsCount;
	}

	private getStatusCondition(status?: ExecutionStatus) {
		const condition: Pick<FindOptionsWhere<IExecutionFlattedDb>, 'status'> = {};

		if (status === 'success') {
			condition.status = 'success';
		} else if (status === 'waiting') {
			condition.status = 'waiting';
		} else if (status === 'error') {
			condition.status = In(['error', 'crashed']);
		} else if (status === 'canceled') {
			condition.status = 'canceled';
		} else if (status === 'running') {
			condition.status = 'running';
		}

		return condition;
	}

	private getIdCondition(params: { lastId?: string; excludedExecutionsIds?: string[] }) {
		const condition: Pick<FindOptionsWhere<IExecutionFlattedDb>, 'id'> = {};

		if (params.lastId && params.excludedExecutionsIds?.length) {
			condition.id = And(LessThan(params.lastId), Not(In(params.excludedExecutionsIds)));
		} else if (params.lastId) {
			condition.id = LessThan(params.lastId);
		} else if (params.excludedExecutionsIds?.length) {
			condition.id = Not(In(params.excludedExecutionsIds));
		}

		return condition;
	}

	private getFindExecutionsForPublicApiCondition(params: {
		lastId?: string;
		workflowIds?: string[];
		status?: ExecutionStatus;
		excludedExecutionsIds?: string[];
	}) {
		const where: FindOptionsWhere<IExecutionFlattedDb> = {
			...this.getIdCondition({
				lastId: params.lastId,
				excludedExecutionsIds: params.excludedExecutionsIds,
			}),
			...this.getStatusCondition(params.status),
			...(params.workflowIds && { workflowId: In(params.workflowIds) }),
		};

		return where;
	}

	async getExecutionsForPublicApi(params: {
		limit: number;
		includeData?: boolean;
		lastId?: string;
		workflowIds?: string[];
		status?: ExecutionStatus;
		excludedExecutionsIds?: string[];
	}): Promise<IExecutionBase[]> {
		const where = this.getFindExecutionsForPublicApiCondition(params);

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
				where,
				order: { id: 'DESC' },
				take: params.limit,
			},
			{
				includeData: params.includeData,
				unflattenData: true,
			},
		);
	}

	async getExecutionInWorkflowsForPublicApi(
		id: string,
		workflowIds: string[],
		includeData?: boolean,
	): Promise<IExecutionBase | undefined> {
		return await this.findSingleExecution(id, {
			where: {
				workflowId: In(workflowIds),
			},
			includeData,
			unflattenData: true,
		});
	}

	async findWithUnflattenedData(executionId: string, accessibleWorkflowIds: string[]) {
		return await this.findSingleExecution(executionId, {
			where: {
				workflowId: In(accessibleWorkflowIds),
			},
			includeData: true,
			unflattenData: true,
			includeAnnotation: true,
		});
	}

	async findIfShared(executionId: string, sharedWorkflowIds: string[]) {
		return await this.findSingleExecution(executionId, {
			where: {
				workflowId: In(sharedWorkflowIds),
			},
			includeData: true,
			unflattenData: false,
			includeAnnotation: true,
		});
	}

	async findIfAccessible(executionId: string, accessibleWorkflowIds: string[]) {
		return await this.findSingleExecution(executionId, {
			where: { workflowId: In(accessibleWorkflowIds) },
		});
	}

	async stopBeforeRun(execution: IExecutionResponse) {
		execution.status = 'canceled';
		execution.stoppedAt = new Date();

		await this.update(
			{ id: execution.id },
			{ status: execution.status, stoppedAt: execution.stoppedAt },
		);

		return execution;
	}

	async stopDuringRun(execution: IExecutionResponse) {
		const error = new ManualExecutionCancelledError(execution.id);

		execution.data = execution.data || createEmptyRunExecutionData();

		execution.data.resultData.error = {
			...error,
			message: error.message,
			stack: error.stack,
		};

		execution.stoppedAt = new Date();
		execution.waitTill = null;
		execution.status = 'canceled';

		await this.updateExistingExecution(execution.id, execution);

		return execution;
	}

	async cancelMany(executionIds: string[]) {
		await this.update({ id: In(executionIds) }, { status: 'canceled', stoppedAt: new Date() });
	}

	// ----------------------------------
	//            new API
	// ----------------------------------

	/**
	 * Fields to include in the summary of an execution when querying for many.
	 */
	private summaryFields = {
		id: true,
		workflowId: true,
		mode: true,
		retryOf: true,
		status: true,
		createdAt: true,
		startedAt: true,
		stoppedAt: true,
	};

	private annotationFields = {
		id: true,
		vote: true,
	};

	/**
	 * This function reduces duplicate rows in the raw result set of the query builder from *toQueryBuilderWithAnnotations*
	 * by merging the tags of the same execution annotation.
	 */
	private reduceExecutionsWithAnnotations(
		rawExecutionsWithTags: Array<
			ExecutionSummary & {
				annotation_id: number;
				annotation_vote: AnnotationVote;
				annotation_tags_id: string;
				annotation_tags_name: string;
			}
		>,
	) {
		const summariesById = new Map<string, ExecutionSummary>();

		for (const {
			annotation_id: _,
			annotation_vote: vote,
			annotation_tags_id: tagId,
			annotation_tags_name: tagName,
			...row
		} of rawExecutionsWithTags) {
			let execution = summariesById.get(row.id);
			if (!execution) {
				execution = {
					...row,
					annotation: {
						vote,
						tags: tagId ? [{ id: tagId, name: tagName }] : [],
					},
				};
				summariesById.set(row.id, execution);
			} else if (tagId) {
				execution.annotation = execution.annotation ?? {
					vote,
					tags: [] as Array<{ id: string; name: string }>,
				};
				execution.annotation.tags.push({ id: tagId, name: tagName });
			}
		}

		return [...summariesById.values()];
	}

	async findManyByRangeQuery(query: ExecutionSummaries.RangeQuery): Promise<ExecutionSummary[]> {
		if (query?.accessibleWorkflowIds?.length === 0) {
			throw new UnexpectedError('Expected accessible workflow IDs');
		}

		// Due to performance reasons, we use custom query builder with raw SQL.
		// IMPORTANT: it produces duplicate rows for executions with multiple tags, which we need to reduce manually
		const qb = this.toQueryBuilderWithAnnotations(query);

		const rawExecutionsWithTags: Array<
			ExecutionSummary & {
				annotation_id: number;
				annotation_vote: AnnotationVote;
				annotation_tags_id: string;
				annotation_tags_name: string;
			}
		> = await qb.getRawMany();

		const executions = this.reduceExecutionsWithAnnotations(rawExecutionsWithTags);

		return executions.map((execution) => this.toSummary(execution));
	}

	// @tech_debt: These transformations should not be needed
	private toSummary(execution: {
		id: number | string;
		createdAt?: Date | string;
		startedAt: Date | string | null;
		stoppedAt?: Date | string;
		waitTill?: Date | string | null;
	}): ExecutionSummary {
		execution.id = execution.id.toString();

		const normalizeDateString = (date: string) => {
			if (date.includes(' ')) return date.replace(' ', 'T') + 'Z';
			return date;
		};

		if (execution.createdAt) {
			execution.createdAt =
				execution.createdAt instanceof Date
					? execution.createdAt.toISOString()
					: normalizeDateString(execution.createdAt);
		}

		if (execution.startedAt) {
			execution.startedAt =
				execution.startedAt instanceof Date
					? execution.startedAt.toISOString()
					: normalizeDateString(execution.startedAt);
		}

		if (execution.waitTill) {
			execution.waitTill =
				execution.waitTill instanceof Date
					? execution.waitTill.toISOString()
					: normalizeDateString(execution.waitTill);
		}

		if (execution.stoppedAt) {
			execution.stoppedAt =
				execution.stoppedAt instanceof Date
					? execution.stoppedAt.toISOString()
					: normalizeDateString(execution.stoppedAt);
		}

		return execution as ExecutionSummary;
	}

	async fetchCount(query: ExecutionSummaries.CountQuery) {
		return await this.toQueryBuilder(query).getCount();
	}

	async getLiveExecutionRowsOnPostgres() {
		const tableName = `${this.globalConfig.database.tablePrefix}execution_entity`;

		const pgSql = `SELECT n_live_tup as result FROM pg_stat_all_tables WHERE relname = '${tableName}' and schemaname = '${this.globalConfig.database.postgresdb.schema}';`;

		try {
			const rows = (await this.query(pgSql)) as Array<{ result: string }>;

			if (rows.length !== 1) throw new PostgresLiveRowsRetrievalError(rows);

			const [row] = rows;

			return parseInt(row.result, 10);
		} catch (error) {
			if (error instanceof Error) this.logger.error(error.message, { error });

			return -1;
		}
	}

	private toQueryBuilder(query: ExecutionSummaries.Query) {
		const {
			accessibleWorkflowIds,
			status,
			finished,
			workflowId,
			startedBefore,
			startedAfter,
			metadata,
			annotationTags,
			vote,
			projectId,
		} = query;

		const fields = Object.keys(this.summaryFields)
			.concat(['waitTill', 'retrySuccessId'])
			.map((key) => `execution.${key} AS "${key}"`)
			.concat('workflow.name AS "workflowName"');

		const qb = this.createQueryBuilder('execution')
			.select(fields)
			.innerJoin('execution.workflow', 'workflow')
			.where('execution.workflowId IN (:...accessibleWorkflowIds)', { accessibleWorkflowIds });

		if (query.kind === 'range') {
			const { limit, firstId, lastId } = query.range;

			qb.limit(limit);

			if (firstId) qb.andWhere('execution.id > :firstId', { firstId });
			if (lastId) qb.andWhere('execution.id < :lastId', { lastId });

			if (query.order?.startedAt === 'DESC') {
				qb.orderBy({ 'COALESCE(execution.startedAt, execution.createdAt)': 'DESC' });
			} else if (query.order?.top) {
				qb.orderBy(`(CASE WHEN execution.status = '${query.order.top}' THEN 0 ELSE 1 END)`);
			} else {
				qb.orderBy({ 'execution.id': 'DESC' });
			}
		}

		if (status) qb.andWhere('execution.status IN (:...status)', { status });
		if (finished) qb.andWhere({ finished });
		if (workflowId) qb.andWhere({ workflowId });
		if (startedBefore) qb.andWhere({ startedAt: lessThanOrEqual(startedBefore) });
		if (startedAfter) qb.andWhere({ startedAt: moreThanOrEqual(startedAfter) });

		if (metadata?.length === 1) {
			const [{ key, value, exactMatch }] = metadata;

			const executionIdMatch = 'md.executionId = execution.id';
			const keyMatch = exactMatch ? 'md.key = :key' : 'LOWER(md.key) = LOWER(:key)';
			const valueMatch = exactMatch ? 'md.value = :value' : 'LOWER(md.value) LIKE LOWER(:value)';

			const matches = [executionIdMatch, keyMatch, valueMatch];

			qb.innerJoin(ExecutionMetadata, 'md', matches.join(' AND '));

			qb.setParameter('key', key);
			qb.setParameter('value', exactMatch ? value : `%${value}%`);
		}

		if (annotationTags?.length || vote) {
			// If there is a filter by one or multiple tags or by vote - we need to join the annotations table
			qb.innerJoin('execution.annotation', 'annotation');

			// Add an inner join for each tag
			if (annotationTags?.length) {
				for (let index = 0; index < annotationTags.length; index++) {
					qb.innerJoin(
						AnnotationTagMapping,
						`atm_${index}`,
						`atm_${index}.annotationId = annotation.id AND atm_${index}.tagId = :tagId_${index}`,
					);

					qb.setParameter(`tagId_${index}`, annotationTags[index]);
				}
			}

			// Add filter by vote
			if (vote) {
				qb.andWhere('annotation.vote = :vote', { vote });
			}
		}

		if (projectId) {
			qb.innerJoin(WorkflowEntity, 'w', 'w.id = execution.workflowId')
				.innerJoin(SharedWorkflow, 'sw', 'sw.workflowId = w.id')
				.andWhere('sw.projectId = :projectId', { projectId });
		}

		return qb;
	}

	/**
	 * This method is used to add the annotation fields to the executions query
	 * It uses original query builder as a subquery and adds the annotation fields to it
	 * IMPORTANT: Query made with this query builder fetches duplicate execution rows for each tag,
	 *  this is intended, as we are working with raw query.
	 *  The duplicates are reduced in the *reduceExecutionsWithAnnotations* method.
	 */
	private toQueryBuilderWithAnnotations(query: ExecutionSummaries.Query) {
		const annotationFields = Object.keys(this.annotationFields).map(
			(key) => `annotation.${key} AS "annotation_${key}"`,
		);

		const subQuery = this.toQueryBuilder(query).addSelect(annotationFields);

		// Ensure the join with annotations is made only once
		// It might be already present as an inner join if the query includes filter by annotation tags
		// If not, it must be added as a left join
		if (!subQuery.expressionMap.joinAttributes.some((join) => join.alias.name === 'annotation')) {
			subQuery.leftJoin('execution.annotation', 'annotation');
		}

		const qb = this.manager
			.createQueryBuilder()
			.select(['e.*', 'ate.id AS "annotation_tags_id"', 'ate.name AS "annotation_tags_name"'])
			.from(`(${subQuery.getQuery()})`, 'e')
			.setParameters(subQuery.getParameters())
			.leftJoin(AnnotationTagMapping, 'atm', 'atm.annotationId = e.annotation_id')
			.leftJoin(AnnotationTagEntity, 'ate', 'ate.id = atm.tagId');

		// Sort the final result after the joins again, because there is no
		// guarantee that the order is unchanged after performing joins. Especially
		// postgres returned to the natural order again, listing executions in the
		// order they were created.
		if (query.kind === 'range') {
			if (query.order?.startedAt === 'DESC') {
				const table = qb.escape('e');
				const startedAt = qb.escape('startedAt');
				const createdAt = qb.escape('createdAt');
				qb.orderBy({ [`COALESCE(${table}.${startedAt}, ${table}.${createdAt})`]: 'DESC' });
			} else if (query.order?.top) {
				qb.orderBy(`(CASE WHEN e.status = '${query.order.top}' THEN 0 ELSE 1 END)`);
			} else {
				qb.orderBy({ 'e.id': 'DESC' });
			}
		}

		return qb;
	}

	async getAllIds() {
		const executions = await this.find({ select: ['id'], order: { id: 'ASC' } });

		return executions.map(({ id }) => id);
	}

	/**
	 * Retrieve a batch of execution IDs with `new` or `running` status, in most recent order.
	 */
	async getInProgressExecutionIds(batchSize: number) {
		const executions = await this.find({
			select: ['id'],
			where: { status: In(['new', 'running']) },
			order: { startedAt: 'DESC' },
			take: batchSize,
		});

		return executions.map(({ id }) => id);
	}

	/**
	 * The number of executions that are running and count towards the concurrent executions limit.
	 * Concurrency control only applies to executions started from a webhook or trigger node.
	 */
	async getConcurrentExecutionsCount() {
		const concurrentExecutionsCount = await this.count({
			where: { status: 'running', mode: In(['webhook', 'trigger']) },
		});

		return concurrentExecutionsCount;
	}

	private async handleExecutionRunData(
		data: string,
		options: { unflattenData?: boolean } = {},
	): Promise<IRunExecutionData | string | undefined> {
		if (options.unflattenData) {
			// Parse the serialized data (async for large payloads to avoid blocking the event loop).
			const deserializedData: unknown = await parseFlatted(data);
			// If it parses to an object, migrate and return it.
			if (deserializedData) {
				return migrateRunExecutionData(deserializedData as IRunExecutionDataAll);
			}
			return undefined;
		}
		// Just return the string data as-is.
		return data;
	}

	async findByStopExecutionsFilter(
		query: ExecutionSummaries.StopExecutionFilterQuery,
	): Promise<Array<{ id: string }>> {
		if (!query.status || query.status.length === 0) return [];

		const where: FindOptionsWhere<ExecutionEntity> = {
			status: In(query.status),
		};

		if (query.workflowId !== 'all') {
			where.workflowId = query.workflowId;
		}

		const startedAtConditions = [];

		if (query.startedAfter)
			startedAtConditions.push(
				MoreThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(new Date(query.startedAfter))),
			);

		if (query.startedBefore)
			startedAtConditions.push(
				LessThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(new Date(query.startedBefore))),
			);

		if (startedAtConditions.length > 0) {
			where.startedAt = And(...startedAtConditions);
		}

		return await this.find({ select: ['id'], where });
	}
}
