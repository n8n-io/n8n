import { proxyActivities } from '@temporalio/workflow';
// Only import the activity types
import type * as activities from './TemporalActivities';

import type { IDeferredPromise, IExecuteResponsePromiseData } from 'n8n-workflow';

import type { IWorkflowExecutionDataProcess } from '@/Interfaces';

const { n8nActivity, doItRight } = proxyActivities<typeof activities>({
	startToCloseTimeout: '1 minute',
});

export async function executeN8nWorkflow(
	data: IWorkflowExecutionDataProcess,
	loadStaticData?: boolean,
	restartExecutionId?: string,
	responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
): Promise<string> {
	return n8nActivity(data, loadStaticData, restartExecutionId, responsePromise);
}

export async function doWorkflowRight(data: IWorkflowExecutionDataProcess, executionId: string) {
	return doItRight(data, executionId);
}
