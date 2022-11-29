/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
import express from 'express';
import { validate as jsonSchemaValidate } from 'jsonschema';
import { BinaryDataManager } from 'n8n-core';
import {
	deepCopy,
	IDataObject,
	IWorkflowBase,
	JsonObject,
	jsonParse,
	LoggerProxy,
	Workflow,
} from 'n8n-workflow';
import { FindOperator, In, IsNull, LessThanOrEqual, Not, Raw } from 'typeorm';

import * as ActiveExecutions from '@/ActiveExecutions';
import * as Db from '@/Db';
import {
	IExecutionFlattedResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	IWorkflowExecutionDataProcess,
} from '@/Interfaces';
import { NodeTypes } from '@/NodeTypes';
import * as ResponseHelper from '@/ResponseHelper';
import { WorkflowRunner } from '@/WorkflowRunner';
import config from '@/config';
import { DEFAULT_EXECUTIONS_GET_ALL_LIMIT } from '@/GenericHelpers';
import { getLogger } from '@/Logger';
import * as Queue from '@/Queue';
import type { ExecutionRequest } from '@/requests';
import { EEExecutionsController } from './executions.controller.ee';
import { ExecutionsService } from './executions.service';

interface IGetExecutionsQueryFilter {
	id?: FindOperator<string>;
	finished?: boolean;
	mode?: string;
	retryOf?: string;
	retrySuccessId?: string;
	workflowId?: number | string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	waitTill?: FindOperator<any> | boolean;
}

export const executionsController = express.Router();

const schemaGetExecutionsQueryFilter = {
	$id: '/IGetExecutionsQueryFilter',
	type: 'object',
	properties: {
		finished: { type: 'boolean' },
		mode: { type: 'string' },
		retryOf: { type: 'string' },
		retrySuccessId: { type: 'string' },
		waitTill: { type: 'boolean' },
		workflowId: { anyOf: [{ type: 'integer' }, { type: 'string' }] },
	},
};

const allowedExecutionsQueryFilterFields = Object.keys(schemaGetExecutionsQueryFilter.properties);

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

executionsController.use('/', EEExecutionsController);

/**
 * GET /executions
 */
executionsController.get(
	'/',
	ResponseHelper.send(async (req: ExecutionRequest.GetAll): Promise<IExecutionsListResponse> => {
		const sharedWorkflowIds = await ExecutionsService.getWorkflowIdsForUser(req.user);
		return ExecutionsService.getExecutionsList(req, sharedWorkflowIds);
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
			const sharedWorkflowIds = await ExecutionsService.getWorkflowIdsForUser(req.user);
			return ExecutionsService.getExecution(req, sharedWorkflowIds);
		},
	),
);

/**
 * POST /executions/:id/retry
 */
executionsController.post(
	'/:id/retry',
	ResponseHelper.send(async (req: ExecutionRequest.Retry): Promise<boolean> => {
		const sharedWorkflowIds = await ExecutionsService.getWorkflowIdsForUser(req.user);
		return ExecutionsService.retryExecution(req, sharedWorkflowIds);
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
					`Parameter "filter" contained invalid JSON string.`,
				);
			}
		}

		if (!deleteBefore && !ids) {
			throw new Error('Either "deleteBefore" or "ids" must be present in the request body');
		}

		const sharedWorkflowIds = await ExecutionsService.getWorkflowIdsForUser(req.user);
		if (sharedWorkflowIds.length === 0) {
			// return early since without shared workflows there can be no hits
			// (note: getSharedWorkflowIds() returns _all_ workflow ids for global owners)
			return;
		}

		const binaryDataManager = BinaryDataManager.getInstance();

		// delete executions by date, if user may access the underlying workflows

		if (deleteBefore) {
			const filters: IDataObject = {
				startedAt: LessThanOrEqual(deleteBefore),
			};

			let query = Db.collections.Execution.createQueryBuilder()
				.select()
				.where({
					...filters,
					workflowId: In(sharedWorkflowIds),
				});

			if (requestFilters) {
				query = query.andWhere(requestFilters);
			}

			const executions = await query.getMany();

			if (!executions.length) return;

			const idsToDelete = executions.map(({ id }) => id.toString());

			await Promise.all(
				idsToDelete.map(async (id) => binaryDataManager.deleteBinaryDataByExecutionId(id)),
			);

			await Db.collections.Execution.delete({ id: In(idsToDelete) });

			return;
		}

		// delete executions by IDs, if user may access the underlying workflows

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
