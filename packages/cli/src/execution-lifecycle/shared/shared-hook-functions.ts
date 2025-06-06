import { Logger } from '@n8n/backend-common';
import type { IExecutionDb } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import pick from 'lodash/pick';
import { ensureError, type ExecutionStatus, type IRun, type IWorkflowBase } from 'n8n-workflow';

import type { UpdateExecutionPayload } from '@/interfaces';
import { ExecutionMetadataService } from '@/services/execution-metadata.service';
import { isWorkflowIdValid } from '@/utils';

export function determineFinalExecutionStatus(runData: IRun): ExecutionStatus {
	const workflowHasCrashed = runData.status === 'crashed';
	const workflowWasCanceled = runData.status === 'canceled';
	const workflowHasFailed = runData.status === 'error';
	const workflowDidSucceed =
		!runData.data.resultData?.error &&
		!workflowHasCrashed &&
		!workflowWasCanceled &&
		!workflowHasFailed;
	let workflowStatusFinal: ExecutionStatus = workflowDidSucceed ? 'success' : 'error';
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
		'isArchived',
		'createdAt',
		'updatedAt',
		'nodes',
		'connections',
		'settings',
		'staticData',
		'pinData',
	]);

	const fullExecutionData: UpdateExecutionPayload = {
		data: runData.data,
		mode: runData.mode,
		finished: runData.finished ? runData.finished : false,
		startedAt: runData.startedAt,
		stoppedAt: runData.stoppedAt,
		workflowData: pristineWorkflowData,
		waitTill: runData.waitTill,
		status: workflowStatusFinal,
		workflowId: pristineWorkflowData.id,
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
	const logger = Container.get(Logger);
	const { executionId, workflowId, executionData } = parameters;
	// Leave log message before flatten as that operation increased memory usage a lot and the chance of a crash is highest here
	logger.debug(`Save execution data to database for execution ID ${executionId}`, {
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
		const error = ensureError(e);
		logger.error(`Failed to save metadata for execution ID ${executionId}`, { error });
	}

	if (executionData.finished === true && executionData.retryOf !== undefined) {
		await Container.get(ExecutionRepository).updateExistingExecution(executionData.retryOf, {
			retrySuccessId: executionId,
		});
	}
}
