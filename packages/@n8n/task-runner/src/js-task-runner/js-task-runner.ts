import isObject from 'lodash/isObject';
import set from 'lodash/set';
import { DateTime, Duration, Interval } from 'luxon';
import { getAdditionalKeys } from 'n8n-core';
import {
	WorkflowDataProxy,
	Workflow,
	ObservableObject,
	Expression,
	jsonStringify,
} from 'n8n-workflow';
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
	IWorkflowDataProxyData,
} from 'n8n-workflow';
import * as a from 'node:assert';
import { type Context, createContext, runInContext } from 'node:vm';

import type { MainConfig } from '@/config/main-config';
import { UnsupportedFunctionError } from '@/js-task-runner/errors/unsupported-function.error';
import type {
	DataRequestResponse,
	InputDataChunkDefinition,
	PartialAdditionalData,
	TaskResultData,
} from '@/runner-types';
import { EXPOSED_RPC_METHODS, UNSUPPORTED_HELPER_FUNCTIONS } from '@/runner-types';
import { noOp, TaskRunner } from '@/task-runner';
import type { TaskParams } from '@/task-runner';

import { BuiltInsParser } from './built-ins-parser/built-ins-parser';
import { BuiltInsParserState } from './built-ins-parser/built-ins-parser-state';
import { isErrorLike } from './errors/error-like';
import { ExecutionError } from './errors/execution-error';
import { makeSerializable } from './errors/serializable-error';
import { TimeoutError } from './errors/timeout-error';
import type { RequireResolver } from './require-resolver';
import { createRequireResolver } from './require-resolver';
import { DataRequestResponseReconstruct } from '../data-request/data-request-response-reconstruct';

export interface RpcCallObject {
	[name: string]: ((...args: unknown[]) => Promise<unknown>) | RpcCallObject;
}

export interface JSExecSettings {
	code: string;
	// Additional properties to add to the context
	additionalProperties?: Record<string, unknown>;
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

	private readonly mode: 'secure' | 'insecure' = 'secure';

	constructor(config: MainConfig, name = 'JS Task Runner') {
		super({
			taskType: 'javascript',
			name,
			...config.baseRunnerConfig,
		});
		const { jsRunnerConfig } = config;

		const parseModuleAllowList = (moduleList: string) =>
			moduleList === '*'
				? '*'
				: new Set(
						moduleList
							.split(',')
							.map((x) => x.trim())
							.filter((x) => x !== ''),
					);

		const allowedBuiltInModules = parseModuleAllowList(jsRunnerConfig.allowedBuiltInModules ?? '');
		const allowedExternalModules = parseModuleAllowList(
			jsRunnerConfig.allowedExternalModules ?? '',
		);
		this.mode = jsRunnerConfig.insecureMode ? 'insecure' : 'secure';

		this.requireResolver = createRequireResolver({
			allowedBuiltInModules,
			allowedExternalModules,
		});

		if (this.mode === 'secure') this.preventPrototypePollution(allowedExternalModules);
	}

	private preventPrototypePollution(allowedExternalModules: Set<string> | '*') {
		if (allowedExternalModules instanceof Set) {
			// This is a workaround to enable the allowed external libraries to mutate
			// prototypes directly. For example momentjs overrides .toString() directly
			// on the Moment.prototype, which doesn't work if Object.prototype has been
			// frozen. This works as long as the overrides are done when the library is
			// imported.
			for (const module of allowedExternalModules) {
				require(module);
			}
		}

		// Freeze globals, except in tests because Jest needs to be able to mutate prototypes
		if (process.env.NODE_ENV !== 'test') {
			Object.getOwnPropertyNames(globalThis)
				// @ts-expect-error globalThis does not have string in index signature
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				.map((name) => globalThis[name])
				.filter((value) => typeof value === 'function')
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
				.forEach((fn) => Object.freeze(fn.prototype));
		}

		// Freeze internal classes
		[Workflow, Expression, WorkflowDataProxy, DateTime, Interval, Duration]
			.map((constructor) => constructor.prototype)
			.forEach(Object.freeze);
	}

