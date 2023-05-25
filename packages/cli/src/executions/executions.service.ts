/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { validate as jsonSchemaValidate } from 'jsonschema';
import { BinaryDataManager } from 'n8n-core';
import type {
	IDataObject,
	IWorkflowBase,
	JsonObject,
	ExecutionStatus,
	IRunExecutionData,
	NodeOperationError,
	IExecutionsSummary,
} from 'n8n-workflow';
import { deepCopy, LoggerProxy, jsonParse, Workflow } from 'n8n-workflow';
import type { FindOperator, FindOptionsWhere } from 'typeorm';
import { In, IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Raw } from 'typeorm';
import { ActiveExecutions } from '@/ActiveExecutions';
import config from '@/config';
import type { User } from '@db/entities/User';
import type { ExecutionEntity } from '@db/entities/ExecutionEntity';
import { ExecutionData } from '@db/entities/ExecutionData';
import type {
	IExecutionFlattedResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	IWorkflowExecutionDataProcess,
} from '@/Interfaces';
import { NodeTypes } from '@/NodeTypes';
import { Queue } from '@/Queue';
import type { ExecutionRequest } from '@/requests';
import * as ResponseHelper from '@/ResponseHelper';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';
import { WorkflowRunner } from '@/WorkflowRunner';
import * as Db from '@/Db';
import * as GenericHelpers from '@/GenericHelpers';
import { parse } from 'flatted';
import { Container } from 'typedi';
import {
	getStatusUsingPreviousExecutionStatusMethod,
	isAdvancedExecutionFiltersEnabled,
} from './executionHelpers';
import { ExecutionMetadata } from '@db/entities/ExecutionMetadata';
import { DateUtils } from 'typeorm/util/DateUtils';
import { ExecutionRepository } from '@/databases/repositories';

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
	metadata?: Array<{ key: string; value: string }>;
	startedAfter?: string;
	startedBefore?: string;
}

const schemaGetExecutionsQueryFilter = {
	$id: '/IGetExecutionsQueryFilter',
	type: 'object',
	properties: {
		id: { type: 'string' },
		finished: { type: 'boolean' },
		mode: { type: 'string' },
		retryOf: { type: 'string' },
		retrySuccessId: { type: 'string' },
		status: {
			type: 'array',
			items: { type: 'string' },
		},
		waitTill: { type: 'boolean' },
		workflowId: { anyOf: [{ type: 'integer' }, { type: 'string' }] },
		metadata: { type: 'array', items: { $ref: '#/$defs/metadata' } },
		startedAfter: { type: 'date-time' },
		startedBefore: { type: 'date-time' },
	},
	$defs: {
		metadata: {
			type: 'object',
			required: ['key', 'value'],
			properties: {
				key: {
					type: 'string',
				},
				value: { type: 'string' },
			},
		},
	},
};

const allowedExecutionsQueryFilterFields = Object.keys(schemaGetExecutionsQueryFilter.properties);

export class ExecutionsService {
	/**
	 * Function to get the workflow Ids for a User
	 * Overridden in EE version to ignore roles
	 */
	static async getWorkflowIdsForUser(user: User): Promise<string[]> {
		// Get all workflows using owner role
		return getSharedWorkflowIds(user, ['owner']);
	}

	/**
	 * Helper function to retrieve count of Executions
	 */
	static async getExecutionsCount(
		countFilter: IDataObject,
		user: User,
		metadata?: Array<{ key: string; value: string }>,
	): Promise<{ count: number; estimated: boolean }> {
		const dbType = config.getEnv('database.type');
		const filteredFields = Object.keys(countFilter).filter((field) => field !== 'id');

		// For databases other than Postgres, do a regular count
		// when filtering based on `workflowId` or `finished` fields.
		if (
			dbType !== 'postgresdb' ||
			metadata?.length ||
			filteredFields.length > 0 ||
			user.globalRole.name !== 'owner'
		) {
			const sharedWorkflowIds = await this.getWorkflowIdsForUser(user);

			let query = Db.collections.Execution.createQueryBuilder('execution')
				.select()
				.orderBy('execution.id', 'DESC')
				.where({ workflowId: In(sharedWorkflowIds) });

			if (metadata?.length) {
				query = query.leftJoinAndSelect(ExecutionMetadata, 'md', 'md.executionId = execution.id');
				for (const md of metadata) {
					query = query.andWhere('md.key = :key AND md.value = :value', md);
				}
			}

			if (filteredFields.length > 0) {
				query = query.andWhere(countFilter);
			}

			const count = await query.getCount();
			return { count, estimated: false };
		}

		try {
			// Get an estimate of rows count.
			const estimateRowsNumberSql =
				"SELECT n_live_tup FROM pg_stat_all_tables WHERE relname = 'execution_entity';";
			const rows: Array<{ n_live_tup: string }> = await Db.collections.Execution.query(
				estimateRowsNumberSql,
			);

			const estimate = parseInt(rows[0].n_live_tup, 10);
			// If over 100k, return just an estimate.
			if (estimate > 100_000) {
				// if less than 100k, we get the real count as even a full
				// table scan should not take so long.
				return { count: estimate, estimated: true };
			}
		} catch (error) {
			LoggerProxy.warn(`Failed to get executions count from Postgres: ${error}`);
		}

		const sharedWorkflowIds = await getSharedWorkflowIds(user);

		const count = await Db.collections.Execution.count({
			where: {
				workflowId: In(sharedWorkflowIds),
			},
		});

		return { count, estimated: false };
	}

