import { Service } from '@n8n/di';
import type { ExecutionError, INode, IRun, WorkflowExecuteMode } from 'n8n-workflow';

@Service()
export class ExecutionDataService {
	generateFailedExecutionFromError(
		mode: WorkflowExecuteMode,
		error: ExecutionError,
		node: INode | undefined,
		startTime = Date.now(),
	): IRun {
		const executionError = {
			...error,
			message: error.message,
			stack: error.stack,
		};
		const returnData: IRun = {
			data: {
				resultData: {
					error: executionError,
					runData: {},
				},
			},
			finished: false,
			mode,
			startedAt: new Date(),
			stoppedAt: new Date(),
			status: 'error',
		};

		if (node) {
			returnData.data.startData = {
				destinationNode: node.name,
				runNodeFilter: [node.name],
			};
			returnData.data.resultData.lastNodeExecuted = node.name;
			returnData.data.resultData.runData[node.name] = [
				{
					startTime,
					executionIndex: 0,
					executionTime: 0,
					executionStatus: 'error',
					error: executionError,
					source: [],
				},
			];
			returnData.data.executionData = {
				contextData: {},
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
				nodeExecutionStack: [
					{
						node,
						data: {},
						source: null,
					},
				],
			};
		}
		return returnData;
	}
}
