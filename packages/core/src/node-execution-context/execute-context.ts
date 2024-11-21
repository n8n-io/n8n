import type {
	AiEvent,
	CallbackManager,
	CloseFunction,
	ContextType,
	ExecutionBaseError,
	IContextObject,
	ICredentialDataDecryptedObject,
	IExecuteData,
	IExecuteFunctions,
	IExecuteResponsePromiseData,
	IExecuteWorkflowInfo,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	INodeInputConfiguration,
	INodeOutputConfiguration,
	IRunExecutionData,
	ISourceData,
	ITaskDataConnections,
	ITaskMetadata,
	IWorkflowDataProxyData,
	IWorkflowExecuteAdditionalData,
	NodeConnectionType,
	RelatedExecution,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	ApplicationError,
	createDeferredPromise,
	NodeHelpers,
	WorkflowDataProxy,
} from 'n8n-workflow';
import Container from 'typedi';

import { createAgentStartJob } from '@/Agent';
import { BinaryDataService } from '@/BinaryData/BinaryData.service';
// eslint-disable-next-line import/no-cycle
import {
	returnJsonArray,
	copyInputItems,
	normalizeItems,
	constructExecutionMetaData,
	continueOnFail,
	getCredentials,
	getAdditionalKeys,
	getInputConnectionData,
	getNodeParameter,
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

import { NodeExecutionContext } from './node-execution-context';

export class ExecuteContext extends NodeExecutionContext implements IExecuteFunctions {
	readonly helpers: IExecuteFunctions['helpers'];

	readonly nodeHelpers: IExecuteFunctions['nodeHelpers'];

	readonly getNodeParameter: IExecuteFunctions['getNodeParameter'];

	readonly startJob: IExecuteFunctions['startJob'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		private readonly runExecutionData: IRunExecutionData,
		private readonly runIndex: number,
		private readonly connectionInputData: INodeExecutionData[],
		private readonly inputData: ITaskDataConnections,
		private readonly executeData: IExecuteData,
		private readonly closeFunctions: CloseFunction[],
		private readonly abortSignal?: AbortSignal,
	) {
		super(workflow, node, additionalData, mode);

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
			getNodeParameter(
				this.workflow,
				this.runExecutionData,
				this.runIndex,
				this.connectionInputData,
				this.node,
				parameterName,
				itemIndex,
				this.mode,
				getAdditionalKeys(this.additionalData, this.mode, this.runExecutionData),
				this.executeData,
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

	getExecutionCancelSignal() {
		return this.abortSignal;
	}

	onExecutionCancellation(handler: () => unknown) {
		const fn = () => {
			this.abortSignal?.removeEventListener('abort', fn);
			handler();
		};
		this.abortSignal?.addEventListener('abort', fn);
	}

	continueOnFail() {
		return continueOnFail(this.node);
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(
		type: string,
		itemIndex: number,
	) {
		return await getCredentials<T>(
			this.workflow,
			this.node,
			type,
			this.additionalData,
			this.mode,
			this.executeData,
			this.runExecutionData,
			this.runIndex,
			this.connectionInputData,
			itemIndex,
		);
	}

	getExecuteData() {
		return this.executeData;
	}

	setMetadata(metadata: ITaskMetadata): void {
		this.executeData.metadata = {
			...(this.executeData.metadata ?? {}),
			...metadata,
		};
	}

	evaluateExpression(expression: string, itemIndex: number) {
		return this.workflow.expression.resolveSimpleParameterValue(
			`=${expression}`,
			{},
			this.runExecutionData,
			this.runIndex,
			itemIndex,
			this.node.name,
			this.connectionInputData,
			this.mode,
			getAdditionalKeys(this.additionalData, this.mode, this.runExecutionData),
			this.executeData,
		);
	}

	async executeWorkflow(
		workflowInfo: IExecuteWorkflowInfo,
		inputData?: INodeExecutionData[],
		parentCallbackManager?: CallbackManager,
		options?: {
			doNotWaitToFinish?: boolean;
			parentExecution?: RelatedExecution;
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): Promise<any> {
		return await this.additionalData
			.executeWorkflow(workflowInfo, this.additionalData, {
				...options,
				parentWorkflowId: this.workflow.id?.toString(),
				inputData,
				parentWorkflowSettings: this.workflow.settings,
				node: this.node,
				parentCallbackManager,
			})
			.then(async (result) => {
				const data = await Container.get(BinaryDataService).duplicateBinaryData(
					this.workflow.id,
					this.additionalData.executionId!,
					result.data,
				);
				return { ...result, data };
			});
	}

	getContext(type: ContextType): IContextObject {
		return NodeHelpers.getContext(this.runExecutionData, type, this.node);
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

	getNodeInputs(): INodeInputConfiguration[] {
		const nodeType = this.workflow.nodeTypes.getByNameAndVersion(
			this.node.type,
			this.node.typeVersion,
		);
		return NodeHelpers.getNodeInputs(this.workflow, this.node, nodeType.description).map((input) =>
			typeof input === 'string' ? { type: input } : input,
		);
	}

	getNodeOutputs(): INodeOutputConfiguration[] {
		const nodeType = this.workflow.nodeTypes.getByNameAndVersion(
			this.node.type,
			this.node.typeVersion,
		);
		return NodeHelpers.getNodeOutputs(this.workflow, this.node, nodeType.description).map(
			(output) => (typeof output === 'string' ? { type: output } : output),
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

	getInputSourceData(inputIndex = 0, inputName = 'main') {
		if (this.executeData?.source === null) {
			// Should never happen as n8n sets it automatically
			throw new ApplicationError('Source data is missing');
		}
		return this.executeData.source[inputName][inputIndex] as ISourceData;
	}

	getWorkflowDataProxy(itemIndex: number): IWorkflowDataProxyData {
		return new WorkflowDataProxy(
			this.workflow,
			this.runExecutionData,
			this.runIndex,
			itemIndex,
			this.node.name,
			this.connectionInputData,
			{},
			this.mode,
			getAdditionalKeys(this.additionalData, this.mode, this.runExecutionData),
			this.executeData,
		).getDataProxy();
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	sendMessageToUI(...args: any[]): void {
		if (this.mode !== 'manual') {
			return;
		}
		try {
			if (this.additionalData.sendDataToUI) {
				args = args.map((arg) => {
					// prevent invalid dates from being logged as null
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
					if (arg.isLuxonDateTime && arg.invalidReason) return { ...arg };

					// log valid dates in human readable format, as in browser
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
					if (arg.isLuxonDateTime) return new Date(arg.ts).toString();
					if (arg instanceof Date) return arg.toString();

					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					return arg;
				});

				this.additionalData.sendDataToUI('sendConsoleMessage', {
					source: `[Node: "${this.node.name}"]`,
					messages: args,
				});
			}
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			this.logger.warn(`There was a problem sending message to UI: ${error.message}`);
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

	logAiEvent(eventName: AiEvent, msg: string) {
		return this.additionalData.logAiEvent(eventName, {
			executionId: this.additionalData.executionId ?? 'unsaved-execution',
			nodeName: this.node.name,
			workflowName: this.workflow.name ?? 'Unnamed workflow',
			nodeType: this.node.type,
			workflowId: this.workflow.id ?? 'unsaved-workflow',
			msg,
		});
	}

	getParentCallbackManager(): CallbackManager | undefined {
		return this.additionalData.parentCallbackManager;
	}
}
