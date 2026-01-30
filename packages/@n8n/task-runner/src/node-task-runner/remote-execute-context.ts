import type {
	IExecuteFunctions,
	INodeExecutionData,
	INode,
	IRunExecutionData,
	WorkflowExecuteMode,
	IDataObject,
	IWorkflowDataProxyData,
	ICredentialDataDecryptedObject,
	IExecuteWorkflowInfo,
	ExecuteWorkflowData,
	CallbackManager,
	RelatedExecution,
	AINodeConnectionType,
	NodeConnectionType,
	INodeInputConfiguration,
	INodeOutputConfiguration,
	IExecuteResponsePromiseData,
	ChunkType,
	ITaskMetadata,
	ContextType,
	IContextObject,
	IExecuteData,
	ISourceData,
	NodeExecutionHint,
	AiEvent,
	Result,
	IGetNodeParameterOptions,
	NodeParameterValueType,
	IBinaryData,
	IPairedItemData,
	NodeExecutionWithMetadata,
	WorkflowParameters,
	IHttpRequestOptions,
	IRequestOptions,
	INodeProperties,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	IWorkflowMetadata,
	IWorkflowSettings,
	NodeTypeAndVersion,
	IExecutionContext,
	Logger,
} from 'n8n-workflow';
import { NodeConnectionTypes, LoggerProxy } from 'n8n-workflow';

import type { DataRequestResponse } from '@/runner-types';
import type { TaskRunner } from '@/task-runner';

/**
 * Remote execution context that implements IExecuteFunctions for nodes running
 * in the sandboxed task runner.
 *
 * Most methods are proxied via RPC to the main process where the real
 * IExecuteFunctions context exists. Some methods that only need local data
 * are implemented directly.
 */
export class RemoteExecuteContext implements IExecuteFunctions {
	readonly helpers: IExecuteFunctions['helpers'];
	readonly nodeHelpers: IExecuteFunctions['nodeHelpers'];
	readonly getNodeParameter: IExecuteFunctions['getNodeParameter'];
	readonly logger: Logger;

	private customData: Record<string, string> = {};

	constructor(
		private readonly taskId: string,
		private readonly runner: TaskRunner,
		private readonly taskData: DataRequestResponse,
		private readonly nodeParameters: Record<string, unknown>,
		private readonly abortSignal?: AbortSignal,
	) {
		this.helpers = this.createHelpersProxy();
		this.nodeHelpers = this.createNodeHelpersProxy();
		this.getNodeParameter = this.createGetNodeParameter();
		this.logger = LoggerProxy;
		console.log('[RemoteExecuteContext] Created for task', {
			taskId,
			nodeName: taskData.node?.name,
			nodeType: taskData.node?.type,
		});
	}

	// ================== Custom data management ==================

	getCustomData(): Record<string, string> {
		return this.customData;
	}

	// ================== Local methods (use cached taskData) ==================

	/**
	 * These methods use data that was already sent with the task request,
	 * so they don't need RPC calls.
	 */

	getInputData(inputIndex = 0, connectionType = NodeConnectionTypes.Main): INodeExecutionData[] {
		const inputData = this.taskData.inputData[connectionType];
		if (!inputData) {
			return [];
		}
		return (inputData[inputIndex] as INodeExecutionData[]) ?? [];
	}

	getNode(): INode {
		return this.taskData.node;
	}

	getWorkflow(): IWorkflowMetadata {
		const workflow = this.taskData.workflow;
		return {
			id: workflow.id,
			name: workflow.name,
			active: workflow.active ?? false,
		};
	}

	getMode(): WorkflowExecuteMode {
		return this.taskData.mode;
	}

	getTimezone(): string {
		return this.taskData.workflow.settings?.timezone ?? 'UTC';
	}

	getRestApiUrl(): string {
		return this.taskData.additionalData.restApiUrl;
	}

	getInstanceBaseUrl(): string {
		return this.taskData.additionalData.instanceBaseUrl;
	}

	getInstanceId(): string {
		return '';
	}

	getExecutionId(): string {
		return this.taskData.additionalData.executionId ?? '';
	}

	getExecutionCancelSignal(): AbortSignal | undefined {
		return this.abortSignal;
	}

	onExecutionCancellation(handler: () => unknown): void {
		if (this.abortSignal) {
			const fn = () => {
				this.abortSignal?.removeEventListener('abort', fn);
				handler();
			};
			this.abortSignal.addEventListener('abort', fn);
		}
	}

	continueOnFail(): boolean {
		const node = this.taskData.node;
		const onError = (node as INode & { onError?: string }).onError;
		if (onError === undefined) {
			return (node as INode & { continueOnFail?: boolean }).continueOnFail ?? false;
		}
		return ['continueRegularOutput', 'continueErrorOutput'].includes(onError);
	}

