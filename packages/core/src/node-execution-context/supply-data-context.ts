import type {
	ICredentialDataDecryptedObject,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	ISupplyDataFunctions,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
	CloseFunction,
	IExecuteData,
	ITaskDataConnections,
	IExecuteWorkflowInfo,
	CallbackManager,
	NodeConnectionType,
	AiEvent,
	DeduplicationHelperFunctions,
	FileSystemHelperFunctions,
} from 'n8n-workflow';
import {
	ApplicationError,
	createDeferredPromise,
	NodeHelpers,
	WorkflowDataProxy,
} from 'n8n-workflow';

import {
	addExecutionDataFunctions,
	continueOnFail,
	getAdditionalKeys,
	getCredentials,
	getInputConnectionData,
	getNodeParameter,
	constructExecutionMetaData,
	normalizeItems,
	returnJsonArray,
	assertBinaryData,
	getBinaryDataBuffer,
	copyInputItems,
} from '@/NodeExecuteFunctions';
import { BaseContext } from './base-contexts';
import { BinaryHelpers } from './helpers/binary-helpers';
import { RequestHelpers } from './helpers/request-helpers';
import Container from 'typedi';
import { BinaryDataService } from '@/BinaryData/BinaryData.service';
import { SSHTunnelHelpers } from './helpers/ssh-tunnel-helpers';
import { DeduplicationHelpers } from './helpers/deduplication-helpers';
import { FileSystemHelpers } from './helpers/file-system-helpers';

export class SupplyDataContext extends BaseContext implements ISupplyDataFunctions {
	readonly helpers: ISupplyDataFunctions['helpers'];

