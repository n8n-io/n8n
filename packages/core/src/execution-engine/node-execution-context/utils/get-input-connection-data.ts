/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type {
	CloseFunction,
	IExecuteData,
	IExecuteFunctions,
	INodeExecutionData,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
	SupplyData,
	AINodeConnectionType,
	IDataObject,
	ISupplyDataFunctions,
	INodeType,
	INode,
} from 'n8n-workflow';
import {
	NodeConnectionTypes,
	NodeOperationError,
	ExecutionBaseError,
	ApplicationError,
} from 'n8n-workflow';

import { createNodeAsTool } from './create-node-as-tool';
import type { ExecuteContext, WebhookContext } from '../../node-execution-context';
// eslint-disable-next-line import/no-cycle
import { SupplyDataContext } from '../../node-execution-context/supply-data-context';

export function makeHandleToolInvocation(
	contextFactory: (runIndex: number) => ISupplyDataFunctions,
	node: INode,
	nodeType: INodeType,
) {
	/**
	 * This keeps track of how many times this specific AI tool node has been invoked.
	 * It is incremented on every invocation of the tool to keep the output of each invocation separate from each other.
	 */
	let toolRunIndex = 0;
	return async (toolArgs: IDataObject) => {
		const runIndex = toolRunIndex++;
		const context = contextFactory(runIndex);
		context.addInputData(NodeConnectionTypes.AiTool, [[{ json: toolArgs }]]);

		try {
			// Execute the sub-node with the proxied context
			const result = await nodeType.execute?.call(context as unknown as IExecuteFunctions);

			// Process and map the results
			const mappedResults = result?.[0]?.flatMap((item) => item.json);
			let response: string | typeof mappedResults = mappedResults;

			// Warn if any (unusable) binary data was returned
			if (result?.some((x) => x.some((y) => y.binary))) {
				if (!mappedResults || mappedResults.flatMap((x) => Object.keys(x ?? {})).length === 0) {
					response =
						'Error: The Tool attempted to return binary data, which is not supported in Agents';
				} else {
					context.logger.warn(
						`Response from Tool '${node.name}' included binary data, which is not supported in Agents. The binary data was omitted from the response.`,
					);
				}
			}

			// Add output data to the context
			context.addOutputData(NodeConnectionTypes.AiTool, runIndex, [[{ json: { response } }]]);

			// Return the stringified results
			return JSON.stringify(response);
		} catch (error) {
			const nodeError = new NodeOperationError(node, error as Error);
			context.addOutputData(NodeConnectionTypes.AiTool, runIndex, nodeError);
			return 'Error during node execution: ' + (nodeError.description ?? nodeError.message);
		}
	};
}

export async function getInputConnectionData(
	this: ExecuteContext | WebhookContext | SupplyDataContext,
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	parentRunIndex: number,
	connectionInputData: INodeExecutionData[],
	parentInputData: ITaskDataConnections,
	additionalData: IWorkflowExecuteAdditionalData,
	executeData: IExecuteData,
	mode: WorkflowExecuteMode,
	closeFunctions: CloseFunction[],
	connectionType: AINodeConnectionType,
	itemIndex: number,
	abortSignal?: AbortSignal,
): Promise<unknown> {
	const parentNode = this.getNode();

	const inputConfiguration = this.nodeInputs.find((input) => input.type === connectionType);
	if (inputConfiguration === undefined) {
		throw new ApplicationError('Node does not have input of type', {
			extra: { nodeName: parentNode.name, connectionType },
		});
	}

	const connectedNodes = this.getConnectedNodes(connectionType);
	if (connectedNodes.length === 0) {
		if (inputConfiguration.required) {
			throw new NodeOperationError(
				parentNode,
				`A ${inputConfiguration?.displayName ?? connectionType} sub-node must be connected and enabled`,
			);
		}
		return inputConfiguration.maxConnections === 1 ? undefined : [];
	}

	if (
		inputConfiguration.maxConnections !== undefined &&
		connectedNodes.length > inputConfiguration.maxConnections
	) {
		throw new NodeOperationError(
			parentNode,
			`Only ${inputConfiguration.maxConnections} ${connectionType} sub-nodes are/is allowed to be connected`,
		);
	}

	const nodes: SupplyData[] = [];
	for (const connectedNode of connectedNodes) {
		const connectedNodeType = workflow.nodeTypes.getByNameAndVersion(
			connectedNode.type,
			connectedNode.typeVersion,
		);
		const contextFactory = (runIndex: number, inputData: ITaskDataConnections) =>
			new SupplyDataContext(
				workflow,
				connectedNode,
				additionalData,
				mode,
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				connectionType,
				executeData,
				closeFunctions,
				abortSignal,
				parentNode,
			);

		if (!connectedNodeType.supplyData) {
			if (connectedNodeType.description.outputs.includes(NodeConnectionTypes.AiTool)) {
				const supplyData = createNodeAsTool({
					node: connectedNode,
					nodeType: connectedNodeType,
					handleToolInvocation: makeHandleToolInvocation(
						(i) => contextFactory(i, {}),
						connectedNode,
						connectedNodeType,
					),
				});
				nodes.push(supplyData);
			} else {
				throw new ApplicationError('Node does not have a `supplyData` method defined', {
					extra: { nodeName: connectedNode.name },
				});
			}
		} else {
			const context = contextFactory(parentRunIndex, parentInputData);
			try {
				const supplyData = await connectedNodeType.supplyData.call(context, itemIndex);
				if (supplyData.closeFunction) {
					closeFunctions.push(supplyData.closeFunction);
				}
				nodes.push(supplyData);
			} catch (error) {
				// Propagate errors from sub-nodes
				if (error instanceof ExecutionBaseError) {
					if (error.functionality === 'configuration-node') throw error;
				} else {
					error = new NodeOperationError(connectedNode, error, {
						itemIndex,
					});
				}

				let currentNodeRunIndex = 0;
				if (runExecutionData.resultData.runData.hasOwnProperty(parentNode.name)) {
					currentNodeRunIndex = runExecutionData.resultData.runData[parentNode.name].length;
				}

				// Display the error on the node which is causing it
				await context.addExecutionDataFunctions(
					'input',
					error,
					connectionType,
					parentNode.name,
					currentNodeRunIndex,
				);

				// Display on the calling node which node has the error
				throw new NodeOperationError(connectedNode, `Error in sub-node ${connectedNode.name}`, {
					itemIndex,
					functionality: 'configuration-node',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
					description: error.message,
				});
			}
		}
	}

	return inputConfiguration.maxConnections === 1
		? (nodes || [])[0]?.response
		: nodes.map((node) => node.response);
}
