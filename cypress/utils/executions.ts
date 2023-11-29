import { ITaskData } from '../../packages/workflow/src';
import { IPinData } from '../../packages/workflow';
import { clickExecuteWorkflowButton } from '../composables/workflow';

export function createMockNodeExecutionData(
	name: string,
	{
		data,
		inputOverride,
		executionStatus = 'success',
		jsonData,
		...rest
	}: Partial<ITaskData> & { jsonData?: Record<string, object> },
): Record<string, ITaskData> {
	return {
		[name]: {
			startTime: new Date().getTime(),
			executionTime: 0,
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
				  }, {})
				: data,
			source: [null],
			...rest,
		},
	};
}

export function createMockWorkflowExecutionData({
	executionId,
	runData,
	pinData = {},
	lastNodeExecuted,
}: {
	executionId: string;
	runData: Record<string, ITaskData | ITaskData[]>;
	pinData?: IPinData;
	lastNodeExecuted: string;
}) {
	return {
		executionId,
		data: {
			data: {
				startData: {},
				resultData: {
					runData,
					pinData,
					lastNodeExecuted,
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			},
			mode: 'manual',
			startedAt: new Date().toISOString(),
			stoppedAt: new Date().toISOString(),
			status: 'success',
			finished: true,
		},
	};
}

export function runMockWorkflowExcution({
	trigger,
	lastNodeExecuted,
	runData,
	workflowExecutionData,
}: {
	trigger?: () => void;
	lastNodeExecuted: string;
	runData: Array<ReturnType<typeof createMockNodeExecutionData>>;
	workflowExecutionData?: ReturnType<typeof createMockWorkflowExecutionData>;
}) {
	const executionId = Math.random().toString(36).substring(4);

	cy.intercept('POST', '/rest/workflows/run', {
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

	const resolvedRunData = {};
	runData.forEach((nodeExecution) => {
		const nodeName = Object.keys(nodeExecution)[0];
		const nodeRunData = nodeExecution[nodeName];

		cy.push('nodeExecuteBefore', {
			executionId,
			nodeName,
		});
		cy.push('nodeExecuteAfter', {
			executionId,
			nodeName,
			data: nodeRunData,
		});

		resolvedRunData[nodeName] = nodeExecution[nodeName];
	});

	cy.push(
		'executionFinished',
		createMockWorkflowExecutionData({
			executionId,
			lastNodeExecuted,
			runData: resolvedRunData,
			...workflowExecutionData,
		}),
	);
}
