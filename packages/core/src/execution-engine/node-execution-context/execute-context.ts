import type {
	AINodeConnectionType,
	CallbackManager,
	ChunkType,
	CloseFunction,
	IDataObject,
	IExecuteData,
	IExecuteFunctions,
	IExecuteResponsePromiseData,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	NodeExecutionHint,
	StructuredChunk,
	Workflow,
	WorkflowExecuteMode,
	EngineResponse,
} from 'n8n-workflow';
import {
	ApplicationError,
	createDeferredPromise,
	jsonParse,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BaseExecuteContext } from './base-execute-context';
import {
	assertBinaryData,
	getBinaryDataBuffer,
	copyBinaryFile,
	getBinaryHelperFunctions,
	detectBinaryEncoding,
} from './utils/binary-helper-functions';
import { constructExecutionMetaData } from './utils/construct-execution-metadata';
import { copyInputItems } from './utils/copy-input-items';
import { getDataTableHelperFunctions } from './utils/data-table-helper-functions';
import { getDeduplicationHelperFunctions } from './utils/deduplication-helper-functions';
import { getFileSystemHelperFunctions } from './utils/file-system-helper-functions';
import { getInputConnectionData } from './utils/get-input-connection-data';
import { normalizeItems } from './utils/normalize-items';
import { getRequestHelperFunctions } from './utils/request-helper-functions';
import { returnJsonArray } from './utils/return-json-array';
import { getSSHTunnelFunctions } from './utils/ssh-tunnel-helper-functions';

export class ExecuteContext extends BaseExecuteContext implements IExecuteFunctions {
	readonly helpers: IExecuteFunctions['helpers'];

	readonly nodeHelpers: IExecuteFunctions['nodeHelpers'];

	readonly getNodeParameter: IExecuteFunctions['getNodeParameter'];

	readonly hints: NodeExecutionHint[] = [];

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
		public subNodeExecutionResults?: EngineResponse,
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
			...getDataTableHelperFunctions(additionalData, workflow, node),
			...getSSHTunnelFunctions(),
			...getFileSystemHelperFunctions(node),
			...getDeduplicationHelperFunctions(workflow, node),

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

	isStreaming(): boolean {
		// Check if we have sendChunk handlers
		const handlers = this.additionalData.hooks?.handlers?.sendChunk?.length;
		const hasHandlers = handlers !== undefined && handlers > 0;

		// Check if streaming was enabled for this execution
		const streamingEnabled = this.additionalData.streamingEnabled === true;

		// Check current execution mode supports streaming
		const executionModeSupportsStreaming = ['manual', 'webhook', 'integrated'];
		const isStreamingMode = executionModeSupportsStreaming.includes(this.mode);

		return hasHandlers && isStreamingMode && streamingEnabled;
	}

	async sendChunk(
		type: ChunkType,
		itemIndex: number,
		content?: IDataObject | string,
	): Promise<void> {
		const node = this.getNode();
		const metadata = {
			nodeId: node.id,
			nodeName: node.name,
			itemIndex,
			runIndex: this.runIndex,
			timestamp: Date.now(),
		};

		const parsedContent = typeof content === 'string' ? content : JSON.stringify(content);

		const message: StructuredChunk = {
			type,
			content: parsedContent,
			metadata,
		};

		await this.additionalData.hooks?.runHook('sendChunk', [message]);
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

	getInputData(inputIndex = 0, connectionType = NodeConnectionTypes.Main) {
		if (!this.inputData.hasOwnProperty(connectionType)) {
			// Return empty array because else it would throw error when nothing is connected to input
			return [];
		}
		return super.getInputItems(inputIndex, connectionType) ?? [];
	}

	logNodeOutput(...args: unknown[]): void {
		if (this.mode === 'manual') {
			const parsedLogArgs = args.map((arg) =>
				typeof arg === 'string' ? jsonParse(arg, { fallbackValue: arg }) : arg,
			);
			this.sendMessageToUI(...parsedLogArgs);
			return;
		}

		if (process.env.CODE_ENABLE_STDOUT === 'true') {
			console.log(`[Workflow "${this.getWorkflow().id}"][Node "${this.node.name}"]`, ...args);
		}
	}

	async sendResponse(response: IExecuteResponsePromiseData): Promise<void> {
		await this.additionalData.hooks?.runHook('sendResponse', [response]);
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

	addExecutionHints(...hints: NodeExecutionHint[]) {
		this.hints.push(...hints);
	}
}
