import { getAdditionalKeys } from 'n8n-core';
import {
	WorkflowDataProxy,
	// type IWorkflowDataProxyAdditionalKeys,
	Workflow,
} from 'n8n-workflow';
import type {
	CodeExecutionMode,
	INode,
	INodeType,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	WorkflowParameters,
	IDataObject,
	IExecuteData,
	INodeExecutionData,
	INodeParameters,
	IRunExecutionData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import * as a from 'node:assert';
import { runInNewContext, type Context } from 'node:vm';

import { validateRunForAllItemsOutput, validateRunForEachItemOutput } from '@/result-validation';

import type { TaskResultData } from './runner-types';
import { type Task, TaskRunner } from './task-runner';

export interface JSExecSettings {
	code: string;
	nodeMode: CodeExecutionMode;
	workflowMode: WorkflowExecuteMode;
	continueOnFail: boolean;

	// For workflow data proxy
	mode: WorkflowExecuteMode;
}

export interface PartialAdditionalData {
	executionId?: string;
	restartExecutionId?: string;
	restApiUrl: string;
	instanceBaseUrl: string;
	formWaitingBaseUrl: string;
	webhookBaseUrl: string;
	webhookWaitingBaseUrl: string;
	webhookTestBaseUrl: string;
	currentNodeParameters?: INodeParameters;
	executionTimeoutTimestamp?: number;
	userId?: string;
	variables: IDataObject;
}

export interface AllCodeTaskData {
	workflow: Omit<WorkflowParameters, 'nodeTypes'>;
	inputData: ITaskDataConnections;
	node: INode;

	runExecutionData: IRunExecutionData;
	runIndex: number;
	itemIndex: number;
	activeNodeName: string;
	connectionInputData: INodeExecutionData[];
	siblingParameters: INodeParameters;
	mode: WorkflowExecuteMode;
	executeData?: IExecuteData;
	defaultReturnRunIndex: number;
	selfData: IDataObject;
	contextNodeName: string;
	additionalData: PartialAdditionalData;
}

type CustomConsole = {
	log: (...args: unknown[]) => void;
};

const noop = () => {};

export class JsTaskRunner extends TaskRunner {
	constructor(
		taskType: string,
		wsUrl: string,
		grantToken: string,
		maxConcurrency: number,
		name?: string,
	) {
		super(taskType, wsUrl, grantToken, maxConcurrency, name ?? 'JS Task Runner');
	}

	async executeTask(task: Task<JSExecSettings>): Promise<TaskResultData> {
		const allData = await this.requestData<AllCodeTaskData>(task.taskId, 'all');

		const settings = task.settings;
		a.ok(settings, 'JS Code not sent to runner');

		const workflowParams = allData.workflow;
		const workflow = new Workflow({
			...workflowParams,
			nodeTypes: {
				getByNameAndVersion() {
					return undefined as unknown as INodeType;
				},
				getByName() {
					return undefined as unknown as INodeType;
				},
				getKnownTypes() {
					return {};
				},
			},
		});

		const customConsole = {
			log:
				settings.workflowMode === 'manual'
					? noop
					: (...args: unknown[]) => {
							const logOutput = args
								.map((arg) => (typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : arg))
								.join(' ');
							console.log('[JS Code]', logOutput);
							void this.makeRpcCall(task.taskId, 'logNodeOutput', [logOutput]);
						},
		};

		const result =
			settings.nodeMode === 'runOnceForAllItems'
				? await this.runForAllItems(task.taskId, settings, allData, workflow, customConsole)
				: await this.runForEachItem(task.taskId, settings, allData, workflow, customConsole);

		return {
			result,
			customData: allData.runExecutionData.resultData.metadata,
		};
	}

	/**
	 * Executes the requested code for all items in a single run
	 */
	private async runForAllItems(
		taskId: string,
		settings: JSExecSettings,
		allData: AllCodeTaskData,
		workflow: Workflow,
		customConsole: CustomConsole,
	): Promise<INodeExecutionData[]> {
		const dataProxy = this.createDataProxy(allData, workflow, allData.itemIndex);
		const inputItems = allData.connectionInputData;

		const context: Context = {
			require,
			module: {},
			console: customConsole,

			items: inputItems,
			...dataProxy,
			...this.buildRpcCallObject(taskId),
		};

		try {
			const result = (await runInNewContext(
				`module.exports = async function() {${settings.code}\n}()`,
				context,
			)) as TaskResultData['result'];

			if (result === null) {
				return [];
			}

			return validateRunForAllItemsOutput(result);
		} catch (error) {
			if (settings.continueOnFail) {
				return [{ json: { error: this.getErrorMessageFromVmError(error) } }];
			}

			(error as Record<string, unknown>).node = allData.node;
			throw error;
		}
	}

	/**
	 * Executes the requested code for each item in the input data
	 */
	private async runForEachItem(
		taskId: string,
		settings: JSExecSettings,
		allData: AllCodeTaskData,
		workflow: Workflow,
		customConsole: CustomConsole,
	): Promise<INodeExecutionData[]> {
		const inputItems = allData.connectionInputData;
		const returnData: INodeExecutionData[] = [];

		for (let index = 0; index < inputItems.length; index++) {
			const item = inputItems[index];
			const dataProxy = this.createDataProxy(allData, workflow, index);
			const context: Context = {
				require,
				module: {},
				console: customConsole,
				item,

				...dataProxy,
				...this.buildRpcCallObject(taskId),
			};

			try {
				let result = (await runInNewContext(
					`module.exports = async function() {${settings.code}\n}()`,
					context,
				)) as INodeExecutionData | undefined;

				// Filter out null values
				if (result === null) {
					continue;
				}

				result = validateRunForEachItemOutput(result, index);
				if (result) {
					returnData.push(
						result.binary
							? {
									json: result.json,
									pairedItem: { item: index },
									binary: result.binary,
								}
							: {
									json: result.json,
									pairedItem: { item: index },
								},
					);
				}
			} catch (error) {
				if (!settings.continueOnFail) {
					(error as Record<string, unknown>).node = allData.node;
					throw error;
				}

				returnData.push({
					json: { error: this.getErrorMessageFromVmError(error) },
					pairedItem: {
						item: index,
					},
				});
			}
		}

		return returnData;
	}

	private createDataProxy(allData: AllCodeTaskData, workflow: Workflow, itemIndex: number) {
		return new WorkflowDataProxy(
			workflow,
			allData.runExecutionData,
			allData.runIndex,
			itemIndex,
			allData.activeNodeName,
			allData.connectionInputData,
			allData.siblingParameters,
			allData.mode,
			getAdditionalKeys(
				allData.additionalData as IWorkflowExecuteAdditionalData,
				allData.mode,
				allData.runExecutionData,
			),
			allData.executeData,
			allData.defaultReturnRunIndex,
			allData.selfData,
			allData.contextNodeName,
		).getDataProxy();
	}

	private getErrorMessageFromVmError(error: unknown): string {
		if (typeof error === 'object' && !!error && 'message' in error) {
			return error.message as string;
		}

		return JSON.stringify(error);
	}
}
