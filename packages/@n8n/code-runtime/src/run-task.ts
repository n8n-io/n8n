import type {
	DataRequestResponse,
	InputDataChunkDefinition,
	JSExecSettings,
	JsTaskData,
	TaskResultData,
} from '@n8n/task-runner';
import isObject from 'lodash/isObject';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import type {
	INodeExecutionData,
	IWorkflowDataProxyData,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { Workflow, WorkflowDataProxy } from 'n8n-workflow';

import { toExecutionError } from './errors';
import { getAdditionalKeys } from './vendor/additional-keys';
import { DataRequestResponseReconstruct } from './vendor/data-request-response-reconstruct';
import { TaskRunnerNodeTypes } from './vendor/node-types';
import type { HelperState } from './helpers';
import { buildHelpers } from './helpers';
import type { CodeTaskFile, CodeTaskResultFile, RpcCaller, WorkerTimings } from './types';

export interface RunTaskResult {
	resultFile: CodeTaskResultFile;
	timings: WorkerTimings;
}

type UserFunction = () => Promise<unknown>;

/**
 * The `require` that user code gets. A worker that starts from a V8 startup
 * snapshot sets one that resolves modules from the runtime folder.
 */
let userRequire: NodeJS.Require = require;

export function setUserRequire(fn: NodeJS.Require) {
	userRequire = fn;
}

/**
 * Compiles user code to an async function in the global scope. The wrapper and
 * the script name match the `node:vm` wrapper of the JS task runner, so stack
 * frames show `evalmachine.<anonymous>:<line>` with the same line numbers.
 */
export function compileUserCode(code: string): UserFunction {
	const source = `(async function VmCodeWrapper() {${code}\n})\n//# sourceURL=evalmachine.<anonymous>`;
	// Indirect eval: global scope, sloppy mode, line 1 is the first user line.
	return (0, eval)(source) as UserFunction;
}

/**
 * Where a task finds its built-ins (`$input`, `items`, `helpers`, ...).
 *
 * - Global: on `globalThis`. For a worker that runs one task.
 * - Task: on a scope object of the task. The user code runs in a `with` block
 *   on that object, and `this` is the object. Its prototype is `globalThis`,
 *   so all globals stay visible. For the shared worker, which runs tasks at
 *   the same time.
 */
interface TaskScope {
	set(values: Record<string, unknown>): void;
	compile(code: string): UserFunction;
	thisArg: object;
}

function globalScope(): TaskScope {
	return {
		set(values) {
			for (const [key, value] of Object.entries(values)) {
				(globalThis as Record<string, unknown>)[key] = value;
			}
		},
		compile: compileUserCode,
		thisArg: globalThis,
	};
}

function taskScope(): TaskScope {
	const scope = Object.create(globalThis) as Record<string, unknown>;
	return {
		set(values) {
			Object.assign(scope, values);
		},
		compile: (code) => compileScopedUserCode(code, scope),
		thisArg: scope,
	};
}

/**
 * Like `compileUserCode`, but names resolve on `scope` first. The wrapper is on
 * the first line, so the line numbers stay the same.
 */
export function compileScopedUserCode(code: string, scope: object): UserFunction {
	const source = `(function (__n8nTaskScope) { with (__n8nTaskScope) { return async function VmCodeWrapper() {${code}\n} } })\n//# sourceURL=evalmachine.<anonymous>`;
	const factory = (0, eval)(source) as (scope: object) => UserFunction;
	return factory(scope);
}

export interface RunTaskOptions {
	/** Keep the built-ins of the task off `globalThis` (shared worker). */
	isolateScope?: boolean;
}

/** Runs the task in `dir`. Reads `in/task.json`. Does not write outputs. */
export async function runTask(
	dir: string,
	rpc: RpcCaller,
	options: RunTaskOptions = {},
): Promise<RunTaskResult> {
	const scope = options.isolateScope ? taskScope() : globalScope();
	const t0 = performance.now();
	const task = JSON.parse(
		await readFile(path.join(dir, 'in', 'task.json'), 'utf-8'),
	) as CodeTaskFile;
	const tRead = performance.now();

	const state: HelperState = { binaryReads: 0, rpcCount: 0, outputBinaries: {} };
	const { settings } = task;
	if (!settings?.code) throw new Error('No code to execute');

	let inputItems: Array<INodeExecutionData | undefined> = [];
	const helpers = buildHelpers({
		dir,
		rpc,
		binaries: task.binaries ?? [],
		inputItems: () => inputItems,
		state,
	});

	const baseGlobals: Record<string, unknown> = {
		__isExecutionContext: true,
		require: userRequire,
		module: { exports: {} },
		helpers,
	};

	if (settings.nodeMode === 'runCode') {
		scope.set({ ...baseGlobals, ...settings.additionalProperties });
		const fn = scope.compile(settings.code);
		const tBuild = performance.now();
		let result: unknown;
		try {
			result = await fn.call(scope.thisArg);
		} catch (e) {
			throw toExecutionError(e);
		}
		return {
			resultFile: { result, binaries: state.outputBinaries },
			timings: timings(t0, tRead, tBuild, performance.now(), state),
		};
	}

	if (!task.data) throw new Error('Task has no data');
	const data = reconstructTaskData(task.data, settings.chunk);
	inputItems = data.connectionInputData;
	const nodeTypes = new TaskRunnerNodeTypes(task.nodeTypes ?? []);
	const workflow = new Workflow({ ...data.workflow, nodeTypes });
	const fn = scope.compile(settings.code);

	scope.set({
		...baseGlobals,
		$getWorkflowStaticData: (type: 'global' | 'node') => workflow.getStaticData(type, data.node),
	});
	const tBuild = performance.now();

	const result =
		settings.nodeMode === 'runOnceForAllItems'
			? await runForAllItems(fn, scope, settings, data, workflow)
			: await runForEachItem(fn, scope, settings, data, workflow);

	return {
		resultFile: {
			result,
			customData: data.runExecutionData.resultData.metadata,
			staticData: workflow.staticData.__dataChanged ? workflow.staticData : undefined,
			binaries: state.outputBinaries,
		},
		timings: timings(t0, tRead, tBuild, performance.now(), state),
	};
}

function timings(
	t0: number,
	tRead: number,
	tBuild: number,
	tRun: number,
	state: HelperState,
): WorkerTimings {
	return {
		read: Math.round(tRead - t0),
		build: Math.round(tBuild - tRead),
		run: Math.round(tRun - tBuild),
		binaryReads: state.binaryReads,
		rpcCount: state.rpcCount,
	};
}

function reconstructTaskData(
	response: DataRequestResponse,
	chunk?: InputDataChunkDefinition,
): JsTaskData {
	const reconstruct = new DataRequestResponseReconstruct();
	const inputData = reconstruct.reconstructConnectionInputItems(
		response.inputData,
		chunk,
	) as INodeExecutionData[];
	return {
		...response,
		connectionInputData: inputData,
		executeData: reconstruct.reconstructExecuteData(response, inputData),
	};
}

function createDataProxy(
	data: JsTaskData,
	workflow: Workflow,
	itemIndex: number,
): IWorkflowDataProxyData {
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
		data.envProviderState ?? { env: {}, isEnvAccessBlocked: false, isProcessAvailable: true },
	).getDataProxy({ throwOnMissingExecutionData: false });
}

