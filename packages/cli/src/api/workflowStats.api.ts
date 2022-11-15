import { User } from '@/databases/entities/User';
import express from 'express';
import { LoggerProxy } from 'n8n-workflow';
import {
	Db,
	IWorkflowStatisticsCounts,
	IWorkflowStatisticsDataLoaded,
	IWorkflowStatisticsTimestamps,
	ResponseHelper,
	whereClause,
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
async function checkWorkflowId(workflowId: string, user: User): Promise<WorkflowEntity> {
	const workflow = await Db.collections.Workflow.findOne(workflowId);
	if (!workflow) {
		throw new ResponseHelper.ResponseError(
			`Workflow with ID "${workflowId}" could not be found..`,
			404,
			404,
		);
	}

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
		LoggerProxy.info('User attempted to read a workflow without permissions', {
			workflowId,
			userId: user.id,
		});
		throw new ResponseHelper.ResponseError(
			`Workflow with ID "${workflowId}" could not be found.`,
			undefined,
			400,
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
		await checkWorkflowId(workflowId, req.user);

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
		await checkWorkflowId(workflowId, req.user);

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
		const workflow = await checkWorkflowId(workflowId, req.user);

		const data: IWorkflowStatisticsDataLoaded = {
			dataLoaded: workflow.dataLoaded,
		};

		return data;
	}),
);
