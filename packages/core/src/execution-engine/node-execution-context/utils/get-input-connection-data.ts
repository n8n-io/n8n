/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { DynamicStructuredTool, StructuredTool, Tool } from '@langchain/core/tools';
import type {
	AINodeConnectionType,
	CloseFunction,
	EngineRequest,
	EngineResponse,
	GenericValue,
	IDataObject,
	IExecuteData,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeInputConfiguration,
	INodeType,
	IRunExecutionData,
	ISupplyDataFunctions,
	ITaskData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	NodeConnectionType,
	NodeOutput,
	SupplyData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	ApplicationError,
	ExecutionBaseError,
	NodeConnectionTypes,
	NodeOperationError,
	UserError,
	sleepWithAbort,
	isHitlToolType,
} from 'n8n-workflow';
import z, { ZodType } from 'zod';

import { StructuredToolkit, type SupplyDataToolResponse } from './ai-tool-types';
import { createNodeAsTool, getSchema } from './create-node-as-tool';
import type { ExecuteContext, WebhookContext } from '../../node-execution-context';
// eslint-disable-next-line import-x/no-cycle
import { SupplyDataContext } from '../../node-execution-context/supply-data-context';
import { isEngineRequest } from '../../requests-response';

/**
 * Normalize a value to an array.
 */
function ensureArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined) return [];
	return Array.isArray(value) ? value : [value];
}

export function createHitlToolkit(
	connectedToolsOrToolkits: SupplyDataToolResponse[] | SupplyDataToolResponse | undefined,
	hitlNode: INode,
) {
	const connectedTools = ensureArray(connectedToolsOrToolkits).flatMap((toolOrToolkit) => {
		if (toolOrToolkit instanceof StructuredToolkit) {
			return toolOrToolkit.tools;
		}
		return toolOrToolkit;
	});

	// toolParameters and tool are filled programmatically in createEngineRequests, don't need to be in the schema
	const hitlNodeSchema = getSchema(hitlNode).omit({ toolParameters: true, tool: true });
	// Wrap each tool: sourceNodeName routes to HITL node, gatedToolNodeName is the tool to execute after approval
	const gatedTools = connectedTools.map((tool) => {
		let schema = tool.schema;
		if (tool.schema instanceof ZodType) {
			schema = z.object({
				toolParameters: tool.schema.describe('Input parameters for the tool'),
				hitlParameters: hitlNodeSchema.describe('Parameters for the Human-in-the-Loop layer'),
			});
		}

		return new DynamicStructuredTool({
			name: tool.name,
			description: tool.description,
			schema,
			func: async () => await Promise.resolve(''),
			metadata: {
				sourceNodeName: hitlNode.name,
				gatedToolNodeName: tool.metadata?.sourceNodeName as string | undefined,
				originalSchema: tool.schema,
			},
		});
	});

	const toolkit = new StructuredToolkit(gatedTools);
	return toolkit;
}

/**
 * Create supplyData for an HITL tool node.
 *
 * Agent sees gated tools directly but with sourceNodeName pointing to the HITL node.
 *
 * Flow:
 * 1. Agent calls gated tool → EngineRequest routes to HITL node
 * 2. HITL executes sendAndWait → waiting state
 * 3. User approves/denies via webhook
 * 4. If approved: new EngineRequest executes gated tool → result to Agent
 * 5. If denied: denial message → Agent knows not to retry
 */
export async function createHitlToolSupplyData(
	hitlNode: INode,
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	parentRunIndex: number,
	connectionInputData: INodeExecutionData[],
	parentInputData: ITaskDataConnections,
	additionalData: IWorkflowExecuteAdditionalData,
	executeData: IExecuteData,
	mode: WorkflowExecuteMode,
	closeFunctions: CloseFunction[],
	itemIndex: number,
	abortSignal?: AbortSignal,
	parentNode?: INode,
): Promise<SupplyData> {
	const context = new SupplyDataContext(
		workflow,
		hitlNode,
		additionalData,
		mode,
		runExecutionData,
		parentRunIndex,
		connectionInputData,
		parentInputData,
		NodeConnectionTypes.AiTool,
		executeData,
		closeFunctions,
		abortSignal,
		parentNode,
	);

	const connectedToolsOrToolkits = (await context.getInputConnectionData(
		NodeConnectionTypes.AiTool,
		itemIndex,
	)) as SupplyDataToolResponse[] | SupplyDataToolResponse | undefined;

	const toolkit = createHitlToolkit(connectedToolsOrToolkits, hitlNode);
	return { response: toolkit };
}

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
 * Maximum number of engine request/response iterations to prevent infinite loops.
 * Each iteration represents one round-trip: sub-agent requests tool execution,
 * tools execute, results returned to sub-agent.
 */
const MAX_ENGINE_REQUEST_ITERATIONS = 50;