	static massageFilters(filter: IDataObject): void {
		if (filter) {
			if (filter.waitTill === true) {
				filter.waitTill = Not(IsNull());
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
			} else if (filter.finished === false) {
				filter.waitTill = IsNull();
			} else {
				delete filter.waitTill;
			}

			if (Array.isArray(filter.metadata)) {
				delete filter.metadata;
			}

			if ('startedAfter' in filter) {
				delete filter.startedAfter;
			}

			if ('startedBefore' in filter) {
				delete filter.startedBefore;
			}
		}
	}

	static async getExecutionsList(req: ExecutionRequest.GetAll): Promise<IExecutionsListResponse> {
		const sharedWorkflowIds = await this.getWorkflowIdsForUser(req.user);
		if (sharedWorkflowIds.length === 0) {
			// return early since without shared workflows there can be no hits
			// (note: getSharedWorkflowIds() returns _all_ workflow ids for global owners)
			return {
				count: 0,
				estimated: false,
				results: [],
			};
		}

		// parse incoming filter object and remove non-valid fields
		let filter: IGetExecutionsQueryFilter | undefined = undefined;
		if (req.query.filter) {
			try {
				const filterJson: JsonObject = jsonParse(req.query.filter);
				if (filterJson) {
					Object.keys(filterJson).map((key) => {
						if (!allowedExecutionsQueryFilterFields.includes(key)) delete filterJson[key];
					});
					if (jsonSchemaValidate(filterJson, schemaGetExecutionsQueryFilter).valid) {
						filter = filterJson as IGetExecutionsQueryFilter;
					}
				}
			} catch (error) {
				LoggerProxy.error('Failed to parse filter', {
					userId: req.user.id,
					filter: req.query.filter,
				});
				throw new ResponseHelper.InternalServerError(
					'Parameter "filter" contained invalid JSON string.',
				);
			}
		}

		// safeguard against querying workflowIds not shared with the user
		const workflowId = filter?.workflowId?.toString();
		if (workflowId !== undefined && !sharedWorkflowIds.includes(workflowId)) {
			LoggerProxy.verbose(
				`User ${req.user.id} attempted to query non-shared workflow ${workflowId}`,
			);
			return {
				count: 0,
				estimated: false,
				results: [],
			};
		}

		const limit = req.query.limit
			? parseInt(req.query.limit, 10)
			: GenericHelpers.DEFAULT_EXECUTIONS_GET_ALL_LIMIT;

		const executingWorkflowIds: string[] = [];

		if (config.getEnv('executions.mode') === 'queue') {
			const queue = Container.get(Queue);
			const currentJobs = await queue.getJobs(['active', 'waiting']);
			executingWorkflowIds.push(...currentJobs.map(({ data }) => data.executionId));
		}

		// We may have manual executions even with queue so we must account for these.
		executingWorkflowIds.push(
			...Container.get(ActiveExecutions)
				.getActiveExecutions()
				.map(({ id }) => id),
		);

		const countFilter = deepCopy(filter ?? {});
		const metadata = isAdvancedExecutionFiltersEnabled() ? filter?.metadata : undefined;

		// deepcopy breaks the In operator so we need to reapply it
		if (filter?.status) {
			Object.assign(countFilter, { status: In(filter.status) });
		}

		this.massageFilters(countFilter as IDataObject);
		countFilter.id = Not(In(executingWorkflowIds));

		const { count, estimated } = await this.getExecutionsCount(
			countFilter as IDataObject,
			req.user,
			metadata,
		);

		const formattedExecutions = await Container.get(ExecutionRepository).searchExecutions(
			filter,
			limit,
			executingWorkflowIds,
			sharedWorkflowIds,
			{
				lastId: req.query.lastId,
				firstId: req.query.firstId,
			},
		);
		return {
			count,
			results: formattedExecutions,
			estimated,
		};
	}

	static async getExecution(
		req: ExecutionRequest.Get,
	): Promise<IExecutionResponse | IExecutionFlattedResponse | undefined> {
		const sharedWorkflowIds = await this.getWorkflowIdsForUser(req.user);
		if (!sharedWorkflowIds.length) return undefined;

		const { id: executionId } = req.params;
		const execution = await Container.get(ExecutionRepository).findSingleExecution(executionId, {
			where: {
				id: executionId,
				workflowId: In(sharedWorkflowIds),
			},
			includeData: true,
			includeWorkflowData: true,
			unflattenData: false,
		});

		if (!execution) {
			LoggerProxy.info('Attempt to read execution was blocked due to insufficient permissions', {
				userId: req.user.id,
				executionId,
			});
			return undefined;
		}

		if (!execution.status) {
			execution.status = getStatusUsingPreviousExecutionStatusMethod(execution);
		}

		return execution;
	}

