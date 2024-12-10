import { getAdditionalKeys } from 'n8n-core';
import { WorkflowDataProxy, Workflow } from 'n8n-workflow';
import type {
	CodeExecutionMode,
	IWorkflowExecuteAdditionalData,
	IDataObject,
	INodeExecutionData,
	INodeParameters,
	WorkflowExecuteMode,
	WorkflowParameters,
	ITaskDataConnections,
	INode,
	IRunExecutionData,
	EnvProviderState,
	IExecuteData,
	INodeTypeDescription,
} from 'n8n-workflow';
import * as a from 'node:assert';
import { runInNewContext, type Context } from 'node:vm';

import type { MainConfig } from '@/config/main-config';
import type {
	DataRequestResponse,
	InputDataChunkDefinition,
	PartialAdditionalData,
	TaskResultData,
} from '@/runner-types';
import { type Task, TaskRunner } from '@/task-runner';

import { BuiltInsParser } from './built-ins-parser/built-ins-parser';
import { BuiltInsParserState } from './built-ins-parser/built-ins-parser-state';
import { isErrorLike } from './errors/error-like';
import { ExecutionError } from './errors/execution-error';
import { makeSerializable } from './errors/serializable-error';
import { TimeoutError } from './errors/timeout-error';
import type { RequireResolver } from './require-resolver';
import { createRequireResolver } from './require-resolver';
import { validateRunForAllItemsOutput, validateRunForEachItemOutput } from './result-validation';
import { DataRequestResponseReconstruct } from '../data-request/data-request-response-reconstruct';

export interface JSExecSettings {
	code: string;
	nodeMode: CodeExecutionMode;
	workflowMode: WorkflowExecuteMode;
	continueOnFail: boolean;
	// For executing partial input data
	chunk?: InputDataChunkDefinition;
}

export interface JsTaskData {
	workflow: Omit<WorkflowParameters, 'nodeTypes'>;
	inputData: ITaskDataConnections;
	connectionInputData: INodeExecutionData[];
	node: INode;

	runExecutionData: IRunExecutionData;
	runIndex: number;
	itemIndex: number;
	activeNodeName: string;
	siblingParameters: INodeParameters;
	mode: WorkflowExecuteMode;
	envProviderState: EnvProviderState;
	executeData?: IExecuteData;
	defaultReturnRunIndex: number;
	selfData: IDataObject;
	contextNodeName: string;
	additionalData: PartialAdditionalData;
}

type CustomConsole = {
	log: (...args: unknown[]) => void;
};

export class JsTaskRunner extends TaskRunner {
	private readonly requireResolver: RequireResolver;

	private readonly builtInsParser = new BuiltInsParser();

	private readonly taskDataReconstruct = new DataRequestResponseReconstruct();

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

	async executeTask(task: Task<JSExecSettings>, signal: AbortSignal): Promise<TaskResultData> {
		const settings = task.settings;
		a.ok(settings, 'JS Code not sent to runner');

		this.validateTaskSettings(settings);

		const neededBuiltInsResult = this.builtInsParser.parseUsedBuiltIns(settings.code);
		const neededBuiltIns = neededBuiltInsResult.ok
			? neededBuiltInsResult.result
			: BuiltInsParserState.newNeedsAllDataState();

		const dataResponse = await this.requestData<DataRequestResponse>(
			task.taskId,
			neededBuiltIns.toDataRequestParams(settings.chunk),
		);

		const data = this.reconstructTaskData(dataResponse, settings.chunk);

		await this.requestNodeTypeIfNeeded(neededBuiltIns, data.workflow, task.taskId);

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
				? await this.runForAllItems(task.taskId, settings, data, workflow, customConsole, signal)
				: await this.runForEachItem(task.taskId, settings, data, workflow, customConsole, signal);

		return {
			result,
			customData: data.runExecutionData.resultData.metadata,
		};
	}