/**
 * Executes tool nodes referenced in an EngineRequest in-process.
 * This is used when a sub-agent (AgentToolV3) returns an EngineRequest
 * but cannot relay it to the workflow execution loop because it's running
 * inside makeHandleToolInvocation's synchronous tool callback.
 *
 * Supports recursive handling: if a tool node itself returns an EngineRequest,
 * this function will recursively execute those nested tool nodes.
 *
 * @param request - The EngineRequest containing actions to execute
 * @param workflow - The workflow containing the tool nodes
 * @param runExecutionData - Current execution data
 * @param additionalData - Additional workflow execution data
 * @param mode - Current workflow execution mode
 * @param closeFunctions - Array to collect close functions from tool contexts
 * @param abortSignal - Optional signal for cancellation support
 * @param depth - Current recursion depth (for safety limits)
 * @returns EngineResponse with results from all executed tool actions
 */
async function executeSubAgentTools(
	request: EngineRequest,
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	closeFunctions: CloseFunction[],
	abortSignal?: AbortSignal,
	depth: number = 0,
): Promise<EngineResponse> {
	const MAX_RECURSION_DEPTH = 10;
	if (depth >= MAX_RECURSION_DEPTH) {
		throw new ApplicationError(
			'Maximum engine request recursion depth exceeded in sub-agent tool execution',
		);
	}

	const actionResponses: EngineResponse['actionResponses'] = [];

	for (const action of request.actions) {
		// action.nodeName comes from the EngineRequest generated server-side by
		// the sub-agent's own execution — it is NOT user-supplied input.
		// Node existence is validated below; only nodes present in the current
		// workflow can be executed, consistent with WorkflowExecute behavior.
		const toolNode = workflow.getNode(action.nodeName);
		if (!toolNode) {
			throw new ApplicationError(
				`Sub-agent requested execution of node "${action.nodeName}" which does not exist in the workflow`,
			);
		}

		const toolNodeType = workflow.nodeTypes.getByNameAndVersion(
			toolNode.type,
			toolNode.typeVersion,
		);

		if (!toolNodeType.execute) {
			throw new ApplicationError(
				`Sub-agent requested execution of node "${action.nodeName}" which does not have an execute method`,
			);
		}

		// Build input data for the tool node from the action's input
		const toolInputData: ITaskDataConnections = {
			main: [[{ json: { ...action.input } }]],
		};
		const toolConnectionInputData: INodeExecutionData[] = [{ json: { ...action.input } }];
		const toolExecuteData: IExecuteData = {
			node: toolNode,
			data: toolInputData,
			source: null,
		};

		const toolContext = new SupplyDataContext(
			workflow,
			toolNode,
			additionalData,
			mode,
			runExecutionData,
			0, // runIndex
			toolConnectionInputData,
			toolInputData,
			NodeConnectionTypes.AiTool,
			toolExecuteData,
			closeFunctions,
			abortSignal,
		);

		const startTime = Date.now();

		try {
			let toolResult = await toolNodeType.execute.call(
				toolContext as unknown as IExecuteFunctions,
			);

			// Recursively handle nested EngineRequests (e.g., MCP tools that also
			// use the engine request pattern for their own sub-operations)
			if (isEngineRequest(toolResult)) {
				const nestedResponse = await executeSubAgentTools(
					toolResult,
					workflow,
					runExecutionData,
					additionalData,
					mode,
					closeFunctions,
					abortSignal,
					depth + 1,
				);

				// Re-invoke the tool with nested results
				toolResult = await toolNodeType.execute.call(
					toolContext as unknown as IExecuteFunctions,
					nestedResponse,
				);
			}

			const executionTime = Date.now() - startTime;

			// Build ITaskData from the tool execution result
			const taskData: ITaskData = {
				startTime,
				executionTime,
				executionIndex: 0,
				source: [],
				executionStatus: 'success',
				data: {
					main: isEngineRequest(toolResult) ? [[]] : (toolResult ?? [[]]),
				},
			};

			actionResponses.push({ data: taskData, action });
		} catch (error) {
			const executionTime = Date.now() - startTime;

			// Create error task data so the sub-agent can see what went wrong
			const taskData: ITaskData = {
				startTime,
				executionTime,
				executionIndex: 0,
				source: [],
				executionStatus: 'error',
				error: error instanceof ExecutionBaseError
					? error
					: new NodeOperationError(toolNode, error as Error),
				data: { main: [[{ json: { error: (error as Error).message } }]] },
			};

			actionResponses.push({ data: taskData, action });
		}
	}

	return {
		actionResponses,
		metadata: request.metadata,
	};
}

/**
 * Resolves an EngineRequest from a sub-agent by executing its tool nodes
 * in-process and re-invoking the sub-agent until it returns actual data.
 *
 * When a sub-agent's tools (MCP, VectorStore, etc.) need execution, the
 * sub-agent returns an EngineRequest. Since we're inside a tool callback
 * and can't relay this to the workflow execution loop, we execute the
 * requested tool nodes in-process and re-invoke the sub-agent with results.
 */
