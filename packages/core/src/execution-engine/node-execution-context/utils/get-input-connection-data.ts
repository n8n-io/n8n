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
	SEND_AND_WAIT_OPERATION,
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

		const toolName = toolArgs.tool_name as string;
		const toolInput = toolArgs.tool_input as IDataObject;
		const reason = toolArgs.reason as string | undefined;

		context.logger.debug('[HITL] Tool invocation started', {
			hitlNode: hitlNode.name,
			toolName,
			toolInput,
			reason,
			runIndex: localRunIndex,
		});

		// Find the selected tool
		const selectedTool = connectedTools.find((t) => t.name === toolName);
		if (!selectedTool) {
			const availableTools = connectedTools.map((t) => t.name).join(', ');
			context.logger.debug('[HITL] Tool not found', { toolName, availableTools });
			return `Error: Tool "${toolName}" not found. Available tools: ${availableTools}`;
		}

		// Get original node type (remove 'HitlTool' suffix)
		const originalNodeTypeName = getOriginalNodeTypeName(hitlNode.type);
		const originalNodeType = workflow.nodeTypes.getByNameAndVersion(
			originalNodeTypeName,
			hitlNode.typeVersion,
		);

		context.logger.debug('[HITL] Resolved original node type', {
			hitlNodeType: hitlNode.type,
			originalNodeTypeName,
			typeVersion: hitlNode.typeVersion,
		});

		// Build approval message with tool details
		const message = `**Tool Approval Request**

Tool: ${toolName}
Input: ${JSON.stringify(toolInput, null, 2)}${reason ? `\nReason: ${reason}` : ''}`;

		// Create a synthetic node with sendAndWait parameters
		const syntheticNode: INode = {
			...hitlNode,
			type: originalNodeTypeName,
			typeVersion: hitlNode.typeVersion,
			parameters: {
				...hitlNode.parameters,
				operation: SEND_AND_WAIT_OPERATION,
				responseType: 'approval',
				message,
			},
		};

		// Update context to use synthetic node for parameter resolution
		const originalNode = context.getNode();
		Object.assign(context, { node: syntheticNode });

		context.addInputData(NodeConnectionTypes.AiTool, [[{ json: toolArgs }]]);

		try {
			context.logger.debug('[HITL] Executing sendAndWait operation', {
				originalNodeTypeName,
				operation: SEND_AND_WAIT_OPERATION,
			});

			// Execute the original node's sendAndWait operation
			const result = await originalNodeType.execute?.call(context as unknown as IExecuteFunctions);

			context.logger.debug('[HITL] sendAndWait execution returned', {
				isEngineRequest: isEngineRequest(result),
				hasResult: result !== undefined,
			});

			// Check if the result is an engine request (e.g., wait request)
			// Engine requests are handled by the execution engine at a higher level
			if (isEngineRequest(result)) {
				// The execution should wait for webhook - this error shouldn't normally be reached
				// as the execution engine will handle the wait request
				context.logger.debug('[HITL] Received engine request, waiting for webhook approval');
				throw new NodeOperationError(
					hitlNode,
					'HITL approval request is pending. Execution will resume after approval.',
				);
			}

			// After resuming from wait, check approval status
			// The sendAndWait operation returns { data: { approved: boolean } } from webhook
			const resultData = (result as INodeExecutionData[][] | undefined)?.[0]?.[0]?.json;
			const approved = (resultData?.data as IDataObject | undefined)?.approved;

			context.logger.debug('[HITL] Approval result received', {
				approved,
				resultData,
			});

			if (!approved) {
				context.logger.debug('[HITL] Tool execution denied by human reviewer');
				context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, [
					[{ json: { response: 'Tool execution was denied by human reviewer.' } }],
				]);
				return 'Tool execution was denied by human reviewer.';
			}

			context.logger.debug('[HITL] Approved, executing connected tool', {
				toolName: selectedTool.name,
				toolInput,
			});

			// Execute the connected tool
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const toolResult: unknown = await selectedTool.invoke(toolInput);
			const response = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);

			context.logger.debug('[HITL] Connected tool execution completed', {
				toolName: selectedTool.name,
				responseLength: response.length,
			});

			context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, [[{ json: { response } }]]);

			return response;
		} catch (error) {
			context.logger.debug('[HITL] Error during execution', {
				error: error instanceof Error ? error.message : String(error),
				hitlNode: hitlNode.name,
			});
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
 * The tool schema includes tool_name, tool_input, and optional reason fields.
 */
function createHitlTool(options: {
	hitlNode: INode;
	connectedTools: DynamicStructuredTool[];
	handleToolInvocation: (toolArgs: IDataObject) => Promise<unknown>;
}) {
	const { hitlNode, connectedTools, handleToolInvocation } = options;

	// Get tool description from node parameters or use default
	const toolDescription =
		(hitlNode.parameters?.toolDescription as string) ||
		'Request human approval before executing a tool';

	// Create enum of available tool names for the schema
	const toolNames = connectedTools.map((t) => t.name);
	const toolNameEnum =
		toolNames.length > 0 ? z.enum(toolNames as [string, ...string[]]) : z.string();

	// Build descriptions of connected tools for the agent
	const toolDescriptions = connectedTools.map((t) => `- ${t.name}: ${t.description}`).join('\n');

	const schema = z.object({
		tool_name: toolNameEnum.describe(
			`Name of the tool to execute after approval. Available tools:\n${toolDescriptions}`,
		),
		tool_input: z.record(z.unknown()).describe('Input parameters for the selected tool'),
		reason: z.string().optional().describe('Reason for executing this tool'),
	});

	const tool = new DynamicStructuredTool({
		name: hitlNode.name.replace(/\s+/g, '_'),
		description: toolDescription,
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
			if (connectedNodeType.description.outputs.includes(NodeConnectionTypes.AiTool)) {
				// Check if this is an HITL tool node
				if (isHitlTool(connectedNode)) {
					// Get connected tools from HITL node's AiTool inputs
					// Create a temporary context to access HITL node's connected nodes
					const hitlContext = contextFactory(parentRunIndex, parentInputData);

					hitlContext.logger.debug('[HITL] Detected HITL tool node', {
						hitlNodeName: connectedNode.name,
						hitlNodeType: connectedNode.type,
						parentNode: parentNode.name,
					});

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

					hitlContext.logger.debug('[HITL] Found connected tools for HITL node', {
						hitlNodeName: connectedNode.name,
						connectedToolCount: toolsArray.length,
						connectedToolNames: toolsArray.map((t) => (t as DynamicStructuredTool).name),
					});

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
