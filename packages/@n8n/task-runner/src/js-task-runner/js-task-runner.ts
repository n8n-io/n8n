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
	EnvProviderState,
} from 'n8n-workflow';
import * as a from 'node:assert';
import { runInNewContext, type Context } from 'node:vm';

import type { TaskResultData } from '@/runner-types';
import { type Task, TaskRunner } from '@/task-runner';

import { isErrorLike } from './errors/error-like';
import { ExecutionError } from './errors/execution-error';
import type { RequireResolver } from './require-resolver';
import { createRequireResolver } from './require-resolver';
import { validateRunForAllItemsOutput, validateRunForEachItemOutput } from './result-validation';

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
	envProviderState?: EnvProviderState;
	executeData?: IExecuteData;
	defaultReturnRunIndex: number;
	selfData: IDataObject;
	contextNodeName: string;
	additionalData: PartialAdditionalData;
}

export interface JsTaskRunnerOpts {
	wsUrl: string;
	grantToken: string;
	maxConcurrency: number;
	name?: string;
	/**
	 * List of built-in nodejs modules that are allowed to be required in the
	 * execution sandbox. Asterisk (*) can be used to allow all.
	 */
	allowedBuiltInModules?: string;
	/**
	 * List of npm modules that are allowed to be required in the execution
	 * sandbox. Asterisk (*) can be used to allow all.
	 */
	allowedExternalModules?: string;
}

type CustomConsole = {
	log: (...args: unknown[]) => void;
};

export class JsTaskRunner extends TaskRunner {
	private readonly requireResolver: RequireResolver;

	constructor({
		grantToken,
		maxConcurrency,
		wsUrl,
		name = 'JS Task Runner',
		allowedBuiltInModules,
		allowedExternalModules,
	}: JsTaskRunnerOpts) {
		super('javascript', wsUrl, grantToken, maxConcurrency, name);

		const parseModuleAllowList = (moduleList: string) =>
			moduleList === '*' ? null : new Set(moduleList.split(',').map((x) => x.trim()));

		this.requireResolver = createRequireResolver({
			allowedBuiltInModules: parseModuleAllowList(allowedBuiltInModules ?? ''),
			allowedExternalModules: parseModuleAllowList(allowedExternalModules ?? ''),
		});
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
			// Send log output back to the main process. It will take care of forwarding
			// it to the UI or printing to console.
			log: (...args: unknown[]) => {
				const logOutput = args
					.map((arg) => (typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : arg))
					.join(' ');
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
			require: this.requireResolver,
			module: {},
			console: customConsole,

			// Exposed Node.js globals in vm2
			Buffer,
			Function,
			eval,
			setTimeout,
			setInterval,
			setImmediate,
			clearTimeout,
			clearInterval,
			clearImmediate,

			items: inputItems,
			...dataProxy,
			...this.buildRpcCallObject(taskId),
		};

		try {
			const result = (await runInNewContext(
				`globalThis.global = globalThis; module.exports = async function VmCodeWrapper() {${settings.code}\n}()`,
				context,
			)) as TaskResultData['result'];

			if (result === null) {
				return [];
			}

			return validateRunForAllItemsOutput(result);
		} catch (e) {
			// Errors thrown by the VM are not instances of Error, so map them to an ExecutionError
			const error = this.toExecutionErrorIfNeeded(e);

			if (settings.continueOnFail) {
				return [{ json: { error: error.message } }];
			}

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
				require: this.requireResolver,
				module: {},
				console: customConsole,
				item,

				...dataProxy,
				...this.buildRpcCallObject(taskId),
			};

			try {
				let result = (await runInNewContext(
					`module.exports = async function VmCodeWrapper() {${settings.code}\n}()`,
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
			} catch (e) {
				// Errors thrown by the VM are not instances of Error, so map them to an ExecutionError
				const error = this.toExecutionErrorIfNeeded(e);

				if (!settings.continueOnFail) {
					throw error;
				}

				returnData.push({
					json: { error: error.message },
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
			// Make sure that even if we don't receive the envProviderState for
			// whatever reason, we don't expose the task runner's env to the code
			allData.envProviderState ?? {
				env: {},
				isEnvAccessBlocked: false,
				isProcessAvailable: true,
			},
		).getDataProxy();
	}

	private toExecutionErrorIfNeeded(error: unknown): Error {
		if (error instanceof Error) {
			return error;
		}

		if (isErrorLike(error)) {
			return new ExecutionError(error);
		}

		return new ExecutionError({ message: JSON.stringify(error) });
	}
}