	getWorkflowSettings(): IWorkflowSettings {
		return this.taskData.workflow.settings ?? {};
	}

	getCredentialsProperties(type: string): INodeProperties[] {
		// This would need RPC but is sync - throw for now
		throw new Error('getCredentialsProperties requires async - not supported in sandbox');
	}

	getWorkflowStaticData(type: string): IDataObject {
		// This would need RPC but is sync - throw for now
		throw new Error('getWorkflowStaticData requires async - not supported in sandbox');
	}

	getSignedResumeUrl(_parameters?: Record<string, string>): string {
		throw new Error('getSignedResumeUrl is not supported in sandboxed execution');
	}

	setSignatureValidationRequired(): void {
		// No-op in sandboxed context
	}

	getChildNodes(
		_nodeName: string,
		_options?: { includeNodeParameters?: boolean },
	): NodeTypeAndVersion[] {
		throw new Error('getChildNodes is not supported in sandboxed execution');
	}

	getParentNodes(
		_nodeName: string,
		_options?: {
			includeNodeParameters?: boolean;
			connectionType?: NodeConnectionType;
			depth?: number;
		},
	): NodeTypeAndVersion[] {
		throw new Error('getParentNodes is not supported in sandboxed execution');
	}

	getKnownNodeTypes(): IDataObject {
		return {};
	}

	getChatTrigger(): INode | null {
		return null;
	}

	isNodeFeatureEnabled(_featureName: string): boolean {
		return false;
	}

	getExecutionContext(): IExecutionContext | undefined {
		return undefined;
	}

	async prepareOutputData(
		outputData: INodeExecutionData[],
	): Promise<INodeExecutionData[][]> {
		return [outputData];
	}

	// ================== RPC methods (proxy to main process) ==================

	/**
	 * These methods call the main process via RPC where the real
	 * IExecuteFunctions context exists.
	 */

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(
		type: string,
		itemIndex: number,
	): Promise<T> {
		console.log('[RemoteExecuteContext] RPC: getCredentials', { type, itemIndex });
		return (await this.runner.makeRpcCall(this.taskId, 'getCredentials', [
			type,
			itemIndex,
		])) as T;
	}

	async executeWorkflow(
		workflowInfo: IExecuteWorkflowInfo,
		inputData?: INodeExecutionData[],
		_parentCallbackManager?: CallbackManager,
		options?: {
			doNotWaitToFinish?: boolean;
			parentExecution?: RelatedExecution;
			executionMode?: WorkflowExecuteMode;
		},
	): Promise<ExecuteWorkflowData> {
		console.log('[RemoteExecuteContext] RPC: executeWorkflow', {
			workflowId: workflowInfo.id,
			inputDataLength: inputData?.length,
		});
		return (await this.runner.makeRpcCall(this.taskId, 'executeWorkflow', [
			workflowInfo,
			inputData,
			undefined, // parentCallbackManager can't be serialized
			options,
		])) as ExecuteWorkflowData;
	}

	async getInputConnectionData(
		connectionType: AINodeConnectionType,
		itemIndex: number,
		inputIndex?: number,
	): Promise<unknown> {
		console.log('[RemoteExecuteContext] RPC: getInputConnectionData', {
			connectionType,
			itemIndex,
			inputIndex,
		});
		return await this.runner.makeRpcCall(this.taskId, 'getInputConnectionData', [
			connectionType,
			itemIndex,
			inputIndex,
		]);
	}

	async getExecutionDataById(executionId: string): Promise<IRunExecutionData | undefined> {
		return (await this.runner.makeRpcCall(this.taskId, 'getExecutionDataById', [
			executionId,
		])) as IRunExecutionData | undefined;
	}

	getNodeInputs(): INodeInputConfiguration[] {
		// This is sync in interface but we need async - wrap in a blocking call pattern
		// For now, throw as this is rarely used
		throw new Error('getNodeInputs requires async - not supported in sandbox');
	}

	getNodeOutputs(): INodeOutputConfiguration[] {
		throw new Error('getNodeOutputs requires async - not supported in sandbox');
	}

	async putExecutionToWait(waitTill: Date): Promise<void> {
		await this.runner.makeRpcCall(this.taskId, 'putExecutionToWait', [waitTill]);
	}

	sendMessageToUI(message: unknown): void {
		// Fire and forget - don't await
		void this.runner.makeRpcCall(this.taskId, 'sendMessageToUI', [message]);
	}

	sendResponse(_response: IExecuteResponsePromiseData): void {
		throw new Error('sendResponse is not supported in sandboxed execution');
	}

	sendChunk(_type: ChunkType, _itemIndex: number, _content?: IDataObject | string): void {
		// Not supported in sandbox
	}

	isStreaming(): boolean {
		return false;
	}

	isToolExecution(): boolean {
		return false;
	}

