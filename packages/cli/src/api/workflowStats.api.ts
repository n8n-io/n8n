import type { User } from '@db/entities/User';
import { whereClause } from '@/UserManagement/UserManagementHelper';
import express from 'express';
import { LoggerProxy } from 'n8n-workflow';
import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import type {
	IWorkflowStatisticsCounts,
	IWorkflowStatisticsDataLoaded,
	IWorkflowStatisticsTimestamps,
} from '@/Interfaces';
import { StatisticsNames } from '@db/entities/WorkflowStatistics';
import { getLogger } from '../Logger';
import type { ExecutionRequest } from '../requests';

export const workflowStatsController = express.Router();

// Helper function that validates the ID, return a flag stating whether the request is allowed
async function checkWorkflowId(workflowId: string, user: User): Promise<boolean> {
	// Check permissions
	const shared = await Db.collections.SharedWorkflow.findOne({
		relations: ['workflow'],
		where: whereClause({
			user,
			entityType: 'workflow',
			entityId: workflowId,
		}),
	});

	if (!shared) {
		LoggerProxy.verbose('User attempted to read a workflow without permissions', {
			workflowId,
			userId: user.id,
		});
		return false;
	}
	return true;
}

/**
 * Initialize Logger if needed
 */
workflowStatsController.use((req, res, next) => {
	try {
		LoggerProxy.getInstance();
	} catch (error) {
		LoggerProxy.init(getLogger());
	}

	next();
});

/**
 * Check that the workflow ID is valid and allowed to be read by the user
 */
workflowStatsController.use(async (req: ExecutionRequest.Get, res, next) => {
	const allowed = await checkWorkflowId(req.params.id, req.user);
	if (allowed) {
		next();
	} else {
		// Otherwise, make and return an error
		const response = new ResponseHelper.NotFoundError(`Workflow ${req.params.id} does not exist.`);
		next(response);
	}
});

/**
 * GET /workflow-stats/:id/counts/
 */
workflowStatsController.get(
	'/:id/counts/',
	ResponseHelper.send(async (req: ExecutionRequest.Get): Promise<IWorkflowStatisticsCounts> => {
		// Get counts from DB
		const workflowId = req.params.id;

		// Find the stats for this workflow
		const stats = await Db.collections.WorkflowStatistics.find({
			select: ['count', 'name'],
			where: {
				workflowId,
			},
		});

		const data: IWorkflowStatisticsCounts = {
			productionSuccess: 0,
			productionError: 0,
			manualSuccess: 0,
			manualError: 0,
		};

		// There will be a maximum of 4 stats (currently)
		stats.forEach(({ count, name }) => {
			switch (name) {
				case StatisticsNames.manualError:
					data.manualError = count;
					break;

				case StatisticsNames.manualSuccess:
					data.manualSuccess = count;
					break;

				case StatisticsNames.productionError:
					data.productionError = count;
					break;

				case StatisticsNames.productionSuccess:
					data.productionSuccess = count;
			}
		});

		return data;
	}),
);

/**
 * GET /workflow-stats/:id/times/
 */
workflowStatsController.get(
	'/:id/times/',
	ResponseHelper.send(async (req: ExecutionRequest.Get): Promise<IWorkflowStatisticsTimestamps> => {
		// Get times from DB
		const workflowId = req.params.id;

		// Find the stats for this workflow
		const stats = await Db.collections.WorkflowStatistics.find({
			select: ['latestEvent', 'name'],
			where: {
				workflowId,
			},
		});

		const data: IWorkflowStatisticsTimestamps = {
			productionSuccess: null,
			productionError: null,
			manualSuccess: null,
			manualError: null,
		};

		// There will be a maximum of 4 stats (currently)
		stats.forEach(({ latestEvent, name }) => {
			switch (name) {
				case StatisticsNames.manualError:
					data.manualError = latestEvent;
					break;

				case StatisticsNames.manualSuccess:
					data.manualSuccess = latestEvent;
					break;

				case StatisticsNames.productionError:
					data.productionError = latestEvent;
					break;

				case StatisticsNames.productionSuccess:
					data.productionSuccess = latestEvent;
			}
		});

		return data;
	}),
);

/**
 * GET /workflow-stats/:id/data-loaded/
 */
workflowStatsController.get(
	'/:id/data-loaded/',
	ResponseHelper.send(async (req: ExecutionRequest.Get): Promise<IWorkflowStatisticsDataLoaded> => {
		// Get flag
		const workflowId = req.params.id;

		// Get the flag
		const stats = await Db.collections.WorkflowStatistics.findOne({
			select: ['latestEvent'],
			where: {
				workflowId,
				name: StatisticsNames.dataLoaded,
			},
		});

		const data: IWorkflowStatisticsDataLoaded = {
			dataLoaded: stats ? true : false,
		};

		return data;
	}),
);
