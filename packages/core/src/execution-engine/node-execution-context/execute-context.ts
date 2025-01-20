import type {
	AINodeConnectionType,
	CallbackManager,
	CloseFunction,
	IExecuteData,
	IExecuteFunctions,
	IExecuteResponsePromiseData,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	Result,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	ApplicationError,
	createDeferredPromise,
	createEnvProviderState,
	NodeConnectionType,
} from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import {
	returnJsonArray,
	copyInputItems,
	normalizeItems,
	constructExecutionMetaData,
	assertBinaryData,
	getBinaryDataBuffer,
	copyBinaryFile,
	getRequestHelperFunctions,
	getBinaryHelperFunctions,
	getSSHTunnelFunctions,
	getFileSystemHelperFunctions,
	getCheckProcessedHelperFunctions,
	detectBinaryEncoding,
} from '@/node-execute-functions';

import { BaseExecuteContext } from './base-execute-context';
import { getInputConnectionData } from './utils/get-input-connection-data';

export class ExecuteContext extends BaseExecuteContext implements IExecuteFunctions {
	readonly helpers: IExecuteFunctions['helpers'];

	readonly nodeHelpers: IExecuteFunctions['nodeHelpers'];

	readonly getNodeParameter: IExecuteFunctions['getNodeParameter'];

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
			detectBinaryEncoding: (buffer: Buffer) => detectBinaryEncoding(buffer),
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
	}

	async startJob<T = unknown, E = unknown>(
		jobType: string,
		settings: unknown,
		itemIndex: number,
	): Promise<Result<T, E>> {
		return await this.additionalData.startRunnerTask<T, E>(
			this.additionalData,
			jobType,
			settings,
			this,
			this.inputData,
			this.node,
			this.workflow,
			this.runExecutionData,
			this.runIndex,
			itemIndex,
			this.node.name,
			this.connectionInputData,
			{},
			this.mode,
			createEnvProviderState(),
			this.executeData,
		);
	}

	async getInputConnectionData(
		connectionType: AINodeConnectionType,
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

	getInputData(inputIndex = 0, connectionType = NodeConnectionType.Main) {
		if (!this.inputData.hasOwnProperty(connectionType)) {
			// Return empty array because else it would throw error when nothing is connected to input
			return [];
		}
		return super.getInputItems(inputIndex, connectionType) ?? [];
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

	/** @deprecated use ISupplyDataFunctions.addInputData */
	addInputData(): { index: number } {
		throw new ApplicationError('addInputData should not be called on IExecuteFunctions');
	}

	/** @deprecated use ISupplyDataFunctions.addOutputData */
	addOutputData(): void {
		throw new ApplicationError('addOutputData should not be called on IExecuteFunctions');
	}

	getParentCallbackManager(): CallbackManager | undefined {
		return this.additionalData.parentCallbackManager;
	}
}
