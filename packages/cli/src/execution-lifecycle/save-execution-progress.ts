import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { IRunExecutionData, ITaskData } from 'n8n-workflow';

export async function saveExecutionProgress(
	workflowId: string,
	executionId: string,
	nodeName: string,
	data: ITaskData,
	executionData: IRunExecutionData,
) {
	const logger = Container.get(Logger);
	const executionRepository = Container.get(ExecutionRepository);
	const errorReporter = Container.get(ErrorReporter);

	try {
		logger.debug(`Save execution progress to database for execution ID ${executionId} `, {
			executionId,
			nodeName,
		});

		const fullExecutionData = await executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

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

		fullExecutionData.data ??= {
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

		const { runData } = fullExecutionData.data.resultData;
		(runData[nodeName] ??= []).push(data);

		fullExecutionData.data.executionData = executionData.executionData;

		// Set last executed node so that it may resume on failure
		fullExecutionData.data.resultData.lastNodeExecuted = nodeName;

		// If the execution was canceled, we do not change the status
		// to running, because it is already canceled.
		if (fullExecutionData.status !== 'canceled') {
			fullExecutionData.status = 'running';
		}

		await executionRepository.updateExistingExecution(executionId, fullExecutionData);
	} catch (e) {
		const error = e instanceof Error ? e : new Error(`${e}`);

		errorReporter.error(error);
		// TODO: Improve in the future!
		// Errors here might happen because of database access
		// For busy machines, we may get "Database is locked" errors.

		// We do this to prevent crashes and executions ending in `unknown` state.
		logger.error(
			`Failed saving execution progress to database for execution ID ${executionId} (hookFunctionsSaveProgress, nodeExecuteAfter)`,
			{ error, executionId, workflowId },
		);
	}
}
