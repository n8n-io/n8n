import type {
	IConnections,
	INodeConnection,
	INodeExecutionData,
	IPinData,
	IRunData,
} from 'n8n-workflow';
import { executeDataImpl } from '@/workers/expressions/resolveParameter/executeData';

export function connectionInputData(
	connections: IConnections,
	parentNode: string[],
	currentNode: string,
	inputName: string,
	runIndex: number,
	shouldReplaceInputDataWithPinData: boolean | undefined,
	pinData: IPinData | undefined,
	workflowRunData: IRunData | null,
	nodeConnection: INodeConnection = { sourceIndex: 0, destinationIndex: 0 },
): INodeExecutionData[] | null {
	let connectionInputData: INodeExecutionData[] | null = null;
	const _executeData = executeDataImpl(
		connections,
		parentNode,
		currentNode,
		inputName,
		runIndex,
		shouldReplaceInputDataWithPinData,
		pinData,
		workflowRunData,
	);
	if (parentNode.length) {
		if (
			!Object.keys(_executeData.data).length ||
			_executeData.data[inputName].length <= nodeConnection.sourceIndex
		) {
			connectionInputData = [];
		} else {
			connectionInputData = _executeData.data[inputName][nodeConnection.sourceIndex];

			if (connectionInputData !== null) {
				// Update the pairedItem information on items
				connectionInputData = connectionInputData.map((item, itemIndex) => {
					return {
						...item,
						pairedItem: {
							item: itemIndex,
							input: nodeConnection.destinationIndex,
						},
					};
				});
			}
		}
	}

	return connectionInputData;
}
