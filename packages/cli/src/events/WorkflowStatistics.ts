import { eventEmitter } from 'n8n-core';
import { IRun, IWorkflowBase } from 'n8n-workflow';
import { Db } from '..';
import { StatisticsNames } from '../databases/entities/WorkflowStatistics';

eventEmitter.on('saveWorkflowStatistics', async (workflowData: IWorkflowBase, runData: IRun) => {
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
		console.log(await Db.collections.WorkflowStatistics.insert({ count: 1, name, workflowId }));

		// TODO - Add first production run code here
	} catch (error) {
		// Do we just assume it's a conflict error? If there is any other sort of error in the DB it should trigger here too
		await Db.collections.WorkflowStatistics.update(
			{ workflowId, name },
			{ count: () => '"count" + 1' },
		);
	}
});
