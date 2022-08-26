/* eslint-disable no-restricted-syntax */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
import express from 'express';
import _, { cloneDeep } from 'lodash';
import { BinaryDataManager } from 'n8n-core';
import { IDataObject, IWorkflowBase, LoggerProxy, Workflow } from 'n8n-workflow';
import { FindManyOptions, In, IsNull, LessThanOrEqual, Not, Raw } from 'typeorm';

import {
	ActiveExecutions,
	DatabaseType,
	Db,
	GenericHelpers,
	IExecutionFlattedResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	IWorkflowExecutionDataProcess,
	NodeTypes,
	WorkflowRunner,
	ResponseHelper,
} from '..';
import * as config from '../../config';
import { ExecutionEntity } from '../databases/entities/ExecutionEntity';
import { User } from '../databases/entities/User';
import { DEFAULT_EXECUTIONS_GET_ALL_LIMIT } from '../GenericHelpers';
import { getLogger } from '../Logger';
import * as Queue from '../Queue';
import type { ExecutionRequest } from '../requests';
import { getSharedWorkflowIds } from '../WorkflowHelpers';

export const executionsController = express.Router();

/**
 * Initialise Logger if needed
 */
executionsController.use((req, res, next) => {
	try {
		LoggerProxy.getInstance();
	} catch (error) {
		LoggerProxy.init(getLogger());
	}
	next();
});

/**
 * Helper function to retrieve count of Executions
 */