async function runForAllItems(
	fn: UserFunction,
	scope: TaskScope,
	settings: JSExecSettings,
	data: JsTaskData,
	workflow: Workflow,
): Promise<TaskResultData['result']> {
	const dataProxy = createDataProxy(data, workflow, data.itemIndex);
	scope.set({ ...dataProxy, items: data.connectionInputData, ...settings.additionalProperties });
	try {
		const result = await fn.call(scope.thisArg);
		return result === null ? [] : result;
	} catch (e) {
		const error = toExecutionError(e);
		if (settings.continueOnFail) return [{ json: { error: error.message } }];
		throw error;
	}
}

function extractJsonData(result: INodeExecutionData) {
	if (!isObject(result)) return result;
	if ('json' in result) return result.json;
	if ('binary' in result) return (result as INodeExecutionData).json ?? {};
	return result;
}

async function runForEachItem(
	fn: UserFunction,
	scope: TaskScope,
	settings: JSExecSettings,
	data: JsTaskData,
	workflow: Workflow,
): Promise<INodeExecutionData[]> {
	const inputItems = data.connectionInputData;
	const returnData: INodeExecutionData[] = [];
	const start = settings.chunk ? settings.chunk.startIndex : 0;
	const end = settings.chunk ? settings.chunk.startIndex + settings.chunk.count : inputItems.length;

	scope.set({ ...settings.additionalProperties });
	for (let index = start; index < end; index++) {
		const dataProxy = createDataProxy(data, workflow, index);
		scope.set({ ...dataProxy, item: inputItems[index] });
		try {
			const result = (await fn.call(scope.thisArg)) as INodeExecutionData | null | undefined;
			if (result === null) continue;
			if (result) {
				const json = extractJsonData(result);
				returnData.push(
					result.binary
						? { json, pairedItem: { item: index }, binary: result.binary }
						: { json, pairedItem: { item: index } },
				);
			}
		} catch (e) {
			// No item index: the task runner does not add one either.
			const error = toExecutionError(e);
			if (!settings.continueOnFail) throw error;
			returnData.push({ json: { error: error.message }, pairedItem: { item: index } });
		}
	}
	return returnData;
}