	addInputData(): { index: number } {
		throw new Error('addInputData is not supported in sandboxed execution');
	}

	addOutputData(): void {
		throw new Error('addOutputData is not supported in sandboxed execution');
	}

	addExecutionHints(...hints: NodeExecutionHint[]): void {
		void this.runner.makeRpcCall(this.taskId, 'addExecutionHints', hints);
	}

	getParentCallbackManager(): CallbackManager | undefined {
		return undefined;
	}

	async startJob<T = unknown, E = unknown>(
		_jobType: string,
		_settings: unknown,
		_itemIndex: number,
	): Promise<Result<T, E>> {
		throw new Error('Nested startJob is not supported in sandboxed execution');
	}

	getRunnerStatus(_taskType: string): { available: true } | { available: false; reason?: string } {
		return { available: false, reason: 'Not available in sandboxed execution' };
	}

	setMetadata(metadata: ITaskMetadata): void {
		void this.runner.makeRpcCall(this.taskId, 'setMetadata', [metadata]);
	}

	evaluateExpression(expression: string, itemIndex: number): NodeParameterValueType {
		// This is sync in interface - problematic for RPC
		// We'll need to handle this specially or throw
		throw new Error('evaluateExpression requires async - not supported in sandbox');
	}

	getContext(type: ContextType): IContextObject {
		throw new Error('getContext requires async - not supported in sandbox');
	}

	getExecuteData(): IExecuteData {
		return {
			node: this.taskData.node,
			source: null,
			data: {},
		} as IExecuteData;
	}

	getWorkflowDataProxy(itemIndex: number): IWorkflowDataProxyData {
		throw new Error('getWorkflowDataProxy requires async - not supported in sandbox');
	}

	getInputSourceData(inputIndex?: number, connectionType?: NodeConnectionType): ISourceData {
		throw new Error('getInputSourceData requires async - not supported in sandbox');
	}

	logAiEvent(eventName: AiEvent, msg?: string): void {
		void this.runner.makeRpcCall(this.taskId, 'logAiEvent', [eventName, msg]);
	}

	// ================== Proxy creators ==================

	private createGetNodeParameter(): IExecuteFunctions['getNodeParameter'] {
		// Use local parameters if available, otherwise RPC
		return ((
			parameterName: string,
			_itemIndex: number,
			fallbackValue?: unknown,
			_options?: IGetNodeParameterOptions,
		) => {
			const value = this.nodeParameters[parameterName];
			if (value === undefined) {
				return fallbackValue;
			}
			return value;
		}) as IExecuteFunctions['getNodeParameter'];
	}