async function getExecutionsCount(
	countFilter: IDataObject,
	user: User,
): Promise<{ count: number; estimated: boolean }> {
	const dbType = (await GenericHelpers.getConfigValue('database.type')) as DatabaseType;
	const filteredFields = Object.keys(countFilter).filter((field) => field !== 'id');

	// For databases other than Postgres, do a regular count
	// when filtering based on `workflowId` or `finished` fields.
	if (dbType !== 'postgresdb' || filteredFields.length > 0 || user.globalRole.name !== 'owner') {
		const sharedWorkflowIds = await getSharedWorkflowIds(user);

		const count = await Db.collections.Execution.count({
			where: {
				workflowId: In(sharedWorkflowIds),
				...countFilter,
			},
		});

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

/**
 * GET /executions
 */
executionsController.get(
	'/',
	ResponseHelper.send(async (req: ExecutionRequest.GetAll): Promise<IExecutionsListResponse> => {
		const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

		const limit = req.query.limit
			? parseInt(req.query.limit, 10)
			: DEFAULT_EXECUTIONS_GET_ALL_LIMIT;

		const executingWorkflowIds: string[] = [];

		if (config.getEnv('executions.mode') === 'queue') {
			const currentJobs = await Queue.getInstance().getJobs(['active', 'waiting']);
			executingWorkflowIds.push(...currentJobs.map(({ data }) => data.executionId));
		}

		// We may have manual executions even with queue so we must account for these.
		executingWorkflowIds.push(
			...ActiveExecutions.getInstance()
				.getActiveExecutions()
				.map(({ id }) => id),
		);

		const countFilter = cloneDeep(filter);
		countFilter.waitTill &&= Not(IsNull());
		countFilter.id = Not(In(executingWorkflowIds));

		const sharedWorkflowIds = await getSharedWorkflowIds(req.user);

		const findOptions: FindManyOptions<ExecutionEntity> = {
			select: [
				'id',
				'finished',
				'mode',
				'retryOf',
				'retrySuccessId',
				'waitTill',
				'startedAt',
				'stoppedAt',
				'workflowData',
			],
			where: { workflowId: In(sharedWorkflowIds) },
			order: { id: 'DESC' },
			take: limit,
		};

		Object.entries(filter).forEach(([key, value]) => {
			let filterToAdd = {};

			if (key === 'waitTill') {
				filterToAdd = { waitTill: Not(IsNull()) };
			} else if (key === 'finished' && value === false) {
				filterToAdd = { finished: false, waitTill: IsNull() };
			} else {
				filterToAdd = { [key]: value };
			}

			Object.assign(findOptions.where!, filterToAdd);
		});

		const rangeQuery: string[] = [];
		const rangeQueryParams: {
			lastId?: string;
			firstId?: string;
			executingWorkflowIds?: string[];
		} = {};

		if (req.query.lastId) {
			rangeQuery.push('id < :lastId');
			rangeQueryParams.lastId = req.query.lastId;
		}

		if (req.query.firstId) {
			rangeQuery.push('id > :firstId');
			rangeQueryParams.firstId = req.query.firstId;
		}

		if (executingWorkflowIds.length > 0) {
			rangeQuery.push(`id NOT IN (:...executingWorkflowIds)`);
			rangeQueryParams.executingWorkflowIds = executingWorkflowIds;
		}

		if (rangeQuery.length) {
			Object.assign(findOptions.where!, {
				id: Raw(() => rangeQuery.join(' and '), rangeQueryParams),
			});
		}

		const executions = await Db.collections.Execution.find(findOptions);

		const { count, estimated } = await getExecutionsCount(countFilter, req.user);

		const formattedExecutions = executions.map((execution) => {
			return {
				id: execution.id.toString(),
				finished: execution.finished,
				mode: execution.mode,
				retryOf: execution.retryOf?.toString(),
				retrySuccessId: execution?.retrySuccessId?.toString(),
				waitTill: execution.waitTill as Date | undefined,
				startedAt: execution.startedAt,
				stoppedAt: execution.stoppedAt,
				workflowId: execution.workflowData?.id?.toString() ?? '',
				workflowName: execution.workflowData.name,
			};
		});

		return {
			count,
			results: formattedExecutions,
			estimated,
		};
	}),
);

/**
 * GET /executions/:id
 */
executionsController.get(
	'/:id',
	ResponseHelper.send(
		async (
			req: ExecutionRequest.Get,
		): Promise<IExecutionResponse | IExecutionFlattedResponse | undefined> => {
			const { id: executionId } = req.params;

			const sharedWorkflowIds = await getSharedWorkflowIds(req.user);

			if (!sharedWorkflowIds.length) return undefined;

			const execution = await Db.collections.Execution.findOne({
				where: {
					id: executionId,
					workflowId: In(sharedWorkflowIds),
				},
			});

			if (!execution) {
				LoggerProxy.info('Attempt to read execution was blocked due to insufficient permissions', {
					userId: req.user.id,
					executionId,
				});
				return undefined;
			}

			if (req.query.unflattedResponse === 'true') {
				return ResponseHelper.unflattenExecutionData(execution);
			}

			const { id, ...rest } = execution;

			// @ts-ignore
			return {
				id: id.toString(),
				...rest,
			};
		},
	),
);

/**
 * POST /executions/:id/retry
 */
executionsController.post(
	'/:id/retry',
	ResponseHelper.send(async (req: ExecutionRequest.Retry): Promise<boolean> => {
		const { id: executionId } = req.params;

		const sharedWorkflowIds = await getSharedWorkflowIds(req.user);

		if (!sharedWorkflowIds.length) return false;

		const execution = await Db.collections.Execution.findOne({
			where: {
				id: executionId,
				workflowId: In(sharedWorkflowIds),
			},
		});

		if (!execution) {
			LoggerProxy.info(
				'Attempt to retry an execution was blocked due to insufficient permissions',
				{
					userId: req.user.id,
					executionId,
				},
			);
			throw new ResponseHelper.ResponseError(
				`The execution with the ID "${executionId}" does not exist.`,
				404,
				404,
			);
		}

		const fullExecutionData = ResponseHelper.unflattenExecutionData(execution);

		if (fullExecutionData.finished) {
			throw new Error('The execution succeeded, so it cannot be retried.');
		}

		const executionMode = 'retry';

		fullExecutionData.workflowData.active = false;

		// Start the workflow
		const data: IWorkflowExecutionDataProcess = {
			executionMode,
			executionData: fullExecutionData.data,
			retryOf: req.params.id,
			workflowData: fullExecutionData.workflowData,
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
			const workflowId = fullExecutionData.workflowData.id;
			const workflowData = (await Db.collections.Workflow.findOne(workflowId)) as IWorkflowBase;

			if (workflowData === undefined) {
				throw new Error(
					`The workflow with the ID "${workflowId}" could not be found and so the data not be loaded for the retry.`,
				);
			}

			data.workflowData = workflowData;
			const nodeTypes = NodeTypes();
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

		const executionData = await ActiveExecutions.getInstance().getPostExecutePromise(
			retriedExecutionId,
		);

		if (!executionData) {
			throw new Error('The retry did not start for an unknown reason.');
		}

		return !!executionData.finished;
	}),
);

/**
 * POST /executions/delete
 * INFORMATION: We use POST instead of DELETE to not run into any issues with the query data
 * getting too long
 */
executionsController.post(
	'/delete',
	ResponseHelper.send(async (req: ExecutionRequest.Delete): Promise<void> => {
		const { deleteBefore, ids, filters: requestFilters } = req.body;

		if (!deleteBefore && !ids) {
			throw new Error('Either "deleteBefore" or "ids" must be present in the request body');
		}

		const sharedWorkflowIds = await getSharedWorkflowIds(req.user);
		const binaryDataManager = BinaryDataManager.getInstance();

		// delete executions by date, if user may access the underyling workflows

		if (deleteBefore) {
			const filters: IDataObject = {
				startedAt: LessThanOrEqual(deleteBefore),
			};

			if (filters) {
				Object.assign(filters, requestFilters);
			}

			const executions = await Db.collections.Execution.find({
				where: {
					workflowId: In(sharedWorkflowIds),
					...filters,
				},
			});

			if (!executions.length) return;

			const idsToDelete = executions.map(({ id }) => id.toString());

			await Promise.all(
				idsToDelete.map(async (id) => binaryDataManager.deleteBinaryDataByExecutionId(id)),
			);

			await Db.collections.Execution.delete({ id: In(idsToDelete) });

			return;
		}

		// delete executions by IDs, if user may access the underyling workflows

		if (ids) {
			const executions = await Db.collections.Execution.find({
				where: {
					id: In(ids),
					workflowId: In(sharedWorkflowIds),
				},
			});

			if (!executions.length) {
				LoggerProxy.error('Failed to delete an execution due to insufficient permissions', {
					userId: req.user.id,
					executionIds: ids,
				});
				return;
			}

			const idsToDelete = executions.map(({ id }) => id.toString());

			await Promise.all(
				idsToDelete.map(async (id) => binaryDataManager.deleteBinaryDataByExecutionId(id)),
			);

			await Db.collections.Execution.delete(idsToDelete);
		}
	}),
);