async function resolveSubAgentEngineRequests(
	initialRequest: EngineRequest,
	executionCtx: {
		workflow: Workflow;
		runExecutionData: IRunExecutionData;
		additionalData: IWorkflowExecuteAdditionalData;
		mode: WorkflowExecuteMode;
		closeFns: CloseFunction[];
		abortSig?: AbortSignal;
	},
	agentCtx: {
		nodeType: INodeType;
		contextFactory: (runIndex: number) => ISupplyDataFunctions;
		toolArgs: IDataObject;
	},
	currentRunIndex: number,
	updateRunIndex: (newIndex: number) => void,
	nodeName: string,
): Promise<INodeExecutionData[][] | undefined> {
	let result: INodeExecutionData[][] | EngineRequest | undefined = initialRequest;
	let runIndex = currentRunIndex;
	let iteration = 0;

	while (isEngineRequest(result) && iteration < MAX_ENGINE_REQUEST_ITERATIONS) {
		iteration++;
		const engineResponse = await executeSubAgentTools(
			result,
			executionCtx.workflow,
			executionCtx.runExecutionData,
			executionCtx.additionalData,
			executionCtx.mode,
			executionCtx.closeFns,
			executionCtx.abortSig,
		);

		// Re-invoke the sub-agent with tool results
		const resumeRunIndex = runIndex++;
		const resumeContext = agentCtx.contextFactory(resumeRunIndex);
		resumeContext.addInputData(NodeConnectionTypes.AiTool, [[{ json: agentCtx.toolArgs }]]);

		result = await agentCtx.nodeType.execute?.call(
			resumeContext as unknown as IExecuteFunctions,
			engineResponse,
		);
	}

	// Propagate the updated runIndex back to the caller
	updateRunIndex(runIndex);

	if (isEngineRequest(result)) {
		throw new ApplicationError(
			`Sub-agent "${nodeName}" exceeded maximum engine request iterations (${MAX_ENGINE_REQUEST_ITERATIONS})`,
		);
	}

	return result;
}

export function makeHandleToolInvocation(
	contextFactory: (runIndex: number) => ISupplyDataFunctions,
	node: INode,
	nodeType: INodeType,
	runExecutionData: IRunExecutionData,
	workflow?: Workflow,
	additionalData?: IWorkflowExecuteAdditionalData,
	mode?: WorkflowExecuteMode,
	closeFns?: CloseFunction[],
	abortSig?: AbortSignal,
) {
	/**
	 * This keeps track of how many times this specific AI tool node has been invoked.
	 * It is incremented on every invocation of the tool to keep the output of each invocation separate from each other.
	 */
	// We get the runIndex from the context to handle multiple executions
	// of the same tool when the tool is used in a loop or in a parallel execution.
	let runIndex = getNextRunIndex(runExecutionData, node.name);

	// Pre-compute whether we have the context needed to handle engine requests
	// from sub-agent nodes. This avoids multiple && checks inside the hot loop.
	const canResolveEngineRequests = !!(workflow && additionalData && mode);

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
				let result = await nodeType.execute?.call(context as unknown as IExecuteFunctions);

				// Handle EngineRequest returns from sub-agent nodes (e.g., AgentToolV3).
				// When a sub-agent's tools (MCP, VectorStore, etc.) need execution,
				// the sub-agent returns an EngineRequest. Since we're inside a tool
				// callback and can't relay this to the workflow execution loop, we
				// execute the requested tool nodes in-process and re-invoke the
				// sub-agent with the results.
				if (isEngineRequest(result) && canResolveEngineRequests) {
					result = await resolveSubAgentEngineRequests(
						result,
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
						{ workflow: workflow!, runExecutionData, additionalData: additionalData!, mode: mode!, closeFns: closeFns ?? [], abortSig },
						{ nodeType, contextFactory, toolArgs },
						runIndex,
						(newRunIndex) => { runIndex = newRunIndex; },
						node.name,
					);
				}

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

// Extends metadata for tools and toolkits to include the source node name that is used for HITL routing
export function extendResponseMetadata(response: unknown, connectedNode: INode) {
	// Ensure sourceNodeName is set for proper routing
	if (response instanceof StructuredTool || response instanceof Tool) {
		response.metadata ??= {};
		response.metadata.sourceNodeName = connectedNode.name;
	}

	if (response instanceof StructuredToolkit) {
		for (const tool of response.tools) {
			tool.metadata ??= {};
			tool.metadata.sourceNodeName = connectedNode.name;
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
		// Check if this is an HITL (Human-in-the-Loop) tool node
		// HITL tools need special handling to create the middleware tool
		if (isHitlToolType(connectedNode?.type)) {
			const supplyData = await createHitlToolSupplyData(
				connectedNode,
				workflow,
				runExecutionData,
				parentRunIndex,
				connectionInputData,
				parentInputData,
				additionalData,
				executeData,
				mode,
				closeFunctions,
				itemIndex,
				abortSignal,
				parentNode,
			);
			nodes.push(supplyData);
			continue;
		}

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
						runExecutionData,
						workflow,
						additionalData,
						mode,
						closeFunctions,
						abortSignal,
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
				const response = supplyData.response;

				extendResponseMetadata(response, connectedNode);

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
