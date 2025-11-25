/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { DynamicStructuredTool } from '@langchain/core/tools';
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
	INodeInputConfiguration,
	INodeOutputConfiguration,
	NodeConnectionType,
	NodeOutput,
	GenericValue,
} from 'n8n-workflow';
import {
	NodeConnectionTypes,
	NodeOperationError,
	ExecutionBaseError,
	ApplicationError,
	UserError,
	sleepWithAbort,
} from 'n8n-workflow';
import { z } from 'zod';

import { createNodeAsTool } from './create-node-as-tool';
import type { ExecuteContext, WebhookContext } from '../../node-execution-context';
// eslint-disable-next-line import-x/no-cycle
import { SupplyDataContext } from '../../node-execution-context/supply-data-context';
import { isEngineRequest } from '../../requests-response';

function getNextRunIndex(runExecutionData: IRunExecutionData, nodeName: string) {
	return runExecutionData.resultData.runData[nodeName]?.length ?? 0;
}

function containsBinaryData(nodeExecutionResult?: NodeOutput): boolean {
	if (isEngineRequest(nodeExecutionResult)) {
		return false;
	}

	if (nodeExecutionResult === undefined || nodeExecutionResult === null) {
		return false;
	}

	return nodeExecutionResult.some((outputBranch) => outputBranch.some((item) => item.binary));
}

function containsDataThatIsUsefulToTheAgent(nodeExecutionResult?: NodeOutput): boolean {
	if (isEngineRequest(nodeExecutionResult)) {
		return false;
	}

	if (nodeExecutionResult === undefined || nodeExecutionResult === null) {
		return false;
	}

	return nodeExecutionResult.some((outputBranch) =>
		outputBranch.some((item) => Object.keys(item.json).length > 0),
	);
}

/**
 * Filters out non-json items and reports if the result contained mixed
 * responses (e.g. json and binary).
 */
function mapResult(result?: NodeOutput) {
	let response:
		| string
		| Array<IDataObject | GenericValue | GenericValue[] | IDataObject[]>
		| undefined;
	let nodeHasMixedJsonAndBinaryData = false;

	if (result === undefined) {
		response = undefined;
	} else if (isEngineRequest(result)) {
		response =
			'Error: The Tool attempted to return an engine request, which is not supported in Agents';
	} else if (containsBinaryData(result) && !containsDataThatIsUsefulToTheAgent(result)) {
		response = 'Error: The Tool attempted to return binary data, which is not supported in Agents';
	} else {
		if (containsBinaryData(result)) {
			nodeHasMixedJsonAndBinaryData = true;
		}
		response = result?.[0]?.flatMap((item) => item.json);
	}

	return { response, nodeHasMixedJsonAndBinaryData };
}

/**
 * Check if a node is an HITL (Human-in-the-Loop) tool.
 * HITL tools are identified by their type ending with 'HitlTool'.
 */
function isHitlTool(node: INode): boolean {
	return node.type.endsWith('HitlTool');
}

/**
 * Get the original node type name from an HITL tool node.
 * Removes the 'HitlTool' suffix to get the original node type.
 */
function getOriginalNodeTypeName(hitlNodeType: string): string {
	return hitlNodeType.replace(/HitlTool$/, '');
}

/**
 * Creates a handler function for HITL tool invocations.
 * This handler:
 * 1. Sends an approval request using the original node's sendAndWait operation
 * 2. Waits for human approval via webhook
 * 3. If approved, executes the selected connected tool
 * 4. Returns the tool result or denial message
 */
