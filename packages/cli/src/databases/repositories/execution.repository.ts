import { Service } from 'typedi';
import { DataSource, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import type {
	FindManyOptions,
	FindOneOptions,
	FindOptionsWhere,
	SelectQueryBuilder,
} from 'typeorm';
import { ExecutionEntity } from '../entities/ExecutionEntity';
import { parse, stringify } from 'flatted';
import type {
	IExecutionBase,
	IExecutionDb,
	IExecutionFlattedDb,
	IExecutionResponse,
} from '@/Interfaces';
import { LoggerProxy } from 'n8n-workflow';
import type { IExecutionsSummary, IRunExecutionData } from 'n8n-workflow';
import { ExecutionDataRepository } from './executionData.repository';
import type { ExecutionData } from '../entities/ExecutionData';
import type { IGetExecutionsQueryFilter } from '@/executions/executions.service';
import { isAdvancedExecutionFiltersEnabled } from '@/executions/executionHelpers';
import { ExecutionMetadata } from '../entities/ExecutionMetadata';
import { DateUtils } from 'typeorm/util/DateUtils';
import { BinaryDataManager } from 'n8n-core';
import config from '@/config';

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
	private executionDataRepository: ExecutionDataRepository;

	constructor(dataSource: DataSource, executionDataRepository: ExecutionDataRepository) {
		super(ExecutionEntity, dataSource.manager);
		this.executionDataRepository = executionDataRepository;
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
		const whereClause: FindOneOptions<ExecutionEntity> = {
			where: {
				id,
				...options?.where,
			},
		};
		if (options?.includeData) {
			whereClause.relations = ['executionData'];
		}

		const execution = await this.findOne(whereClause);

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

	async createNewExecution(execution: IExecutionDb) {
		const { data, workflowData, ...rest } = execution;

		const newExecution = await this.save(rest);
		await this.executionDataRepository.save({
			execution: newExecution,
			workflowData,
			data: stringify(data),
		});

		return newExecution;
	}

	async updateExistingExecution(executionId: string, execution: Partial<IExecutionResponse>) {
		// Se isolate startedAt because it must be set when the execution starts and should never change.
		// So we prevent updating it, if it's sent (it usually is and causes problems to executions that
		// are resumed after waiting for some time, as a new startedAt is set)
		const { id, data, workflowData, startedAt, ...executionInformation } = execution;
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

	async deleteExecution(executionId: string) {
		// TODO: Should this be awaited? Should we add a catch in case it fails?
		await BinaryDataManager.getInstance().deleteBinaryDataByExecutionIds([executionId]);
		return this.delete({ id: executionId });
	}

	async countExecutions(
		filters: IGetExecutionsQueryFilter | undefined,
		accessibleWorkflowIds: string[],
		currentlyRunningExecutions: string[],
		isOwner: boolean,
	): Promise<{ count: number; estimated: boolean }> {
		const dbType = config.getEnv('database.type');
		if (dbType !== 'postgresdb' || (filters && Object.keys(filters).length > 0) || !isOwner) {
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
				LoggerProxy.warn(`Failed to get executions count from Postgres: ${error.message}`, {
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
	): Promise<IExecutionsSummary[]> {
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

	async deleteExecutions(
		filters: IGetExecutionsQueryFilter | undefined,
		accessibleWorkflowIds: string[],
		deleteConditions: {
			deleteBefore?: Date;
			ids?: string[];
		},
	) {
		if (!deleteConditions?.deleteBefore && !deleteConditions?.ids) {
			throw new Error('Either "deleteBefore" or "ids" must be present in the request body');
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
				LoggerProxy.error('Failed to delete an execution due to insufficient permissions', {
					executionIds: deleteConditions.ids,
				});
			}
			return;
		}

		const executionIds = executions.map(({ id }) => id);
		const binaryDataManager = BinaryDataManager.getInstance();
		await binaryDataManager.deleteBinaryDataByExecutionIds(executionIds);

		do {
			// Delete in batches to avoid "SQLITE_ERROR: Expression tree is too large (maximum depth 1000)" error
			const batch = executionIds.splice(0, 500);
			await this.delete(batch);
		} while (executionIds.length > 0);
	}
}
