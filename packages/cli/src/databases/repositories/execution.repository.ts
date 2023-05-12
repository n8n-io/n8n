import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import type { FindManyOptions, FindOneOptions, FindOptionsWhere } from 'typeorm';
import { ExecutionEntity } from '../entities/ExecutionEntity';
import { parse, stringify } from 'flatted';
import type { IExecutionFlattedDb, IExecutionResponse } from '@/Interfaces';
import type { IRunExecutionData } from 'n8n-workflow';
import { ExecutionDataRepository } from './executionData.repository';
import { ExecutionData } from '../entities/ExecutionData';

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
}
