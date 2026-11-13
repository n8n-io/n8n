/**
 * The JavaScript task runner of the host. Nodes that run code through n8n's
 * `JsTaskRunnerSandbox` (Code tools, AI Transform, Sort by code) call
 * `startRunnerTask` with a job of type `javascript`. n8n sends the job to its
 * task runner process. The host runs the code in its own code runner
 * (`code-step.ts`) instead, with the names of n8n's runner: `items`, `$input`,
 * `$json`, `$binary`, and the additional properties of the job.
 */
import type { INodeExecutionData } from 'n8n-workflow';

import type { CodeStepOptions } from './code-step';
import { messageOf, runCodeStepAsync } from './code-step';
import { isJsonObject, type JsonObject, type JsonValue } from './protocol';

type NodeMode = 'runOnceForAllItems' | 'runOnceForEachItem' | 'runCode';

export interface JsTaskSettings {
	code: string;
	nodeMode: NodeMode;
	chunk?: { startIndex: number; count: number };
	additionalProperties: Record<string, JsonValue>;
}

export type JsTaskResult =
	| { ok: true; result: JsonValue }
	| { ok: false; error: { message: string } };

export class TaskSettingsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TaskSettingsError';
	}
}

const NODE_MODES: readonly string[] = ['runOnceForAllItems', 'runOnceForEachItem', 'runCode'];

function isNodeMode(value: unknown): value is NodeMode {
	return typeof value === 'string' && NODE_MODES.includes(value);
}

/** A copy of the value as JSON. Values that are not JSON (functions, dates) take their JSON form. */
function toJson(value: unknown): JsonValue | undefined {
	if (value === undefined) return undefined;
	const text = JSON.stringify(value);
	if (text === undefined) return undefined;
	const parsed: JsonValue = JSON.parse(text);
	return parsed;
}

/** Reads the settings of a `javascript` job of `JsTaskRunnerSandbox`. */
export function parseJsTaskSettings(settings: unknown): JsTaskSettings {
	if (typeof settings !== 'object' || settings === null) {
		throw new TaskSettingsError('The task settings must be an object');
	}
	const code: unknown = Reflect.get(settings, 'code');
	const nodeMode: unknown = Reflect.get(settings, 'nodeMode');
	if (typeof code !== 'string') throw new TaskSettingsError('The task has no code');
	if (!isNodeMode(nodeMode)) {
		throw new TaskSettingsError(`The node mode ${String(nodeMode)} is not known`);
	}
	const chunk: unknown = Reflect.get(settings, 'chunk');
	const startIndex: unknown =
		typeof chunk === 'object' && chunk !== null ? Reflect.get(chunk, 'startIndex') : undefined;
	const count: unknown =
		typeof chunk === 'object' && chunk !== null ? Reflect.get(chunk, 'count') : undefined;
	const extra = toJson(Reflect.get(settings, 'additionalProperties'));
	return {
		code,
		nodeMode,
		...(typeof startIndex === 'number' && typeof count === 'number'
			? { chunk: { startIndex, count } }
			: {}),
		additionalProperties: isJsonObject(extra) ? extra : {},
	};
}

/** An n8n item as a code step item: the JSON, with the binary data in `$binary`. */
function toCodeItem(item: INodeExecutionData): JsonObject {
	const json = toJson(item.json);
	const out: JsonObject = isJsonObject(json) ? { ...json } : {};
	const binary = toJson(item.binary);
	if (isJsonObject(binary) && Object.keys(binary).length > 0) out.$binary = binary;
	return out;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * The body of the code step. It gives the names of n8n's runner and returns the
 * result in one item `{ __wfValue }`, so the host gets the value as it is.
 */
export function taskBody(settings: JsTaskSettings): string {
	const extras = Object.entries(settings.additionalProperties)
		// `items` of the job are the input items, which the body gives already.
		.filter(([key]) => key !== 'items' && IDENTIFIER.test(key))
		.map(([key, value]) => `const ${key} = ${JSON.stringify(value)};\n`)
		.join('');
	const prologue = `const __wrap = (j) => {
	if (j !== null && typeof j === 'object' && j.$binary) {
		const { $binary, ...json } = j;
		return { json, binary: $binary };
	}
	return { json: j };
};
items = items.map(__wrap);
${extras}`;
	const done = 'return [{ __wfValue: __value === undefined ? null : __value }];';
	if (settings.nodeMode === 'runOnceForEachItem') {
		const start = settings.chunk?.startIndex ?? 0;
		const count = settings.chunk?.count ?? Number.MAX_SAFE_INTEGER;
		return `${prologue}const __value = [];
const __end = Math.min(items.length, ${start} + ${count});
for (let $itemIndex = ${start}; $itemIndex < __end; $itemIndex++) {
	const item = items[$itemIndex];
	const $json = item.json;
	const $binary = item.binary;
	const $input = { item, all: () => items, first: () => items[0], last: () => items[items.length - 1] };
	const __result = await (async () => {
${settings.code}
	})();
	// As n8n's runner: an item without a result gives no output.
	if (__result !== undefined && __result !== null) __value.push(__result);
}
${done}
`;
	}
	return `${prologue}const $input = { all: () => items, first: () => items[0], last: () => items[items.length - 1], item: items[0] };
const $json = items[0]?.json;
const $binary = items[0]?.binary;
const __value = await (async () => {
${settings.code}
})();
${done}
`;
}

/**
 * Runs a `javascript` job in the host's code runner. The result has the form
 * of n8n's task runner: `{ ok, result }` or `{ ok: false, error }`.
 */
export async function runJsTask(
	settings: unknown,
	items: INodeExecutionData[],
	context: { name: string; timezone?: string },
	options: CodeStepOptions = {},
): Promise<JsTaskResult> {
	try {
		const parsed = parseJsTaskSettings(settings);
		const out = await runCodeStepAsync(
			{
				name: context.name,
				code: taskBody(parsed),
				items: items.map(toCodeItem),
				...(context.timezone ? { timezone: context.timezone } : {}),
			},
			options,
		);
		const first = out[0];
		const value = first === undefined ? null : first.__wfValue;
		return { ok: true, result: value === undefined ? null : value };
	} catch (error) {
		return { ok: false, error: { message: messageOf(error) } };
	}
}
