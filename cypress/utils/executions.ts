import { stringify } from 'flatted';
import type { IDataObject, ITaskData, ITaskDataConnections } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { clickExecuteWorkflowButton } from '../composables/workflow';

export function createMockNodeExecutionData(
	name: string,
	{
		data,
		inputOverride,
		executionStatus = 'success',
		jsonData,
		...rest
	}: Partial<ITaskData> & { jsonData?: Record<string, IDataObject> },
): Record<string, ITaskData> {
	return {
		[name]: {
			startTime: Date.now(),
			executionIndex: 0,
			executionTime: 1,
			executionStatus,
			data: jsonData
				? Object.keys(jsonData).reduce((acc, key) => {
						acc[key] = [
							[
								{
									json: jsonData[key],
									pairedItem: { item: 0 },
								},
							],
						];

						return acc;
					}, {} as ITaskDataConnections)
				: data,
			source: [null],
			inputOverride,
			...rest,
		},
	};
}

export function runMockWorkflowExecution({
	trigger,
	lastNodeExecuted,
	runData,
}: {
	trigger?: () => void;
	lastNodeExecuted: string;
	runData: Array<ReturnType<typeof createMockNodeExecutionData>>;
}) {
	const workflowId = nanoid();
	const executionId = Math.floor(Math.random() * 1_000_000).toString();

	cy.intercept('POST', '/rest/workflows/**/run?**', {
		statusCode: 201,
		body: {
			data: {
				executionId,
			},
		},
	}).as('runWorkflow');

	if (trigger) {
		trigger();
	} else {
		clickExecuteWorkflowButton();
	}

	cy.wait('@runWorkflow');

	const resolvedRunData: Record<string, ITaskData> = {};
	runData.forEach((nodeExecution) => {
		const nodeName = Object.keys(nodeExecution)[0];
		const nodeRunData = nodeExecution[nodeName];

		cy.push('nodeExecuteBefore', {
			executionId,
			nodeName,
			data: nodeRunData,
		});
		cy.push('nodeExecuteAfter', {
			executionId,
			nodeName,
			data: nodeRunData,
		});

		resolvedRunData[nodeName] = nodeExecution[nodeName];
	});

	cy.push('executionFinished', {
		executionId,
		workflowId,
		status: 'success',
		rawData: stringify({
			startData: {},
			resultData: {
				runData,
				pinData: {},
				lastNodeExecuted,
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		}),
	});
}
