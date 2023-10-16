import type { ExecutionStatus, IRun, IWorkflowBase } from 'n8n-workflow';
import type { ExecutionPayload, IExecutionDb } from '@/Interfaces';
import pick from 'lodash/pick';
import { isWorkflowIdValid } from '@/utils';
import { LoggerProxy } from 'n8n-workflow';
import Container from 'typedi';
import { ExecutionRepository } from '../../databases/repositories';
import { ExecutionMetadataService } from '../../services/executionMetadata.service';

export function determineFinalExecutionStatus(runData: IRun): ExecutionStatus {
	const workflowHasCrashed = runData.status === 'crashed';
	const workflowWasCanceled = runData.status === 'canceled';
	const workflowDidSucceed =
		!runData.data.resultData.error && !workflowHasCrashed && !workflowWasCanceled;
	let workflowStatusFinal: ExecutionStatus = workflowDidSucceed ? 'success' : 'failed';
	if (workflowHasCrashed) workflowStatusFinal = 'crashed';
	if (workflowWasCanceled) workflowStatusFinal = 'canceled';
	if (runData.waitTill) workflowStatusFinal = 'waiting';
	return workflowStatusFinal;
}

export function prepareExecutionDataForDbUpdate(parameters: {
	runData: IRun;
	workflowData: IWorkflowBase;
	workflowStatusFinal: ExecutionStatus;
	retryOf?: string;
}) {
	const { runData, workflowData, workflowStatusFinal, retryOf } = parameters;
	// Although it is treated as IWorkflowBase here, it's being instantiated elsewhere with properties that may be sensitive
	// As a result, we should create an IWorkflowBase object with only the data we want to save in it.
	const pristineWorkflowData: IWorkflowBase = pick(workflowData, [
		'id',
		'name',
		'active',
		'createdAt',
		'updatedAt',
		'nodes',
		'connections',
		'settings',
		'staticData',
		'pinData',
	]);

	const fullExecutionData: ExecutionPayload = {
		data: runData.data,
		mode: runData.mode,
		finished: runData.finished ? runData.finished : false,
		startedAt: runData.startedAt,
		stoppedAt: runData.stoppedAt,
		workflowData: pristineWorkflowData,
		waitTill: runData.waitTill,
		status: workflowStatusFinal,
	};

	if (retryOf !== undefined) {
		fullExecutionData.retryOf = retryOf.toString();
	}

	const workflowId = workflowData.id;
	if (isWorkflowIdValid(workflowId)) {
		fullExecutionData.workflowId = workflowId;
	}

	return fullExecutionData;
}

export async function updateExistingExecution(parameters: {
	executionId: string;
	workflowId: string;
	executionData: Partial<IExecutionDb>;
}) {
	const { executionId, workflowId, executionData } = parameters;
	// Leave log message before flatten as that operation increased memory usage a lot and the chance of a crash is highest here
	LoggerProxy.debug(`Save execution data to database for execution ID ${executionId}`, {
		executionId,
		workflowId,
		finished: executionData.finished,
		stoppedAt: executionData.stoppedAt,
	});

	await Container.get(ExecutionRepository).updateExistingExecution(executionId, executionData);

	try {
		if (executionData.data?.resultData.metadata) {
			await Container.get(ExecutionMetadataService).save(
				executionId,
				executionData.data.resultData.metadata,
			);
		}
	} catch (e) {
		LoggerProxy.error(`Failed to save metadata for execution ID ${executionId}`, e as Error);
	}

	if (executionData.finished === true && executionData.retryOf !== undefined) {
		await Container.get(ExecutionRepository).updateExistingExecution(executionData.retryOf, {
			retrySuccessId: executionId,
		});
	}
}