export function makeHitlToolInvocation(
	contextFactory: (runIndex: number, inputData: ITaskDataConnections) => ISupplyDataFunctions,
	hitlNode: INode,
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	connectedTools: DynamicStructuredTool[],
) {
	let runIndex = getNextRunIndex(runExecutionData, hitlNode.name);

	return async (toolArgs: IDataObject) => {
		const localRunIndex = runIndex++;
		const context = contextFactory(localRunIndex, {});

		const toolName = toolArgs.toolName as string;
		const parameters = toolArgs.parameters as IDataObject;

		// Find the selected tool
		const selectedTool = connectedTools.find((t) => t.name === toolName);
		if (!selectedTool) {
			const availableTools = connectedTools.map((t) => t.name).join(', ');
			return `Error: Tool "${toolName}" not found. Available tools: ${availableTools}`;
		}

		// Get original node type (remove 'HitlTool' suffix)
		const originalNodeTypeName = getOriginalNodeTypeName(hitlNode.type);
		const originalNodeType = workflow.nodeTypes.getByNameAndVersion(
			originalNodeTypeName,
			hitlNode.typeVersion,
		);

		// Create a synthetic node with sendAndWait parameters
		// resource/operation come from HITL node's hidden properties (set via property defaults)
		// The message is configured via the node's message property (supports expressions like {{ $json.toolName }})
		const syntheticNode: INode = {
			...hitlNode,
			type: originalNodeTypeName,
			typeVersion: hitlNode.typeVersion,
			parameters: {
				...hitlNode.parameters,
				responseType: 'approval',
			},
		};

		// Update context to use synthetic node for parameter resolution
		const originalNode = context.getNode();
		Object.assign(context, { node: syntheticNode });

		context.addInputData(NodeConnectionTypes.AiTool, [[{ json: toolArgs }]]);

		try {
			// Execute the original node's sendAndWait operation
			const result = await originalNodeType.execute?.call(context as unknown as IExecuteFunctions);

			// Check if the execution entered waiting state (for webhook callback)
			// When putExecutionToWait() is called, it sets waitTill on runExecutionData
			if (runExecutionData.waitTill) {
				// Store HITL context for webhook resumption
				// The Agent will be set as lastNodeExecuted by the execution engine,
				// but the webhook handler needs to know which HITL node to use for webhook lookup
				if (runExecutionData.executionData) {
					// Store HITL context in contextData under 'hitl' key for webhook lookup
					runExecutionData.executionData.contextData.hitl = {
						nodeName: hitlNode.name,
						toolArgs: {
							...toolArgs,
							__selectedToolName: toolName,
							__selectedToolParameters: parameters,
						},
					};
				}

				// Return a message indicating waiting state
				// The Agent will continue but the execution engine will detect waitTill
				// and save the execution in waiting state
				return 'Waiting for human approval. The workflow will resume when approval is received.';
			}

			// Check if the result is an engine request (e.g., tool action request)
			// This is different from wait state - engine requests are for scheduling sub-nodes
			if (isEngineRequest(result)) {
				throw new NodeOperationError(
					hitlNode,
					'Unexpected engine request from HITL tool execution.',
				);
			}

			// After resuming from wait, check approval status
			// The sendAndWait operation returns { data: { approved: boolean } } from webhook
			const resultData = (result as INodeExecutionData[][] | undefined)?.[0]?.[0]?.json;
			const approved = (resultData?.data as IDataObject | undefined)?.approved;

			if (!approved) {
				context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, [
					[{ json: { response: 'Tool execution was denied by human reviewer.' } }],
				]);
				return 'Tool execution was denied by human reviewer.';
			}

			// Execute the connected tool
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const toolResult: unknown = await selectedTool.invoke(parameters);
			const response = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);

			context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, [[{ json: { response } }]]);

			return response;
		} catch (error) {
			const nodeError = new NodeOperationError(hitlNode, error as Error);
			context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, nodeError);
			throw nodeError;
		} finally {
			// Restore original node
			Object.assign(context, { node: originalNode });
		}
	};
}

/**
 * Creates an HITL tool that wraps connected tools with human approval.
 * The tool schema includes toolName, toolCallId, and parameters fields.
 */
function createHitlTool(options: {
	hitlNode: INode;
	connectedTools: DynamicStructuredTool[];
	handleToolInvocation: (toolArgs: IDataObject) => Promise<unknown>;
}) {
	const { hitlNode, connectedTools, handleToolInvocation } = options;

	// Create enum of available tool names for the schema
	const toolNames = connectedTools.map((t) => t.name);
	const toolNameEnum =
		toolNames.length > 0 ? z.enum(toolNames as [string, ...string[]]) : z.string();

	// Build descriptions of connected tools for the agent
	const toolDescriptions = connectedTools.map((t) => `- ${t.name}: ${t.description}`).join('\n');

	const schema = z.object({
		toolName: toolNameEnum.describe(
			`Name of the tool to execute after approval. Available tools:\n${toolDescriptions}`,
		),
		toolCallId: z.string().describe('Unique identifier for this tool call'),
		parameters: z.record(z.unknown()).describe('Input parameters for the selected tool'),
	});

	const tool = new DynamicStructuredTool({
		name: hitlNode.name.replace(/\s+/g, '_'),
		description: `Request human approval before executing a tool. Available tools: ${toolNames.join(', ')}`,
		schema,
		func: async (toolArgs: z.infer<typeof schema>) => {
			const result = await handleToolInvocation(toolArgs as unknown as IDataObject);
			return typeof result === 'string' ? result : JSON.stringify(result);
		},
	});

	return { response: tool };
}

