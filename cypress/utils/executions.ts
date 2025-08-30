import { stringify } from 'flatted';
import pick from 'lodash/pick';
import type {
	IDataObject,
	IRunData,
	IRunExecutionData,
	ITaskData,
	ITaskDataConnections,
} from 'n8n-workflow';
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

	const resolvedRunData = runData.reduce<IRunData>((acc, nodeExecution) => {
		const nodeName = Object.keys(nodeExecution)[0];
		acc[nodeName] = [nodeExecution[nodeName]];
		return acc;
	}, {});

	const executionData: IRunExecutionData = {
		startData: {},
		resultData: {
			runData: resolvedRunData,
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
	};

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

	cy.push('executionStarted', {
		workflowId,
		executionId,
		mode: 'manual',
		startedAt: new Date(),
		workflowName: '',
		flattedRunData: '',
	});

	runData.forEach((nodeExecution) => {
		const nodeName = Object.keys(nodeExecution)[0];
		const nodeRunData = nodeExecution[nodeName];

		cy.push('nodeExecuteBefore', {
			executionId,
			nodeName,
			data: pick(nodeRunData, ['startTime', 'executionIndex', 'source', 'hints']),
		});
		const { data: _, ...taskData } = nodeRunData;
		const itemCount = nodeRunData.data?.main?.[0]?.length ?? 0;
		cy.push('nodeExecuteAfter', {
			executionId,
			nodeName,
			data: taskData,
			itemCount,
		});
		cy.push('nodeExecuteAfterData', {
			executionId,
			nodeName,
			data: nodeRunData,
			itemCount,
		});
	});

	cy.push('executionFinished', {
		executionId,
		workflowId,
		status: 'success',
		rawData: stringify(executionData),
	});
}