	private createHelpersProxy(): IExecuteFunctions['helpers'] {
		const taskId = this.taskId;
		const runner = this.runner;

		return {
			// === RPC helpers ===
			async httpRequest(
				options: IHttpRequestOptions,
			): Promise<IN8nHttpFullResponse | IN8nHttpResponse> {
				console.log('[RemoteExecuteContext] RPC: helpers.httpRequest', {
					url: options.url,
					method: options.method,
				});
				return (await runner.makeRpcCall(taskId, 'helpers.httpRequest', [
					options,
				])) as IN8nHttpFullResponse;
			},

			async request(options: IRequestOptions): Promise<unknown> {
				console.log('[RemoteExecuteContext] RPC: helpers.request', {
					url: options.url ?? options.uri,
					method: options.method,
				});
				return await runner.makeRpcCall(taskId, 'helpers.request', [options]);
			},

			async httpRequestWithAuthentication(
				this: IExecuteFunctions,
				credentialsType: string,
				requestOptions: IHttpRequestOptions,
				additionalCredentialOptions?: unknown,
			): Promise<unknown> {
				console.log('[RemoteExecuteContext] RPC: helpers.httpRequestWithAuthentication', {
					credentialsType,
					url: requestOptions.url,
					method: requestOptions.method,
				});
				return await runner.makeRpcCall(taskId, 'helpers.httpRequestWithAuthentication', [
					credentialsType,
					requestOptions,
					additionalCredentialOptions,
				]);
			},

			async requestWithAuthenticationPaginated(
				this: IExecuteFunctions,
				requestOptions: unknown,
				itemIndex: number,
				paginationOptions: unknown,
				credentialsType?: string,
				additionalCredentialOptions?: unknown,
			): Promise<unknown[]> {
				console.log('[RemoteExecuteContext] RPC: helpers.requestWithAuthenticationPaginated', {
					credentialsType,
					itemIndex,
				});
				return (await runner.makeRpcCall(
					taskId,
					'helpers.requestWithAuthenticationPaginated',
					[
						requestOptions,
						itemIndex,
						paginationOptions,
						credentialsType,
						additionalCredentialOptions,
					],
				)) as unknown[];
			},

			async getBinaryDataBuffer(
				itemIndex: number,
				propertyName: string | IBinaryData,
			): Promise<Buffer> {
				console.log('[RemoteExecuteContext] RPC: helpers.getBinaryDataBuffer', {
					itemIndex,
					propertyName: typeof propertyName === 'string' ? propertyName : 'IBinaryData',
				});
				return (await runner.makeRpcCall(taskId, 'helpers.getBinaryDataBuffer', [
					itemIndex,
					propertyName,
				])) as Buffer;
			},

			async prepareBinaryData(
				binaryData: Buffer | Uint8Array,
				fileName?: string,
				mimeType?: string,
			): Promise<IBinaryData> {
				console.log('[RemoteExecuteContext] RPC: helpers.prepareBinaryData', {
					dataSize: binaryData.length,
					fileName,
					mimeType,
				});
				return (await runner.makeRpcCall(taskId, 'helpers.prepareBinaryData', [
					binaryData,
					fileName,
					mimeType,
				])) as IBinaryData;
			},

			async setBinaryDataBuffer(data: IBinaryData, buffer: Buffer): Promise<IBinaryData> {
				console.log('[RemoteExecuteContext] RPC: helpers.setBinaryDataBuffer', {
					bufferSize: buffer.length,
				});
				return (await runner.makeRpcCall(taskId, 'helpers.setBinaryDataBuffer', [
					data,
					buffer,
				])) as IBinaryData;
			},

			assertBinaryData(itemIndex: number, propertyName: string): IBinaryData {
				// Sync method - can't use RPC directly
				throw new Error('assertBinaryData requires async - use getBinaryDataBuffer instead');
			},

			async binaryToString(body: Buffer, encoding?: string): Promise<string> {
				return (await runner.makeRpcCall(taskId, 'helpers.binaryToString', [
					body,
					encoding,
				])) as string;
			},

			// === Local helpers (don't need RPC) ===
			createDeferredPromise<T>() {
				let resolve!: (value: T) => void;
				let reject!: (error: Error) => void;
				const promise = new Promise<T>((res, rej) => {
					resolve = res;
					reject = rej;
				});
				return { promise, resolve, reject };
			},

			returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[] {
				const returnData: INodeExecutionData[] = [];

				if (!Array.isArray(jsonData)) {
					jsonData = [jsonData];
				}

				jsonData.forEach((data: IDataObject & { json?: IDataObject }) => {
					if (data?.json) {
						// We already have the JSON key so avoid double wrapping
						returnData.push({ ...data, json: data.json });
					} else {
						returnData.push({ json: data });
					}
				});

				return returnData;
			},

			normalizeItems(items: INodeExecutionData | INodeExecutionData[]): INodeExecutionData[] {
				if (!Array.isArray(items)) {
					return [items];
				}
				return items;
			},

			constructExecutionMetaData(
				inputData: INodeExecutionData[],
				options: { itemData: IPairedItemData | IPairedItemData[] },
			): NodeExecutionWithMetadata[] {
				const itemData = Array.isArray(options.itemData) ? options.itemData : [options.itemData];
				return inputData.map((item, index) => ({
					...item,
					pairedItem: itemData[index] ?? { item: index },
				})) as NodeExecutionWithMetadata[];
			},

			copyInputItems(items: INodeExecutionData[], properties: string[]): IDataObject[] {
				return items.map((item) => {
					const newItem: IDataObject = {};
					for (const property of properties) {
						if (item.json[property] !== undefined) {
							newItem[property] = item.json[property] as IDataObject;
						}
					}
					return newItem;
				});
			},

			detectBinaryEncoding(_buffer: Buffer): string {
				// Simple detection - could be made more sophisticated
				return 'utf-8';
			},

			// === Unsupported helpers (throw errors) ===
			createReadStream() {
				throw new Error('createReadStream is not supported in sandboxed execution');
			},

			getStoragePath() {
				throw new Error('getStoragePath is not supported in sandboxed execution');
			},

			writeContentToFile() {
				throw new Error('writeContentToFile is not supported in sandboxed execution');
			},

			getSSHClient() {
				throw new Error('getSSHClient is not supported in sandboxed execution');
			},

			getBinaryPath() {
				throw new Error('getBinaryPath is not supported in sandboxed execution');
			},

			getBinaryMetadata() {
				throw new Error('getBinaryMetadata is not supported in sandboxed execution');
			},

			getBinaryStream() {
				throw new Error('getBinaryStream is not supported in sandboxed execution');
			},

			binaryToBuffer() {
				throw new Error('binaryToBuffer is not supported in sandboxed execution');
			},
		} as unknown as IExecuteFunctions['helpers'];
	}

	private createNodeHelpersProxy(): IExecuteFunctions['nodeHelpers'] {
		return {
			copyBinaryFile: async () => {
				throw new Error('copyBinaryFile is not supported in sandboxed execution');
			},
		};
	}
}
