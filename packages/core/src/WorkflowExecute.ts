/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-labels */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-continue */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import PCancelable from 'p-cancelable';

import {
	ExecutionError,
	IConnection,
	IDataObject,
	IExecuteData,
	INode,
	INodeConnections,
	INodeExecutionData,
	IRun,
	IRunData,
	IRunExecutionData,
	ISourceData,
	ITaskData,
	ITaskDataConnections,
	ITaskDataConnectionsSource,
	IWaitingForExecution,
	IWaitingForExecutionSource,
	IWorkflowExecuteAdditionalData,
	LoggerProxy as Logger,
	NodeApiError,
	NodeOperationError,
	PinData,
	Workflow,
	WorkflowExecuteMode,
	WorkflowOperationError,
} from 'n8n-workflow';
// eslint-disable-next-line import/no-extraneous-dependencies
import { get } from 'lodash';
// eslint-disable-next-line import/no-cycle
import { NodeExecuteFunctions } from '.';

export class WorkflowExecute {
	runExecutionData: IRunExecutionData;

	private additionalData: IWorkflowExecuteAdditionalData;

	private mode: WorkflowExecuteMode;

	constructor(
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		runExecutionData?: IRunExecutionData,
	) {
		this.additionalData = additionalData;
		this.mode = mode;
		this.runExecutionData = runExecutionData || {
			startData: {},
			resultData: {
				runData: {},
				pinData: {},
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};
	}

	/**
	 * Executes the given workflow.
	 *
	 * @param {Workflow} workflow The workflow to execute
	 * @param {INode[]} [startNodes] Node to start execution from
	 * @param {string} [destinationNode] Node to stop execution at
	 * @returns {(Promise<string>)}
	 * @memberof WorkflowExecute
	 */
	// IMPORTANT: Do not add "async" to this function, it will then convert the
	//            PCancelable to a regular Promise and does so not allow canceling
	//            active executions anymore
	// eslint-disable-next-line @typescript-eslint/promise-function-async
	run(
		workflow: Workflow,
		startNode?: INode,
		destinationNode?: string,
		pinData?: PinData,
	): PCancelable<IRun> {
		// Get the nodes to start workflow execution from
		startNode = startNode || workflow.getStartNode(destinationNode);

		if (startNode === undefined) {
			throw new Error('No node to start the workflow from could be found!');
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
				data: {
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
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};

		return this.processRunExecutionData(workflow);
	}

	/**
	 * Executes the given workflow but only
	 *
	 * @param {Workflow} workflow The workflow to execute
	 * @param {IRunData} runData
	 * @param {string[]} startNodes Nodes to start execution from
	 * @param {string} destinationNode Node to stop execution at
	 * @returns {(Promise<string>)}
	 * @memberof WorkflowExecute
	 */
	// IMPORTANT: Do not add "async" to this function, it will then convert the
	//            PCancelable to a regular Promise and does so not allow canceling
	//            active executions anymore
	// eslint-disable-next-line @typescript-eslint/promise-function-async
	runPartialWorkflow(
		workflow: Workflow,
		runData: IRunData,
		startNodes: string[],
		destinationNode: string,
		pinData?: PinData,
		// @ts-ignore
	): PCancelable<IRun> {
		let incomingNodeConnections: INodeConnections | undefined;
		let connection: IConnection;

		const runIndex = 0;

		// Initialize the nodeExecutionStack and waitingExecution with
		// the data from runData
		const nodeExecutionStack: IExecuteData[] = [];
		const waitingExecution: IWaitingForExecution = {};
		const waitingExecutionSource: IWaitingForExecutionSource = {};
		for (const startNode of startNodes) {
			incomingNodeConnections = workflow.connectionsByDestinationNode[startNode];

			const incomingData: INodeExecutionData[][] = [];
			let incomingSourceData: ITaskDataConnectionsSource | null = null;

			if (incomingNodeConnections === undefined) {
				// If it has no incoming data add the default empty data
				incomingData.push([
					{
						json: {},
					},
				]);
			} else {
				// Get the data of the incoming connections
				incomingSourceData = { main: [] };
				for (const connections of incomingNodeConnections.main) {
					for (let inputIndex = 0; inputIndex < connections.length; inputIndex++) {
						connection = connections[inputIndex];
						incomingData.push(
							// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
							runData[connection.node][runIndex].data![connection.type][connection.index]!,
						);
						incomingSourceData.main.push({
							previousNode: connection.node,
						});
					}
				}
			}

			const executeData: IExecuteData = {
				node: workflow.getNode(startNode) as INode,
				data: {
					main: incomingData,
				},
				source: incomingSourceData,
			};

			nodeExecutionStack.push(executeData);

			// Check if the destinationNode has to be added as waiting
			// because some input data is already fully available
			incomingNodeConnections = workflow.connectionsByDestinationNode[destinationNode];
			if (incomingNodeConnections !== undefined) {
				for (const connections of incomingNodeConnections.main) {
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
		}

		// Only run the parent nodes and no others
		let runNodeFilter: string[] | undefined;
		// eslint-disable-next-line prefer-const
		runNodeFilter = workflow.getParentNodes(destinationNode);
		runNodeFilter.push(destinationNode);

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
				waitingExecution,
				waitingExecutionSource,
			},
		};

		return this.processRunExecutionData(workflow);
	}

	/**
	 * Executes the hook with the given name
	 *
	 * @param {string} hookName
	 * @param {any[]} parameters
	 * @returns {Promise<IRun>}
	 * @memberof WorkflowExecute
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async executeHook(hookName: string, parameters: any[]): Promise<void> {
		// tslint:disable-line:no-any
		if (this.additionalData.hooks === undefined) {
			return;
		}

		// eslint-disable-next-line consistent-return
		return this.additionalData.hooks.executeHookFunctions(hookName, parameters);
	}

	/**
	 * Checks the incoming connection does not receive any data
	 */
	incomingConnectionIsEmpty(
		runData: IRunData,
		inputConnections: IConnection[],
		runIndex: number,
	): boolean {
		// for (const inputConnection of workflow.connectionsByDestinationNode[nodeToAdd].main[0]) {
		for (const inputConnection of inputConnections) {
			const nodeIncomingData = get(
				runData,
				`[${inputConnection.node}][${runIndex}].data.main[${inputConnection.index}]`,
			);
			if (nodeIncomingData !== undefined && (nodeIncomingData as object[]).length !== 0) {
				return false;
			}
		}
		return true;
	}

	addNodeToBeExecuted(
		workflow: Workflow,
		connectionData: IConnection,
		outputIndex: number,
		parentNodeName: string,
		nodeSuccessData: INodeExecutionData[][],
		runIndex: number,
	): void {
		let stillDataMissing = false;

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
			if (
				this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex] ===
				undefined
			) {
				// Node does not have data for runIndex yet so create also empty one and init it
				this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex] = {
					main: [],
				};
				this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node][runIndex] =
					{
						main: [],
					};
				for (
					let i = 0;
					i < workflow.connectionsByDestinationNode[connectionData.node].main.length;
					i++
				) {
					this.runExecutionData.executionData!.waitingExecution[connectionData.node][
						runIndex
					].main.push(null);

					this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node][
						runIndex
					].main.push(null);
				}
			}

			// Add the new data
			if (nodeSuccessData === null) {
				this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex].main[
					connectionData.index
				] = null;
				this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node][
					runIndex
				].main[connectionData.index] = null;
			} else {
				this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex].main[
					connectionData.index
				] = nodeSuccessData[outputIndex];
				this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node][
					runIndex
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
				this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex].main
					.length;
				i++
			) {
				thisExecutionData =
					this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex].main[
						i
					];
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
						runIndex
					],
					source:
						this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node][
							runIndex
						],
				} as IExecuteData;

				if (
					this.runExecutionData.executionData!.waitingExecutionSource !== null &&
					this.runExecutionData.executionData!.waitingExecutionSource !== undefined
				) {
					executionStackItem.source =
						this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node][
							runIndex
						];
				}

				this.runExecutionData.executionData!.nodeExecutionStack.push(executionStackItem);

				// Remove the data from waiting
				delete this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex];
				delete this.runExecutionData.executionData!.waitingExecutionSource[connectionData.node][
					runIndex
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
						!workflow.connectionsBySourceNode[parentNodeName].main.hasOwnProperty(outputIndexParent)
					) {
						continue;
					}
					for (const connectionDataCheck of workflow.connectionsBySourceNode[parentNodeName].main[
						outputIndexParent
					]) {
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
					]) {
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
									workflow.connectionsByDestinationNode[inputData.node].main[0],
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

						// Check if any of the parent nodes does not have any inputs. That
						// would mean that it has to get added to the list of nodes to process.
						const parentNodes = workflow.getParentNodes(inputData.node, 'main', -1);
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
								workflow.connectionsByDestinationNode[nodeToAdd].main[0],
								runIndex,
							)
						) {
							// Add empty item also if the input data is empty
							addEmptyItem = true;
						}

						if (addEmptyItem) {
							// Add only node if it does not have any inputs because else it will
							// be added by its input node later anyway.
							this.runExecutionData.executionData!.nodeExecutionStack.push({
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

		// Make sure the array has all the values
		const connectionDataArray: Array<INodeExecutionData[] | null> = [];
		for (let i: number = connectionData.index; i >= 0; i--) {
			connectionDataArray[i] = null;
		}

		// Add the data of the current execution
		if (nodeSuccessData === null) {
			connectionDataArray[connectionData.index] = null;
		} else {
			connectionDataArray[connectionData.index] = nodeSuccessData[outputIndex];
		}

		if (stillDataMissing) {
			// Additional data is needed to run node so add it to waiting
			if (
				!this.runExecutionData.executionData!.waitingExecution.hasOwnProperty(connectionData.node)
			) {
				this.runExecutionData.executionData!.waitingExecution[connectionData.node] = {};
			}
			this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex] = {
				main: connectionDataArray,
			};
		} else {
			// All data is there so add it directly to stack
			this.runExecutionData.executionData!.nodeExecutionStack.push({
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
	 * Runs the given execution data.
	 *
	 * @param {Workflow} workflow
	 * @returns {Promise<string>}
	 * @memberof WorkflowExecute
	 */
	// IMPORTANT: Do not add "async" to this function, it will then convert the
	//            PCancelable to a regular Promise and does so not allow canceling
	//            active executions anymore
	// eslint-disable-next-line @typescript-eslint/promise-function-async
	processRunExecutionData(workflow: Workflow): PCancelable<IRun> {
		Logger.verbose('Workflow execution started', { workflowId: workflow.id });

		const startedAt = new Date();

		const startNode = this.runExecutionData.executionData!.nodeExecutionStack[0].node.name;

		let destinationNode: string | undefined;
		if (this.runExecutionData.startData && this.runExecutionData.startData.destinationNode) {
			destinationNode = this.runExecutionData.startData.destinationNode;
		}

		const pinDataNodeNames = Object.keys(this.runExecutionData.resultData.pinData ?? {});

		const workflowIssues = workflow.checkReadyForExecution({
			startNode,
			destinationNode,
			pinDataNodeNames,
		});
		if (workflowIssues !== null) {
			throw new Error(
				'The workflow has issues and can for that reason not be executed. Please fix them first.',
			);
		}

		// Variables which hold temporary data for each node-execution
		let executionData: IExecuteData;
		let executionError: ExecutionError | undefined;
		let executionNode: INode;
		let nodeSuccessData: INodeExecutionData[][] | null | undefined;
		let runIndex: number;
		let startTime: number;
		let taskData: ITaskData;

		if (this.runExecutionData.startData === undefined) {
			this.runExecutionData.startData = {};
		}

		if (this.runExecutionData.waitTill) {
			const lastNodeExecuted = this.runExecutionData.resultData.lastNodeExecuted as string;
			this.runExecutionData.executionData!.nodeExecutionStack[0].node.disabled = true;
			this.runExecutionData.waitTill = undefined;
			this.runExecutionData.resultData.runData[lastNodeExecuted].pop();
		}

		let currentExecutionTry = '';
		let lastExecutionTry = '';
		let closeFunction: Promise<void> | undefined;

		return new PCancelable(async (resolve, reject, onCancel) => {
			let gotCancel = false;

			onCancel.shouldReject = false;
			onCancel(() => {
				gotCancel = true;
			});

			const returnPromise = (async () => {
				try {
					await this.executeHook('workflowExecuteBefore', [workflow]);
				} catch (error) {
					// Set the error that it can be saved correctly
					executionError = {
						...(error as NodeOperationError | NodeApiError),
						message: (error as NodeOperationError | NodeApiError).message,
						stack: (error as NodeOperationError | NodeApiError).stack,
					};

					// Set the incoming data of the node that it can be saved correctly
					// eslint-disable-next-line prefer-destructuring
					executionData = this.runExecutionData.executionData!.nodeExecutionStack[0];
					this.runExecutionData.resultData = {
						runData: {
							[executionData.node.name]: [
								{
									startTime,
									executionTime: new Date().getTime() - startTime,
									data: {
										main: executionData.data.main,
									} as ITaskDataConnections,
									source: [],
								},
							],
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
						gotCancel = true;
					}

					// @ts-ignore
					if (gotCancel) {
						return Promise.resolve();
					}

					nodeSuccessData = null;
					executionError = undefined;
					executionData =
						this.runExecutionData.executionData!.nodeExecutionStack.shift() as IExecuteData;
					executionNode = executionData.node;

					// Update the pairedItem information on items
					const newTaskDataConnections: ITaskDataConnections = {};
					for (const inputName of Object.keys(executionData.data)) {
						newTaskDataConnections[inputName] = executionData.data[inputName].map(
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

					Logger.debug(`Start processing node "${executionNode.name}"`, {
						node: executionNode.name,
						workflowId: workflow.id,
					});
					await this.executeHook('nodeExecuteBefore', [executionNode.name]);

					// Get the index of the current run
					runIndex = 0;
					if (this.runExecutionData.resultData.runData.hasOwnProperty(executionNode.name)) {
						runIndex = this.runExecutionData.resultData.runData[executionNode.name].length;
					}

					currentExecutionTry = `${executionNode.name}:${runIndex}`;

					if (currentExecutionTry === lastExecutionTry) {
						throw new Error('Did stop execution because execution seems to be in endless loop.');
					}

					if (
						this.runExecutionData.startData!.runNodeFilter !== undefined &&
						this.runExecutionData.startData!.runNodeFilter.indexOf(executionNode.name) === -1
					) {
						// If filter is set and node is not on filter skip it, that avoids the problem that it executes
						// leafs that are parallel to a selected destinationNode. Normally it would execute them because
						// they have the same parent and it executes all child nodes.
						continue;
					}

					// Check if all the data which is needed to run the node is available
					if (workflow.connectionsByDestinationNode.hasOwnProperty(executionNode.name)) {
						// Check if the node has incoming connections
						if (workflow.connectionsByDestinationNode[executionNode.name].hasOwnProperty('main')) {
							let inputConnections: IConnection[][];
							let connectionIndex: number;

							// eslint-disable-next-line prefer-const
							inputConnections = workflow.connectionsByDestinationNode[executionNode.name].main;

							for (
								connectionIndex = 0;
								connectionIndex < inputConnections.length;
								connectionIndex++
							) {
								if (
									workflow.getHighestNode(executionNode.name, 'main', connectionIndex).length === 0
								) {
									// If there is no valid incoming node (if all are disabled)
									// then ignore that it has inputs and simply execute it as it is without
									// any data
									continue;
								}

								if (!executionData.data.hasOwnProperty('main')) {
									// ExecutionData does not even have the connection set up so can
									// not have that data, so add it again to be executed later
									this.runExecutionData.executionData!.nodeExecutionStack.push(executionData);
									lastExecutionTry = currentExecutionTry;
									continue executionLoop;
								}

								// Check if it has the data for all the inputs
								// The most nodes just have one but merge node for example has two and data
								// of both inputs has to be available to be able to process the node.
								if (
									executionData.data.main!.length < connectionIndex ||
									executionData.data.main![connectionIndex] === null
								) {
									// Does not have the data of the connections so add back to stack
									this.runExecutionData.executionData!.nodeExecutionStack.push(executionData);
									lastExecutionTry = currentExecutionTry;
									continue executionLoop;
								}
							}
						}
					}

					startTime = new Date().getTime();

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
						// @ts-ignore
						if (gotCancel) {
							return Promise.resolve();
						}
						try {
							if (tryIndex !== 0) {
								// Reset executionError from previous error try
								executionError = undefined;
								if (waitBetweenTries !== 0) {
									// TODO: Improve that in the future and check if other nodes can
									//       be executed in the meantime
									// eslint-disable-next-line @typescript-eslint/no-shadow
									await new Promise((resolve) => {
										setTimeout(() => {
											resolve(undefined);
										}, waitBetweenTries);
									});
								}
							}

							const { pinData } = this.runExecutionData.resultData;

							if (pinData && !executionNode.disabled && pinData[executionNode.name] !== undefined) {
								let nodePinData = pinData[executionNode.name];

								if (!Array.isArray(nodePinData)) nodePinData = [nodePinData];

								const itemsPerRun = nodePinData.map((item, index) => {
									return { json: item, pairedItem: { item: index } };
								});
								nodeSuccessData = [itemsPerRun]; // always zeroth runIndex
							} else {
								Logger.debug(`Running node "${executionNode.name}" started`, {
									node: executionNode.name,
									workflowId: workflow.id,
								});
								const runNodeData = await workflow.runNode(
									executionData,
									this.runExecutionData,
									runIndex,
									this.additionalData,
									NodeExecuteFunctions,
									this.mode,
								);
								nodeSuccessData = runNodeData.data;

								if (runNodeData.closeFunction) {
									// Explanation why we do this can be found in n8n-workflow/Workflow.ts -> runNode
									// eslint-disable-next-line @typescript-eslint/no-unsafe-call
									closeFunction = runNodeData.closeFunction();
								}
							}

							Logger.debug(`Running node "${executionNode.name}" finished successfully`, {
								node: executionNode.name,
								workflowId: workflow.id,
							});

							if (nodeSuccessData) {
								// Check if the output data contains pairedItem data
								checkOutputData: for (const outputData of nodeSuccessData) {
									if (outputData === null) {
										continue;
									}
									for (const [index, item] of outputData.entries()) {
										if (!item.pairedItem) {
											// The pairedItem data is missing, so check if it can get automatically fixed
											if (
												executionData.data.main.length === 1 &&
												executionData.data.main[0]?.length === 1
											) {
												// The node has one input and one incoming item, so we know
												// that all items must originate from that single
												item.pairedItem = {
													item: 0,
												};
											} else if (
												nodeSuccessData.length === 1 &&
												executionData.data.main.length === 1 &&
												executionData.data.main[0]?.length === nodeSuccessData[0].length
											) {
												// The node has one input and one output. The number of items on both is
												// identical so we can make the resonable asumption that each of the input
												// items is the origin of the corresponding output items
												item.pairedItem = {
													item: index,
												};
											} else {
												// In all other cases is autofixing not possible
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

							if (nodeSuccessData === null || nodeSuccessData[0][0] === undefined) {
								if (executionData.node.alwaysOutputData === true) {
									nodeSuccessData = nodeSuccessData || [];
									nodeSuccessData[0] = [
										{
											json: {},
										},
									];
								}
							}

							if (nodeSuccessData === null && !this.runExecutionData.waitTill!) {
								// If null gets returned it means that the node did succeed
								// but did not have any data. So the branch should end
								// (meaning the nodes afterwards should not be processed)
								continue executionLoop;
							}

							break;
						} catch (error) {
							this.runExecutionData.resultData.lastNodeExecuted = executionData.node.name;

							executionError = {
								...(error as NodeOperationError | NodeApiError),
								message: (error as NodeOperationError | NodeApiError).message,
								stack: (error as NodeOperationError | NodeApiError).stack,
							};

							Logger.debug(`Running node "${executionNode.name}" finished with error`, {
								node: executionNode.name,
								workflowId: workflow.id,
							});
						}
					}

					// Add the data to return to the user
					// (currently does not get cloned as data does not get changed, maybe later we should do that?!?!)

					if (!this.runExecutionData.resultData.runData.hasOwnProperty(executionNode.name)) {
						this.runExecutionData.resultData.runData[executionNode.name] = [];
					}

					taskData = {
						startTime,
						executionTime: new Date().getTime() - startTime,
						source: !executionData.source ? [] : executionData.source.main,
					};

					if (executionError !== undefined) {
						taskData.error = executionError;

						if (executionData.node.continueOnFail === true) {
							// Workflow should continue running even if node errors
							if (executionData.data.hasOwnProperty('main') && executionData.data.main.length > 0) {
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

							await this.executeHook('nodeExecuteAfter', [
								executionNode.name,
								taskData,
								this.runExecutionData,
							]);

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

					this.runExecutionData.resultData.runData[executionNode.name].push(taskData);

					if (this.runExecutionData.waitTill!) {
						await this.executeHook('nodeExecuteAfter', [
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
						await this.executeHook('nodeExecuteAfter', [
							executionNode.name,
							taskData,
							this.runExecutionData,
						]);

						// If destination node is defined and got executed stop execution
						continue;
					}

					// Add the nodes to which the current node has an output connection to that they can
					// be executed next
					if (workflow.connectionsBySourceNode.hasOwnProperty(executionNode.name)) {
						if (workflow.connectionsBySourceNode[executionNode.name].hasOwnProperty('main')) {
							let outputIndex: string;
							let connectionData: IConnection;
							// Iterate over all the outputs

							// Add the nodes to be executed
							// eslint-disable-next-line @typescript-eslint/no-for-in-array
							for (outputIndex in workflow.connectionsBySourceNode[executionNode.name].main) {
								if (
									!workflow.connectionsBySourceNode[executionNode.name].main.hasOwnProperty(
										outputIndex,
									)
								) {
									continue;
								}

								// Iterate over all the different connections of this output
								for (connectionData of workflow.connectionsBySourceNode[executionNode.name].main[
									outputIndex
								]) {
									if (!workflow.nodes.hasOwnProperty(connectionData.node)) {
										return Promise.reject(
											new Error(
												`The node "${executionNode.name}" connects to not found node "${connectionData.node}"`,
											),
										);
									}

									if (
										nodeSuccessData![outputIndex] &&
										(nodeSuccessData![outputIndex].length !== 0 || connectionData.index > 0)
									) {
										// Add the node only if it did execute or if connected to second "optional" input
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
					}

					// If we got here, it means that we did not stop executing from manual executions / destination.
					// Execute hooks now to make sure that all hooks are executed properly
					// Await is needed to make sure that we don't fall into concurrency problems
					// When saving node execution data
					await this.executeHook('nodeExecuteAfter', [
						executionNode.name,
						taskData,
						this.runExecutionData,
					]);
				}

				return Promise.resolve();
			})()
				.then(async () => {
					if (gotCancel && executionError === undefined) {
						return this.processSuccessExecution(
							startedAt,
							workflow,
							new WorkflowOperationError('Workflow has been canceled or timed out!'),
							closeFunction,
						);
					}
					return this.processSuccessExecution(startedAt, workflow, executionError, closeFunction);
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
					// eslint-disable-next-line no-underscore-dangle
					if (workflow.staticData.__dataChanged === true) {
						// Static data of workflow changed
						newStaticData = workflow.staticData;
					}
					await this.executeHook('workflowExecuteAfter', [fullRunData, newStaticData]).catch(
						// eslint-disable-next-line @typescript-eslint/no-shadow
						(error) => {
							// eslint-disable-next-line no-console
							console.error('There was a problem running hook "workflowExecuteAfter"', error);
						},
					);

					if (closeFunction) {
						try {
							await closeFunction;
						} catch (errorClose) {
							Logger.error(
								// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
								`There was a problem deactivating trigger of workflow "${workflow.id}": "${errorClose.message}"`,
								{
									workflowId: workflow.id,
								},
							);
						}
					}

					return fullRunData;
				});

			return returnPromise.then(resolve);
		});
	}

	async processSuccessExecution(
		startedAt: Date,
		workflow: Workflow,
		executionError?: ExecutionError,
		closeFunction?: Promise<void>,
	): Promise<IRun> {
		const fullRunData = this.getFullRunData(startedAt);

		if (executionError !== undefined) {
			Logger.verbose(`Workflow execution finished with error`, {
				error: executionError,
				workflowId: workflow.id,
			});
			fullRunData.data.resultData.error = {
				...executionError,
				message: executionError.message,
				stack: executionError.stack,
			} as ExecutionError;
		} else if (this.runExecutionData.waitTill!) {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			Logger.verbose(`Workflow execution will wait until ${this.runExecutionData.waitTill}`, {
				workflowId: workflow.id,
			});
			fullRunData.waitTill = this.runExecutionData.waitTill;
		} else {
			Logger.verbose(`Workflow execution finished successfully`, { workflowId: workflow.id });
			fullRunData.finished = true;
		}

		// Check if static data changed
		let newStaticData: IDataObject | undefined;
		// eslint-disable-next-line no-underscore-dangle
		if (workflow.staticData.__dataChanged === true) {
			// Static data of workflow changed
			newStaticData = workflow.staticData;
		}

		await this.executeHook('workflowExecuteAfter', [fullRunData, newStaticData]);

		if (closeFunction) {
			try {
				await closeFunction;
			} catch (error) {
				Logger.error(
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
		const fullRunData: IRun = {
			data: this.runExecutionData,
			mode: this.mode,
			startedAt,
			stoppedAt: new Date(),
		};

		return fullRunData;
	}
}
