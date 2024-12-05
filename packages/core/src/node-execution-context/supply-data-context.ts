import type {
	CloseFunction,
	IExecuteData,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	ISupplyDataFunctions,
	ITaskDataConnections,
	ITaskMetadata,
	IWorkflowExecuteAdditionalData,
	NodeConnectionType,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError, createDeferredPromise } from 'n8n-workflow';

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
	addExecutionDataFunctions,
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

	async getInputConnectionData(inputName: NodeConnectionType, itemIndex: number): Promise<unknown> {
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
			inputName,
			itemIndex,
			this.abortSignal,
		);
	}

	getInputData(inputIndex = 0, inputName = 'main') {
		if (!this.inputData.hasOwnProperty(inputName)) {
			// Return empty array because else it would throw error when nothing is connected to input
			return [];
		}

		// TODO: Check if nodeType has input with that index defined
		if (this.inputData[inputName].length < inputIndex) {
			throw new ApplicationError('Could not get input with given index', {
				extra: { inputIndex, inputName },
			});
		}

		if (this.inputData[inputName][inputIndex] === null) {
			throw new ApplicationError('Value of input was not set', {
				extra: { inputIndex, inputName },
			});
		}

		return this.inputData[inputName][inputIndex];
	}

	addInputData(
		connectionType: NodeConnectionType,
		data: INodeExecutionData[][],
	): { index: number } {
		const nodeName = this.node.name;
		let currentNodeRunIndex = 0;
		if (this.runExecutionData.resultData.runData.hasOwnProperty(nodeName)) {
			currentNodeRunIndex = this.runExecutionData.resultData.runData[nodeName].length;
		}

		addExecutionDataFunctions(
			'input',
			nodeName,
			data,
			this.runExecutionData,
			connectionType,
			this.additionalData,
			nodeName,
			this.runIndex,
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

	addOutputData(
		connectionType: NodeConnectionType,
		currentNodeRunIndex: number,
		data: INodeExecutionData[][],
		metadata?: ITaskMetadata,
	): void {
		const nodeName = this.node.name;
		addExecutionDataFunctions(
			'output',
			nodeName,
			data,
			this.runExecutionData,
			connectionType,
			this.additionalData,
			nodeName,
			this.runIndex,
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
}
