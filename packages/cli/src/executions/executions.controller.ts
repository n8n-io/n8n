/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
import express from 'express';
import { LoggerProxy } from 'n8n-workflow';
import {
	IExecutionFlattedResponse,
	IExecutionResponse,
	IExecutionsListResponse,
} from '@/Interfaces';
import * as ResponseHelper from '@/ResponseHelper';
import { getLogger } from '@/Logger';
import type { ExecutionRequest } from '@/requests';
import { EEExecutionsController } from './executions.controller.ee';
import { ExecutionsService } from './executions.service';

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
		const sharedWorkflowIds = await ExecutionsService.getWorkflowIdsForUser(req.user);
		await ExecutionsService.deleteExecutions(req, sharedWorkflowIds);
	}),
);
