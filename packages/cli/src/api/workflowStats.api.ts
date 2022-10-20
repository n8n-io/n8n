import express from 'express';
import { LoggerProxy } from 'n8n-workflow';
import { In } from 'typeorm';
import { ResponseHelper, IWorkflowStatisticsCounts, Db } from '..';
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
async function checkWorkflowId(workflowId: string): Promise<void> {
	const workflow = await Db.collections.Workflow.findOne(workflowId);
	if (!workflow) {
		throw new ResponseHelper.ResponseError(
			`The workflow with the ID "${workflowId}" does not exist.`,
			404,
			404,
		);
	}
}

// Base endpoint is /workflow-stats
workflowStatsController.get(
	'/:id/counts/',
	ResponseHelper.send(async (req: ExecutionRequest.Get): Promise<IWorkflowStatisticsCounts> => {
		// Get counts from DB
		const workflowId = req.params.id;
		console.log(workflowId);

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
