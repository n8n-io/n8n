import express from 'express';
import { LoggerProxy } from 'n8n-workflow';
import {
	Db,
	IWorkflowStatisticsCounts,
	IWorkflowStatisticsDataLoaded,
	IWorkflowStatisticsTimestamps,
	ResponseHelper,
} from '..';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';
import { StatisticsNames } from '../databases/entities/WorkflowStatistics';
import { getLogger } from '../Logger';
import { ExecutionRequest } from '../requests';

export const workflowStatsController = express.Router();

/**
 * Initialise Logger if needed
 */
workflowStatsController.use((req, res, next) => {
	try {
		LoggerProxy.getInstance();
	} catch (error) {
		LoggerProxy.init(getLogger());
	}
	next();
});

// Helper function that validates the ID, throws an error if not valud
async function checkWorkflowId(workflowId: string): Promise<WorkflowEntity> {
	const workflow = await Db.collections.Workflow.findOne(workflowId);
	if (!workflow) {
		throw new ResponseHelper.ResponseError(
			`The workflow with the ID "${workflowId}" does not exist.`,
			404,
			404,
		);
	}
	return workflow;
}

/**
 * GET /workflow-stats/:id/counts/
 */
workflowStatsController.get(
	'/:id/counts/',
	ResponseHelper.send(async (req: ExecutionRequest.Get): Promise<IWorkflowStatisticsCounts> => {
		// Get counts from DB
		const workflowId = req.params.id;

		// Check that the id is valid
		await checkWorkflowId(workflowId);

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

		// Check that the id is valid
		await checkWorkflowId(workflowId);

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

		// Get the corresponding workflow
		const workflow = await checkWorkflowId(workflowId);

		const data: IWorkflowStatisticsDataLoaded = {
			dataLoaded: workflow.dataLoaded,
		};

		return data;
	}),
);
