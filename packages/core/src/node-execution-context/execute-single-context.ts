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
	ITaskMetadata,
} from 'n8n-workflow';
import {
	ApplicationError,
	createDeferredPromise,
	NodeHelpers,
	WorkflowDataProxy,
} from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import {
	assertBinaryData,
	continueOnFail,
	getAdditionalKeys,
	getBinaryDataBuffer,
	getBinaryHelperFunctions,
	getCredentials,
	getNodeParameter,
	getRequestHelperFunctions,
	returnJsonArray,
} from '@/NodeExecuteFunctions';

import { NodeExecutionContext } from './node-execution-context';

export class ExecuteSingleContext extends NodeExecutionContext implements IExecuteSingleFunctions {
	readonly helpers: IExecuteSingleFunctions['helpers'];

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		private readonly runExecutionData: IRunExecutionData,
		private readonly runIndex: number,
		private readonly connectionInputData: INodeExecutionData[],
		private readonly inputData: ITaskDataConnections,
		private readonly itemIndex: number,
		private readonly executeData: IExecuteData,
		private readonly abortSignal?: AbortSignal,
	) {
		super(workflow, node, additionalData, mode);

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

	setMetadata(metadata: ITaskMetadata): void {
		this.executeData.metadata = {
			...(this.executeData.metadata ?? {}),
			...metadata,
		};
	}

	continueOnFail() {
		return continueOnFail(this.node);
	}

	evaluateExpression(expression: string, evaluateItemIndex: number | undefined) {
		evaluateItemIndex = evaluateItemIndex ?? this.itemIndex;
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

		if (allItems === null || allItems === undefined) {
			throw new ApplicationError('Input index was not set', {
				extra: { inputIndex, inputName },
			});
		}

		const data = allItems[this.itemIndex];
		if (data === null || data === undefined) {
			throw new ApplicationError('Value of input with given index was not set', {
				extra: { inputIndex, inputName, itemIndex: this.itemIndex },
			});
		}

		return data;
	}

	getItemIndex() {
		return this.itemIndex;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

	// TODO: extract out in a BaseExecutionContext
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
