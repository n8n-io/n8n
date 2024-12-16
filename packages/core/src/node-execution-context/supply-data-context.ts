import get from 'lodash/get';
import type {
	CloseFunction,
	ExecutionBaseError,
	IExecuteData,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	ISupplyDataFunctions,
	ITaskData,
	ITaskDataConnections,
	ITaskMetadata,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError, NodeConnectionType, createDeferredPromise } from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import {
	assertBinaryData,
	constructExecutionMetaData,
	copyInputItems,
	getBinaryDataBuffer,
	getBinaryHelperFunctions,
	getCheckProcessedHelperFunctions,
	getFileSystemHelperFunctions,
	getRequestHelperFunctions,
	getSSHTunnelFunctions,
	normalizeItems,
	returnJsonArray,
	getInputConnectionData,
} from '@/NodeExecuteFunctions';

import { BaseExecuteContext } from './base-execute-context';

export class SupplyDataContext extends BaseExecuteContext implements ISupplyDataFunctions {
	readonly helpers: ISupplyDataFunctions['helpers'];

	readonly getNodeParameter: ISupplyDataFunctions['getNodeParameter'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		runExecutionData: IRunExecutionData,
		runIndex: number,
		connectionInputData: INodeExecutionData[],
		inputData: ITaskDataConnections,
		private readonly connectionType: NodeConnectionType,
		executeData: IExecuteData,
		private readonly closeFunctions: CloseFunction[],
		abortSignal?: AbortSignal,
	) {
		super(
			workflow,
			node,
			additionalData,
			mode,
			runExecutionData,
			runIndex,
			connectionInputData,
			inputData,
			executeData,
			abortSignal,
		);

		this.helpers = {
			createDeferredPromise,
			copyInputItems,
			...getRequestHelperFunctions(
				workflow,
				node,
				additionalData,
				runExecutionData,
				connectionInputData,
			),
			...getSSHTunnelFunctions(),
			...getFileSystemHelperFunctions(node),
			...getBinaryHelperFunctions(additionalData, workflow.id),
			...getCheckProcessedHelperFunctions(workflow, node),
			assertBinaryData: (itemIndex, propertyName) =>
				assertBinaryData(inputData, node, itemIndex, propertyName, 0),
			getBinaryDataBuffer: async (itemIndex, propertyName) =>
				await getBinaryDataBuffer(inputData, itemIndex, propertyName, 0),

			returnJsonArray,
			normalizeItems,
			constructExecutionMetaData,
		};

		this.getNodeParameter = ((
			parameterName: string,
			itemIndex: number,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			fallbackValue?: any,
			options?: IGetNodeParameterOptions,
		) =>
			this._getNodeParameter(
				parameterName,
				itemIndex,
				fallbackValue,
				options,
			)) as ISupplyDataFunctions['getNodeParameter'];
	}

	async getInputConnectionData(
		connectionType: NodeConnectionType,
		itemIndex: number,
	): Promise<unknown> {
		return await getInputConnectionData.call(
			this,
			this.workflow,
			this.runExecutionData,
			this.runIndex,
			this.connectionInputData,
			this.inputData,
			this.additionalData,
			this.executeData,
			this.mode,
			this.closeFunctions,
			connectionType,
			itemIndex,
			this.abortSignal,
		);
	}

	getInputData(inputIndex = 0, connectionType = this.connectionType) {
		if (!this.inputData.hasOwnProperty(connectionType)) {
			// Return empty array because else it would throw error when nothing is connected to input
			return [];
		}
		return super.getInputItems(inputIndex, connectionType) ?? [];
	}

	/** @deprecated create a context object with inputData for every runIndex */
	addInputData(
		connectionType: NodeConnectionType,
		data: INodeExecutionData[][],
	): { index: number } {
		const nodeName = this.node.name;
		let currentNodeRunIndex = 0;
		if (this.runExecutionData.resultData.runData.hasOwnProperty(nodeName)) {
			currentNodeRunIndex = this.runExecutionData.resultData.runData[nodeName].length;
		}

		this.addExecutionDataFunctions(
			'input',
			data,
			connectionType,
			nodeName,
			currentNodeRunIndex,
		).catch((error) => {
			this.logger.warn(
				`There was a problem logging input data of node "${nodeName}": ${
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					error.message
				}`,
			);
		});

		return { index: currentNodeRunIndex };
	}

