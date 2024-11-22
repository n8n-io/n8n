import type {
	AiEvent,
	CallbackManager,
	CloseFunction,
	ExecuteWorkflowData,
	ICredentialDataDecryptedObject,
	IExecuteData,
	IExecuteWorkflowInfo,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	ISupplyDataFunctions,
	ITaskDataConnections,
	ITaskMetadata,
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

import { BinaryDataService } from '@/BinaryData/BinaryData.service';
// eslint-disable-next-line import/no-cycle
import {
	assertBinaryData,
	continueOnFail,
	constructExecutionMetaData,
	copyInputItems,
	getAdditionalKeys,
	getBinaryDataBuffer,
	getBinaryHelperFunctions,
	getCheckProcessedHelperFunctions,
	getCredentials,
	getFileSystemHelperFunctions,
	getNodeParameter,
	getRequestHelperFunctions,
	getSSHTunnelFunctions,
	normalizeItems,
	returnJsonArray,
	getInputConnectionData,
	addExecutionDataFunctions,
} from '@/NodeExecuteFunctions';

import { NodeExecutionContext } from './node-execution-context';

export class SupplyDataContext extends NodeExecutionContext implements ISupplyDataFunctions {
	readonly helpers: ISupplyDataFunctions['helpers'];

	readonly getNodeParameter: ISupplyDataFunctions['getNodeParameter'];

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
			)) as ISupplyDataFunctions['getNodeParameter'];
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

	continueOnFail() {
		return continueOnFail(this.node);
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
	): Promise<ExecuteWorkflowData> {
		return await this.additionalData
			.executeWorkflow(workflowInfo, this.additionalData, {
				parentWorkflowId: this.workflow.id?.toString(),
				inputData,
				parentWorkflowSettings: this.workflow.settings,
				node: this.node,
				parentCallbackManager,
				...options,
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
