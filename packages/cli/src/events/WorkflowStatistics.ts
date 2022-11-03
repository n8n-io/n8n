import { eventEmitter } from 'n8n-core';
import { INode, IRun, IWorkflowBase } from 'n8n-workflow';
import { Db, InternalHooksManager } from '..';
import { StatisticsNames } from '../databases/entities/WorkflowStatistics';
import { getWorkflowOwner } from '../UserManagement/UserManagementHelper';

eventEmitter.on(
	eventEmitter.types.workflowExecutionCompleted,
	async (workflowData: IWorkflowBase, runData: IRun) => {
		// Determine the name of the statistic
		const finished = runData.finished ? runData.finished : false;
		const manual = runData.mode === 'manual';
		let name: StatisticsNames;

		if (finished) {
			if (manual) name = StatisticsNames.manualSuccess;
			else name = StatisticsNames.productionSuccess;
		} else {
			if (manual) name = StatisticsNames.manualError;
			else name = StatisticsNames.productionError;
		}

		// Get the workflow id
		let workflowId: number;
		try {
			workflowId = parseInt(workflowData.id as string, 10);
		} catch (error) {
			console.error(`Error ${error as string} when casting workflow ID to a number`);
			return;
		}

		// Try insertion and if it fails due to key conflicts then update the existing entry instead
		try {
			await Db.collections.WorkflowStatistics.insert({ count: 1, name, workflowId });

			// If we're here we can check if we're sending the first production success metric
			if (name !== StatisticsNames.productionSuccess) return;

			// Get the owner of the workflow so we can send the metric
			const owner = await getWorkflowOwner(workflowId);
			const metrics = {
				user_id: owner.id,
				workflow_id: workflowId,
			};

			// Send the metrics
			await InternalHooksManager.getInstance().onFirstProductionWorkflowSuccess(metrics);
		} catch (error) {
			// Do we just assume it's a conflict error? If there is any other sort of error in the DB it should trigger here too
			await Db.collections.WorkflowStatistics.update(
				{ workflowId, name },
				{ count: () => '"count" + 1' },
			);
		}
	},
);

eventEmitter.on(eventEmitter.types.nodeFetchedData, async (workflowId: string, node: INode) => {
	console.log(node);
	// Get the workflow id
	let id: number;
	try {
		id = parseInt(workflowId, 10);
	} catch (error) {
		console.error(`Error ${error as string} when casting workflow ID to a number`);
		return;
	}

	// Update only if necessary
	const response = await Db.collections.Workflow.update(
		{ id, dataLoaded: false },
		{ dataLoaded: true },
	);

	// If response.affected is 1 then we know this was the first time data was loaded into the workflow; do posthog event here
	if (response.affected) {
		console.log('posthog');
	}
});
