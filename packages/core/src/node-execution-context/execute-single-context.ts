import type {
	ICredentialDataDecryptedObject,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	IExecuteSingleFunctions,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
	ITaskDataConnections,
	IExecuteData,
	ContextType,
	AiEvent,
	ISourceData,
} from 'n8n-workflow';
import {
	ApplicationError,
	createDeferredPromise,
	NodeHelpers,
	WorkflowDataProxy,
} from 'n8n-workflow';

import {
	assertBinaryData,
	continueOnFail,
	getAdditionalKeys,
	getBinaryDataBuffer,
	getCredentials,
	getNodeParameter,
	returnJsonArray,
} from '@/NodeExecuteFunctions';
import { BaseContext } from './base-contexts';
import { BinaryHelpers } from './helpers/binary-helpers';
import { RequestHelpers } from './helpers/request-helpers';

export class ExecuteSingleContext extends BaseContext implements IExecuteSingleFunctions {
	readonly helpers: IExecuteSingleFunctions['helpers'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		private readonly runExecutionData: IRunExecutionData,
		private readonly runIndex: number,
		private readonly connectionInputData: INodeExecutionData[],
		private readonly inputData: ITaskDataConnections,
		private readonly itemIndex: number,
		private readonly executeData: IExecuteData,
		private readonly mode: WorkflowExecuteMode,
		private readonly abortSignal?: AbortSignal,
	) {
		super(workflow, node, additionalData);

		const binaryHelpers = new BinaryHelpers(workflow, additionalData);
		const requestHelpers = new RequestHelpers(this, workflow, node, additionalData);

		this.helpers = {
			createDeferredPromise: () => createDeferredPromise(),
			returnJsonArray: (items) => returnJsonArray(items),

			getBinaryPath: (id) => binaryHelpers.getBinaryPath(id),
			getBinaryMetadata: (id) => binaryHelpers.getBinaryMetadata(id),
			getBinaryStream: (id) => binaryHelpers.getBinaryStream(id),
			binaryToBuffer: (body) => binaryHelpers.binaryToBuffer(body),
			binaryToString: (body) => binaryHelpers.binaryToString(body),
			prepareBinaryData: binaryHelpers.prepareBinaryData.bind(binaryHelpers),
			setBinaryDataBuffer: binaryHelpers.setBinaryDataBuffer.bind(binaryHelpers),
			copyBinaryFile: () => binaryHelpers.copyBinaryFile(),
			assertBinaryData: (propertyName, inputIndex = 0) =>
				assertBinaryData(inputData, node, itemIndex, propertyName, inputIndex),
			getBinaryDataBuffer: async (propertyName, inputIndex = 0) =>
				await getBinaryDataBuffer(inputData, itemIndex, propertyName, inputIndex),

			httpRequest: requestHelpers.httpRequest.bind(requestHelpers),
			httpRequestWithAuthentication:
				requestHelpers.httpRequestWithAuthentication.bind(requestHelpers),
			requestWithAuthenticationPaginated:
				requestHelpers.requestWithAuthenticationPaginated.bind(requestHelpers),
			request: requestHelpers.request.bind(requestHelpers),
			requestWithAuthentication: requestHelpers.requestWithAuthentication.bind(requestHelpers),
			requestOAuth1: requestHelpers.requestOAuth1.bind(requestHelpers),
			requestOAuth2: requestHelpers.requestOAuth2.bind(requestHelpers),
		};
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

	evaluateExpression(expression: string, evaluateItemIndex: number | undefined) {
		evaluateItemIndex = evaluateItemIndex === undefined ? this.itemIndex : evaluateItemIndex;
		return this.workflow.expression.resolveSimpleParameterValue(
			`=${expression}`,
			{},
			this.runExecutionData,
			this.runIndex,
			evaluateItemIndex,
			this.node.name,
			this.connectionInputData,
			this.mode,
			getAdditionalKeys(this.additionalData, this.mode, this.runExecutionData),
			this.executeData,
		);
	}

	getContext(type: ContextType) {
		return NodeHelpers.getContext(this.runExecutionData, type, this.node);
	}

	getInputData(inputIndex = 0, inputName = 'main') {
		if (!this.inputData.hasOwnProperty(inputName)) {
			// Return empty array because else it would throw error when nothing is connected to input
			return { json: {} };
		}

		// TODO: Check if nodeType has input with that index defined
		if (this.inputData[inputName].length < inputIndex) {
			throw new ApplicationError('Could not get input index', {
				extra: { inputIndex, inputName },
			});
		}

		const allItems = this.inputData[inputName][inputIndex];

		if (allItems === null) {
			throw new ApplicationError('Input index was not set', {
				extra: { inputIndex, inputName },
			});
		}

		if (allItems[this.itemIndex] === null) {
			throw new ApplicationError('Value of input with given index was not set', {
				extra: { inputIndex, inputName, itemIndex: this.itemIndex },
			});
		}

		return allItems[this.itemIndex];
	}

	getItemIndex() {
		return this.itemIndex;
	}

	getNodeParameter(parameterName: string, fallbackValue?: any, options?: IGetNodeParameterOptions) {
		return getNodeParameter(
			this.workflow,
			this.runExecutionData,
			this.runIndex,
			this.connectionInputData,
			this.node,
			parameterName,
			this.itemIndex,
			this.mode,
			getAdditionalKeys(this.additionalData, this.mode, this.runExecutionData),
			this.executeData,
			fallbackValue,
			options,
		);
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
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
			this.itemIndex,
		);
	}

	getMode() {
		return this.mode;
	}

	getExecuteData() {
		return this.executeData;
	}

	getWorkflowDataProxy() {
		return new WorkflowDataProxy(
			this.workflow,
			this.runExecutionData,
			this.runIndex,
			this.itemIndex,
			this.node.name,
			this.connectionInputData,
			{},
			this.mode,
			getAdditionalKeys(this.additionalData, this.mode, this.runExecutionData),
			this.executeData,
		).getDataProxy();
	}

	getInputSourceData(inputIndex = 0, inputName = 'main'): ISourceData {
		if (this.executeData?.source === null) {
			// Should never happen as n8n sets it automatically
			throw new ApplicationError('Source data is missing');
		}
		return this.executeData.source[inputName][inputIndex] as ISourceData;
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
}
