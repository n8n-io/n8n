import { Container } from 'typedi';

import type { IRunExecutionData, ITaskData, IWorkflowBase } from 'n8n-workflow';
import { ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';

import { Logger } from '@/Logger';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { toSaveSettings } from '@/executionLifecycleHooks/toSaveSettings';

export async function saveExecutionProgress(
	workflowData: IWorkflowBase,
	executionId: string,
	nodeName: string,
	data: ITaskData,
	executionData: IRunExecutionData,
	sessionId?: string,
) {
	const saveSettings = toSaveSettings(workflowData.settings);

	if (!saveSettings.progress) return;

	const logger = Container.get(Logger);

	try {
		logger.debug(`Save execution progress to database for execution ID ${executionId} `, {
			executionId,
			nodeName,
		});

		const fullExecutionData = await Container.get(ExecutionRepository).findSingleExecution(
			executionId,
			{
				includeData: true,
				unflattenData: true,
			},
		);

		if (!fullExecutionData) {
			// Something went badly wrong if this happens.
			// This check is here mostly to make typescript happy.
			return;
		}

		if (fullExecutionData.finished) {
			// We already received ´workflowExecuteAfter´ webhook, so this is just an async call
			// that was left behind. We skip saving because the other call should have saved everything
			// so this one is safe to ignore
			return;
		}

		if (fullExecutionData.data === undefined) {
			fullExecutionData.data = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: [],
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};
		}

		if (Array.isArray(fullExecutionData.data.resultData.runData[nodeName])) {
			// Append data if array exists
			fullExecutionData.data.resultData.runData[nodeName].push(data);
		} else {
			// Initialize array and save data
			fullExecutionData.data.resultData.runData[nodeName] = [data];
		}

		fullExecutionData.data.executionData = executionData.executionData;

		// Set last executed node so that it may resume on failure
		fullExecutionData.data.resultData.lastNodeExecuted = nodeName;

		fullExecutionData.status = 'running';

		await Container.get(ExecutionRepository).updateExistingExecution(
			executionId,
			fullExecutionData,
		);
	} catch (e) {
		const error = e instanceof Error ? e : new Error(`${e}`);

		ErrorReporter.error(error);
		// TODO: Improve in the future!
		// Errors here might happen because of database access
		// For busy machines, we may get "Database is locked" errors.

		// We do this to prevent crashes and executions ending in `unknown` state.
		logger.error(
			`Failed saving execution progress to database for execution ID ${executionId} (hookFunctionsPreExecute, nodeExecuteAfter)`,
			{
				...error,
				executionId,
				sessionId,
				workflowId: workflowData.id,
			},
		);
	}
}
