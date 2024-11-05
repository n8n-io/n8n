import { getAdditionalKeys } from 'n8n-core';
import {
	WorkflowDataProxy,
	// type IWorkflowDataProxyAdditionalKeys,
	Workflow,
} from 'n8n-workflow';
import type {
	CodeExecutionMode,
	INode,
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
	INodeTypeDescription,
} from 'n8n-workflow';
import * as a from 'node:assert';
import { runInNewContext, type Context } from 'node:vm';

import type { TaskResultData } from '@/runner-types';
import { type Task, TaskRunner } from '@/task-runner';

import { BuiltInsParser } from './built-ins-parser/built-ins-parser';
import { BuiltInsParserState } from './built-ins-parser/built-ins-parser-state';
import { isErrorLike } from './errors/error-like';
import { ExecutionError } from './errors/execution-error';
import { makeSerializable } from './errors/serializable-error';
import type { RequireResolver } from './require-resolver';
import { createRequireResolver } from './require-resolver';
import { validateRunForAllItemsOutput, validateRunForEachItemOutput } from './result-validation';
import type { MainConfig } from '../config/main-config';

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

export interface DataRequestResponse {
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

export interface NodeTypesResponse {
	nodeTypes: INodeTypeDescription[];
}

type CustomConsole = {
	log: (...args: unknown[]) => void;
};

export class JsTaskRunner extends TaskRunner {
	private readonly requireResolver: RequireResolver;

	private readonly builtInsParser = new BuiltInsParser();

	constructor(config: MainConfig, name = 'JS Task Runner') {
		super({
			taskType: 'javascript',
			name,
			...config.baseRunnerConfig,
		});
		const { jsRunnerConfig } = config;

		const parseModuleAllowList = (moduleList: string) =>
			moduleList === '*' ? null : new Set(moduleList.split(',').map((x) => x.trim()));

		this.requireResolver = createRequireResolver({
			allowedBuiltInModules: parseModuleAllowList(jsRunnerConfig.allowedBuiltInModules ?? ''),
			allowedExternalModules: parseModuleAllowList(jsRunnerConfig.allowedExternalModules ?? ''),
		});
	}

	async executeTask(task: Task<JSExecSettings>): Promise<TaskResultData> {
		const settings = task.settings;
		a.ok(settings, 'JS Code not sent to runner');

		const neededBuiltInsResult = this.builtInsParser.parseUsedBuiltIns(settings.code);
		const neededBuiltIns = neededBuiltInsResult.ok
			? neededBuiltInsResult.result
			: BuiltInsParserState.newNeedsAllDataState();

		const data = await this.requestData<DataRequestResponse>(
			task.taskId,
			neededBuiltIns.toDataRequestParams(),
		);

		const nodeTypesInWorkflow = data.workflow.nodes.map((node) => ({
			name: node.type,
			version: node.typeVersion,
		}));

		const unknownNodeTypes = this.nodeTypes.filterOutKnown(nodeTypesInWorkflow);

		const nodeTypes = await this.requestNodeTypes<INodeTypeDescription[]>(
			task.taskId,
			unknownNodeTypes,
		);

		this.nodeTypes.addNodeTypeDescriptions(nodeTypes);

		const workflowParams = data.workflow;
		const workflow = new Workflow({
			...workflowParams,
			nodeTypes: this.nodeTypes,
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
				? await this.runForAllItems(task.taskId, settings, data, workflow, customConsole)
				: await this.runForEachItem(task.taskId, settings, data, workflow, customConsole);

		return {
			result,
			customData: data.runExecutionData.resultData.metadata,
		};
	}

	private getNativeVariables() {
		return {
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

			// Missing JS natives
			btoa,
			atob,
			TextDecoder,
			TextDecoderStream,
			TextEncoder,
			TextEncoderStream,
			FormData,
		};
	}

	/**
	 * Executes the requested code for all items in a single run
	 */
	private async runForAllItems(
		taskId: string,
		settings: JSExecSettings,
		data: DataRequestResponse,
		workflow: Workflow,
		customConsole: CustomConsole,
	): Promise<INodeExecutionData[]> {
		const dataProxy = this.createDataProxy(data, workflow, data.itemIndex);
		const inputItems = data.connectionInputData;

		const context: Context = {
			require: this.requireResolver,
			module: {},
			console: customConsole,
			items: inputItems,

			...this.getNativeVariables(),
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
		data: DataRequestResponse,
		workflow: Workflow,
		customConsole: CustomConsole,
	): Promise<INodeExecutionData[]> {
		const inputItems = data.connectionInputData;
		const returnData: INodeExecutionData[] = [];

		for (let index = 0; index < inputItems.length; index++) {
			const item = inputItems[index];
			const dataProxy = this.createDataProxy(data, workflow, index);
			const context: Context = {
				require: this.requireResolver,
				module: {},
				console: customConsole,
				item,

				...this.getNativeVariables(),
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

	private createDataProxy(data: DataRequestResponse, workflow: Workflow, itemIndex: number) {
		return new WorkflowDataProxy(
			workflow,
			data.runExecutionData,
			data.runIndex,
			itemIndex,
			data.activeNodeName,
			data.connectionInputData,
			data.siblingParameters,
			data.mode,
			getAdditionalKeys(
				data.additionalData as IWorkflowExecuteAdditionalData,
				data.mode,
				data.runExecutionData,
			),
			data.executeData,
			data.defaultReturnRunIndex,
			data.selfData,
			data.contextNodeName,
			// Make sure that even if we don't receive the envProviderState for
			// whatever reason, we don't expose the task runner's env to the code
			data.envProviderState ?? {
				env: {},
				isEnvAccessBlocked: false,
				isProcessAvailable: true,
			},
			// Because we optimize the needed data, it can be partially available.
			// We assign the available built-ins to the execution context, which
			// means we run the getter for '$json', and by default $json throws
			// if there is no data available.
		).getDataProxy({ throwOnMissingExecutionData: false });
	}

	private toExecutionErrorIfNeeded(error: unknown): Error {
		if (error instanceof Error) {
			return makeSerializable(error);
		}

		if (isErrorLike(error)) {
			return new ExecutionError(error);
		}

		return new ExecutionError({ message: JSON.stringify(error) });
	}
}
