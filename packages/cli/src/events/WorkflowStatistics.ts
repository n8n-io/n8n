import type { INode, IRun, IWorkflowBase } from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';
import * as Db from '@/Db';
import { StatisticsNames } from '@db/entities/WorkflowStatistics';
import { getWorkflowOwner } from '@/UserManagement/UserManagementHelper';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';
import { UserService } from '@/user/user.service';

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

	try {
		const upsertResult = await Db.collections.WorkflowStatistics.upsertWorkflowStatistics(
			name,
			workflowId,
			true,
		);

		if (name === 'production_success' && upsertResult === 'insert') {
			const owner = await getWorkflowOwner(workflowId);
			const metrics = {
				user_id: owner.id,
				workflow_id: workflowId,
			};

			if (!owner.settings?.userActivated) {
				await UserService.updateUserSettings(owner.id, {
					firstSuccessfulWorkflowId: workflowId,
					userActivated: true,
					showUserActivationSurvey: true,
				});
			}

			// Send the metrics
			await Container.get(InternalHooks).onFirstProductionWorkflowSuccess(metrics);
		}
	} catch (error) {
		LoggerProxy.error('Unable to fire first workflow success telemetry event');
	}
}

export async function nodeFetchedData(
	workflowId: string | undefined | null,
	node: INode,
): Promise<void> {
	if (!workflowId) return;
	const upsertResult = await Db.collections.WorkflowStatistics.upsertWorkflowStatistics(
		StatisticsNames.dataLoaded,
		workflowId,
		false,
	);
	if (upsertResult !== 'insert') return;

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
	await Container.get(InternalHooks).onFirstWorkflowDataLoad(metrics);
}