	private readonly binaryDataService = Container.get(BinaryDataService);

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		private readonly mode: WorkflowExecuteMode,
		private readonly runExecutionData: IRunExecutionData,
		private readonly runIndex: number,
		private readonly connectionInputData: INodeExecutionData[],
		private readonly inputData: ITaskDataConnections,
		private readonly executeData: IExecuteData,
		private readonly closeFunctions: CloseFunction[],
		private readonly abortSignal?: AbortSignal,
	) {
		super(workflow, node, additionalData);

		const binaryHelpers = new BinaryHelpers(workflow, additionalData);
		const deduplicationHelpers = new DeduplicationHelpers(workflow, node);
		const fileSystemHelpers = new FileSystemHelpers(node);
		const requestHelpers = new RequestHelpers(
			this as ISupplyDataFunctions,
			workflow,
			node,
			additionalData,
		);
		const sshTunnelHelpers = new SSHTunnelHelpers();

		// TODO: extract out in a BaseExecutionContext
		this.helpers = {
			createDeferredPromise,
			returnJsonArray,

			getBinaryPath: (id) => binaryHelpers.getBinaryPath(id),
			getBinaryMetadata: (id) => binaryHelpers.getBinaryMetadata(id),
			getBinaryStream: (id) => binaryHelpers.getBinaryStream(id),
			binaryToBuffer: (body) => binaryHelpers.binaryToBuffer(body),
			binaryToString: (body) => binaryHelpers.binaryToString(body),
			prepareBinaryData: binaryHelpers.prepareBinaryData.bind(binaryHelpers),
			setBinaryDataBuffer: binaryHelpers.setBinaryDataBuffer.bind(binaryHelpers),
			copyBinaryFile: () => binaryHelpers.copyBinaryFile(),
			assertBinaryData: (itemIndex, propertyName) =>
				assertBinaryData(inputData, node, itemIndex, propertyName, 0),
			getBinaryDataBuffer: async (itemIndex, propertyName) =>
				await getBinaryDataBuffer(inputData, itemIndex, propertyName, 0),

			httpRequest: requestHelpers.httpRequest.bind(requestHelpers),
			httpRequestWithAuthentication:
				requestHelpers.httpRequestWithAuthentication.bind(requestHelpers),
			requestWithAuthenticationPaginated:
				requestHelpers.requestWithAuthenticationPaginated.bind(requestHelpers),
			request: requestHelpers.request.bind(requestHelpers),
			requestWithAuthentication: requestHelpers.requestWithAuthentication.bind(requestHelpers),
			requestOAuth1: requestHelpers.requestOAuth1.bind(requestHelpers),
			requestOAuth2: requestHelpers.requestOAuth2.bind(requestHelpers),

			getSSHClient: sshTunnelHelpers.getSSHClient.bind(sshTunnelHelpers),

			copyInputItems,
			normalizeItems,
			constructExecutionMetaData,

			checkProcessedAndRecord:
				deduplicationHelpers.checkProcessedAndRecord.bind(deduplicationHelpers),
			checkProcessedItemsAndRecord:
				deduplicationHelpers.checkProcessedItemsAndRecord.bind(deduplicationHelpers),
			removeProcessed: deduplicationHelpers.removeProcessed.bind(deduplicationHelpers),
			clearAllProcessedItems:
				deduplicationHelpers.clearAllProcessedItems.bind(deduplicationHelpers),
			getProcessedDataCount: deduplicationHelpers.getProcessedDataCount.bind(deduplicationHelpers),

			createReadStream: fileSystemHelpers.createReadStream.bind(fileSystemHelpers),
			getStoragePath: fileSystemHelpers.getStoragePath.bind(fileSystemHelpers),
			writeContentToFile: fileSystemHelpers.writeContentToFile.bind(fileSystemHelpers),
		};
	}

	// TODO: extract out in a BaseExecutionContext
	getMode() {
		return this.mode;
	}

	// TODO: extract out in a BaseExecutionContext
	getExecutionCancelSignal() {
		return this.abortSignal;
	}

	// TODO: extract out in a BaseExecutionContext
	onExecutionCancellation(handler: () => unknown) {
		const fn = () => {
			this.abortSignal?.removeEventListener('abort', fn);
			handler();
		};
		this.abortSignal?.addEventListener('abort', fn);
	}

	// TODO: extract out in a BaseExecutionContext
	continueOnFail() {
		return continueOnFail(this.node);
	}

	// TODO: extract out in a BaseExecutionContext
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

	// TODO: extract out in a BaseExecutionContext
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
	) {
		await this.additionalData
			.executeWorkflow(workflowInfo, this.additionalData, {
				parentWorkflowId: this.workflow.id?.toString(),
				inputData,
				parentWorkflowSettings: this.workflow.settings,
				node: this.node,
				parentCallbackManager,
			})
			.then(
				async (result) =>
					await this.binaryDataService.duplicateBinaryData(
						this.workflow.id,
						this.additionalData.executionId!,
						result,
					),
			);
	}

	getNodeOutputs() {
		const nodeType = this.workflow.nodeTypes.getByNameAndVersion(
			this.node.type,
			this.node.typeVersion,
		);
		return NodeHelpers.getNodeOutputs(this.workflow, this.node, nodeType.description).map(
			(output) => {
				if (typeof output === 'string') {
					return {
						type: output,
					};
				}
				return output;
			},
		);
	}

	async getInputConnectionData(inputName: NodeConnectionType, itemIndex: number): Promise<unknown> {
		return await getInputConnectionData(
			this as ISupplyDataFunctions,
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

	// @ts-expect-error Not sure how to fix this typing
	getNodeParameter(
		parameterName: string,
		itemIndex: number,
		fallbackValue?: any,
		options?: IGetNodeParameterOptions,
	) {
		return getNodeParameter(
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
		) as ISupplyDataFunctions['getNodeParameter'];
	}

	getWorkflowDataProxy(itemIndex: number) {
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

	sendMessageToUI(...args: any[]): void {
		if (this.mode !== 'manual') {
			return;
		}
		try {
			if (this.additionalData.sendDataToUI) {
				args = args.map((arg) => {
					// prevent invalid dates from being logged as null
					if (arg.isLuxonDateTime && arg.invalidReason) return { ...arg };

					// log valid dates in human readable format, as in browser
					if (arg.isLuxonDateTime) return new Date(arg.ts).toString();
					if (arg instanceof Date) return arg.toString();

					return arg;
				});

				this.additionalData.sendDataToUI('sendConsoleMessage', {
					source: `[Node: "${this.node.name}"]`,
					messages: args,
				});
			}
		} catch (error) {
			this.logger.warn(`There was a problem sending message to UI: ${error.message}`);
		}
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
			this.node.name,
			data,
			this.runExecutionData,
			connectionType,
			this.additionalData,
			this.node.name,
			this.runIndex,
			currentNodeRunIndex,
		).catch((error) => {
			this.logger.warn(
				`There was a problem logging input data of node "${this.node.name}": ${error.message}`,
			);
		});

		return { index: currentNodeRunIndex };
	}

	addOutputData(
		connectionType: NodeConnectionType,
		currentNodeRunIndex: number,
		data: INodeExecutionData[][],
	): void {
		addExecutionDataFunctions(
			'output',
			this.node.name,
			data,
			this.runExecutionData,
			connectionType,
			this.additionalData,
			this.node.name,
			this.runIndex,
			currentNodeRunIndex,
		).catch((error) => {
			this.logger.warn(
				`There was a problem logging output data of node "${this.node.name}": ${error.message}`,
			);
		});
	}
}
