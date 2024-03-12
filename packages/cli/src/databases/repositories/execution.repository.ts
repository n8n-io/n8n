import { Service } from 'typedi';
import {
	Brackets,
	DataSource,
	In,
	IsNull,
	LessThan,
	LessThanOrEqual,
	MoreThanOrEqual,
	Not,
	Raw,
	Repository,
} from '@n8n/typeorm';
import { DateUtils } from '@n8n/typeorm/util/DateUtils';
import type {
	FindManyOptions,
	FindOneOptions,
	FindOperator,
	FindOptionsWhere,
	SelectQueryBuilder,
} from '@n8n/typeorm';
import { parse, stringify } from 'flatted';
import {
	ApplicationError,
	type ExecutionStatus,
	type ExecutionSummary,
	type IRunExecutionData,
} from 'n8n-workflow';
import { BinaryDataService } from 'n8n-core';
import type {
	ExecutionPayload,
	IExecutionBase,
	IExecutionFlattedDb,
	IExecutionResponse,
} from '@/Interfaces';

import config from '@/config';
import { isAdvancedExecutionFiltersEnabled } from '@/executions/executionHelpers';
import type { ExecutionData } from '../entities/ExecutionData';
import { ExecutionEntity } from '../entities/ExecutionEntity';
import { ExecutionMetadata } from '../entities/ExecutionMetadata';
import { ExecutionDataRepository } from './executionData.repository';
import { Logger } from '@/Logger';
import type { GetManyActiveFilter } from '@/executions/execution.types';

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
	if (filters?.metadata && isAdvancedExecutionFiltersEnabled()) {
		qb.leftJoin(ExecutionMetadata, 'md', 'md.executionId = execution.id');
		for (const md of filters.metadata) {
			qb.andWhere('md.key = :key AND md.value = :value', md);
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

@Service()
export class ExecutionRepository extends Repository<ExecutionEntity> {
	private hardDeletionBatchSize = 100;

	constructor(
		dataSource: DataSource,
		private readonly logger: Logger,
		private readonly executionDataRepository: ExecutionDataRepository,
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
			if (!queryParams.relations) {
				queryParams.relations = [];
			}
			(queryParams.relations as string[]).push('executionData');
		}

		const executions = await this.find(queryParams);

		if (options?.includeData && options?.unflattenData) {
			return executions.map((execution) => {
				const { executionData, ...rest } = execution;
				return {
					...rest,
					data: parse(executionData.data) as IRunExecutionData,
					workflowData: executionData.workflowData,
				} as IExecutionResponse;
			});
		} else if (options?.includeData) {
			return executions.map((execution) => {
				const { executionData, ...rest } = execution;
				return {
					...rest,
					data: execution.executionData.data,
					workflowData: execution.executionData.workflowData,
				} as IExecutionFlattedDb;
			});
		}

		return executions.map((execution) => {
			const { executionData, ...rest } = execution;
			return rest;
		});
	}

	async findSingleExecution(
		id: string,
		options?: {
			includeData: true;
			unflattenData: true;
			where?: FindOptionsWhere<ExecutionEntity>;
		},
	): Promise<IExecutionResponse | undefined>;
	async findSingleExecution(
		id: string,
		options?: {
			includeData: true;
			unflattenData?: false | undefined;
			where?: FindOptionsWhere<ExecutionEntity>;
		},
	): Promise<IExecutionFlattedDb | undefined>;
	async findSingleExecution(
		id: string,
		options?: {
			includeData?: boolean;
			unflattenData?: boolean;
			where?: FindOptionsWhere<ExecutionEntity>;
		},
	): Promise<IExecutionBase | undefined>;
	async findSingleExecution(
		id: string,
		options?: {
			includeData?: boolean;
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
			findOptions.relations = ['executionData'];
		}

		const execution = await this.findOne(findOptions);

		if (!execution) {
			return undefined;
		}

		const { executionData, ...rest } = execution;

		if (options?.includeData && options?.unflattenData) {
			return {
				...rest,
				data: parse(execution.executionData.data) as IRunExecutionData,
				workflowData: execution.executionData.workflowData,
			} as IExecutionResponse;
		} else if (options?.includeData) {
			return {
				...rest,
				data: execution.executionData.data,
				workflowData: execution.executionData.workflowData,
			} as IExecutionFlattedDb;
		}

		return rest;
	}

	async createNewExecution(execution: ExecutionPayload): Promise<string> {
		const { data, workflowData, ...rest } = execution;
		const { identifiers: inserted } = await this.insert(rest);
		const { id: executionId } = inserted[0] as { id: string };
		const { connections, nodes, name, settings } = workflowData ?? {};
		await this.executionDataRepository.insert({
			executionId,
			workflowData: { connections, nodes, name, settings, id: workflowData.id },
			data: stringify(data),
		});
		return String(executionId);
	}

	async markAsCrashed(executionIds: string[]) {
		await this.update(
			{ id: In(executionIds) },
			{
				status: 'crashed',
				stoppedAt: new Date(),
			},
		);
	}

	/**
	 * Permanently remove a single execution and its binary data.
	 */
	async hardDelete(ids: { workflowId: string; executionId: string }) {
		return await Promise.all([
			this.delete(ids.executionId),
			this.binaryDataService.deleteMany([ids]),
		]);
	}

	async updateStatus(executionId: string, status: ExecutionStatus) {
		await this.update({ id: executionId }, { status });
	}

	async updateExistingExecution(executionId: string, execution: Partial<IExecutionResponse>) {
		// Se isolate startedAt because it must be set when the execution starts and should never change.
		// So we prevent updating it, if it's sent (it usually is and causes problems to executions that
		// are resumed after waiting for some time, as a new startedAt is set)
		const { id, data, workflowId, workflowData, startedAt, ...executionInformation } = execution;
		if (Object.keys(executionInformation).length > 0) {
			await this.update({ id: executionId }, executionInformation);
		}

		if (data || workflowData) {
			const executionData: Partial<ExecutionData> = {};
			if (workflowData) {
				executionData.workflowData = workflowData;
			}
			if (data) {
				executionData.data = stringify(data);
			}
			// @ts-ignore
			await this.executionDataRepository.update({ executionId }, executionData);
		}
	}

	async countExecutions(
		filters: IGetExecutionsQueryFilter | undefined,
		accessibleWorkflowIds: string[],
		currentlyRunningExecutions: string[],
		hasGlobalRead: boolean,
	): Promise<{ count: number; estimated: boolean }> {
		const dbType = config.getEnv('database.type');
		if (dbType !== 'postgresdb' || (filters && Object.keys(filters).length > 0) || !hasGlobalRead) {
			const query = this.createQueryBuilder('execution').andWhere(
				'execution.workflowId IN (:...accessibleWorkflowIds)',
				{ accessibleWorkflowIds },
			);
			if (currentlyRunningExecutions.length > 0) {
				query.andWhere('execution.id NOT IN (:...currentlyRunningExecutions)', {
					currentlyRunningExecutions,
				});
			}

			parseFiltersToQueryBuilder(query, filters);

			const count = await query.getCount();
			return { count, estimated: false };
		}

		try {
			// Get an estimate of rows count.
			const estimateRowsNumberSql =
				"SELECT n_live_tup FROM pg_stat_all_tables WHERE relname = 'execution_entity';";
			const rows = (await this.query(estimateRowsNumberSql)) as Array<{ n_live_tup: string }>;

			const estimate = parseInt(rows[0].n_live_tup, 10);
			// If over 100k, return just an estimate.
			if (estimate > 100_000) {
				// if less than 100k, we get the real count as even a full
				// table scan should not take so long.
				return { count: estimate, estimated: true };
			}
		} catch (error) {
			if (error instanceof Error) {
				this.logger.warn(`Failed to get executions count from Postgres: ${error.message}`, {
					error,
				});
			}
		}

		const count = await this.count({
			where: {
				workflowId: In(accessibleWorkflowIds),
			},
		});

		return { count, estimated: false };
	}

	async searchExecutions(
		filters: IGetExecutionsQueryFilter | undefined,
		limit: number,
		excludedExecutionIds: string[],
		accessibleWorkflowIds: string[],
		additionalFilters?: { lastId?: string; firstId?: string },
	): Promise<ExecutionSummary[]> {
		if (accessibleWorkflowIds.length === 0) {
			return [];
		}
		const query = this.createQueryBuilder('execution')
			.select([
				'execution.id',
				'execution.finished',
				'execution.mode',
				'execution.retryOf',
				'execution.retrySuccessId',
				'execution.status',
				'execution.startedAt',
				'execution.stoppedAt',
				'execution.workflowId',
				'execution.waitTill',
				'workflow.name',
			])
			.innerJoin('execution.workflow', 'workflow')
			.limit(limit)
			// eslint-disable-next-line @typescript-eslint/naming-convention
			.orderBy({ 'execution.id': 'DESC' })
			.andWhere('execution.workflowId IN (:...accessibleWorkflowIds)', { accessibleWorkflowIds });
		if (excludedExecutionIds.length > 0) {
			query.andWhere('execution.id NOT IN (:...excludedExecutionIds)', { excludedExecutionIds });
		}

		if (additionalFilters?.lastId) {
			query.andWhere('execution.id < :lastId', { lastId: additionalFilters.lastId });
		}
		if (additionalFilters?.firstId) {
			query.andWhere('execution.id > :firstId', { firstId: additionalFilters.firstId });
		}

		parseFiltersToQueryBuilder(query, filters);

		const executions = await query.getMany();

		return executions.map((execution) => {
			const { workflow, waitTill, ...rest } = execution;
			return {
				...rest,
				waitTill: waitTill ?? undefined,
				workflowName: workflow.name,
			};
		});
	}

	async deleteExecutionsByFilter(
		filters: IGetExecutionsQueryFilter | undefined,
		accessibleWorkflowIds: string[],
		deleteConditions: {
			deleteBefore?: Date;
			ids?: string[];
		},
	) {
		if (!deleteConditions?.deleteBefore && !deleteConditions?.ids) {
			throw new ApplicationError(
				'Either "deleteBefore" or "ids" must be present in the request body',
			);
		}

		const query = this.createQueryBuilder('execution')
			.select(['execution.id'])
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
			return;
		}

		const executionIds = executions.map(({ id }) => id);
		do {
			// Delete in batches to avoid "SQLITE_ERROR: Expression tree is too large (maximum depth 1000)" error
			const batch = executionIds.splice(0, this.hardDeletionBatchSize);
			await this.delete(batch);
		} while (executionIds.length > 0);
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
		const maxAge = config.getEnv('executions.pruneDataMaxAge'); // in h
		const maxCount = config.getEnv('executions.pruneDataMaxCount');

		// Find ids of all executions that were stopped longer that pruneDataMaxAge ago
		const date = new Date();
		date.setHours(date.getHours() - maxAge);

		const toPrune: Array<FindOptionsWhere<ExecutionEntity>> = [
			// date reformatting needed - see https://github.com/typeorm/typeorm/issues/2286
			{ stoppedAt: LessThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(date)) },
		];

		if (maxCount > 0) {
			const executions = await this.find({
				select: ['id'],
				skip: maxCount,
				take: 1,
				order: { id: 'DESC' },
			});

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
			.andWhere(
				new Brackets((qb) =>
					countBasedWhere
						? qb.where(timeBasedWhere).orWhere(countBasedWhere)
						: qb.where(timeBasedWhere),
				),
			)
			.execute();
	}

	async hardDeleteSoftDeletedExecutions() {
		const date = new Date();
		date.setHours(date.getHours() - config.getEnv('executions.pruneDataHardDeleteBuffer'));

		const workflowIdsAndExecutionIds = (
			await this.find({
				select: ['workflowId', 'id'],
				where: {
					deletedAt: LessThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(date)),
				},
				take: this.hardDeletionBatchSize,

				/**
				 * @important This ensures soft-deleted executions are included,
				 * else `@DeleteDateColumn()` at `deletedAt` will exclude them.
				 */
				withDeleted: true,
			})
		).map(({ id: executionId, workflowId }) => ({ workflowId, executionId }));

		return workflowIdsAndExecutionIds;
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

		const dbType = config.getEnv('database.type');
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

	async getExecutionsCountForPublicApi(data: {
		limit: number;
		lastId?: string;
		workflowIds?: string[];
		status?: ExecutionStatus;
		excludedWorkflowIds?: string[];
	}): Promise<number> {
		const executions = await this.count({
			where: {
				...(data.lastId && { id: LessThan(data.lastId) }),
				...(data.status && { ...this.getStatusCondition(data.status) }),
				...(data.workflowIds && { workflowId: In(data.workflowIds) }),
				...(data.excludedWorkflowIds && { workflowId: Not(In(data.excludedWorkflowIds)) }),
			},
			take: data.limit,
		});

		return executions;
	}

	private getStatusCondition(status: ExecutionStatus) {
		const condition: Pick<FindOptionsWhere<IExecutionFlattedDb>, 'status'> = {};

		if (status === 'success') {
			condition.status = 'success';
		} else if (status === 'waiting') {
			condition.status = 'waiting';
		} else if (status === 'error') {
			condition.status = In(['error', 'crashed', 'failed']);
		}

		return condition;
	}

	async getExecutionsForPublicApi(params: {
		limit: number;
		includeData?: boolean;
		lastId?: string;
		workflowIds?: string[];
		status?: ExecutionStatus;
		excludedExecutionsIds?: string[];
	}): Promise<IExecutionBase[]> {
		let where: FindOptionsWhere<IExecutionFlattedDb> = {};

		if (params.lastId && params.excludedExecutionsIds?.length) {
			where.id = Raw((id) => `${id} < :lastId AND ${id} NOT IN (:...excludedExecutionsIds)`, {
				lastId: params.lastId,
				excludedExecutionsIds: params.excludedExecutionsIds,
			});
		} else if (params.lastId) {
			where.id = LessThan(params.lastId);
		} else if (params.excludedExecutionsIds?.length) {
			where.id = Not(In(params.excludedExecutionsIds));
		}

		if (params.status) {
			where = { ...where, ...this.getStatusCondition(params.status) };
		}

		if (params.workflowIds) {
			where = { ...where, workflowId: In(params.workflowIds) };
		}

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
				],
				where,
				order: { id: 'DESC' },
				take: params.limit,
				relations: ['executionData'],
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
		});
	}

	async findIfShared(executionId: string, sharedWorkflowIds: string[]) {
		return await this.findSingleExecution(executionId, {
			where: {
				workflowId: In(sharedWorkflowIds),
			},
			includeData: true,
			unflattenData: false,
		});
	}

	async findIfAccessible(executionId: string, accessibleWorkflowIds: string[]) {
		return await this.findSingleExecution(executionId, {
			where: { workflowId: In(accessibleWorkflowIds) },
		});
	}

	async getManyActive(
		activeExecutionIds: string[],
		accessibleWorkflowIds: string[],
		filter?: GetManyActiveFilter,
	) {
		const where: FindOptionsWhere<ExecutionEntity> = {
			id: In(activeExecutionIds),
			status: Not(In(['finished', 'stopped', 'failed', 'crashed'] as ExecutionStatus[])),
		};

		if (filter) {
			const { workflowId, status, finished } = filter;
			if (workflowId && accessibleWorkflowIds.includes(workflowId)) {
				where.workflowId = workflowId;
			} else {
				where.workflowId = In(accessibleWorkflowIds);
			}
			if (status) {
				// @ts-ignore
				where.status = In(status);
			}
			if (finished !== undefined) {
				where.finished = finished;
			}
		} else {
			where.workflowId = In(accessibleWorkflowIds);
		}

		return await this.findMultipleExecutions({
			select: ['id', 'workflowId', 'mode', 'retryOf', 'startedAt', 'stoppedAt', 'status'],
			order: { id: 'DESC' },
			where,
		});
	}
}

export interface IGetExecutionsQueryFilter {
	id?: FindOperator<string> | string;
	finished?: boolean;
	mode?: string;
	retryOf?: string;
	retrySuccessId?: string;
	status?: ExecutionStatus[];
	workflowId?: string;
	waitTill?: FindOperator<any> | boolean;
	metadata?: Array<{ key: string; value: string }>;
	startedAfter?: string;
	startedBefore?: string;
}
