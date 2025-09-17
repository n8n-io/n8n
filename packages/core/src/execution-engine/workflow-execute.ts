/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { GlobalConfig } from '@n8n/config';
import { TOOL_EXECUTOR_NODE_NAME } from '@n8n/constants';
import { Container } from '@n8n/di';
import * as assert from 'assert/strict';
import { setMaxListeners } from 'events';
import get from 'lodash/get';
import type {
	ExecutionBaseError,
	ExecutionStatus,
	GenericValue,
	IConnection,
	IDataObject,
	IExecuteData,
	INode,
	INodeConnections,
	INodeExecutionData,
	IPairedItemData,
	IPinData,
	IRun,
	IRunData,
	ISourceData,
	ITaskData,
	ITaskDataConnections,
	ITaskDataConnectionsSource,
	ITaskMetadata,
	IWaitingForExecution,
	IWaitingForExecutionSource,
	NodeApiError,
	NodeOperationError,
	Workflow,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
	CloseFunction,
	StartNodeData,
	IRunNodeResponse,
	IWorkflowIssues,
	INodeIssues,
	INodeType,
	ITaskStartedData,
	AiAgentRequest,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import {
	LoggerProxy as Logger,
	NodeHelpers,
	NodeConnectionTypes,
	ApplicationError,
	sleep,
	ExecutionCancelledError,
	Node,
	UnexpectedError,
	UserError,
	OperationalError,
} from 'n8n-workflow';
import PCancelable from 'p-cancelable';

import { ErrorReporter } from '@/errors/error-reporter';
import { WorkflowHasIssuesError } from '@/errors/workflow-has-issues.error';
import * as NodeExecuteFunctions from '@/node-execute-functions';
import { isJsonCompatible } from '@/utils/is-json-compatible';

import type { ExecutionLifecycleHooks } from './execution-lifecycle-hooks';
import { ExecuteContext, PollContext } from './node-execution-context';
import {
	DirectedGraph,
	findStartNodes,
	findSubgraph,
	findTriggerForPartialExecution,
	cleanRunData,
	recreateNodeExecutionStack,
	handleCycles,
	filterDisabledNodes,
	rewireGraph,
	getNextExecutionIndex,
} from './partial-execution-utils';
import { RoutingNode } from './routing-node';
import { TriggersAndPollers } from './triggers-and-pollers';

export class WorkflowExecute {
	private status: ExecutionStatus = 'new';

	private readonly abortController = new AbortController();

	constructor(
		private readonly additionalData: IWorkflowExecuteAdditionalData,
		private readonly mode: WorkflowExecuteMode,
		private runExecutionData: IRunExecutionData = {
			startData: {},
			resultData: {
				runData: {},
				pinData: {},
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		},
	) {}

	/**
	 * Executes the given workflow.
	 *
	 * @param {Workflow} workflow The workflow to execute
	 * @param {INode[]} [startNode] Node to start execution from
	 * @param {string} [destinationNode] Node to stop execution at
	 */
	// IMPORTANT: Do not add "async" to this function, it will then convert the
	//            PCancelable to a regular Promise and does so not allow canceling
	//            active executions anymore
	// eslint-disable-next-line @typescript-eslint/promise-function-async
	run(
		workflow: Workflow,
		startNode?: INode,
		destinationNode?: string,
		pinData?: IPinData,
		triggerToStartFrom?: IWorkflowExecutionDataProcess['triggerToStartFrom'],
	): PCancelable<IRun> {
		this.status = 'running';

		// Get the nodes to start workflow execution from
		startNode = startNode || workflow.getStartNode(destinationNode);

		if (startNode === undefined) {
			throw new ApplicationError('No node to start the workflow from could be found');
		}

		// If a destination node is given we only run the direct parent nodes and no others
		let runNodeFilter: string[] | undefined;
		if (destinationNode) {
			runNodeFilter = workflow.getParentNodes(destinationNode);
			runNodeFilter.push(destinationNode);
		}

		// Initialize the data of the start nodes
		const nodeExecutionStack: IExecuteData[] = [
			{
				node: startNode,
				data: triggerToStartFrom?.data?.data ?? {
					main: [
						[
							{
								json: {},
							},
						],
					],
				},
				source: null,
			},
		];

		this.runExecutionData = {
			startData: {
				destinationNode,
				runNodeFilter,
			},
			resultData: {
				runData: {},
				pinData,
			},
			executionData: {
				contextData: {},
				nodeExecutionStack,
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};

		return this.processRunExecutionData(workflow);
	}

	isLegacyExecutionOrder(workflow: Workflow): boolean {
		return workflow.settings.executionOrder !== 'v1';
	}

	/**
	 * Executes the given workflow but only
	 *
	 * @param {Workflow} workflow The workflow to execute
	 * @param {string[]} startNodes Nodes to start execution from
	 * @param {string} destinationNode Node to stop execution at
	 */
	// IMPORTANT: Do not add "async" to this function, it will then convert the
	//            PCancelable to a regular Promise and does so not allow canceling
	//            active executions anymore
	// eslint-disable-next-line @typescript-eslint/promise-function-async, complexity
	runPartialWorkflow(
		workflow: Workflow,
		runData: IRunData,
		startNodes: StartNodeData[],
		destinationNode?: string,
		pinData?: IPinData,
	): PCancelable<IRun> {
		let incomingNodeConnections: INodeConnections | undefined;
		let connection: IConnection;

		// Increment currentExecutionIndex based on previous run
		this.additionalData.currentNodeExecutionIndex = getNextExecutionIndex(runData);

		this.status = 'running';

		const runIndex = 0;
		let runNodeFilter: string[] | undefined;

		// Initialize the nodeExecutionStack and waitingExecution with
		// the data from runData
		const nodeExecutionStack: IExecuteData[] = [];
		const waitingExecution: IWaitingForExecution = {};
		const waitingExecutionSource: IWaitingForExecutionSource = {};
		for (const startNode of startNodes) {
			incomingNodeConnections = workflow.connectionsByDestinationNode[startNode.name];

			const incomingData: INodeExecutionData[][] = [];
			let incomingSourceData: ITaskDataConnectionsSource | null = null;

			if (incomingNodeConnections === undefined) {
				incomingData.push([
					{
						json: {},
					},
				]);
			} else {
				// Get the data of the incoming connections
				incomingSourceData = { main: [] };
				for (const connections of incomingNodeConnections.main) {
					if (!connections) {
						continue;
					}
					for (let inputIndex = 0; inputIndex < connections.length; inputIndex++) {
						connection = connections[inputIndex];

						const node = workflow.getNode(connection.node);

						if (node?.disabled) continue;

						if (node && pinData && pinData[node.name]) {
							incomingData.push(pinData[node.name]);
						} else {
							if (!runData[connection.node]) {
								continue;
							}
							const nodeIncomingData =
								runData[connection.node]?.[runIndex]?.data?.[connection.type]?.[connection.index];
							if (nodeIncomingData) {
								incomingData.push(nodeIncomingData);
							}
						}

						incomingSourceData.main.push(startNode.sourceData ?? { previousNode: connection.node });
					}
				}
			}

			const executeData: IExecuteData = {
				node: workflow.getNode(startNode.name) as INode,
				data: {
					main: incomingData,
				},
				source: incomingSourceData,
			};

			nodeExecutionStack.push(executeData);

			if (destinationNode) {
				// Check if the destinationNode has to be added as waiting
				// because some input data is already fully available
				incomingNodeConnections = workflow.connectionsByDestinationNode[destinationNode];
				if (incomingNodeConnections !== undefined) {
					for (const connections of incomingNodeConnections.main) {
						if (!connections) {
							continue;
						}
						for (let inputIndex = 0; inputIndex < connections.length; inputIndex++) {
							connection = connections[inputIndex];

							if (waitingExecution[destinationNode] === undefined) {
								waitingExecution[destinationNode] = {};
								waitingExecutionSource[destinationNode] = {};
							}
							if (waitingExecution[destinationNode][runIndex] === undefined) {
								waitingExecution[destinationNode][runIndex] = {};
								waitingExecutionSource[destinationNode][runIndex] = {};
							}
							if (waitingExecution[destinationNode][runIndex][connection.type] === undefined) {
								waitingExecution[destinationNode][runIndex][connection.type] = [];
								waitingExecutionSource[destinationNode][runIndex][connection.type] = [];
							}

							if (runData[connection.node] !== undefined) {
								// Input data exists so add as waiting
								// incomingDataDestination.push(runData[connection.node!][runIndex].data![connection.type][connection.index]);
								waitingExecution[destinationNode][runIndex][connection.type].push(
									runData[connection.node][runIndex].data![connection.type][connection.index],
								);
								waitingExecutionSource[destinationNode][runIndex][connection.type].push({
									previousNode: connection.node,
									previousNodeOutput: connection.index || undefined,
									previousNodeRun: runIndex || undefined,
								} as ISourceData);
							} else {
								waitingExecution[destinationNode][runIndex][connection.type].push(null);
								waitingExecutionSource[destinationNode][runIndex][connection.type].push(null);
							}
						}
					}
				}

				// Only run the parent nodes and no others
				runNodeFilter = workflow
					.getParentNodes(destinationNode)
					.filter((parentNodeName) => !workflow.getNode(parentNodeName)?.disabled);

				runNodeFilter.push(destinationNode);
			}
		}

		this.runExecutionData = {
			startData: {
				destinationNode,
				runNodeFilter,
			},
			resultData: {
				runData,
				pinData,
			},
			executionData: {
				contextData: {},
				nodeExecutionStack,
				metadata: {},
				waitingExecution,
				waitingExecutionSource,
			},
		};

		return this.processRunExecutionData(workflow);
	}

	// IMPORTANT: Do not add "async" to this function, it will then convert the
	//            PCancelable to a regular Promise and does so not allow canceling
	//            active executions anymore
	// eslint-disable-next-line @typescript-eslint/promise-function-async
	runPartialWorkflow2(
		workflow: Workflow,
		runData: IRunData,
		pinData: IPinData = {},
		dirtyNodeNames: string[] = [],
		destinationNodeName?: string,
		agentRequest?: AiAgentRequest,
	): PCancelable<IRun> {
		// TODO: Refactor the call-site to make `destinationNodeName` a required
		// after removing the old partial execution flow.
		assert.ok(
			destinationNodeName,
			'a destinationNodeName is required for the new partial execution flow',
		);
		const originalDestination = destinationNodeName;

		let destination = workflow.getNode(destinationNodeName);
		assert.ok(
			destination,
			`Could not find a node with the name ${destinationNodeName} in the workflow.`,
		);

		let graph = DirectedGraph.fromWorkflow(workflow);

		const destinationNodeType = workflow.nodeTypes.getByNameAndVersion(
			destination.type,
			destination.typeVersion,
		);
		// Partial execution of nodes as tools
		if (NodeHelpers.isTool(destinationNodeType.description, destination.parameters)) {
			graph = rewireGraph(destination, graph, agentRequest);
			workflow = graph.toWorkflow({ ...workflow });
			// Rewire destination node to the virtual agent
			const toolExecutorNode = workflow.getNode(TOOL_EXECUTOR_NODE_NAME);
			if (!toolExecutorNode) {
				throw new OperationalError('ToolExecutor can not be found');
			}
			destination = toolExecutorNode;
			destinationNodeName = toolExecutorNode.name;
		} else {
			// Edge Case 1:
			// Support executing a single node that is not connected to a trigger
			const destinationHasNoParents = graph.getDirectParentConnections(destination).length === 0;
			if (destinationHasNoParents) {
				// short cut here, only create a subgraph and the stacks
				graph = findSubgraph({
					graph: filterDisabledNodes(graph),
					destination,
					trigger: destination,
				});
				const filteredNodes = graph.getNodes();
				runData = cleanRunData(runData, graph, new Set([destination]));
				const { nodeExecutionStack, waitingExecution, waitingExecutionSource } =
					recreateNodeExecutionStack(graph, new Set([destination]), runData, pinData ?? {});

				this.status = 'running';
				this.runExecutionData = {
					startData: {
						destinationNode: destinationNodeName,
						runNodeFilter: Array.from(filteredNodes.values()).map((node) => node.name),
					},
					resultData: {
						runData,
						pinData,
					},
					executionData: {
						contextData: {},
						nodeExecutionStack,
						metadata: {},
						waitingExecution,
						waitingExecutionSource,
					},
				};

				return this.processRunExecutionData(graph.toWorkflow({ ...workflow }));
			}
		}

		// 1. Find the Trigger
		let trigger = findTriggerForPartialExecution(workflow, destinationNodeName, runData);
		if (trigger === undefined) {
			// destination has parents but none of them are triggers, so find the closest
			// parent node that has run data, and treat that parent as starting point

			let startNode;

			const parentNodes = workflow.getParentNodes(destinationNodeName);

			for (const nodeName of parentNodes) {
				if (runData[nodeName]) {
					startNode = workflow.getNode(nodeName);
					break;
				}
			}

			if (!startNode) {
				throw new UserError('Connect a trigger to run this node');
			}

			trigger = startNode;
		}

		// 2. Find the Subgraph
		graph = findSubgraph({ graph: filterDisabledNodes(graph), destination, trigger });
		const filteredNodes = graph.getNodes();

		// 3. Find the Start Nodes
		const dirtyNodes = graph.getNodesByNames(dirtyNodeNames);
		runData = cleanRunData(runData, graph, dirtyNodes);
		let startNodes = findStartNodes({ graph, trigger, destination, runData, pinData });

		// 4. Detect Cycles
		// 5. Handle Cycles
		startNodes = handleCycles(graph, startNodes, trigger);

		// 6. Clean Run Data
		runData = cleanRunData(runData, graph, startNodes);

		// 7. Recreate Execution Stack
		const { nodeExecutionStack, waitingExecution, waitingExecutionSource } =
			recreateNodeExecutionStack(graph, startNodes, runData, pinData ?? {});

		// 8. Execute

		// Increment currentExecutionIndex based on previous run
		this.additionalData.currentNodeExecutionIndex = getNextExecutionIndex(runData);

		this.status = 'running';
		this.runExecutionData = {
			startData: {
				destinationNode: destinationNodeName,
				originalDestinationNode: originalDestination,
				runNodeFilter: Array.from(filteredNodes.values()).map((node) => node.name),
			},
			resultData: {
				runData,
				pinData,
			},
			executionData: {
				contextData: {},
				nodeExecutionStack,
				metadata: {},
				waitingExecution,
				waitingExecutionSource,
			},
		};

		// Still passing the original workflow here, because the WorkflowDataProxy
		// needs it to create more useful error messages, e.g. differentiate
		// between a node not being connected to the node referencing it or a node
		// not existing in the workflow.
		return this.processRunExecutionData(workflow);
	}

	/**
	 * Merges temporary execution metadata into the final runData structure.
	 * During workflow execution, metadata is collected in a temporary location
	 * (executionData.metadata). This method moves that metadata to its final
	 * location in the resultData.runData for each node.
	 *
	 * @remarks
	 * - Metadata from multiple runs is preserved using run indices
	 * - Existing metadata in runData is preserved and merged with new metadata
	 * - If no metadata exists, the operation is a no-op
	 */
	moveNodeMetadata(): void {
		const metadata = get(this.runExecutionData, 'executionData.metadata');

		if (metadata) {
			const runData = get(this.runExecutionData, 'resultData.runData');

			let index: number;
			let metaRunData: ITaskMetadata;
			for (const nodeName of Object.keys(metadata)) {
				for ([index, metaRunData] of metadata[nodeName].entries()) {
					const taskData = runData[nodeName]?.[index];
					if (taskData) {
						taskData.metadata = { ...taskData.metadata, ...metaRunData };
					} else {
						Container.get(ErrorReporter).error(
							new UnexpectedError('Taskdata missing at the end of an execution'),
							{ extra: { nodeName, index } },
						);
					}
				}
			}
		}
	}

	/**
	 * Checks if all incoming connections to a node are empty (have no data).
	 * This is used to determine if a node should be executed or skipped.
	 *
	 * @param runData - The execution data from all nodes in the workflow
	 * @param inputConnections - Array of connections to check
	 * @param runIndex - Index of the current execution run (nodes can execute multiple times)
	 *
	 * @returns `true` if all connections are empty (no data), `false` if any connection has data
	 *
	 * @remarks
	 * A connection is considered empty when:
	 * - The source node doesn't exist in runData
	 * - The source node's data is undefined
	 * - The source node's output array is empty
	 * - The specified output index contains no items
	 */
	incomingConnectionIsEmpty(
		runData: IRunData,
		inputConnections: IConnection[],
		runIndex: number,
	): boolean {
		for (const inputConnection of inputConnections) {
			const nodeIncomingData = get(runData, [
				inputConnection.node,
				runIndex,
				'data',
				'main',
				inputConnection.index,
			]);
			if (nodeIncomingData !== undefined && (nodeIncomingData as object[]).length !== 0) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Prepares the waiting execution data structure for a node that needs to wait for data before it can execute.
	 * This function initializes arrays to store data and metadata for each connection of the node.
	 *
	 * @param nodeName - The name of the node to prepare waiting execution for
	 * @param numberOfConnections - Number of input connections the node has
	 * @param runIndex - The index of the current run (for nodes that may run multiple times)
	 */
	prepareWaitingToExecution(nodeName: string, numberOfConnections: number, runIndex: number) {
		const executionData = this.runExecutionData.executionData!;

		executionData.waitingExecution ??= {};
		executionData.waitingExecutionSource ??= {};

		const nodeWaiting = (executionData.waitingExecution[nodeName] ??= []);
		const nodeWaitingSource = (executionData.waitingExecutionSource[nodeName] ??= []);

		nodeWaiting[runIndex] = { main: [] };
		nodeWaitingSource[runIndex] = { main: [] };

		for (let i = 0; i < numberOfConnections; i++) {
			nodeWaiting[runIndex].main.push(null);
			nodeWaitingSource[runIndex].main.push(null);
		}
	}

	// eslint-disable-next-line complexity
	addNodeToBeExecuted(
		workflow: Workflow,
		connectionData: IConnection,
		outputIndex: number,
		parentNodeName: string,
		nodeSuccessData: INodeExecutionData[][],
		runIndex: number,
	): void {
		let stillDataMissing = false;
		const enqueueFn = workflow.settings.executionOrder === 'v1' ? 'unshift' : 'push';
		let waitingNodeIndex: number | undefined;

		// Check if node has multiple inputs as then we have to wait for all input data
		// to be present before we can add it to the node-execution-stack
		if (workflow.connectionsByDestinationNode[connectionData.node].main.length > 1) {
			// Node has multiple inputs
			let nodeWasWaiting = true;

			if (!this.runExecutionData.executionData!.waitingExecutionSource) {
				this.runExecutionData.executionData!.waitingExecutionSource = {};
			}

			// Check if there is already data for the node
			if (
				this.runExecutionData.executionData!.waitingExecution[connectionData.node] === undefined
			) {
				// Node does not have data yet so create a new empty one
				this.runExecutionData.executionData!.waitingExecution[connectionData.node] = {};
				this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node] = {};
				nodeWasWaiting = false;
			}

			// Figure out if the node is already waiting with partial data to which to add the
			// data to or if a new entry has to get created
			let createNewWaitingEntry = true;

			if (
				Object.keys(this.runExecutionData.executionData!.waitingExecution[connectionData.node])
					.length > 0
			) {
				// Check if there is already data for the input on all of the waiting nodes
				for (const index of Object.keys(
					this.runExecutionData.executionData!.waitingExecution[connectionData.node],
				)) {
					if (
						!this.runExecutionData.executionData!.waitingExecution[connectionData.node][
							parseInt(index)
						].main[connectionData.index]
					) {
						// Data for the input is missing so we can add it to the existing entry
						createNewWaitingEntry = false;
						waitingNodeIndex = parseInt(index);
						break;
					}
				}
			}

			if (waitingNodeIndex === undefined) {
				waitingNodeIndex = Object.values(
					this.runExecutionData.executionData!.waitingExecution[connectionData.node],
				).length;
			}

			if (createNewWaitingEntry) {
				// There is currently no node waiting that does not already have data for
				// the given input, so create a new entry

				this.prepareWaitingToExecution(
					connectionData.node,
					workflow.connectionsByDestinationNode[connectionData.node].main.length,
					waitingNodeIndex,
				);
			}

			// Add the new data
			if (nodeSuccessData === null) {
				this.runExecutionData.executionData!.waitingExecution[connectionData.node][
					waitingNodeIndex
				].main[connectionData.index] = null;
				this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node][
					waitingNodeIndex
				].main[connectionData.index] = null;
			} else {
				this.runExecutionData.executionData!.waitingExecution[connectionData.node][
					waitingNodeIndex
				].main[connectionData.index] = nodeSuccessData[outputIndex];

				this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node][
					waitingNodeIndex
				].main[connectionData.index] = {
					previousNode: parentNodeName,
					previousNodeOutput: outputIndex || undefined,
					previousNodeRun: runIndex || undefined,
				};
			}

			// Check if all data exists now
			let thisExecutionData: INodeExecutionData[] | null;
			let allDataFound = true;
			for (
				let i = 0;
				i <
				this.runExecutionData.executionData!.waitingExecution[connectionData.node][waitingNodeIndex]
					.main.length;
				i++
			) {
				thisExecutionData =
					this.runExecutionData.executionData!.waitingExecution[connectionData.node][
						waitingNodeIndex
					].main[i];
				if (thisExecutionData === null) {
					allDataFound = false;
					break;
				}
			}

			if (allDataFound) {
				// All data exists for node to be executed
				// So add it to the execution stack

				const executionStackItem = {
					node: workflow.nodes[connectionData.node],
					data: this.runExecutionData.executionData!.waitingExecution[connectionData.node][
						waitingNodeIndex
					],
					source:
						this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node][
							waitingNodeIndex
						],
				} as IExecuteData;

				if (
					this.runExecutionData.executionData!.waitingExecutionSource !== null &&
					this.runExecutionData.executionData!.waitingExecutionSource !== undefined
				) {
					executionStackItem.source =
						this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node][
							waitingNodeIndex
						];
				}

				this.runExecutionData.executionData!.nodeExecutionStack[enqueueFn](executionStackItem);

				// Remove the data from waiting
				delete this.runExecutionData.executionData!.waitingExecution[connectionData.node][
					waitingNodeIndex
				];
				delete this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node][
					waitingNodeIndex
				];

				if (
					Object.keys(this.runExecutionData.executionData!.waitingExecution[connectionData.node])
						.length === 0
				) {
					// No more data left for the node so also delete that one
					delete this.runExecutionData.executionData!.waitingExecution[connectionData.node];
					delete this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node];
				}
				return;
			}
			stillDataMissing = true;

			if (!nodeWasWaiting) {
				// Get a list of all the output nodes that we can check for siblings easier
				const checkOutputNodes = [];
				// eslint-disable-next-line @typescript-eslint/no-for-in-array
				for (const outputIndexParent in workflow.connectionsBySourceNode[parentNodeName].main) {
					if (
						!Object.hasOwn(workflow.connectionsBySourceNode[parentNodeName].main, outputIndexParent)
					) {
						continue;
					}
					for (const connectionDataCheck of workflow.connectionsBySourceNode[parentNodeName].main[
						outputIndexParent
					] ?? []) {
						checkOutputNodes.push(connectionDataCheck.node);
					}
				}

				// Node was not on "waitingExecution" so it is the first time it gets
				// checked. So we have to go through all the inputs and check if they
				// are already on the list to be processed.
				// If that is not the case add it.

				for (
					let inputIndex = 0;
					inputIndex < workflow.connectionsByDestinationNode[connectionData.node].main.length;
					inputIndex++
				) {
					for (const inputData of workflow.connectionsByDestinationNode[connectionData.node].main[
						inputIndex
					] ?? []) {
						if (inputData.node === parentNodeName) {
							// Is the node we come from so its data will be available for sure
							continue;
						}

						const executionStackNodes = this.runExecutionData.executionData!.nodeExecutionStack.map(
							(stackData) => stackData.node.name,
						);

						// Check if that node is also an output connection of the
						// previously processed one
						if (inputData.node !== parentNodeName && checkOutputNodes.includes(inputData.node)) {
							// So the parent node will be added anyway which
							// will then process this node next. So nothing to do
							// unless the incoming data of the node is empty
							// because then it would not be executed
							if (
								!this.incomingConnectionIsEmpty(
									this.runExecutionData.resultData.runData,
									workflow.connectionsByDestinationNode[inputData.node].main[0] ?? [],
									runIndex,
								)
							) {
								continue;
							}
						}

						// Check if it is already in the execution stack
						if (executionStackNodes.includes(inputData.node)) {
							// Node is already on the list to be executed
							// so there is nothing to do
							continue;
						}

						// Check if node got processed already
						if (this.runExecutionData.resultData.runData[inputData.node] !== undefined) {
							// Node got processed already so no need to add it
							continue;
						}

						if (!this.isLegacyExecutionOrder(workflow)) {
							// Do not automatically follow all incoming nodes and force them
							// to execute
							continue;
						}

						// Check if any of the parent nodes does not have any inputs. That
						// would mean that it has to get added to the list of nodes to process.
						const parentNodes = workflow.getParentNodes(
							inputData.node,
							NodeConnectionTypes.Main,
							-1,
						);
						let nodeToAdd: string | undefined = inputData.node;
						parentNodes.push(inputData.node);
						parentNodes.reverse();

						for (const parentNode of parentNodes) {
							// Check if that node is also an output connection of the
							// previously processed one
							if (inputData.node !== parentNode && checkOutputNodes.includes(parentNode)) {
								// So the parent node will be added anyway which
								// will then process this node next. So nothing to do.
								nodeToAdd = undefined;
								break;
							}

							// Check if it is already in the execution stack
							if (executionStackNodes.includes(parentNode)) {
								// Node is already on the list to be executed
								// so there is nothing to do
								nodeToAdd = undefined;
								break;
							}

							// Check if node got processed already
							if (this.runExecutionData.resultData.runData[parentNode] !== undefined) {
								// Node got processed already so we can use the
								// output data as input of this node
								break;
							}

							nodeToAdd = parentNode;
						}
						const parentNodesNodeToAdd = workflow.getParentNodes(nodeToAdd as string);
						if (
							parentNodesNodeToAdd.includes(parentNodeName) &&
							nodeSuccessData[outputIndex].length === 0
						) {
							// We do not add the node if there is no input data and the node that should be connected
							// is a child of the parent node. Because else it would run a node even though it should be
							// specifically not run, as it did not receive any data.
							nodeToAdd = undefined;
						}

						if (nodeToAdd === undefined) {
							// No node has to get added so process
							continue;
						}

						let addEmptyItem = false;

						if (workflow.connectionsByDestinationNode[nodeToAdd] === undefined) {
							// Add empty item if the node does not have any input connections
							addEmptyItem = true;
						} else if (
							this.incomingConnectionIsEmpty(
								this.runExecutionData.resultData.runData,
								workflow.connectionsByDestinationNode[nodeToAdd].main[0] ?? [],
								runIndex,
							)
						) {
							// Add empty item also if the input data is empty
							addEmptyItem = true;
						}

						if (addEmptyItem) {
							// Add only node if it does not have any inputs because else it will
							// be added by its input node later anyway.
							this.runExecutionData.executionData!.nodeExecutionStack[enqueueFn]({
								node: workflow.getNode(nodeToAdd) as INode,
								data: {
									main: [
										[
											{
												json: {},
											},
										],
									],
								},
								source: {
									main: [
										{
											previousNode: parentNodeName,
											previousNodeOutput: outputIndex || undefined,
											previousNodeRun: runIndex || undefined,
										},
									],
								},
							});
						}
					}
				}
			}
		}

		let connectionDataArray: Array<INodeExecutionData[] | null> = get(
			this.runExecutionData,
			[
				'executionData',
				'waitingExecution',
				connectionData.node,
				waitingNodeIndex!,
				NodeConnectionTypes.Main,
			],
			null,
		);

		if (connectionDataArray === null) {
			connectionDataArray = [];
			for (let i: number = connectionData.index; i >= 0; i--) {
				connectionDataArray[i] = null;
			}
		}

		// Add the data of the current execution
		if (nodeSuccessData === null) {
			connectionDataArray[connectionData.index] = null;
		} else {
			connectionDataArray[connectionData.index] = nodeSuccessData[outputIndex];
		}

		if (stillDataMissing) {
			waitingNodeIndex = waitingNodeIndex!;
			const waitingExecutionSource =
				this.runExecutionData.executionData!.waitingExecutionSource![connectionData.node][
					waitingNodeIndex
				].main;

			// Additional data is needed to run node so add it to waiting
			this.prepareWaitingToExecution(
				connectionData.node,
				workflow.connectionsByDestinationNode[connectionData.node].main.length,
				waitingNodeIndex,
			);

			this.runExecutionData.executionData!.waitingExecution[connectionData.node][waitingNodeIndex] =
				{
					main: connectionDataArray,
				};

			this.runExecutionData.executionData!.waitingExecutionSource![connectionData.node][
				waitingNodeIndex
			].main = waitingExecutionSource;
		} else {
			// All data is there so add it directly to stack
			this.runExecutionData.executionData!.nodeExecutionStack[enqueueFn]({
				node: workflow.nodes[connectionData.node],
				data: {
					main: connectionDataArray,
				},
				source: {
					main: [
						{
							previousNode: parentNodeName,
							previousNodeOutput: outputIndex || undefined,
							previousNodeRun: runIndex || undefined,
						},
					],
				},
			});
		}
	}

	/**
	 * Checks if everything in the workflow is complete
	 * and ready to be executed. If it returns null everything
	 * is fine. If there are issues it returns the issues
	 * which have been found for the different nodes.
	 * TODO: Does currently not check for credential issues!
	 */
	checkReadyForExecution(
		workflow: Workflow,
		inputData: {
			startNode?: string;
			destinationNode?: string;
			pinDataNodeNames?: string[];
		} = {},
	): IWorkflowIssues | null {
		const workflowIssues: IWorkflowIssues = {};

		let checkNodes: string[] = [];
		if (inputData.destinationNode) {
			// If a destination node is given we have to check all the nodes
			// leading up to it
			checkNodes = workflow.getParentNodes(inputData.destinationNode);
			checkNodes.push(inputData.destinationNode);
		} else if (inputData.startNode) {
			// If a start node is given we have to check all nodes which
			// come after it
			checkNodes = workflow.getChildNodes(inputData.startNode);
			checkNodes.push(inputData.startNode);
		}

		for (const nodeName of checkNodes) {
			let nodeIssues: INodeIssues | null = null;
			const node = workflow.nodes[nodeName];

			if (node.disabled === true) {
				continue;
			}

			const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

			if (nodeType === undefined) {
				// Node type is not known
				nodeIssues = {
					typeUnknown: true,
				};
			} else {
				nodeIssues = NodeHelpers.getNodeParametersIssues(
					nodeType.description.properties,
					node,
					nodeType.description,
					inputData.pinDataNodeNames,
				);
			}

			if (nodeIssues !== null) {
				workflowIssues[node.name] = nodeIssues;
			}
		}

		if (Object.keys(workflowIssues).length === 0) {
			return null;
		}

		return workflowIssues;
	}

	private getCustomOperation(node: INode, type: INodeType) {
		if (!type.customOperations) return undefined;
		if (!node.parameters && !node.forceCustomOperation) return undefined;

		const { customOperations } = type;
		const { resource, operation } = node.forceCustomOperation ?? node.parameters;

		if (typeof resource !== 'string' || typeof operation !== 'string') return undefined;
		if (!customOperations[resource] || !customOperations[resource][operation]) return undefined;

		const customOperation = customOperations[resource][operation];

		return customOperation;
	}

	/**
	 * Handles execution of disabled nodes by passing through input data
	 */
	private handleDisabledNode(inputData: ITaskDataConnections): IRunNodeResponse {
		if (Object.hasOwn(inputData, 'main') && inputData.main.length > 0) {
			// If the node is disabled simply return the data from the first main input
			if (inputData.main[0] === null) {
				return { data: undefined };
			}
			return { data: [inputData.main[0]] };
		}
		return { data: undefined };
	}

	private prepareConnectionInputData(
		workflow: Workflow,
		nodeType: INodeType,
		customOperation: ReturnType<WorkflowExecute['getCustomOperation']>,
		inputData: ITaskDataConnections,
	): INodeExecutionData[] | null {
		if (
			nodeType.execute ||
			customOperation ||
			(!nodeType.poll && !nodeType.trigger && !nodeType.webhook)
		) {
			if (!inputData.main?.length) {
				return null;
			}

			// We always use the data of main input and the first input for execute
			let connectionInputData = inputData.main[0];

			const forceInputNodeExecution = workflow.settings.executionOrder !== 'v1';
			if (!forceInputNodeExecution) {
				// If the nodes do not get force executed data of some inputs may be missing
				// for that reason do we use the data of the first one that contains any
				for (const mainData of inputData.main) {
					if (mainData?.length) {
						connectionInputData = mainData;
						break;
					}
				}
			}

			if (!connectionInputData || connectionInputData.length === 0) {
				return null;
			}

			return connectionInputData;
		}

		// For poll, trigger, and webhook nodes, we don't need to process input data
		return [];
	}

	/**
	 * Handles re-throwing errors from previous node execution attempts
	 */
	private rethrowLastNodeError(runExecutionData: IRunExecutionData, node: INode): void {
		if (
			runExecutionData.resultData.lastNodeExecuted === node.name &&
			runExecutionData.resultData.error !== undefined
		) {
			// The node did already fail. So throw an error here that it displays and logs it correctly.
			// Does get used by webhook and trigger nodes in case they throw an error that it is possible
			// to log the error and display in Editor-UI.
			if (
				runExecutionData.resultData.error.name === 'NodeOperationError' ||
				runExecutionData.resultData.error.name === 'NodeApiError'
			) {
				throw runExecutionData.resultData.error;
			}

			const error = new Error(runExecutionData.resultData.error.message);
			error.stack = runExecutionData.resultData.error.stack;
			throw error;
		}
	}

	/**
	 * Handles executeOnce logic by limiting input data to first item only
	 */
	private handleExecuteOnce(node: INode, inputData: ITaskDataConnections): ITaskDataConnections {
		if (node.executeOnce === true) {
			// If node should be executed only once so use only the first input item
			const newInputData: ITaskDataConnections = {};
			for (const connectionType of Object.keys(inputData)) {
				newInputData[connectionType] = inputData[connectionType].map((input) => {
					return input && input.slice(0, 1);
				});
			}
			return newInputData;
		}
		return inputData;
	}

	/**
	 * Validates execution data for JSON compatibility and reports issues to Sentry
	 */
	private reportJsonIncompatibleOutput(
		data: INodeExecutionData[][] | null,
		workflow: Workflow,
		node: INode,
	): void {
		if (Container.get(GlobalConfig).sentry.backendDsn) {
			// If data is not json compatible then log it as incorrect output
			// Does not block the execution from continuing
			const jsonCompatibleResult = isJsonCompatible(data, new Set(['pairedItem']));
			if (!jsonCompatibleResult.isValid) {
				Container.get(ErrorReporter).error('node execution returned incorrect output', {
					shouldBeLogged: false,
					extra: {
						nodeName: node.name,
						nodeType: node.type,
						nodeVersion: node.typeVersion,
						workflowId: workflow.id,
						workflowName: workflow.name ?? 'Unnamed workflow',
						executionId: this.additionalData.executionId ?? 'unsaved-execution',
						errorPath: jsonCompatibleResult.errorPath,
						errorMessage: jsonCompatibleResult.errorMessage,
					},
				});
			}
		}
	}

	private async executeNode(
		workflow: Workflow,
		node: INode,
		nodeType: INodeType,
		customOperation: ReturnType<WorkflowExecute['getCustomOperation']>,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		runExecutionData: IRunExecutionData,
		runIndex: number,
		connectionInputData: INodeExecutionData[],
		inputData: ITaskDataConnections,
		executionData: IExecuteData,
		abortSignal?: AbortSignal,
	): Promise<IRunNodeResponse> {
		const closeFunctions: CloseFunction[] = [];
		const context = new ExecuteContext(
			workflow,
			node,
			additionalData,
			mode,
			runExecutionData,
			runIndex,
			connectionInputData,
			inputData,
			executionData,
			closeFunctions,
			abortSignal,
		);

		let data: INodeExecutionData[][] | null = null;

		if (customOperation) {
			data = await customOperation.call(context);
		} else if (nodeType.execute) {
			data =
				nodeType instanceof Node
					? await nodeType.execute(context)
					: await nodeType.execute.call(context);
		}

		this.reportJsonIncompatibleOutput(data, workflow, node);

		const closeFunctionsResults = await Promise.allSettled(
			closeFunctions.map(async (fn) => await fn()),
		);

		const closingErrors = closeFunctionsResults
			.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			.map((result) => result.reason);

		if (closingErrors.length > 0) {
			if (closingErrors[0] instanceof Error) throw closingErrors[0];
			throw new ApplicationError("Error on execution node's close function(s)", {
				extra: { nodeName: node.name },
				tags: { nodeType: node.type },
				cause: closingErrors,
			});
		}

		return { data, hints: context.hints };
	}

	/**
	 * Executes a poll node
	 */
	private async executePollNode(
		workflow: Workflow,
		node: INode,
		nodeType: INodeType,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		inputData: ITaskDataConnections,
	): Promise<IRunNodeResponse> {
		if (mode === 'manual') {
			// In manual mode run the poll function
			const context = new PollContext(workflow, node, additionalData, mode, 'manual');
			return { data: await nodeType.poll!.call(context) };
		}
		// In any other mode pass data through as it already contains the result of the poll
		return { data: inputData.main as INodeExecutionData[][] };
	}

	/**
	 * Executes a trigger node
	 */
	private async executeTriggerNode(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		inputData: ITaskDataConnections,
		abortSignal?: AbortSignal,
	): Promise<IRunNodeResponse> {
		if (mode === 'manual') {
			// In manual mode start the trigger
			const triggerResponse = await Container.get(TriggersAndPollers).runTrigger(
				workflow,
				node,
				NodeExecuteFunctions.getExecuteTriggerFunctions,
				additionalData,
				mode,
				'manual',
			);

			if (triggerResponse === undefined) {
				return { data: null };
			}

			let closeFunction;
			if (triggerResponse.closeFunction) {
				// In manual mode we return the trigger closeFunction. That allows it to be called directly
				// but we do not have to wait for it to finish. That is important for things like queue-nodes.
				// There the full close will may be delayed till a message gets acknowledged after the execution.
				// If we would not be able to wait for it to close would it cause problems with "own" mode as the
				// process would be killed directly after it and so the acknowledge would not have been finished yet.
				closeFunction = triggerResponse.closeFunction;

				// Manual testing of Trigger nodes creates an execution. If the execution is cancelled, `closeFunction` should be called to cleanup any open connections/consumers
				abortSignal?.addEventListener('abort', closeFunction);
			}

			if (triggerResponse.manualTriggerFunction !== undefined) {
				// If a manual trigger function is defined call it and wait till it did run
				await triggerResponse.manualTriggerFunction();
			}

			const response = await triggerResponse.manualTriggerResponse!;

			if (response.length === 0) {
				return { data: null, closeFunction };
			}

			return { data: response, closeFunction };
		}
		// For trigger nodes in any mode except "manual" do we simply pass the data through
		return { data: inputData.main as INodeExecutionData[][] };
	}

	private async executeDeclarativeNodeInTest(
		workflow: Workflow,
		node: INode,
		nodeType: INodeType,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		runExecutionData: IRunExecutionData,
		runIndex: number,
		connectionInputData: INodeExecutionData[],
		inputData: ITaskDataConnections,
		executionData: IExecuteData,
	): Promise<IRunNodeResponse> {
		// NOTE: This block is only called by nodes tests.
		// In the application, declarative nodes get assigned a `.execute` method in NodeTypes.
		const context = new ExecuteContext(
			workflow,
			node,
			additionalData,
			mode,
			runExecutionData,
			runIndex,
			connectionInputData,
			inputData,
			executionData,
			[],
		);
		const routingNode = new RoutingNode(context, nodeType);
		const data = await routingNode.runNode();
		return { data };
	}

	/**
	 * Figures out the node type and state and calls the right execution
	 * implementation.
	 */
	async runNode(
		workflow: Workflow,
		executionData: IExecuteData,
		runExecutionData: IRunExecutionData,
		runIndex: number,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		abortSignal?: AbortSignal,
	): Promise<IRunNodeResponse> {
		const { node } = executionData;
		let inputData = executionData.data;

		if (node.disabled === true) {
			return this.handleDisabledNode(inputData);
		}

		const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		const customOperation = this.getCustomOperation(node, nodeType);

		const connectionInputData = this.prepareConnectionInputData(
			workflow,
			nodeType,
			customOperation,
			inputData,
		);

		if (connectionInputData === null) {
			return { data: undefined };
		}

		this.rethrowLastNodeError(runExecutionData, node);

		inputData = this.handleExecuteOnce(node, inputData);

		const isDeclarativeNode = nodeType.description.requestDefaults !== undefined;

		if (nodeType.execute || customOperation) {
			return await this.executeNode(
				workflow,
				node,
				nodeType,
				customOperation,
				additionalData,
				mode,
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				executionData,
				abortSignal,
			);
		}

		if (nodeType.poll) {
			return await this.executePollNode(workflow, node, nodeType, additionalData, mode, inputData);
		}

		if (nodeType.trigger) {
			return await this.executeTriggerNode(
				workflow,
				node,
				additionalData,
				mode,
				inputData,
				abortSignal,
			);
		}

		if (nodeType.webhook && !isDeclarativeNode) {
			// Check if the node have requestDefaults(Declarative Node),
			// else for webhook nodes always simply pass the data through
			// as webhook method would be called by WebhookService
			return { data: inputData.main as INodeExecutionData[][] };
		}

		return await this.executeDeclarativeNodeInTest(
			workflow,
			node,
			nodeType,
			additionalData,
			mode,
			runExecutionData,
			runIndex,
			connectionInputData,
			inputData,
			executionData,
		);
	}

	private assertExecutionDataExists(
		this: WorkflowExecute,
		executionData: IRunExecutionData['executionData'],
		workflow: Workflow,
	): asserts executionData is NonNullable<IRunExecutionData['executionData']> {
		if (!executionData) {
			throw new UnexpectedError('Failed to run workflow due to missing execution data', {
				extra: {
					workflowId: workflow.id,
					executionId: this.additionalData.executionId,
					mode: this.mode,
				},
			});
		}
	}

	/**
	 * Handles executions that have been waiting by
	 * 1. unsetting the `waitTill`
	 * 2. disabling the currently executing node (which should be the node that
	 *    put the execution into waiting) making sure it won't be executed again
	 * 3. Removing the last run for the last executed node (which also should be
	 *    the node that put the execution into waiting) to make sure the node
	 *    does not show up as having run twice
	 */
	private handleWaitingState(workflow: Workflow) {
		if (this.runExecutionData.waitTill) {
			this.runExecutionData.waitTill = undefined;

			this.assertExecutionDataExists(this.runExecutionData.executionData, workflow);
			this.runExecutionData.executionData.nodeExecutionStack[0].node.disabled = true;

			const lastNodeExecuted = this.runExecutionData.resultData.lastNodeExecuted as string;
			this.runExecutionData.resultData.runData[lastNodeExecuted].pop();
		}
	}

	private checkForWorkflowIssues(workflow: Workflow): void {
		this.assertExecutionDataExists(this.runExecutionData.executionData, workflow);
		// Node execution stack will be empty for an execution containing only Chat
		// Trigger.
		const startNode = this.runExecutionData.executionData.nodeExecutionStack.at(0)?.node.name;

		let destinationNode: string | undefined;
		if (this.runExecutionData.startData && this.runExecutionData.startData.destinationNode) {
			destinationNode = this.runExecutionData.startData.destinationNode;
		}
		const pinDataNodeNames = Object.keys(this.runExecutionData.resultData.pinData ?? {});
		const workflowIssues = this.checkReadyForExecution(workflow, {
			startNode,
			destinationNode,
			pinDataNodeNames,
		});
		if (workflowIssues !== null) {
			throw new WorkflowHasIssuesError();
		}
	}

	private setupExecution(): {
		startedAt: Date;
		hooks: ExecutionLifecycleHooks;
	} {
		this.status = 'running';

		const { hooks } = this.additionalData;
		assert.ok(hooks, 'Failed to run workflow due to missing execution lifecycle hooks');

		// NOTE: As far as I can tell this code is dead.
		// FIXME: Fix the types to make sure startData is always set and remove the
		// code.
		if (this.runExecutionData.startData === undefined) {
			this.runExecutionData.startData = {};
		}

		return { startedAt: new Date(), hooks };
	}

	/**
	 * Runs the given execution data.
	 *
	 */
	// IMPORTANT: Do not add "async" to this function, it will then convert the
	//            PCancelable to a regular Promise and does so not allow canceling
	//            active executions anymore
	// eslint-disable-next-line @typescript-eslint/promise-function-async
	processRunExecutionData(workflow: Workflow): PCancelable<IRun> {
		Logger.debug('Workflow execution started', { workflowId: workflow.id });
		const { startedAt, hooks } = this.setupExecution();
		this.checkForWorkflowIssues(workflow);
		this.handleWaitingState(workflow);

		// Variables which hold temporary data for each node-execution
		let executionData: IExecuteData;
		let executionError: ExecutionBaseError | undefined;
		let executionNode: INode;
		let runIndex: number;
		let currentExecutionTry = '';
		let lastExecutionTry = '';
		let closeFunction: Promise<void> | undefined;

		return new PCancelable(async (resolve, _reject, onCancel) => {
			// Let as many nodes listen to the abort signal, without getting the MaxListenersExceededWarning
			setMaxListeners(Infinity, this.abortController.signal);

			onCancel.shouldReject = false;
			onCancel(() => {
				this.status = 'canceled';
				this.updateTaskStatusesToCancelled();
				this.abortController.abort();
				const fullRunData = this.getFullRunData(startedAt);
				void hooks.runHook('workflowExecuteAfter', [fullRunData]);
			});

			// eslint-disable-next-line complexity
			const returnPromise = (async () => {
				try {
					if (!this.additionalData.restartExecutionId) {
						await hooks.runHook('workflowExecuteBefore', [workflow, this.runExecutionData]);
					}
				} catch (error) {
					const e = error as unknown as ExecutionBaseError;

					// Set the error that it can be saved correctly
					executionError = {
						...e,
						message: e.message,
						stack: e.stack,
					};

					// Set the incoming data of the node that it can be saved correctly

					executionData = this.runExecutionData.executionData!.nodeExecutionStack[0];
					const taskData: ITaskData = {
						startTime: Date.now(),
						executionIndex: 0,
						executionTime: 0,
						data: {
							main: executionData.data.main,
						},
						source: [],
						executionStatus: 'error',
						hints: [],
					};
					this.runExecutionData.resultData = {
						runData: {
							[executionData.node.name]: [taskData],
						},
						lastNodeExecuted: executionData.node.name,
						error: executionError,
					};

					throw error;
				}

				executionLoop: while (
					this.runExecutionData.executionData!.nodeExecutionStack.length !== 0
				) {
					if (
						this.additionalData.executionTimeoutTimestamp !== undefined &&
						Date.now() >= this.additionalData.executionTimeoutTimestamp
					) {
						this.status = 'canceled';
					}

					if (this.status === 'canceled') {
						return;
					}

					let nodeSuccessData: INodeExecutionData[][] | null | undefined = null;
					executionError = undefined;
					executionData =
						this.runExecutionData.executionData!.nodeExecutionStack.shift() as IExecuteData;
					executionNode = executionData.node;

					const taskStartedData: ITaskStartedData = {
						startTime: Date.now(),
						executionIndex: this.additionalData.currentNodeExecutionIndex++,
						source: !executionData.source ? [] : executionData.source.main,
						hints: [],
					};

					// Update the pairedItem information on items
					const newTaskDataConnections: ITaskDataConnections = {};
					for (const connectionType of Object.keys(executionData.data)) {
						newTaskDataConnections[connectionType] = executionData.data[connectionType].map(
							(input, inputIndex) => {
								if (input === null) {
									return input;
								}

								return input.map((item, itemIndex) => {
									return {
										...item,
										pairedItem: {
											item: itemIndex,
											input: inputIndex || undefined,
										},
									};
								});
							},
						);
					}
					executionData.data = newTaskDataConnections;

					// Get the index of the current run
					runIndex = 0;
					if (Object.hasOwn(this.runExecutionData.resultData.runData, executionNode.name)) {
						runIndex = this.runExecutionData.resultData.runData[executionNode.name].length;
					}
					currentExecutionTry = `${executionNode.name}:${runIndex}`;
					if (currentExecutionTry === lastExecutionTry) {
						throw new ApplicationError(
							'Stopped execution because it seems to be in an endless loop',
						);
					}

					if (
						this.runExecutionData.startData!.runNodeFilter !== undefined &&
						this.runExecutionData.startData!.runNodeFilter.indexOf(executionNode.name) === -1
					) {
						// If filter is set and node is not on filter skip it, that avoids the problem that it executes
						// leaves that are parallel to a selected destinationNode. Normally it would execute them because
						// they have the same parent and it executes all child nodes.
						continue;
					}

					const hasInputData = this.ensureInputData(workflow, executionNode, executionData);
					if (!hasInputData) {
						lastExecutionTry = currentExecutionTry;
						continue executionLoop;
					}

					Logger.debug(`Start executing node "${executionNode.name}"`, {
						node: executionNode.name,
						workflowId: workflow.id,
					});
					await hooks.runHook('nodeExecuteBefore', [executionNode.name, taskStartedData]);
					let maxTries = 1;
					if (executionData.node.retryOnFail === true) {
						// TODO: Remove the hardcoded default-values here and also in NodeSettings.vue
						maxTries = Math.min(5, Math.max(2, executionData.node.maxTries || 3));
					}

					let waitBetweenTries = 0;
					if (executionData.node.retryOnFail === true) {
						// TODO: Remove the hardcoded default-values here and also in NodeSettings.vue
						waitBetweenTries = Math.min(
							5000,
							Math.max(0, executionData.node.waitBetweenTries || 1000),
						);
					}

					for (let tryIndex = 0; tryIndex < maxTries; tryIndex++) {
						try {
							if (tryIndex !== 0) {
								// Reset executionError from previous error try
								executionError = undefined;
								if (waitBetweenTries !== 0) {
									// TODO: Improve that in the future and check if other nodes can
									//       be executed in the meantime

									await new Promise((resolve) => {
										setTimeout(() => {
											resolve(undefined);
										}, waitBetweenTries);
									});
								}
							}

							const { pinData } = this.runExecutionData.resultData;

							if (pinData && !executionNode.disabled && pinData[executionNode.name] !== undefined) {
								const nodePinData = pinData[executionNode.name];

								nodeSuccessData = [nodePinData]; // always zeroth runIndex
							} else {
								Logger.debug(`Running node "${executionNode.name}" started`, {
									node: executionNode.name,
									workflowId: workflow.id,
								});

								let runNodeData = await this.runNode(
									workflow,
									executionData,
									this.runExecutionData,
									runIndex,
									this.additionalData,
									this.mode,
									this.abortController.signal,
								);

								nodeSuccessData = runNodeData.data;

								let didContinueOnFail = nodeSuccessData?.[0]?.[0]?.json?.error !== undefined;

								while (didContinueOnFail && tryIndex !== maxTries - 1) {
									await sleep(waitBetweenTries);

									runNodeData = await this.runNode(
										workflow,
										executionData,
										this.runExecutionData,
										runIndex,
										this.additionalData,
										this.mode,
										this.abortController.signal,
									);

									nodeSuccessData = runNodeData.data;
									didContinueOnFail = nodeSuccessData?.[0]?.[0]?.json?.error !== undefined;
									tryIndex++;
								}

								if (runNodeData.hints?.length) {
									taskStartedData.hints!.push(...runNodeData.hints);
								}

								if (nodeSuccessData && executionData.node.onError === 'continueErrorOutput') {
									this.handleNodeErrorOutput(workflow, executionData, nodeSuccessData, runIndex);
								}

								if (runNodeData.closeFunction) {
									// Explanation why we do this can be found in n8n-workflow/Workflow.ts -> runNode

									closeFunction = runNodeData.closeFunction();
								}
							}

							Logger.debug(`Running node "${executionNode.name}" finished successfully`, {
								node: executionNode.name,
								workflowId: workflow.id,
							});

							nodeSuccessData = this.assignPairedItems(nodeSuccessData, executionData);

							if (!nodeSuccessData?.[0]?.[0]) {
								if (executionData.node.alwaysOutputData === true) {
									const pairedItem: IPairedItemData[] = [];

									// Get pairedItem from all input items
									executionData.data.main.forEach((inputData, inputIndex) => {
										if (!inputData) {
											return;
										}
										inputData.forEach((_item, itemIndex) => {
											pairedItem.push({
												item: itemIndex,
												input: inputIndex,
											});
										});
									});

									nodeSuccessData ??= [];
									nodeSuccessData[0] = [
										{
											json: {},
											pairedItem,
										},
									];
								}
							}

							if (nodeSuccessData === null && !this.runExecutionData.waitTill) {
								// If null gets returned it means that the node did succeed
								// but did not have any data. So the branch should end
								// (meaning the nodes afterwards should not be processed)
								continue executionLoop;
							}

							break;
						} catch (error) {
							this.runExecutionData.resultData.lastNodeExecuted = executionData.node.name;

							let toReport: Error | undefined;
							if (error instanceof ApplicationError) {
								// Report any unhandled errors that were wrapped in by one of our error classes
								if (error.cause instanceof Error) toReport = error.cause;
							} else {
								// Report any unhandled and non-wrapped errors to Sentry
								toReport = error;
							}
							if (toReport) {
								Container.get(ErrorReporter).error(toReport, {
									extra: {
										nodeName: executionNode.name,
										nodeType: executionNode.type,
										nodeVersion: executionNode.typeVersion,
										workflowId: workflow.id,
									},
								});
							}

							const e = error as unknown as ExecutionBaseError;

							executionError = { ...e, message: e.message, stack: e.stack };

							Logger.debug(`Running node "${executionNode.name}" finished with error`, {
								node: executionNode.name,
								workflowId: workflow.id,
							});
						}
					}

					// Add the data to return to the user
					// (currently does not get cloned as data does not get changed, maybe later we should do that?!?!)

					if (!Object.hasOwn(this.runExecutionData.resultData.runData, executionNode.name)) {
						this.runExecutionData.resultData.runData[executionNode.name] = [];
					}

					const taskData: ITaskData = {
						...taskStartedData,
						executionTime: Date.now() - taskStartedData.startTime,
						metadata: executionData.metadata,
						executionStatus: this.runExecutionData.waitTill ? 'waiting' : 'success',
					};

					if (executionError !== undefined) {
						taskData.error = executionError;
						taskData.executionStatus = 'error';

						// Send error to the response if necessary
						await hooks?.runHook('sendChunk', [
							{
								type: 'error',
								content: executionError.description,
								metadata: {
									nodeId: executionNode.id,
									nodeName: executionNode.name,
									runIndex,
									itemIndex: 0,
								},
							},
						]);

						if (
							executionData.node.continueOnFail === true ||
							['continueRegularOutput', 'continueErrorOutput'].includes(
								executionData.node.onError || '',
							)
						) {
							// Workflow should continue running even if node errors
							if (Object.hasOwn(executionData.data, 'main') && executionData.data.main.length > 0) {
								// Simply get the input data of the node if it has any and pass it through
								// to the next node
								if (executionData.data.main[0] !== null) {
									nodeSuccessData = [executionData.data.main[0]];
								}
							}
						} else {
							// Node execution did fail so add error and stop execution
							this.runExecutionData.resultData.runData[executionNode.name].push(taskData);

							// Add the execution data again so that it can get restarted
							this.runExecutionData.executionData!.nodeExecutionStack.unshift(executionData);
							// Only execute the nodeExecuteAfter hook if the node did not get aborted
							if (!this.isCancelled) {
								await hooks.runHook('nodeExecuteAfter', [
									executionNode.name,
									taskData,
									this.runExecutionData,
								]);
							}

							break;
						}
					}

					// Merge error information to default output for now
					// As the new nodes can report the errors in
					// the `error` property.
					for (const execution of nodeSuccessData!) {
						for (const lineResult of execution) {
							if (
								lineResult.json !== undefined &&
								lineResult.json.$error !== undefined &&
								lineResult.json.$json !== undefined
							) {
								lineResult.error = lineResult.json.$error as NodeApiError | NodeOperationError;
								lineResult.json = {
									error: (lineResult.json.$error as NodeApiError | NodeOperationError).message,
								};
							} else if (lineResult.error !== undefined) {
								lineResult.json = { error: lineResult.error.message };
							}
						}
					}

					// Node executed successfully. So add data and go on.
					taskData.data = {
						main: nodeSuccessData,
					} as ITaskDataConnections;

					// Rewire output data log to the given connectionType
					if (executionNode.rewireOutputLogTo) {
						taskData.data = {
							[executionNode.rewireOutputLogTo]: nodeSuccessData,
						} as ITaskDataConnections;
					}

					this.runExecutionData.resultData.runData[executionNode.name].push(taskData);

					if (this.runExecutionData.waitTill) {
						await hooks.runHook('nodeExecuteAfter', [
							executionNode.name,
							taskData,
							this.runExecutionData,
						]);

						// Add the node back to the stack that the workflow can start to execute again from that node
						this.runExecutionData.executionData!.nodeExecutionStack.unshift(executionData);

						break;
					}

					if (
						this.runExecutionData.startData &&
						this.runExecutionData.startData.destinationNode &&
						this.runExecutionData.startData.destinationNode === executionNode.name
					) {
						// Before stopping, make sure we are executing hooks so
						// That frontend is notified for example for manual executions.
						await hooks.runHook('nodeExecuteAfter', [
							executionNode.name,
							taskData,
							this.runExecutionData,
						]);

						// If destination node is defined and got executed stop execution
						continue;
					}

					// Add the nodes to which the current node has an output connection to that they can
					// be executed next
					if (Object.hasOwn(workflow.connectionsBySourceNode, executionNode.name)) {
						if (Object.hasOwn(workflow.connectionsBySourceNode[executionNode.name], 'main')) {
							let outputIndex: string;
							let connectionData: IConnection;
							// Iterate over all the outputs

							const nodesToAdd: Array<{
								position: [number, number];
								connection: IConnection;
								outputIndex: number;
							}> = [];

							// Add the nodes to be executed
							// eslint-disable-next-line @typescript-eslint/no-for-in-array
							for (outputIndex in workflow.connectionsBySourceNode[executionNode.name].main) {
								if (
									!Object.hasOwn(
										workflow.connectionsBySourceNode[executionNode.name].main,
										outputIndex,
									)
								) {
									continue;
								}

								// Iterate over all the different connections of this output
								for (connectionData of workflow.connectionsBySourceNode[executionNode.name].main[
									outputIndex
								] ?? []) {
									if (!Object.hasOwn(workflow.nodes, connectionData.node)) {
										throw new ApplicationError('Destination node not found', {
											extra: {
												sourceNodeName: executionNode.name,
												destinationNodeName: connectionData.node,
											},
										});
									}

									if (
										nodeSuccessData![outputIndex] &&
										(nodeSuccessData![outputIndex].length !== 0 ||
											(connectionData.index > 0 && this.isLegacyExecutionOrder(workflow)))
									) {
										// Add the node only if it did execute or if connected to second "optional" input
										if (workflow.settings.executionOrder === 'v1') {
											const nodeToAdd = workflow.getNode(connectionData.node);
											nodesToAdd.push({
												position: nodeToAdd?.position || [0, 0],
												connection: connectionData,
												outputIndex: parseInt(outputIndex, 10),
											});
										} else {
											this.addNodeToBeExecuted(
												workflow,
												connectionData,
												parseInt(outputIndex, 10),
												executionNode.name,
												nodeSuccessData!,
												runIndex,
											);
										}
									}
								}
							}

							if (workflow.settings.executionOrder === 'v1') {
								// Always execute the node that is more to the top-left first
								nodesToAdd.sort((a, b) => {
									if (a.position[1] < b.position[1]) {
										return 1;
									}
									if (a.position[1] > b.position[1]) {
										return -1;
									}

									if (a.position[0] > b.position[0]) {
										return -1;
									}

									return 0;
								});

								for (const nodeData of nodesToAdd) {
									this.addNodeToBeExecuted(
										workflow,
										nodeData.connection,
										nodeData.outputIndex,
										executionNode.name,
										nodeSuccessData!,
										runIndex,
									);
								}
							}
						}
					}

					// If we got here, it means that we did not stop executing from manual executions / destination.
					// Execute hooks now to make sure that all hooks are executed properly
					// Await is needed to make sure that we don't fall into concurrency problems
					// When saving node execution data
					await hooks.runHook('nodeExecuteAfter', [
						executionNode.name,
						taskData,
						this.runExecutionData,
					]);

					let waitingNodes: string[] = Object.keys(
						this.runExecutionData.executionData!.waitingExecution,
					);

					if (
						this.runExecutionData.executionData!.nodeExecutionStack.length === 0 &&
						waitingNodes.length
					) {
						// There are no more nodes in the execution stack. Check if there are
						// waiting nodes that do not require data on all inputs and execute them,
						// one by one.

						// TODO: Should this also care about workflow position (top-left first?)
						for (let i = 0; i < waitingNodes.length; i++) {
							const nodeName = waitingNodes[i];

							const checkNode = workflow.getNode(nodeName);
							if (!checkNode) {
								continue;
							}
							const nodeType = workflow.nodeTypes.getByNameAndVersion(
								checkNode.type,
								checkNode.typeVersion,
							);

							// Check if the node is only allowed execute if all inputs received data
							let requiredInputs =
								workflow.settings.executionOrder === 'v1'
									? nodeType.description.requiredInputs
									: undefined;
							if (requiredInputs !== undefined) {
								if (typeof requiredInputs === 'string') {
									requiredInputs = workflow.expression.getSimpleParameterValue(
										checkNode,
										requiredInputs,
										this.mode,
										{ $version: checkNode.typeVersion },
										undefined,
										[],
									) as number[];
								}

								if (
									(requiredInputs !== undefined &&
										Array.isArray(requiredInputs) &&
										requiredInputs.length === nodeType.description.inputs.length) ||
									requiredInputs === nodeType.description.inputs.length
								) {
									// All inputs are required, but not all have data so do not continue
									continue;
								}
							}

							const parentNodes = workflow.getParentNodes(nodeName);

							// Check if input nodes (of same run) got already executed

							const parentIsWaiting = parentNodes.some((value) => waitingNodes.includes(value));
							if (parentIsWaiting) {
								// Execute node later as one of its dependencies is still outstanding
								continue;
							}

							const runIndexes = Object.keys(
								this.runExecutionData.executionData!.waitingExecution[nodeName],
							).sort();

							// The run-index of the earliest outstanding one
							const firstRunIndex = parseInt(runIndexes[0]);

							// Find all the inputs which received any kind of data, even if it was an empty
							// array as this shows that the parent nodes executed but they did not have any
							// data to pass on.
							const inputsWithData = this.runExecutionData
								.executionData!.waitingExecution[nodeName][firstRunIndex].main.map((data, index) =>
									data === null ? null : index,
								)
								.filter((data) => data !== null);

							if (requiredInputs !== undefined) {
								// Certain inputs are required that the node can execute

								if (Array.isArray(requiredInputs)) {
									// Specific inputs are required (array of input indexes)
									let inputDataMissing = false;
									for (const requiredInput of requiredInputs) {
										if (!inputsWithData.includes(requiredInput)) {
											inputDataMissing = true;
											break;
										}
									}
									if (inputDataMissing) {
										continue;
									}
								} else {
									// A certain amount of inputs are required (amount of inputs)
									if (inputsWithData.length < requiredInputs) {
										continue;
									}
								}
							}

							const taskDataMain = this.runExecutionData.executionData!.waitingExecution[nodeName][
								firstRunIndex
							].main.map((data) => {
								// For the inputs for which never any data got received set it to an empty array
								return data === null ? [] : data;
							});

							if (taskDataMain.filter((data) => data.length).length !== 0) {
								// Add the node to be executed

								// Make sure that each input at least receives an empty array
								if (taskDataMain.length < nodeType.description.inputs.length) {
									for (; taskDataMain.length < nodeType.description.inputs.length; ) {
										taskDataMain.push([]);
									}
								}

								this.runExecutionData.executionData!.nodeExecutionStack.push({
									node: workflow.nodes[nodeName],
									data: {
										main: taskDataMain,
									},
									source:
										this.runExecutionData.executionData!.waitingExecutionSource![nodeName][
											firstRunIndex
										],
								});
							}

							// Remove the node from waiting
							delete this.runExecutionData.executionData!.waitingExecution[nodeName][firstRunIndex];
							delete this.runExecutionData.executionData!.waitingExecutionSource![nodeName][
								firstRunIndex
							];

							if (
								Object.keys(this.runExecutionData.executionData!.waitingExecution[nodeName])
									.length === 0
							) {
								// No more data left for the node so also delete that one
								delete this.runExecutionData.executionData!.waitingExecution[nodeName];
								delete this.runExecutionData.executionData!.waitingExecutionSource![nodeName];
							}

							if (taskDataMain.filter((data) => data.length).length !== 0) {
								// Node to execute got found and added to stop
								break;
							} else {
								// Node to add did not get found, rather an empty one removed so continue with search
								waitingNodes = Object.keys(this.runExecutionData.executionData!.waitingExecution);
								// Set counter to start again from the beginning. Set it to -1 as it auto increments
								// after run. So only like that will we end up again at 0.
								i = -1;
							}
						}
					}
				}

				return;
			})()
				.then(async () => {
					if (this.status === 'canceled' && executionError === undefined) {
						return await this.processSuccessExecution(
							startedAt,
							workflow,
							new ExecutionCancelledError(this.additionalData.executionId ?? 'unknown'),
							closeFunction,
						);
					}
					return await this.processSuccessExecution(
						startedAt,
						workflow,
						executionError,
						closeFunction,
					);
				})
				.catch(async (error) => {
					const fullRunData = this.getFullRunData(startedAt);

					fullRunData.data.resultData.error = {
						...error,
						message: error.message,
						stack: error.stack,
					};

					// Check if static data changed
					let newStaticData: IDataObject | undefined;

					if (workflow.staticData.__dataChanged === true) {
						// Static data of workflow changed
						newStaticData = workflow.staticData;
					}

					this.moveNodeMetadata();

					await hooks
						.runHook('workflowExecuteAfter', [fullRunData, newStaticData])
						.catch((error) => {
							console.error('There was a problem running hook "workflowExecuteAfter"', error);
						});

					if (closeFunction) {
						try {
							await closeFunction;
						} catch (errorClose) {
							Logger.error(
								`There was a problem deactivating trigger of workflow "${workflow.id}": "${errorClose.message}"`,
								{
									workflowId: workflow.id,
								},
							);
						}
					}

					return fullRunData;
				});

			return await returnPromise.then(resolve);
		});
	}

	/**
	 * This method determines if a specific node has incoming connections and verifies if execution data is available for all required inputs.
	 * If any required input data is missing, the node execution is deferred by pushing it back onto the execution stack.
	 *
	 * @param workflow - The workflow containing the node and connections.
	 * @param executionNode - The node being checked.
	 * @param executionData - The data available for executing the node.
	 * @returns `true` if the node has the required input data and can execute immediately, otherwise `false`.
	 */
	ensureInputData(workflow: Workflow, executionNode: INode, executionData: IExecuteData): boolean {
		const inputConnections = workflow.connectionsByDestinationNode[executionNode.name]?.main ?? [];
		for (let connectionIndex = 0; connectionIndex < inputConnections.length; connectionIndex++) {
			const highestNodes = workflow.getHighestNode(executionNode.name, connectionIndex);
			if (highestNodes.length === 0) {
				// If there is no valid incoming node (if all are disabled)
				// then ignore that it has inputs and simply execute it as it is without
				// any data
				return true;
			}

			if (!Object.hasOwn(executionData.data, 'main')) {
				// ExecutionData does not even have the connection set up so can
				// not have that data, so add it again to be executed later
				this.runExecutionData.executionData!.nodeExecutionStack.push(executionData);
				return false;
			}

			if (this.isLegacyExecutionOrder(workflow)) {
				// Check if it has the data for all the inputs
				// The most nodes just have one but merge node for example has two and data
				// of both inputs has to be available to be able to process the node.
				if (
					executionData.data.main.length < connectionIndex ||
					executionData.data.main[connectionIndex] === null
				) {
					// Does not have the data of the connections so add back to stack
					this.runExecutionData.executionData!.nodeExecutionStack.push(executionData);
					return false;
				}
			}
		}
		return true;
	}

	/**
	 * Processes the final state of a workflow execution and prepares the execution result.
	 * This method handles different completion scenarios: success, waiting, error, and canceled states.
	 * It also manages cleanup tasks like static data updates and trigger deactivation.
	 *
	 * @param startedAt - The timestamp when the workflow execution started
	 * @param workflow - The workflow being executed
	 * @param executionError - Optional error that occurred during execution
	 * @param closeFunction - Optional promise that handles cleanup of triggers/webhooks
	 *
	 * @returns A promise that resolves to the complete workflow execution data (IRun)
	 *
	 * @remarks
	 * The function performs these tasks in order:
	 * 1. Generates full execution data
	 * 2. Sets appropriate status based on execution outcome
	 * 3. Handles any static data changes
	 * 4. Moves node metadata to its final location
	 * 5. Executes the 'workflowExecuteAfter' hook
	 * 6. Performs cleanup via closeFunction if provided
	 */
	async processSuccessExecution(
		startedAt: Date,
		workflow: Workflow,
		executionError?: ExecutionBaseError,
		closeFunction?: Promise<void>,
	): Promise<IRun> {
		const fullRunData = this.getFullRunData(startedAt);

		if (executionError !== undefined) {
			Logger.debug('Workflow execution finished with error', {
				error: executionError,
				workflowId: workflow.id,
			});
			fullRunData.data.resultData.error = {
				...executionError,
				message: executionError.message,
				stack: executionError.stack,
			} as ExecutionBaseError;
			if (executionError.message?.includes('canceled')) {
				fullRunData.status = 'canceled';
			}
		} else if (this.runExecutionData.waitTill) {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			Logger.debug(`Workflow execution will wait until ${this.runExecutionData.waitTill}`, {
				workflowId: workflow.id,
			});
			fullRunData.waitTill = this.runExecutionData.waitTill;
			fullRunData.status = 'waiting';
		} else {
			Logger.debug('Workflow execution finished successfully', { workflowId: workflow.id });
			fullRunData.finished = true;
			fullRunData.status = 'success';
		}

		// Check if static data changed
		let newStaticData: IDataObject | undefined;

		if (workflow.staticData.__dataChanged === true) {
			// Static data of workflow changed
			newStaticData = workflow.staticData;
		}

		this.moveNodeMetadata();
		// Prevent from running the hook if the error is an abort error as it was already handled
		if (!this.isCancelled) {
			await this.additionalData.hooks?.runHook('workflowExecuteAfter', [
				fullRunData,
				newStaticData,
			]);
		}

		if (closeFunction) {
			try {
				await closeFunction;
			} catch (error) {
				Logger.error(
					`There was a problem deactivating trigger of workflow "${workflow.id}": "${error.message}"`,
					{
						workflowId: workflow.id,
					},
				);
			}
		}

		return fullRunData;
	}

	getFullRunData(startedAt: Date): IRun {
		return {
			data: this.runExecutionData,
			mode: this.mode,
			startedAt,
			stoppedAt: new Date(),
			status: this.status,
		};
	}

	handleNodeErrorOutput(
		workflow: Workflow,
		executionData: IExecuteData,
		nodeSuccessData: INodeExecutionData[][],
		runIndex: number,
	): void {
		const nodeType = workflow.nodeTypes.getByNameAndVersion(
			executionData.node.type,
			executionData.node.typeVersion,
		);
		const outputs = NodeHelpers.getNodeOutputs(workflow, executionData.node, nodeType.description);
		const outputTypes = NodeHelpers.getConnectionTypes(outputs);
		const mainOutputTypes = outputTypes.filter((output) => output === NodeConnectionTypes.Main);

		const errorItems: INodeExecutionData[] = [];
		const closeFunctions: CloseFunction[] = [];
		// Create a WorkflowDataProxy instance that we can get the data of the
		// item which did error
		const executeFunctions = new ExecuteContext(
			workflow,
			executionData.node,
			this.additionalData,
			this.mode,
			this.runExecutionData,
			runIndex,
			[],
			executionData.data,
			executionData,
			closeFunctions,
			this.abortController.signal,
		);

		const dataProxy = executeFunctions.getWorkflowDataProxy(0);

		// Loop over all outputs except the error output as it would not contain data by default
		for (let outputIndex = 0; outputIndex < mainOutputTypes.length - 1; outputIndex++) {
			const successItems: INodeExecutionData[] = [];
			const items = nodeSuccessData[outputIndex]?.length ? nodeSuccessData[outputIndex] : [];

			while (items.length) {
				const item = items.shift();
				if (item === undefined) {
					continue;
				}

				let errorData: GenericValue | undefined;
				if (item.error) {
					errorData = item.error;
					item.error = undefined;
				} else if (item.json.error && Object.keys(item.json).length === 1) {
					errorData = item.json.error;
				} else if (item.json.error && item.json.message && Object.keys(item.json).length === 2) {
					errorData = item.json.error;
				}

				if (errorData) {
					const pairedItemData =
						item.pairedItem && typeof item.pairedItem === 'object'
							? Array.isArray(item.pairedItem)
								? item.pairedItem[0]
								: item.pairedItem
							: undefined;

					if (executionData.source === null || pairedItemData === undefined) {
						// Source data is missing for some reason so we can not figure out the item
						errorItems.push(item);
					} else {
						const pairedItemInputIndex = pairedItemData.input || 0;

						const sourceData = executionData.source[NodeConnectionTypes.Main][pairedItemInputIndex];

						const constPairedItem = dataProxy.$getPairedItem(
							sourceData!.previousNode,
							sourceData,
							pairedItemData,
						);

						if (constPairedItem === null) {
							errorItems.push(item);
						} else {
							errorItems.push({
								...item,
								json: {
									...constPairedItem.json,
									...item.json,
								},
							});
						}
					}
				} else {
					successItems.push(item);
				}
			}

			nodeSuccessData[outputIndex] = successItems;
		}

		nodeSuccessData[mainOutputTypes.length - 1] = errorItems;
	}

	/**
	 * Assigns pairedItem information to node output items by matching them with input items.
	 * PairedItem data is used to track which output items were derived from which input items.
	 *
	 * @param nodeSuccessData - The output data from a node execution
	 * @param executionData - The execution data containing input information
	 *
	 * @returns The node output data with pairedItem information assigned where possible
	 *
	 * @remarks
	 * Auto-assignment of pairedItem happens in two scenarios:
	 * 1. Single input/output: When node has exactly one input item and produces output(s),
	 *    all outputs are marked as derived from that single input (item: 0)
	 * 2. Matching items count: When number of input and output items match exactly,
	 *    each output item is paired with the input item at the same index
	 *
	 * In all other cases, if pairedItem is missing, it remains undefined as automatic
	 * assignment cannot be done reliably.
	 */
	assignPairedItems(
		nodeSuccessData: INodeExecutionData[][] | null | undefined,
		executionData: IExecuteData,
	) {
		if (nodeSuccessData?.length) {
			// Check if the output data contains pairedItem data and if not try
			// to automatically fix it

			const isSingleInputAndOutput =
				executionData.data.main.length === 1 && executionData.data.main[0]?.length === 1;

			const isSameNumberOfItems =
				nodeSuccessData.length === 1 &&
				executionData.data.main.length === 1 &&
				executionData.data.main[0]?.length === nodeSuccessData[0].length;

			checkOutputData: for (const outputData of nodeSuccessData) {
				if (outputData === null) {
					continue;
				}
				for (const [index, item] of outputData.entries()) {
					if (item.pairedItem === undefined) {
						// The pairedItem data is missing, so check if it can get automatically fixed
						if (isSingleInputAndOutput) {
							// The node has one input and one incoming item, so we know
							// that all items must originate from that single
							item.pairedItem = {
								item: 0,
							};
						} else if (isSameNumberOfItems) {
							// The number of incoming and outgoing items is identical so we can
							// make the reasonable assumption that each of the input items
							// is the origin of the corresponding output items
							item.pairedItem = {
								item: index,
							};
						} else {
							// In all other cases autofixing is not possible
							break checkOutputData;
						}
					}
				}
			}
		}

		if (nodeSuccessData === undefined) {
			// Node did not get executed
			nodeSuccessData = null;
		} else {
			this.runExecutionData.resultData.lastNodeExecuted = executionData.node.name;
		}

		return nodeSuccessData;
	}

	private updateTaskStatusesToCancelled(): void {
		Object.keys(this.runExecutionData.resultData.runData).forEach((nodeName) => {
			const taskDataArray = this.runExecutionData.resultData.runData[nodeName];
			taskDataArray.forEach((taskData) => {
				if (taskData.executionStatus === 'running') {
					taskData.executionStatus = 'canceled';
				}
			});
		});
	}

	private get isCancelled() {
		return this.abortController.signal.aborted;
	}
}
