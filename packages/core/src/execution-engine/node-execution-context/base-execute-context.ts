import { Container } from '@n8n/di';
import get from 'lodash/get';
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
	IWorkflowDataProxyData,
	ISourceData,
	AiEvent,
	NodeConnectionType,
	Result,
	IExecuteFunctions,
} from 'n8n-workflow';
import {
	ApplicationError,
	NodeHelpers,
	NodeConnectionTypes,
	WAIT_INDEFINITELY,
	WorkflowDataProxy,
	createEnvProviderState,
} from 'n8n-workflow';

import { BinaryDataService } from '@/binary-data/binary-data.service';

import { NodeExecutionContext } from './node-execution-context';

export class BaseExecuteContext extends NodeExecutionContext {
	protected readonly binaryDataService = Container.get(BinaryDataService);

	constructor(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		readonly runExecutionData: IRunExecutionData,
		runIndex: number,
		readonly connectionInputData: INodeExecutionData[],
		readonly inputData: ITaskDataConnections,
		readonly executeData: IExecuteData,
		readonly abortSignal?: AbortSignal,
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

	async putExecutionToWait(waitTill: Date): Promise<void> {
		this.runExecutionData.waitTill = waitTill;
		if (this.additionalData.setExecutionStatus) {
			this.additionalData.setExecutionStatus('waiting');
		}
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
		const result = await this.additionalData.executeWorkflow(workflowInfo, this.additionalData, {
			...options,
			parentWorkflowId: this.workflow.id,
			inputData,
			parentWorkflowSettings: this.workflow.settings,
			node: this.node,
			parentCallbackManager,
		});

		// If a sub-workflow execution goes into the waiting state
		if (result.waitTill) {
			// then put the parent workflow execution also into the waiting state,
			// but do not use the sub-workflow `waitTill` to avoid WaitTracker resuming the parent execution at the same time as the sub-workflow
			await this.putExecutionToWait(WAIT_INDEFINITELY);
		}

		const data = await this.binaryDataService.duplicateBinaryData(
			this.workflow.id,
			this.additionalData.executionId!,
			result.data,
		);
		return { ...result, data };
	}

	async getExecutionDataById(executionId: string): Promise<IRunExecutionData | undefined> {
		return await this.additionalData.getRunExecutionData(executionId);
	}

	protected getInputItems(inputIndex: number, connectionType: NodeConnectionType) {
		const inputData = this.inputData[connectionType];
		if (inputData.length < inputIndex) {
			throw new ApplicationError('Could not get input with given index', {
				extra: { inputIndex, connectionType },
			});
		}

		const allItems = inputData[inputIndex] as INodeExecutionData[] | null | undefined;
		if (allItems === null) {
			throw new ApplicationError('Input index was not set', {
				extra: { inputIndex, connectionType },
			});
		}

		return allItems;
	}

	getInputSourceData(inputIndex = 0, connectionType = NodeConnectionTypes.Main): ISourceData {
		if (this.executeData?.source === null) {
			// Should never happen as n8n sets it automatically
			throw new ApplicationError('Source data is missing');
		}
		return this.executeData.source[connectionType][inputIndex]!;
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

	async startJob<T = unknown, E = unknown>(
		jobType: string,
		settings: unknown,
		itemIndex: number,
	): Promise<Result<T, E>> {
		return await this.additionalData.startRunnerTask<T, E>(
			this.additionalData,
			jobType,
			settings,
			this as IExecuteFunctions,
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
}