export function makeHandleToolInvocation(
	contextFactory: (runIndex: number) => ISupplyDataFunctions,
	node: INode,
	nodeType: INodeType,
	runExecutionData: IRunExecutionData,
) {
	/**
	 * This keeps track of how many times this specific AI tool node has been invoked.
	 * It is incremented on every invocation of the tool to keep the output of each invocation separate from each other.
	 */
	// We get the runIndex from the context to handle multiple executions
	// of the same tool when the tool is used in a loop or in a parallel execution.
	let runIndex = getNextRunIndex(runExecutionData, node.name);

	return async (toolArgs: IDataObject) => {
		let maxTries = 1;
		if (node.retryOnFail === true) {
			maxTries = Math.min(5, Math.max(2, node.maxTries ?? 3));
		}

		let waitBetweenTries = 0;
		if (node.retryOnFail === true) {
			waitBetweenTries = Math.min(5000, Math.max(0, node.waitBetweenTries ?? 1000));
		}

		let lastError: NodeOperationError | undefined;

		for (let tryIndex = 0; tryIndex < maxTries; tryIndex++) {
			// Increment the runIndex for the next invocation
			const localRunIndex = runIndex++;
			const context = contextFactory(localRunIndex);

			// Get abort signal from context for cancellation support
			const abortSignal = context.getExecutionCancelSignal?.();

			// Check if execution was cancelled before retry
			if (abortSignal?.aborted) {
				return 'Error during node execution: Execution was cancelled';
			}

			if (tryIndex !== 0) {
				// Reset error from previous attempt
				lastError = undefined;
				if (waitBetweenTries !== 0) {
					try {
						await sleepWithAbort(waitBetweenTries, abortSignal);
					} catch (abortError) {
						return 'Error during node execution: Execution was cancelled';
					}
				}
			}

			context.addInputData(NodeConnectionTypes.AiTool, [[{ json: toolArgs }]]);

			try {
				// Execute the sub-node with the proxied context
				const result = await nodeType.execute?.call(context as unknown as IExecuteFunctions);

				const { response, nodeHasMixedJsonAndBinaryData } = mapResult(result);

				// If the node returned some binary data, but also useful data we just log a warning instead of overriding the result
				if (nodeHasMixedJsonAndBinaryData) {
					context.logger.warn(
						`Response from Tool '${node.name}' included binary data, which is not supported in Agents. The binary data was omitted from the response.`,
					);
				}

				// Add output data to the context
				context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, [
					[{ json: { response } }],
				]);

				// Return the stringified results
				return JSON.stringify(response);
			} catch (error) {
				// Check if error is due to cancellation
				if (abortSignal?.aborted) {
					throw new NodeOperationError(node, 'Execution was cancelled');
				}

				const nodeError = new NodeOperationError(node, error as Error);
				context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, nodeError);

				lastError = nodeError;

				// If this is the last attempt, throw the error to properly terminate execution
				if (tryIndex === maxTries - 1) {
					// Enhance the error with detailed information
					if (nodeError.description && !nodeError.message.includes(nodeError.description)) {
						nodeError.message = `${nodeError.message}\n\nDetails: ${nodeError.description}`;
					}
					throw nodeError;
				}
			}
		}

		// This should never be reached, but if it is, throw the error
		if (lastError) {
			if (lastError.description && !lastError.message.includes(lastError.description)) {
				lastError.message = `${lastError.message}\n\nDetails: ${lastError.description}`;
			}
			throw lastError;
		}

		throw new NodeOperationError(node, 'Unknown error during node execution');
	};
}

