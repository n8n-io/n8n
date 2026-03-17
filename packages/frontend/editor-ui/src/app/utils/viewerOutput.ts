import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { INodeExecutionData, ITaskData } from 'n8n-workflow';

export interface ViewerExecutionOutput {
	status: 'success' | 'error' | 'empty';
	nodeName?: string;
	jsonPreview?: string;
	binaryKeys: string[];
	errorMessage?: string;
}

const MAX_JSON_PREVIEW_LENGTH = 5000;

function getErrorMessage(error: unknown): string | undefined {
	if (!error) return undefined;
	if (typeof error === 'string') return error;
	if (error instanceof Error) return error.message;
	if (typeof error === 'object' && error !== null && 'message' in error) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === 'string') {
			return message;
		}
	}
	return undefined;
}

function getTaskOutputItem(task: ITaskData): INodeExecutionData | undefined {
	return task.data?.main?.[0]?.[0];
}

function getJsonPreview(jsonData: INodeExecutionData['json']): string | undefined {
	if (!jsonData || Object.keys(jsonData).length === 0) return undefined;

	try {
		const serialized = JSON.stringify(jsonData, null, 2);
		if (serialized.length <= MAX_JSON_PREVIEW_LENGTH) {
			return serialized;
		}

		return `${serialized.slice(0, MAX_JSON_PREVIEW_LENGTH)}...`;
	} catch {
		return undefined;
	}
}

export function getViewerExecutionOutput(
	execution: IExecutionResponse | null,
): ViewerExecutionOutput | null {
	if (!execution) return null;

	if (!execution.finished && ['new', 'running', 'waiting'].includes(execution.status)) {
		return null;
	}

	const runData = execution.data?.resultData?.runData;
	const executionError = getErrorMessage(execution.data?.resultData?.error);

	if (!runData || Object.keys(runData).length === 0) {
		if (executionError) {
			return {
				status: 'error',
				binaryKeys: [],
				errorMessage: executionError,
			};
		}

		return {
			status: 'empty',
			binaryKeys: [],
		};
	}

	const runDataNodeNames = Object.keys(runData);
	const nodeNames = execution.executedNode
		? [
				execution.executedNode,
				...runDataNodeNames.filter((nodeName) => nodeName !== execution.executedNode).reverse(),
			]
		: [...runDataNodeNames].reverse();

	let taskError: string | undefined;

	for (const nodeName of nodeNames) {
		const tasks = runData[nodeName] ?? [];

		for (let index = tasks.length - 1; index >= 0; index--) {
			const task = tasks[index];
			const outputItem = getTaskOutputItem(task);
			if (outputItem) {
				return {
					status: 'success',
					nodeName,
					jsonPreview: getJsonPreview(outputItem.json),
					binaryKeys: Object.keys(outputItem.binary ?? {}),
				};
			}

			if (!taskError) {
				taskError = getErrorMessage(task.error);
			}
		}
	}

	if (executionError || taskError) {
		return {
			status: 'error',
			binaryKeys: [],
			errorMessage: executionError ?? taskError,
		};
	}

	return {
		status: 'empty',
		binaryKeys: [],
	};
}
