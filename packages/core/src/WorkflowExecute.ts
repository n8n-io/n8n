import * as PCancelable from 'p-cancelable';

import {
	IConnection,
	IDataObject,
	IExecuteData,
	IExecutionError,
	INode,
	INodeConnections,
	INodeExecutionData,
	IRun,
	IRunData,
	IRunExecutionData,
	ITaskData,
	ITaskDataConnections,
	IWaitingForExecution,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
	Workflow,
} from 'n8n-workflow';
import {
	NodeExecuteFunctions,
} from './';

export class WorkflowExecute {
	runExecutionData: IRunExecutionData;
	private additionalData: IWorkflowExecuteAdditionalData;
	private mode: WorkflowExecuteMode;


	constructor(additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode, runExecutionData?: IRunExecutionData) {
		this.additionalData = additionalData;
		this.mode = mode;
		this.runExecutionData = runExecutionData || {
			startData: {
			},
			resultData: {
				runData: {},
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				waitingExecution: {},
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
	run(workflow: Workflow, startNode?: INode, destinationNode?: string): PCancelable<IRun> {
		// Get the nodes to start workflow execution from
		startNode = startNode || workflow.getStartNode(destinationNode);

		if (startNode === undefined) {
			throw new Error('No node to start the workflow from could be found!');
		}

		// If a destination node is given we only run the direct parent nodes and no others
		let runNodeFilter: string[] | undefined = undefined;
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
			}
		];

		this.runExecutionData = {
			startData: {
				destinationNode,
				runNodeFilter,
			},
			resultData: {
				runData: {},
			},
			executionData: {
				contextData: {},
				nodeExecutionStack,
				waitingExecution: {},
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
	// @ts-ignore
	async runPartialWorkflow(workflow: Workflow, runData: IRunData, startNodes: string[], destinationNode: string): PCancelable<IRun> {
		let incomingNodeConnections: INodeConnections | undefined;
		let connection: IConnection;

		const runIndex = 0;

		// Initialize the nodeExecutionStack and waitingExecution with
		// the data from runData
		const nodeExecutionStack: IExecuteData[] = [];
		const waitingExecution: IWaitingForExecution = {};
		for (const startNode of startNodes) {
			incomingNodeConnections = workflow.connectionsByDestinationNode[startNode];

			const incomingData: INodeExecutionData[][] = [];

			if (incomingNodeConnections === undefined) {
				// If it has no incoming data add the default empty data
				incomingData.push([
					{
						json: {}
					}
				]);
			} else {
				// Get the data of the incoming connections
				for (const connections of incomingNodeConnections.main) {
					for (let inputIndex = 0; inputIndex < connections.length; inputIndex++) {
						connection = connections[inputIndex];
						incomingData.push(
							runData[connection.node!][runIndex].data![connection.type][connection.index]!,
						);
					}
				}
			}

			const executeData: IExecuteData = {
				node: workflow.getNode(startNode) as INode,
				data: {
					main: incomingData,
				}
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
						}
						if (waitingExecution[destinationNode][runIndex] === undefined) {
							waitingExecution[destinationNode][runIndex] = {};
						}
						if (waitingExecution[destinationNode][runIndex][connection.type] === undefined) {
							waitingExecution[destinationNode][runIndex][connection.type] = [];
						}


						if (runData[connection.node!] !== undefined) {
							// Input data exists so add as waiting
							// incomingDataDestination.push(runData[connection.node!][runIndex].data![connection.type][connection.index]);
							waitingExecution[destinationNode][runIndex][connection.type].push(runData[connection.node!][runIndex].data![connection.type][connection.index]);
						} else {
							waitingExecution[destinationNode][runIndex][connection.type].push(null);
						}
					}
				}
			}
		}

		// Only run the parent nodes and no others
		let runNodeFilter: string[] | undefined = undefined;
		runNodeFilter = workflow.getParentNodes(destinationNode);
		runNodeFilter.push(destinationNode);

		this.runExecutionData = {
			startData: {
				destinationNode,
				runNodeFilter,
			},
			resultData: {
				runData,
			},
			executionData: {
				contextData: {},
				nodeExecutionStack,
				waitingExecution,
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
	async executeHook(hookName: string, parameters: any[]): Promise<void> { // tslint:disable-line:no-any
		if (this.additionalData.hooks === undefined) {
			return;
		}

		return this.additionalData.hooks.executeHookFunctions(hookName, parameters);
	}


	addNodeToBeExecuted(workflow: Workflow, connectionData: IConnection, outputIndex: number, parentNodeName: string, nodeSuccessData: INodeExecutionData[][], runIndex: number): void {
		let stillDataMissing = false;

		// Check if node has multiple inputs as then we have to wait for all input data
		// to be present before we can add it to the node-execution-stack
		if (workflow.connectionsByDestinationNode[connectionData.node]['main'].length > 1) {
			// Node has multiple inputs
			let nodeWasWaiting = true;

			// Check if there is already data for the node
			if (this.runExecutionData.executionData!.waitingExecution[connectionData.node] === undefined) {
				// Node does not have data yet so create a new empty one
				this.runExecutionData.executionData!.waitingExecution[connectionData.node] = {};
				nodeWasWaiting = false;
			}
			if (this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex] === undefined) {
				// Node does not have data for runIndex yet so create also empty one and init it
				this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex] = {
					main: []
				};
				for (let i = 0; i < workflow.connectionsByDestinationNode[connectionData.node]['main'].length; i++) {
					this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex].main.push(null);
				}
			}

			// Add the new data
			if (nodeSuccessData === null) {
				this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex].main[connectionData.index] = null;
			} else {
				this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex].main[connectionData.index] = nodeSuccessData[outputIndex];
			}

			// Check if all data exists now
			let thisExecutionData: INodeExecutionData[] | null;
			let allDataFound = true;
			for (let i = 0; i < this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex].main.length; i++) {
				thisExecutionData = this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex].main[i];
				if (thisExecutionData === null) {
					allDataFound = false;
					break;
				}
			}

			if (allDataFound === true) {
				// All data exists for node to be executed
				// So add it to the execution stack
				this.runExecutionData.executionData!.nodeExecutionStack.push({
					node: workflow.nodes[connectionData.node],
					data: this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex]
				});

				// Remove the data from waiting
				delete this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex];

				if (Object.keys(this.runExecutionData.executionData!.waitingExecution[connectionData.node]).length === 0) {
					// No more data left for the node so also delete that one
					delete this.runExecutionData.executionData!.waitingExecution[connectionData.node];
				}
				return;
			} else {
				stillDataMissing = true;
			}

			if (nodeWasWaiting === false) {

				// Get a list of all the output nodes that we can check for siblings eaiser
				const checkOutputNodes = [];
				for (const outputIndexParent in workflow.connectionsBySourceNode[parentNodeName].main) {
					if (!workflow.connectionsBySourceNode[parentNodeName].main.hasOwnProperty(outputIndexParent)) {
						continue;
					}
					for (const connectionDataCheck of workflow.connectionsBySourceNode[parentNodeName].main[outputIndexParent]) {
						checkOutputNodes.push(connectionDataCheck.node);
					}
				}

				// Node was not on "waitingExecution" so it is the first time it gets
				// checked. So we have to go through all the inputs and check if they
				// are already on the list to be processed.
				// If that is not the case add it.
				for (let inputIndex = 0; inputIndex < workflow.connectionsByDestinationNode[connectionData.node]['main'].length; inputIndex++) {
					for (const inputData of workflow.connectionsByDestinationNode[connectionData.node]['main'][inputIndex]) {
						if (inputData.node === parentNodeName) {
							// Is the node we come from so its data will be available for sure
							continue;
						}

						const executionStackNodes = this.runExecutionData.executionData!.nodeExecutionStack.map((stackData) => stackData.node.name);

						// Check if that node is also an output connection of the
						// previously processed one
						if (inputData.node !== parentNodeName && checkOutputNodes.includes(inputData.node)) {
							// So the parent node will be added anyway which
							// will then process this node next. So nothing to do.
							continue;
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

						if (nodeToAdd === undefined) {
							// No node has to get added so process
							continue;
						}

						if (workflow.connectionsByDestinationNode[nodeToAdd] === undefined)  {
							// Add only node if it does not have any inputs becuase else it will
							// be added by its input node later anyway.
							this.runExecutionData.executionData!.nodeExecutionStack.push(
								{
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
								},
							);
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

		if (stillDataMissing === true) {
			// Additional data is needed to run node so add it to waiting
			if (!this.runExecutionData.executionData!.waitingExecution.hasOwnProperty(connectionData.node)) {
				this.runExecutionData.executionData!.waitingExecution[connectionData.node] = {};
			}
			this.runExecutionData.executionData!.waitingExecution[connectionData.node][runIndex] = {
				main: connectionDataArray
			};
		} else {
			// All data is there so add it directly to stack
			this.runExecutionData.executionData!.nodeExecutionStack.push({
				node: workflow.nodes[connectionData.node],
				data: {
					main: connectionDataArray
				}
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
	processRunExecutionData(workflow: Workflow): PCancelable<IRun> {
		const startedAt = new Date();

		const workflowIssues = workflow.checkReadyForExecution();
		if (workflowIssues !== null) {
			throw new Error('The workflow has issues and can for that reason not be executed. Please fix them first.');
		}

		// Variables which hold temporary data for each node-execution
		let executionData: IExecuteData;
		let executionError: IExecutionError | undefined;
		let executionNode: INode;
		let nodeSuccessData: INodeExecutionData[][] | null | undefined;
		let runIndex: number;
		let startTime: number;
		let taskData: ITaskData;

		if (this.runExecutionData.startData === undefined) {
			this.runExecutionData.startData = {};
		}

		this.executeHook('workflowExecuteBefore', []);

		let currentExecutionTry = '';
		let lastExecutionTry = '';

		return new PCancelable((resolve, reject, onCancel) => {
			let gotCancel = false;

			onCancel.shouldReject = false;
			onCancel(() => {
				gotCancel = true;
			});

			const returnPromise = (async () => {

				executionLoop:
				while (this.runExecutionData.executionData!.nodeExecutionStack.length !== 0) {

					// @ts-ignore
					if (gotCancel === true) {
						return Promise.resolve();
					}

					nodeSuccessData = null;
					executionError = undefined;
					executionData = this.runExecutionData.executionData!.nodeExecutionStack.shift() as IExecuteData;
					executionNode = executionData.node;

					this.executeHook('nodeExecuteBefore', [executionNode.name]);

					// Get the index of the current run
					runIndex = 0;
					if (this.runExecutionData.resultData.runData.hasOwnProperty(executionNode.name)) {
						runIndex = this.runExecutionData.resultData.runData[executionNode.name].length;
					}

					currentExecutionTry = `${executionNode.name}:${runIndex}`;

					if (currentExecutionTry === lastExecutionTry) {
						throw new Error('Did stop execution because execution seems to be in endless loop.');
					}

					if (this.runExecutionData.startData!.runNodeFilter !== undefined && this.runExecutionData.startData!.runNodeFilter!.indexOf(executionNode.name) === -1) {
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

							inputConnections = workflow.connectionsByDestinationNode[executionNode.name]['main'];

							for (connectionIndex = 0; connectionIndex < inputConnections.length; connectionIndex++) {
								if (workflow.getHighestNode(executionNode.name, 'main', connectionIndex).length === 0) {
									// If there is no valid incoming node (if all are disabled)
									// then ignore that it has inputs and simply execute it as it is without
									// any data
									continue;
								}

								if (!executionData.data!.hasOwnProperty('main')) {
									// ExecutionData does not even have the connection set up so can
									// not have that data, so add it again to be executed later
									this.runExecutionData.executionData!.nodeExecutionStack.push(executionData);
									lastExecutionTry = currentExecutionTry;
									continue executionLoop;
								}

								// Check if it has the data for all the inputs
								// The most nodes just have one but merge node for example has two and data
								// of both inputs has to be available to be able to process the node.
								if (executionData.data!.main!.length < connectionIndex || executionData.data!.main![connectionIndex] === null) {
									// Does not have the data of the connections so add back to stack
									this.runExecutionData.executionData!.nodeExecutionStack.push(executionData);
									lastExecutionTry = currentExecutionTry;
									continue executionLoop;
								}
							}
						}
					}

					// Clone input data that nodes can not mess up data of parallel nodes which receive the same data
					// TODO: Should only clone if multiple nodes get the same data or when it gets returned to frontned
					//       is very slow so only do if needed
					startTime = new Date().getTime();

					let maxTries = 1;
					if (executionData.node.retryOnFail === true) {
						// TODO: Remove the hardcoded default-values here and also in NodeSettings.vue
						maxTries = Math.min(5, Math.max(2, executionData.node.maxTries || 3));
					}

					let waitBetweenTries = 0;
					if (executionData.node.retryOnFail === true) {
						// TODO: Remove the hardcoded default-values here and also in NodeSettings.vue
						waitBetweenTries = Math.min(5000, Math.max(0, executionData.node.waitBetweenTries || 1000));
					}

					for (let tryIndex = 0; tryIndex < maxTries; tryIndex++) {
						// @ts-ignore
						if (gotCancel === true) {
							return Promise.resolve();
						}
						try {

							if (tryIndex !== 0) {
								// Reset executionError from previous error try
								executionError = undefined;
								if (waitBetweenTries !== 0) {
									// TODO: Improve that in the future and check if other nodes can
									//       be executed in the meantime
									await new Promise((resolve) => {
										setTimeout(() => {
											resolve();
										}, waitBetweenTries);
									});
								}
							}

							nodeSuccessData = await workflow.runNode(executionData.node, executionData.data, this.runExecutionData, runIndex, this.additionalData, NodeExecuteFunctions, this.mode);

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
										}
									];
								}
							}

							if (nodeSuccessData === null) {
								// If null gets returned it means that the node did succeed
								// but did not have any data. So the branch should end
								// (meaning the nodes afterwards should not be processed)
								continue executionLoop;
							}

							break;
						} catch (error) {
							executionError = {
								message: error.message,
								stack: error.stack,
							};
						}
					}

					// Add the data to return to the user
					// (currently does not get cloned as data does not get changed, maybe later we should do that?!?!)

					if (!this.runExecutionData.resultData.runData.hasOwnProperty(executionNode.name)) {
						this.runExecutionData.resultData.runData[executionNode.name] = [];
					}
					taskData = {
						startTime,
						executionTime: (new Date().getTime()) - startTime
					};

					if (executionError !== undefined) {
						taskData.error = executionError;

						if (executionData.node.continueOnFail === true) {
							// Workflow should continue running even if node errors
							if (executionData.data.hasOwnProperty('main') && executionData.data.main.length > 0) {
								// Simply get the input data of the node if it has any and pass it through
								// to the next node
								if (executionData.data.main[0] !== null) {
									nodeSuccessData = [executionData.data.main[0] as INodeExecutionData[]];
								}
							}
						} else {
							// Node execution did fail so add error and stop execution
							this.runExecutionData.resultData.runData[executionNode.name].push(taskData);

							// Add the execution data again so that it can get restarted
							this.runExecutionData.executionData!.nodeExecutionStack.unshift(executionData);

							this.executeHook('nodeExecuteAfter', [executionNode.name, taskData]);

							break;
						}
					}

					// Node executed successfully. So add data and go on.
					taskData.data = ({
						'main': nodeSuccessData
					} as ITaskDataConnections);

					this.executeHook('nodeExecuteAfter', [executionNode.name, taskData]);

					this.runExecutionData.resultData.runData[executionNode.name].push(taskData);

					if (this.runExecutionData.startData && this.runExecutionData.startData.destinationNode && this.runExecutionData.startData.destinationNode === executionNode.name) {
						// If destination node is defined and got executed stop execution
						continue;
					}

					// Add the nodes to which the current node has an output connection to that they can
					// be executed next
					if (workflow.connectionsBySourceNode.hasOwnProperty(executionNode.name)) {
						if (workflow.connectionsBySourceNode[executionNode.name].hasOwnProperty('main')) {
							let outputIndex: string, connectionData: IConnection;
							// Go over all the different

							// Add the nodes to be executed
							for (outputIndex in workflow.connectionsBySourceNode[executionNode.name]['main']) {
								if (!workflow.connectionsBySourceNode[executionNode.name]['main'].hasOwnProperty(outputIndex)) {
									continue;
								}

								// Go through all the different outputs of this connection
								for (connectionData of workflow.connectionsBySourceNode[executionNode.name]['main'][outputIndex]) {
									if (!workflow.nodes.hasOwnProperty(connectionData.node)) {
										return Promise.reject(new Error(`The node "${executionNode.name}" connects to not found node "${connectionData.node}"`));
									}

									this.addNodeToBeExecuted(workflow, connectionData, parseInt(outputIndex, 10), executionNode.name, nodeSuccessData!, runIndex);
								}
							}
						}
					}
				}

				return Promise.resolve();
			})()
			.then(async () => {
				return this.processSuccessExecution(startedAt, workflow, executionError);
			})
			.catch(async (error) => {
				const fullRunData = this.getFullRunData(startedAt);

				fullRunData.data.resultData.error = {
					message: error.message,
					stack: error.stack,
				};

				// Check if static data changed
				let newStaticData: IDataObject | undefined;
				if (workflow.staticData.__dataChanged === true) {
					// Static data of workflow changed
					newStaticData = workflow.staticData;
				}

				await this.executeHook('workflowExecuteAfter', [fullRunData, newStaticData]);

				return fullRunData;
			});

			return returnPromise.then(resolve);
		});
	}


	// @ts-ignore
	async processSuccessExecution(startedAt: Date, workflow: Workflow, executionError?: IExecutionError): PCancelable<IRun> {
		const fullRunData = this.getFullRunData(startedAt);

		if (executionError !== undefined) {
			fullRunData.data.resultData.error = executionError;
		} else {
			fullRunData.finished = true;
		}

		// Check if static data changed
		let newStaticData: IDataObject | undefined;
		if (workflow.staticData.__dataChanged === true) {
			// Static data of workflow changed
			newStaticData = workflow.staticData;
		}

		await this.executeHook('workflowExecuteAfter', [fullRunData, newStaticData]);

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
