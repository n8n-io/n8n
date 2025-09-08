import {
	type IConnection,
	type IExecuteData,
	type INode,
	type INodeExecutionData,
	type IRunData,
	type IRunNodeResponse,
	type ITaskMetadata,
	type Request,
	type Workflow,
	type LoggerProxy,
	UnexpectedError,
} from 'n8n-workflow';

type NodeToBeExecuted = {
	inputConnectionData: IConnection;
	parentOutputIndex: number;
	parentNode: string;
	parentOutputData: INodeExecutionData[][];
	runIndex: number;
	nodeRunIndex: number;
	metadata?: ITaskMetadata;
};

// if runNodeData is Request
// 1. stop executing current node and put it as paused on the stack
//	- do any clean up of execution variables
// 2. put actions nodes on the stack, rewiring the graph potentially?
// 3. continue executionLoop
// 4. when hitting the paused node again, restore the state and call the execute method on the paused node again
export function handleRequests({
	workflow,
	currentNode,
	request,
	runIndex,
	executionData,
	runData,
	logger,
}: {
	workflow: Workflow;
	currentNode: INode;
	request: Request;
	runIndex: number;
	executionData: IExecuteData;
	runData: IRunData;
	logger: typeof LoggerProxy;
}): {
	nodesToBeExecuted: NodeToBeExecuted[];
} {
	// 1. collect nodes to be put on the stack
	const nodesToBeExecuted: NodeToBeExecuted[] = [];
	const subNodeExecutionData: ITaskMetadata['subNodeExecutionData'] = {
		actions: [],
		metadata: request.metadata,
	};
	for (const action of request.actions) {
		const node = workflow.getNode(action.nodeName);

		if (!node) {
			throw new UnexpectedError(
				`Workflow does not contain a node with the name of "${action.nodeName}".`,
			);
		}

		node.rewireOutputLogTo = action.type;
		const inputConnectionData: IConnection = {
			// agents always have a main input
			type: action.type,
			node: action.nodeName,
			// tools always have only one input
			index: 0,
		};
		const parentNode = currentNode.name;
		const parentOutputData: INodeExecutionData[][] = [
			[
				{
					json: {
						...action.input,
						toolCallId: action.id,
					},
				},
			],
		];
		const parentOutputIndex = 0;

		runData[node.name] ||= [];
		const nodeRunData = runData[node.name];
		const nodeRunIndex = nodeRunData.length;
		// TODO: Remove when AI-723 lands.
		nodeRunData.push({
			// Necessary for the log on the canvas.
			inputOverride: { ai_tool: parentOutputData },
			source: [],
			executionIndex: 0,
			executionTime: 0,
			startTime: 0,
		});

		nodesToBeExecuted.push({
			inputConnectionData,
			parentOutputIndex,
			parentNode,
			parentOutputData,
			runIndex,
			nodeRunIndex,
		});
		subNodeExecutionData.actions.push({
			action,
			nodeName: action.nodeName,
			runIndex: nodeRunIndex,
		});
	}

	// 2. create metadata for current node
	const parentNode = executionData.source?.main?.[0]?.previousNode;
	if (!parentNode) {
		logger.warn('Cannot find parent node for subnode execution', {
			executionNode: executionData.node.name,
			sourceData: executionData.source,
			workflowId: workflow.id,
		});

		return { nodesToBeExecuted: [] };
	}
	const connectionData: IConnection = {
		// agents always have a main input
		type: 'ai_tool',
		node: executionData.node.name,
		// agents always have only one input
		index: 0,
	};

	// 3. add current node back to the bottom of the stack
	nodesToBeExecuted.unshift({
		inputConnectionData: connectionData,
		parentOutputIndex: 0,
		parentNode,
		parentOutputData: executionData.data.main as INodeExecutionData[][],
		runIndex,
		nodeRunIndex: runIndex,
		metadata: { subNodeExecutionData },
	});

	return { nodesToBeExecuted };
}

export function isRequest(
	responseOrRequest: INodeExecutionData[][] | IRunNodeResponse | Request | null | undefined,
): responseOrRequest is Request {
	return !!responseOrRequest && 'actions' in responseOrRequest;
}