	static async retryExecution(req: ExecutionRequest.Retry): Promise<boolean> {
		const sharedWorkflowIds = await this.getWorkflowIdsForUser(req.user);
		if (!sharedWorkflowIds.length) return false;

		const { id: executionId } = req.params;
		const execution = await Container.get(ExecutionRepository).findSingleExecution(executionId, {
			where: {
				workflowId: In(sharedWorkflowIds),
			},
			includeData: true,
			unflattenData: true,
		});

		if (!execution) {
			LoggerProxy.info(
				'Attempt to retry an execution was blocked due to insufficient permissions',
				{
					userId: req.user.id,
					executionId,
				},
			);
			throw new ResponseHelper.NotFoundError(
				`The execution with the ID "${executionId}" does not exist.`,
			);
		}

		if (execution.finished) {
			throw new Error('The execution succeeded, so it cannot be retried.');
		}

		const executionMode = 'retry';

		execution.workflowData.active = false;

		// Start the workflow
		const data: IWorkflowExecutionDataProcess = {
			executionMode,
			executionData: execution.data,
			retryOf: req.params.id,
			workflowData: execution.workflowData,
			userId: req.user.id,
		};

		const { lastNodeExecuted } = data.executionData!.resultData;

		if (lastNodeExecuted) {
			// Remove the old error and the data of the last run of the node that it can be replaced
			delete data.executionData!.resultData.error;
			const { length } = data.executionData!.resultData.runData[lastNodeExecuted];
			if (
				length > 0 &&
				data.executionData!.resultData.runData[lastNodeExecuted][length - 1].error !== undefined
			) {
				// Remove results only if it is an error.
				// If we are retrying due to a crash, the information is simply success info from last node
				data.executionData!.resultData.runData[lastNodeExecuted].pop();
				// Stack will determine what to run next
			}
		}

		if (req.body.loadWorkflow) {
			// Loads the currently saved workflow to execute instead of the
			// one saved at the time of the execution.
			const workflowId = execution.workflowData.id as string;
			const workflowData = (await Db.collections.Workflow.findOneBy({
				id: workflowId,
			})) as IWorkflowBase;

			if (workflowData === undefined) {
				throw new Error(
					`The workflow with the ID "${workflowId}" could not be found and so the data not be loaded for the retry.`,
				);
			}

			data.workflowData = workflowData;
			const nodeTypes = Container.get(NodeTypes);
			const workflowInstance = new Workflow({
				id: workflowData.id as string,
				name: workflowData.name,
				nodes: workflowData.nodes,
				connections: workflowData.connections,
				active: false,
				nodeTypes,
				staticData: undefined,
				settings: workflowData.settings,
			});

			// Replace all of the nodes in the execution stack with the ones of the new workflow
			for (const stack of data.executionData!.executionData!.nodeExecutionStack) {
				// Find the data of the last executed node in the new workflow
				const node = workflowInstance.getNode(stack.node.name);
				if (node === null) {
					LoggerProxy.error('Failed to retry an execution because a node could not be found', {
						userId: req.user.id,
						executionId,
						nodeName: stack.node.name,
					});
					throw new Error(
						`Could not find the node "${stack.node.name}" in workflow. It probably got deleted or renamed. Without it the workflow can sadly not be retried.`,
					);
				}

				// Replace the node data in the stack that it really uses the current data
				stack.node = node;
			}
		}

		const workflowRunner = new WorkflowRunner();
		const retriedExecutionId = await workflowRunner.run(data);

		const executionData = await Container.get(ActiveExecutions).getPostExecutePromise(
			retriedExecutionId,
		);

		if (!executionData) {
			throw new Error('The retry did not start for an unknown reason.');
		}

		return !!executionData.finished;
	}

	static async deleteExecutions(req: ExecutionRequest.Delete): Promise<void> {
		const sharedWorkflowIds = await this.getWorkflowIdsForUser(req.user);
		if (sharedWorkflowIds.length === 0) {
			// return early since without shared workflows there can be no hits
			// (note: getSharedWorkflowIds() returns _all_ workflow ids for global owners)
			return;
		}
		const { deleteBefore, ids, filters: requestFiltersRaw } = req.body;
		let requestFilters;
		if (requestFiltersRaw) {
			try {
				Object.keys(requestFiltersRaw).map((key) => {
					if (!allowedExecutionsQueryFilterFields.includes(key)) delete requestFiltersRaw[key];
				});
				if (jsonSchemaValidate(requestFiltersRaw, schemaGetExecutionsQueryFilter).valid) {
					requestFilters = requestFiltersRaw as IGetExecutionsQueryFilter;
				}
			} catch (error) {
				throw new ResponseHelper.InternalServerError(
					'Parameter "filter" contained invalid JSON string.',
				);
			}
		}

		return Container.get(ExecutionRepository).deleteExecutions(requestFilters, sharedWorkflowIds, {
			deleteBefore,
			ids,
		});
	}
}