	/** @deprecated Switch to WorkflowExecute to store output on runExecutionData.resultData.runData */
	addOutputData(
		connectionType: NodeConnectionType,
		currentNodeRunIndex: number,
		data: INodeExecutionData[][],
		metadata?: ITaskMetadata,
	): void {
		const nodeName = this.node.name;
		this.addExecutionDataFunctions(
			'output',
			data,
			connectionType,
			nodeName,
			currentNodeRunIndex,
			metadata,
		).catch((error) => {
			this.logger.warn(
				`There was a problem logging output data of node "${nodeName}": ${
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					error.message
				}`,
			);
		});
	}

	async addExecutionDataFunctions(
		type: 'input' | 'output',
		data: INodeExecutionData[][] | ExecutionBaseError,
		connectionType: NodeConnectionType,
		sourceNodeName: string,
		currentNodeRunIndex: number,
		metadata?: ITaskMetadata,
	): Promise<void> {
		if (connectionType === NodeConnectionType.Main) {
			throw new ApplicationError('Setting type is not supported for main connection', {
				extra: { type },
			});
		}

		const {
			additionalData,
			runExecutionData,
			runIndex: sourceNodeRunIndex,
			node: { name: nodeName },
		} = this;

		let taskData: ITaskData | undefined;
		if (type === 'input') {
			taskData = {
				startTime: new Date().getTime(),
				executionTime: 0,
				executionStatus: 'running',
				source: [null],
			};
		} else {
			// At the moment we expect that there is always an input sent before the output
			taskData = get(
				runExecutionData,
				['resultData', 'runData', nodeName, currentNodeRunIndex],
				undefined,
			);
			if (taskData === undefined) {
				return;
			}
			taskData.metadata = metadata;
		}
		taskData = taskData!;

		if (data instanceof Error) {
			taskData.executionStatus = 'error';
			taskData.error = data;
		} else {
			if (type === 'output') {
				taskData.executionStatus = 'success';
			}
			taskData.data = {
				[connectionType]: data,
			} as ITaskDataConnections;
		}

		if (type === 'input') {
			if (!(data instanceof Error)) {
				this.inputData[connectionType] = data;
				// TODO: remove inputOverride
				taskData.inputOverride = {
					[connectionType]: data,
				} as ITaskDataConnections;
			}

			if (!runExecutionData.resultData.runData.hasOwnProperty(nodeName)) {
				runExecutionData.resultData.runData[nodeName] = [];
			}

			runExecutionData.resultData.runData[nodeName][currentNodeRunIndex] = taskData;
			if (additionalData.sendDataToUI) {
				additionalData.sendDataToUI('nodeExecuteBefore', {
					executionId: additionalData.executionId,
					nodeName,
				});
			}
		} else {
			// Outputs
			taskData.executionTime = new Date().getTime() - taskData.startTime;

			if (additionalData.sendDataToUI) {
				additionalData.sendDataToUI('nodeExecuteAfter', {
					executionId: additionalData.executionId,
					nodeName,
					data: taskData,
				});
			}

			if (get(runExecutionData, 'executionData.metadata', undefined) === undefined) {
				runExecutionData.executionData!.metadata = {};
			}

			let sourceTaskData = runExecutionData.executionData?.metadata?.[sourceNodeName];

			if (!sourceTaskData) {
				runExecutionData.executionData!.metadata[sourceNodeName] = [];
				sourceTaskData = runExecutionData.executionData!.metadata[sourceNodeName];
			}

			if (!sourceTaskData[sourceNodeRunIndex]) {
				sourceTaskData[sourceNodeRunIndex] = {
					subRun: [],
				};
			}

			sourceTaskData[sourceNodeRunIndex].subRun!.push({
				node: nodeName,
				runIndex: currentNodeRunIndex,
			});
		}
	}
}
