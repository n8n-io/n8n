import { Service } from 'typedi';
import { DataSource, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import type { FindManyOptions, FindOneOptions, FindOptionsWhere } from 'typeorm';
import { ExecutionEntity } from '../entities/ExecutionEntity';
import { parse, stringify } from 'flatted';
import type { IExecutionFlattedDb, IExecutionResponse } from '@/Interfaces';
import type { IExecutionsSummary, IRunExecutionData } from 'n8n-workflow';
import { ExecutionDataRepository } from './executionData.repository';
import { ExecutionData } from '../entities/ExecutionData';
import type { IGetExecutionsQueryFilter } from '@/executions/executions.service';
import { isAdvancedExecutionFiltersEnabled } from '@/executions/executionHelpers';
import { ExecutionMetadata } from '../entities/ExecutionMetadata';
import { DateUtils } from 'typeorm/util/DateUtils';
import { exec } from 'shelljs';
import { WorkflowEntity } from '../entities/WorkflowEntity';

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
			includeWorkflowData?: boolean;
			includeData?: boolean;
		},
	): Promise<IExecutionResponse[]>;
	async findMultipleExecutions(
		queryParams: FindManyOptions<ExecutionEntity>,
		options?: {
			unflattenData?: false;
			includeWorkflowData?: boolean;
			includeData?: boolean;
		},
	): Promise<IExecutionFlattedDb[]>;
	async findMultipleExecutions(
		queryParams: FindManyOptions<ExecutionEntity>,
		options?: {
			unflattenData?: boolean;
			includeWorkflowData?: boolean;
			includeData?: boolean;
		},
	) {
		if (options?.includeData || options?.includeWorkflowData) {
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
					data: parse(execution.executionData.data) as IRunExecutionData,
					workflowData: execution.executionData.workflowData,
				} as IExecutionResponse;
			});
		}

		return executions.map((execution) => {
			const { executionData, ...rest } = execution;
			return {
				...rest,
				data: execution.executionData.data,
				workflowData: execution.executionData.workflowData,
			} as IExecutionFlattedDb;
		});
	}

	async findSingleExecution(
		id: string,
		options?: {
			includeData?: boolean;
			includeWorkflowData?: boolean;
			unflattenData?: true;
			where?: FindOptionsWhere<ExecutionEntity>;
		},
	): Promise<IExecutionResponse | undefined>;
	async findSingleExecution(
		id: string,
		options?: {
			includeData?: boolean;
			includeWorkflowData?: boolean;
			unflattenData?: false;
			where?: FindOptionsWhere<ExecutionEntity>;
		},
	): Promise<IExecutionFlattedDb | undefined>;
	async findSingleExecution(
		id: string,
		options?: {
			includeData?: boolean;
			includeWorkflowData?: boolean;
			unflattenData?: boolean;
			where?: FindOptionsWhere<ExecutionEntity>;
		},
	): Promise<IExecutionFlattedDb | IExecutionResponse | undefined> {
		const whereClause: FindOneOptions<ExecutionEntity> = {
			where: {
				id,
				...options?.where,
			},
		};
		if (options?.includeData || options?.includeWorkflowData) {
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
		}

		return {
			...rest,
			data: execution.executionData.data,
			workflowData: execution.executionData.workflowData,
		} as IExecutionFlattedDb;
	}

	async createNewExecution(execution: IExecutionResponse) {
		const { data, workflowData, ...rest } = execution;

		const newExecution = await this.save({
			...rest,
		});
		await this.executionDataRepository.save({
			execution: newExecution,
			workflowData,
			data: stringify(data),
		});

		return newExecution;
	}

	async updateExistingExecution(executionId: string, execution: Partial<IExecutionResponse>) {
		const { id, data, workflowData, ...executionInformation } = execution;

		await this.manager.transaction(async (transactionManager) => {
			if (Object.keys(executionInformation).length > 0) {
				await transactionManager.update(ExecutionEntity, { id: executionId }, executionInformation);
			}

			if (data) {
				await transactionManager.update(
					ExecutionData,
					{ executionId },
					{
						data: stringify(data),
					},
				);
			}
		});
	}

	async deleteExecution(executionId: string) {
		return this.delete({ id: executionId });
	}

	async searchExecutions(
		filters: IGetExecutionsQueryFilter | undefined,
		limit: number,
		excludedExecutionIds: string[],
		workflowIdAllowList: string[],
	): Promise<IExecutionsSummary[]> {
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
			.orderBy('execution.startedAt', 'DESC')
			.andWhere('execution.id NOT IN (:...excludedExecutionIds)', { excludedExecutionIds })
			.andWhere('execution.workflowId IN (:...workflowIdAllowList)', { workflowIdAllowList });

		if (filters?.status) {
			query.andWhere('execution.status', In(filters.status));
		}
		if (filters?.finished) {
			query.andWhere('execution.finished', In([filters.finished]));
		}
		if (filters?.metadata && isAdvancedExecutionFiltersEnabled()) {
			query.leftJoin(ExecutionMetadata, 'md', 'md.executionId = execution.id');
			for (const md of filters.metadata) {
				query.andWhere('md.key = :key AND md.value = :value', md);
			}
		}
		if (filters?.startedAfter) {
			query.andWhere({
				startedAt: MoreThanOrEqual(
					DateUtils.mixedDateToUtcDatetimeString(new Date(filters.startedAfter)),
				),
			});
		}
		if (filters?.startedBefore) {
			query.andWhere({
				startedAt: LessThanOrEqual(
					DateUtils.mixedDateToUtcDatetimeString(new Date(filters.startedBefore)),
				),
			});
		}

		const executions = await query.getMany();
		console.log(executions[0]);

		return executions.map((execution) => {
			const { workflow, waitTill, ...rest } = execution;
			return {
				...rest,
				waitTill: waitTill ?? undefined,
				workflowName: workflow.name,
			};
		});
	}
}