	async executeTask(
		taskParams: TaskParams<JSExecSettings>,
		abortSignal: AbortSignal,
	): Promise<TaskResultData> {
		const { taskId, settings } = taskParams;
		a.ok(settings, 'JS Code not sent to runner');

		this.validateTaskSettings(settings);

		const neededBuiltInsResult = this.builtInsParser.parseUsedBuiltIns(settings.code);
		const neededBuiltIns = neededBuiltInsResult.ok
			? neededBuiltInsResult.result
			: BuiltInsParserState.newNeedsAllDataState();

		const dataResponse = await this.requestData<DataRequestResponse>(
			taskId,
			neededBuiltIns.toDataRequestParams(settings.chunk),
		);

		const data = this.reconstructTaskData(dataResponse, settings.chunk);

		await this.requestNodeTypeIfNeeded(neededBuiltIns, data.workflow, taskId);

		const workflowParams = data.workflow;
		const workflow = new Workflow({
			...workflowParams,
			nodeTypes: this.nodeTypes,
		});

		workflow.staticData = ObservableObject.create(workflow.staticData);

		const result =
			settings.nodeMode === 'runOnceForAllItems'
				? await this.runForAllItems(taskId, settings, data, workflow, abortSignal)
				: await this.runForEachItem(taskId, settings, data, workflow, abortSignal);

		return {
			result,
			customData: data.runExecutionData.resultData.metadata,
			staticData: workflow.staticData.__dataChanged ? workflow.staticData : undefined,
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
			// Exposed Node.js globals
			Buffer,
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
		signal: AbortSignal,
	): Promise<TaskResultData['result']> {
		const dataProxy = this.createDataProxy(data, workflow, data.itemIndex);
		const inputItems = data.connectionInputData;

		const context = this.buildContext(taskId, workflow, data.node, dataProxy, {
			items: inputItems,
			...settings.additionalProperties,
		});

		try {
			const result = await new Promise<TaskResultData['result']>((resolve, reject) => {
				const abortHandler = () => {
					reject(new TimeoutError(this.taskTimeout));
				};

				signal.addEventListener('abort', abortHandler, { once: true });

				let taskResult: Promise<TaskResultData['result']>;

				if (this.mode === 'secure') {
					taskResult = runInContext(this.createVmExecutableCode(settings.code), context, {
						timeout: this.taskTimeout * 1000,
					}) as Promise<TaskResultData['result']>;
				} else {
					taskResult = this.runDirectly<TaskResultData['result']>(settings.code, context);
				}

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

			return result;
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
		signal: AbortSignal,
	): Promise<INodeExecutionData[]> {
		const inputItems = data.connectionInputData;
		const returnData: INodeExecutionData[] = [];

		// If a chunk was requested, only process the items in the chunk
		const chunkStartIdx = settings.chunk ? settings.chunk.startIndex : 0;
		const chunkEndIdx = settings.chunk
			? settings.chunk.startIndex + settings.chunk.count
			: inputItems.length;

		const context = this.buildContext(
			taskId,
			workflow,
			data.node,
			undefined,
			settings.additionalProperties,
		);

		for (let index = chunkStartIdx; index < chunkEndIdx; index++) {
			const dataProxy = this.createDataProxy(data, workflow, index);

			Object.assign(context, dataProxy, { item: inputItems[index] });

			try {
				const result = await new Promise<INodeExecutionData | undefined>((resolve, reject) => {
					const abortHandler = () => {
						reject(new TimeoutError(this.taskTimeout));
					};

					signal.addEventListener('abort', abortHandler);

					let taskResult: Promise<INodeExecutionData>;

					if (this.mode === 'secure') {
						taskResult = runInContext(this.createVmExecutableCode(settings.code), context, {
							timeout: this.taskTimeout * 1000,
						}) as Promise<INodeExecutionData>;
					} else {
						taskResult = this.runDirectly<INodeExecutionData>(settings.code, context);
					}

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

				if (result) {
					let jsonData;
					if (isObject(result) && 'json' in result) {
						jsonData = result.json;
					} else {
						jsonData = result;
					}

					returnData.push(
						result.binary
							? {
									json: jsonData,
									pairedItem: { item: index },
									binary: result.binary,
								}
							: {
									json: jsonData,
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

	private buildRpcCallObject(taskId: string) {
		const rpcObject: RpcCallObject = {};

		for (const rpcMethod of EXPOSED_RPC_METHODS) {
			set(
				rpcObject,
				rpcMethod.split('.'),
				async (...args: unknown[]) => await this.makeRpcCall(taskId, rpcMethod, args),
			);
		}

		for (const rpcMethod of UNSUPPORTED_HELPER_FUNCTIONS) {
			set(rpcObject, rpcMethod.split('.'), () => {
				throw new UnsupportedFunctionError(rpcMethod);
			});
		}

		return rpcObject;
	}

	private buildCustomConsole(taskId: string): CustomConsole {
		return {
			// all except `log` are dummy methods that disregard without throwing, following existing Code node behavior
			...Object.keys(console).reduce<Record<string, () => void>>((acc, name) => {
				acc[name] = noOp;
				return acc;
			}, {}),

			// Send log output back to the main process. It will take care of forwarding
			// it to the UI or printing to console.
			log: (...args: unknown[]) => {
				const formattedLogArgs = args.map((arg) => {
					if (isObject(arg) && '__isExecutionContext' in arg) return '[[ExecutionContext]]';
					if (typeof arg === 'string') return `'${arg}'`;
					return jsonStringify(arg, { replaceCircularRefs: true });
				});
				void this.makeRpcCall(taskId, 'logNodeOutput', formattedLogArgs);
			},
		};
	}

	/**
	 * Builds the 'global' context object that is passed to the script
	 *
	 * @param taskId The ID of the task. Needed for RPC calls
	 * @param workflow The workflow that is being executed. Needed for static data
	 * @param node The node that is being executed. Needed for static data
	 * @param dataProxy The data proxy object that provides access to built-ins
	 * @param additionalProperties Additional properties to add to the context
	 */
	buildContext(
		taskId: string,
		workflow: Workflow,
		node: INode,
		dataProxy?: IWorkflowDataProxyData,
		additionalProperties: Record<string, unknown> = {},
	): Context {
		return createContext({
			__isExecutionContext: true,
			require: this.requireResolver,
			module: {},
			console: this.buildCustomConsole(taskId),
			$getWorkflowStaticData: (type: 'global' | 'node') => workflow.getStaticData(type, node),
			...this.getNativeVariables(),
			...dataProxy,
			...this.buildRpcCallObject(taskId),
			...additionalProperties,
		});
	}

	private createVmExecutableCode(code: string) {
		return [
			// shim for `global` compatibility
			'globalThis.global = globalThis',

			// prevent prototype manipulation
			'Object.getPrototypeOf = () => ({})',
			'Reflect.getPrototypeOf = () => ({})',
			'Object.setPrototypeOf = () => false',
			'Reflect.setPrototypeOf = () => false',

			// wrap user code
			`module.exports = async function VmCodeWrapper() {${code}\n}()`,
		].join('; ');
	}

	private async runDirectly<T>(code: string, context: Context): Promise<T> {
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const fn = new Function(
			'context',
			`with(context) { return (async function() {${code}\n})(); }`,
		);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
		return await fn(context);
	}
}
