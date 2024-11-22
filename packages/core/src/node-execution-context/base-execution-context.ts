import { get } from 'lodash';
import type {
	Workflow,
	INode,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
	IRunExecutionData,
	INodeExecutionData,
	ITaskDataConnections,
	IExecuteData,
	ICredentialDataDecryptedObject,
	CallbackManager,
	IExecuteWorkflowInfo,
	RelatedExecution,
	ExecuteWorkflowData,
	ITaskMetadata,
	ContextType,
	IContextObject,
	INodeInputConfiguration,
	INodeOutputConfiguration,
	IWorkflowDataProxyData,
	ISourceData,
	AiEvent,
} from 'n8n-workflow';
import { ApplicationError, NodeHelpers, WorkflowDataProxy } from 'n8n-workflow';
import { Container } from 'typedi';

import { BinaryDataService } from '@/BinaryData/BinaryData.service';

import { NodeExecutionContext } from './node-execution-context';

export class BaseExecuteContext extends NodeExecutionContext {
	protected readonly binaryDataService = Container.get(BinaryDataService);

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		protected readonly runExecutionData: IRunExecutionData,
		runIndex: number,
		protected readonly connectionInputData: INodeExecutionData[],
		protected readonly inputData: ITaskDataConnections,
		protected readonly executeData: IExecuteData,
		protected readonly abortSignal?: AbortSignal,
	) {
		super(workflow, node, additionalData, mode, runExecutionData, runIndex);
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

	getExecuteData() {
		return this.executeData;
	}

	setMetadata(metadata: ITaskMetadata): void {
		this.executeData.metadata = {
			...(this.executeData.metadata ?? {}),
			...metadata,
		};
	}

	getContext(type: ContextType): IContextObject {
		return NodeHelpers.getContext(this.runExecutionData, type, this.node);
	}

	/** Returns if execution should be continued even if there was an error */
	continueOnFail(): boolean {
		const onError = get(this.node, 'onError', undefined);

		if (onError === undefined) {
			return get(this.node, 'continueOnFail', false);
		}

		return ['continueRegularOutput', 'continueErrorOutput'].includes(onError);
	}

	async getCredentials<T extends object = ICredentialDataDecryptedObject>(
		type: string,
		itemIndex: number,
	) {
		return await this._getCredentials<T>(
			type,
			this.executeData,
			this.connectionInputData,
			itemIndex,
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
				...options,
				parentWorkflowId: this.workflow.id?.toString(),
				inputData,
				parentWorkflowSettings: this.workflow.settings,
				node: this.node,
				parentCallbackManager,
			})
			.then(async (result) => {
				const data = await this.binaryDataService.duplicateBinaryData(
					this.workflow.id,
					this.additionalData.executionId!,
					result.data,
				);
				return { ...result, data };
			});
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

	getInputSourceData(inputIndex = 0, inputName = 'main'): ISourceData {
		if (this.executeData?.source === null) {
			// Should never happen as n8n sets it automatically
			throw new ApplicationError('Source data is missing');
		}
		return this.executeData.source[inputName][inputIndex]!;
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
			this.additionalKeys,
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
}