	private validateTaskSettings(settings: JSExecSettings) {
		a.ok(settings.code, 'No code to execute');

		if (settings.nodeMode === 'runOnceForAllItems') {
			a.ok(settings.chunk === undefined, 'Chunking is not supported for runOnceForAllItems');
		}
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
		data: JsTaskData,
		workflow: Workflow,
		customConsole: CustomConsole,
		signal: AbortSignal,
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
			const result = await new Promise<TaskResultData['result']>((resolve, reject) => {
				const abortHandler = () => {
					reject(new TimeoutError(this.taskTimeout));
				};

				signal.addEventListener('abort', abortHandler, { once: true });

				const taskResult = runInNewContext(
					`globalThis.global = globalThis; module.exports = async function VmCodeWrapper() {${settings.code}\n}()`,
					context,
					{ timeout: this.taskTimeout * 1000 },
				) as Promise<TaskResultData['result']>;

				void taskResult
					.then(resolve)
					.catch(reject)
					.finally(() => {
						signal.removeEventListener('abort', abortHandler);
					});
			});

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
		data: JsTaskData,
		workflow: Workflow,
		customConsole: CustomConsole,
		signal: AbortSignal,
	): Promise<INodeExecutionData[]> {
		const inputItems = data.connectionInputData;
		const returnData: INodeExecutionData[] = [];

		// If a chunk was requested, only process the items in the chunk
		const chunkStartIdx = settings.chunk ? settings.chunk.startIndex : 0;
		const chunkEndIdx = settings.chunk
			? settings.chunk.startIndex + settings.chunk.count
			: inputItems.length;

		for (let index = chunkStartIdx; index < chunkEndIdx; index++) {
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
				let result = await new Promise<INodeExecutionData | undefined>((resolve, reject) => {
					const abortHandler = () => {
						reject(new TimeoutError(this.taskTimeout));
					};

					signal.addEventListener('abort', abortHandler);

					const taskResult = runInNewContext(
						`module.exports = async function VmCodeWrapper() {${settings.code}\n}()`,
						context,
						{ timeout: this.taskTimeout * 1000 },
					) as Promise<INodeExecutionData>;

					void taskResult
						.then(resolve)
						.catch(reject)
						.finally(() => {
							signal.removeEventListener('abort', abortHandler);
						});
				});

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

	private createDataProxy(data: JsTaskData, workflow: Workflow, itemIndex: number) {
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

	private reconstructTaskData(
		response: DataRequestResponse,
		chunk?: InputDataChunkDefinition,
	): JsTaskData {
		const inputData = this.taskDataReconstruct.reconstructConnectionInputItems(
			response.inputData,
			chunk,
			// This type assertion is intentional. Chunking is only supported in
			// runOnceForEachItem mode and if a chunk was requested, we intentionally
			// fill the array with undefined values for the items outside the chunk.
			// We only iterate over the chunk items but WorkflowDataProxy expects
			// the full array of items.
		) as INodeExecutionData[];

		return {
			...response,
			connectionInputData: inputData,
			executeData: this.taskDataReconstruct.reconstructExecuteData(response, inputData),
		};
	}

	private async requestNodeTypeIfNeeded(
		neededBuiltIns: BuiltInsParserState,
		workflow: JsTaskData['workflow'],
		taskId: string,
	) {
		/**
		 * We request node types only when we know a task needs all nodes, because
		 * needing all nodes means that the task relies on paired item functionality,
		 * which is the same requirement for needing node types.
		 */
		if (neededBuiltIns.needsAllNodes) {
			const uniqueNodeTypes = new Map(
				workflow.nodes.map((node) => [
					`${node.type}|${node.typeVersion}`,
					{ name: node.type, version: node.typeVersion },
				]),
			);

			const unknownNodeTypes = this.nodeTypes.onlyUnknown([...uniqueNodeTypes.values()]);

			const nodeTypes = await this.requestNodeTypes<INodeTypeDescription[]>(
				taskId,
				unknownNodeTypes,
			);

			this.nodeTypes.addNodeTypeDescriptions(nodeTypes);
		}
	}
}
