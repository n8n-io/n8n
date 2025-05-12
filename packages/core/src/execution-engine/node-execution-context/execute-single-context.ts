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
} from 'n8n-workflow';
import { ApplicationError, createDeferredPromise, NodeConnectionTypes } from 'n8n-workflow';

import { BaseExecuteContext } from './base-execute-context';
import {
	assertBinaryData,
	detectBinaryEncoding,
	getBinaryDataBuffer,
	getBinaryHelperFunctions,
} from './utils/binary-helper-functions';
import { getRequestHelperFunctions } from './utils/request-helper-functions';
import { returnJsonArray } from './utils/return-json-array';

export class ExecuteSingleContext extends BaseExecuteContext implements IExecuteSingleFunctions {
	readonly helpers: IExecuteSingleFunctions['helpers'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		runExecutionData: IRunExecutionData,
		runIndex: number,
		connectionInputData: INodeExecutionData[],
		inputData: ITaskDataConnections,
		private readonly itemIndex: number,
		executeData: IExecuteData,
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
			...getRequestHelperFunctions(
				workflow,
				node,
				additionalData,
				runExecutionData,
				connectionInputData,
			),
			...getBinaryHelperFunctions(additionalData, workflow.id),

			assertBinaryData: (propertyName, inputIndex = 0) =>
				assertBinaryData(inputData, node, itemIndex, propertyName, inputIndex),
			getBinaryDataBuffer: async (propertyName, inputIndex = 0) =>
				await getBinaryDataBuffer(inputData, itemIndex, propertyName, inputIndex),
			detectBinaryEncoding: (buffer) => detectBinaryEncoding(buffer),
		};
	}

	evaluateExpression(expression: string, itemIndex: number = this.itemIndex) {
		return super.evaluateExpression(expression, itemIndex);
	}

	getInputData(inputIndex = 0, connectionType = NodeConnectionTypes.Main) {
		if (!this.inputData.hasOwnProperty(connectionType)) {
			// Return empty array because else it would throw error when nothing is connected to input
			return { json: {} };
		}

		const allItems = super.getInputItems(inputIndex, connectionType);

		const data = allItems?.[this.itemIndex];
		if (data === undefined) {
			throw new ApplicationError('Value of input with given index was not set', {
				extra: { inputIndex, connectionType, itemIndex: this.itemIndex },
			});
		}

		return data;
	}

	getItemIndex() {
		return this.itemIndex;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getNodeParameter(parameterName: string, fallbackValue?: any, options?: IGetNodeParameterOptions) {
		return this._getNodeParameter(parameterName, this.itemIndex, fallbackValue, options);
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(type: string) {
		return await super.getCredentials<T>(type, this.itemIndex);
	}

	getWorkflowDataProxy() {
		return super.getWorkflowDataProxy(this.itemIndex);
	}
}
