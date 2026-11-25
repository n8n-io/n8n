import type { CodeTaskInput, CodeTaskUserError } from '@n8n/code-task-contract';
import { createResultError, createResultOk, type Result } from '@n8n/utils/result';

import { createTaskContext, runInTaskContext } from './task-context';
import type { TaskConsole } from './task-console';
import { createTaskData, type TaskData } from './task-data';
import { toUserError } from './task-error';

export type TaskOutcome = Result<unknown, CodeTaskUserError | Error>;

const isObject = (value: unknown): value is Record<string, unknown> =>
	(typeof value === 'object' && value !== null) || typeof value === 'function';

/** Output item of the code for one input item, as the task runner builds it. */
function toOutputItem(result: unknown, itemIndex: number) {
	const pairedItem = { item: itemIndex };
	if (!isObject(result)) return { json: result, pairedItem };

	const json = 'json' in result ? result.json : 'binary' in result ? (result.json ?? {}) : result;

	return result.binary ? { json, pairedItem, binary: result.binary } : { json, pairedItem };
}

async function runOnceForAllItems(
	input: CodeTaskInput,
	taskData: TaskData,
	console: TaskConsole['console'],
): Promise<TaskOutcome> {
	const context = createTaskContext({
		console,
		...taskData.getBuiltIns(input.data.itemIndex),
		items: taskData.items,
		...input.additionalProperties,
	});

	try {
		const result = await runInTaskContext(input.code, context);
		return createResultOk(result === null ? [] : result);
	} catch (e) {
		const error = toUserError(e);
		if (!input.continueOnFail) return createResultError(error);

		return createResultOk([{ json: { error: error.message } }]);
	}
}

async function runOnceForEachItem(
	input: CodeTaskInput,
	taskData: TaskData,
	console: TaskConsole['console'],
): Promise<TaskOutcome> {
	const { items } = taskData;
	const start = input.chunk?.startIndex ?? 0;
	const end = input.chunk ? start + input.chunk.count : items.length;
	const context = createTaskContext({ console, ...input.additionalProperties });
	const outputItems: unknown[] = [];

	for (let index = start; index < end; index++) {
		Object.assign(context, taskData.getBuiltIns(index), { item: items[index] });

		try {
			const result = await runInTaskContext(input.code, context);
			if (result) outputItems.push(toOutputItem(result, index));
		} catch (e) {
			const error = toUserError(e);
			if (!input.continueOnFail) return createResultError(error);

			outputItems.push({ json: { error: error.message }, pairedItem: { item: index } });
		}
	}

	return createResultOk(outputItems);
}

/**
 * Runs the code of a task once for all items, or once for each item, as the
 * Code node mode says. A failed task returns the user error, unless the task
 * continues on fail.
 */
export async function runTask(
	input: CodeTaskInput,
	console: TaskConsole['console'],
): Promise<TaskOutcome> {
	const taskData = createTaskData(input);

	return input.nodeMode === 'runOnceForAllItems'
		? await runOnceForAllItems(input, taskData, console)
		: await runOnceForEachItem(input, taskData, console);
}
