import { INode, IRun, IWorkflowBase } from 'n8n-workflow';
import * as Db from '@/Db';
import { InternalHooksManager } from '@/InternalHooksManager';
import { StatisticsNames } from '@db/entities/WorkflowStatistics';
import { getWorkflowOwner } from '@/UserManagement/UserManagementHelper';
import { QueryFailedError } from 'typeorm';

export async function workflowExecutionCompleted(
	workflowData: IWorkflowBase,
	runData: IRun,
): Promise<void> {
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
	const workflowId = workflowData.id;
	if (!workflowId) return;

	// Try insertion and if it fails due to key conflicts then update the existing entry instead
	try {
		await Db.collections.WorkflowStatistics.insert({
			count: 1,
			name,
			workflowId,
			latestEvent: new Date(),
		});

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
		if (!(error instanceof QueryFailedError)) {
			throw error;
		}

		await Db.collections.WorkflowStatistics.update(
			{ workflowId, name },
			{ count: () => 'count + 1', latestEvent: new Date() },
		);
	}
}

export async function nodeFetchedData(
	workflowId: string | undefined | null,
	node: INode,
): Promise<void> {
	if (!workflowId) return;
	// Try to insert the data loaded statistic
	try {
		await Db.collections.WorkflowStatistics.insert({
			workflowId,
			name: StatisticsNames.dataLoaded,
			count: 1,
			latestEvent: new Date(),
		});
	} catch (error) {
		// if it's a duplicate key error then that's fine, otherwise throw the error
		if (!(error instanceof QueryFailedError)) {
			throw error;
		}
		// If it is a query failed error, we return
		return;
	}

	// Compile the metrics since this was a new data loaded event
	const owner = await getWorkflowOwner(workflowId);
	let metrics = {
		user_id: owner.id,
		workflow_id: workflowId,
		node_type: node.type,
		node_id: node.id,
	};

	// This is probably naive but I can't see a way for a node to have multiple credentials attached so..
	if (node.credentials) {
		Object.entries(node.credentials).forEach(([credName, credDetails]) => {
			metrics = Object.assign(metrics, {
				credential_type: credName,
				credential_id: credDetails.id,
			});
		});
	}

	// Send metrics to posthog
	await InternalHooksManager.getInstance().onFirstWorkflowDataLoad(metrics);
}