function validateInputConfiguration(
	context: ExecuteContext | WebhookContext | SupplyDataContext,
	connectionType: NodeConnectionType,
	nodeInputs: INodeInputConfiguration[],
	connectedNodes: INode[],
) {
	const parentNode = context.getNode();

	const connections = context.getConnections(parentNode, connectionType);

	// Validate missing required connections
	for (let index = 0; index < nodeInputs.length; index++) {
		const inputConfiguration = nodeInputs[index];

		if (inputConfiguration.required) {
			// For required inputs, we need at least one enabled connected node
			if (
				connections.length === 0 ||
				connections.length <= index ||
				connections.at(index)?.length === 0 ||
				!connectedNodes.find((node) =>
					connections
						.at(index)
						?.map((value) => value.node)
						.includes(node.name),
				)
			) {
				throw new NodeOperationError(
					parentNode,
					`A ${inputConfiguration?.displayName ?? connectionType} sub-node must be connected and enabled`,
				);
			}
		}
	}
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
	const inputConfigurations = this.nodeInputs.filter((input) => input.type === connectionType);

	if (inputConfigurations === undefined || inputConfigurations.length === 0) {
		throw new UserError('Node does not have input of type', {
			extra: { nodeName: parentNode.name, connectionType },
		});
	}

	const maxConnections = inputConfigurations.reduce(
		(acc, currentItem) =>
			currentItem.maxConnections !== undefined ? acc + currentItem.maxConnections : acc,
		0,
	);

	const connectedNodes = this.getConnectedNodes(connectionType);
	validateInputConfiguration(this, connectionType, inputConfigurations, connectedNodes);

	// Nothing is connected or required
	if (connectedNodes.length === 0) {
		return maxConnections === 1 ? undefined : [];
	}

	// Too many connections
	if (
		maxConnections !== undefined &&
		maxConnections !== 0 &&
		connectedNodes.length > maxConnections
	) {
		throw new NodeOperationError(
			parentNode,
			`Only ${maxConnections} ${connectionType} sub-nodes are/is allowed to be connected`,
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
			// Check if node outputs AI tool type - support both string and object formats
			const outputs = connectedNodeType.description.outputs;
			const hasAiToolOutput =
				Array.isArray(outputs) &&
				outputs.some((output: NodeConnectionType | INodeOutputConfiguration) => {
					if (typeof output === 'string') {
						return output === NodeConnectionTypes.AiTool;
					}
					return output.type === NodeConnectionTypes.AiTool;
				});
			if (hasAiToolOutput) {
				// Check if this is an HITL tool node
				if (isHitlTool(connectedNode)) {
					// Get connected tools from HITL node's AiTool inputs
					// Create a temporary context to access HITL node's connected nodes
					const hitlContext = contextFactory(parentRunIndex, parentInputData);

					// Get tools connected to the HITL node's input
					const hitlConnectedTools = await getInputConnectionData.call(
						hitlContext,
						workflow,
						runExecutionData,
						parentRunIndex,
						connectionInputData,
						parentInputData,
						additionalData,
						executeData,
						mode,
						closeFunctions,
						NodeConnectionTypes.AiTool,
						itemIndex,
						abortSignal,
					);

					// Normalize to array of tools
					const toolsArray = Array.isArray(hitlConnectedTools)
						? hitlConnectedTools
						: hitlConnectedTools
							? [hitlConnectedTools]
							: [];

					// Create HITL tool that wraps the connected tools
					const supplyData = createHitlTool({
						hitlNode: connectedNode,
						connectedTools: toolsArray as DynamicStructuredTool[],
						handleToolInvocation: makeHitlToolInvocation(
							contextFactory,
							connectedNode,
							workflow,
							runExecutionData,
							toolsArray as DynamicStructuredTool[],
						),
					});
					nodes.push(supplyData);
				} else {
					// Regular tool node
					const supplyData = createNodeAsTool({
						node: connectedNode,
						nodeType: connectedNodeType,
						handleToolInvocation: makeHandleToolInvocation(
							(i) => contextFactory(i, {}),
							connectedNode,
							connectedNodeType,
							runExecutionData,
						),
					});
					nodes.push(supplyData);
				}
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
				// Add hints from context to supply data
				if (context.hints.length > 0) {
					supplyData.hints = context.hints;
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

				await context.addExecutionDataFunctions(
					'output',
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

	return maxConnections === 1 ? (nodes || [])[0]?.response : nodes.map((node) => node.response);
}
