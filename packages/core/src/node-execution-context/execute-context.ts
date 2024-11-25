import type {
	CallbackManager,
	CloseFunction,
	ExecutionBaseError,
	IExecuteData,
	IExecuteFunctions,
	IExecuteResponsePromiseData,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	ITaskDataConnections,
	ITaskMetadata,
	IWorkflowExecuteAdditionalData,
	NodeConnectionType,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ApplicationError, createDeferredPromise } from 'n8n-workflow';

import { createAgentStartJob } from '@/Agent';
// eslint-disable-next-line import/no-cycle
import {
	returnJsonArray,
	copyInputItems,
	normalizeItems,
	constructExecutionMetaData,
	getInputConnectionData,
	addExecutionDataFunctions,
	assertBinaryData,
	getBinaryDataBuffer,
	copyBinaryFile,
	getRequestHelperFunctions,
	getBinaryHelperFunctions,
	getSSHTunnelFunctions,
	getFileSystemHelperFunctions,
	getCheckProcessedHelperFunctions,
} from '@/NodeExecuteFunctions';

import { BaseExecuteContext } from './base-execute-context';

export class ExecuteContext extends BaseExecuteContext implements IExecuteFunctions {
	readonly helpers: IExecuteFunctions['helpers'];

	readonly nodeHelpers: IExecuteFunctions['nodeHelpers'];

	readonly getNodeParameter: IExecuteFunctions['getNodeParameter'];

	readonly startJob: IExecuteFunctions['startJob'];

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
			returnJsonArray,
			copyInputItems,
			normalizeItems,
			constructExecutionMetaData,
			...getRequestHelperFunctions(
				workflow,
				node,
				additionalData,
				runExecutionData,
				connectionInputData,
			),
			...getBinaryHelperFunctions(additionalData, workflow.id),
			...getSSHTunnelFunctions(),
			...getFileSystemHelperFunctions(node),
			...getCheckProcessedHelperFunctions(workflow, node),

			assertBinaryData: (itemIndex, propertyName) =>
				assertBinaryData(inputData, node, itemIndex, propertyName, 0),
			getBinaryDataBuffer: async (itemIndex, propertyName) =>
				await getBinaryDataBuffer(inputData, itemIndex, propertyName, 0),
		};

		this.nodeHelpers = {
			copyBinaryFile: async (filePath, fileName, mimeType) =>
				await copyBinaryFile(
					this.workflow.id,
					this.additionalData.executionId!,
					filePath,
					fileName,
					mimeType,
				),
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
			)) as IExecuteFunctions['getNodeParameter'];

		this.startJob = createAgentStartJob(
			this.additionalData,
			this.inputData,
			this.node,
			this.workflow,
			this.runExecutionData,
			this.runIndex,
			this.node.name,
			this.connectionInputData,
			{},
			this.mode,
			this.executeData,
		);
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

		const inputData = this.inputData[inputName];
		// TODO: Check if nodeType has input with that index defined
		if (inputData.length < inputIndex) {
			throw new ApplicationError('Could not get input with given index', {
				extra: { inputIndex, inputName },
			});
		}

		if (inputData[inputIndex] === null) {
			throw new ApplicationError('Value of input was not set', {
				extra: { inputIndex, inputName },
			});
		}

		return inputData[inputIndex];
	}

	async putExecutionToWait(waitTill: Date): Promise<void> {
		this.runExecutionData.waitTill = waitTill;
		if (this.additionalData.setExecutionStatus) {
			this.additionalData.setExecutionStatus('waiting');
		}
	}

	logNodeOutput(...args: unknown[]): void {
		if (this.mode === 'manual') {
			this.sendMessageToUI(...args);
			return;
		}

		if (process.env.CODE_ENABLE_STDOUT === 'true') {
			console.log(`[Workflow "${this.getWorkflow().id}"][Node "${this.node.name}"]`, ...args);
		}
	}

	async sendResponse(response: IExecuteResponsePromiseData): Promise<void> {
		await this.additionalData.hooks?.executeHookFunctions('sendResponse', [response]);
	}

	addInputData(
		connectionType: NodeConnectionType,
		data: INodeExecutionData[][] | ExecutionBaseError,
	): { index: number } {
		const nodeName = this.node.name;
		let currentNodeRunIndex = 0;
		if (this.runExecutionData.resultData.runData.hasOwnProperty(nodeName)) {
			currentNodeRunIndex = this.runExecutionData.resultData.runData[nodeName].length;
		}

		void addExecutionDataFunctions(
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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				`There was a problem logging input data of node "${nodeName}": ${error.message}`,
			);
		});

		return { index: currentNodeRunIndex };
	}

	addOutputData(
		connectionType: NodeConnectionType,
		currentNodeRunIndex: number,
		data: INodeExecutionData[][] | ExecutionBaseError,
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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				`There was a problem logging output data of node "${nodeName}": ${error.message}`,
			);
		});
	}

	getParentCallbackManager(): CallbackManager | undefined {
		return this.additionalData.parentCallbackManager;
	}
}
