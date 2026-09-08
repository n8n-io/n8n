import type { INode, INodeExecutionData, IPinData, IRunExecutionData } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

interface TriggerExecutionDataInput {
	triggerNode: INode;
	pinData?: IPinData;
	triggerItems?: INodeExecutionData[];
}

function createEmptyTriggerItems(): INodeExecutionData[] {
	return [{ json: {} }];
}

export function createTriggerExecutionData(input: TriggerExecutionDataInput): IRunExecutionData {
	const triggerItems = input.triggerItems ?? createEmptyTriggerItems();
	return createRunExecutionData({
		startData: {},
		resultData: { pinData: input.pinData, runData: {} },
		executionData: {
			contextData: {},
			metadata: {},
			nodeExecutionStack: [
				{
					node: input.triggerNode,
					data: { main: [triggerItems] },
					source: null,
				},
			],
			waitingExecution: {},
			waitingExecutionSource: {},
		},
	});
}
