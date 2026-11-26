import {
	CODE_TASK_CONTRACT_VERSION,
	parseCodeTaskInput,
	TASK_INPUT_PATH,
	TASK_RESULT_PATH,
	type CodeTaskConsoleOutput,
	type CodeTaskInput,
	type CodeTaskUserError,
} from '@n8n/code-task-contract';
import { isRecord } from '@n8n/utils/is-record';
import { readFile, writeFile } from 'node:fs/promises';
import { Socket } from 'node:net';
import { join } from 'node:path';
import type { Duplex } from 'node:stream';

import {
	parseStartMessage,
	serializeMessage,
	type RuntimeMessage,
	type StartMessage,
} from './control-protocol';
import { runTask, type TaskOutcome } from './run-task';
import { createTaskConsole } from './task-console';

const CONTROL_FD = 3;

/** A value from user code can throw on any access, so this never throws. */
function errorMessage(error: unknown): string {
	try {
		const message: unknown = error instanceof Error ? error.message : String(error);
		return typeof message === 'string' ? message : 'Unknown error';
	} catch {
		return 'Unknown error';
	}
}

const isOptionalInt = (value: unknown) => value === undefined || Number.isSafeInteger(value);

/** Checks the fields of a user error that n8n reads. n8n keeps the other fields as they are. */
function isUserError(value: unknown): value is CodeTaskUserError {
	return (
		isRecord(value) &&
		typeof value.message === 'string' &&
		(value.description === undefined ||
			value.description === null ||
			typeof value.description === 'string') &&
		(value.stack === undefined || typeof value.stack === 'string') &&
		isOptionalInt(value.lineNumber) &&
		isOptionalInt(value.itemIndex) &&
		(value.context === undefined || isRecord(value.context))
	);
}

/** The error as JSON holds it, e.g. through the `toJSON` of an n8n error. */
function toPlainError(error: CodeTaskUserError | Error): CodeTaskUserError {
	// eslint-disable-next-line n8n-local-rules/no-json-parse-json-stringify -- deepCopy keeps values that JSON drops
	const json: unknown = JSON.parse(JSON.stringify(error));
	return isUserError(json) ? json : { message: errorMessage(error) };
}

async function readTaskInput(dir: string): Promise<CodeTaskInput> {
	const file: unknown = JSON.parse(await readFile(join(dir, 'in', TASK_INPUT_PATH), 'utf8'));
	const parsed = parseCodeTaskInput(file);
	if (!parsed.ok) throw parsed.error;

	return parsed.result;
}

type ResultFile = { content: string; error?: CodeTaskUserError };

function errorResultFile(error: CodeTaskUserError, console: CodeTaskConsoleOutput): ResultFile {
	const result = { version: CODE_TASK_CONTRACT_VERSION, status: 'error', error, console };
	return { content: JSON.stringify(result), error };
}

function toResultFile(outcome: TaskOutcome, console: CodeTaskConsoleOutput): ResultFile {
	try {
		if (!outcome.ok) return errorResultFile(toPlainError(outcome.error), console);

		const result = {
			version: CODE_TASK_CONTRACT_VERSION,
			status: 'success',
			result: outcome.result,
			console,
		};
		return { content: JSON.stringify(result) };
	} catch (e) {
		// The result holds a value that JSON cannot hold, e.g. a circular object or a BigInt
		return errorResultFile({ message: errorMessage(e) }, console);
	}
}

/** The daemon sends a small result inline, and n8n downloads a large one. */
async function runTaskInDir(dir: string): Promise<CodeTaskUserError | undefined> {
	const input = await readTaskInput(dir);
	const taskConsole = createTaskConsole();
	const outcome = await runTask(input, taskConsole.console);
	const { content, error } = toResultFile(outcome, taskConsole.getOutput());

	await writeFile(join(dir, 'out', TASK_RESULT_PATH), content, { mode: 0o600 });

	return error;
}

/**
 * Each message is one line of JSON. Tasks run at the same time, and each task ends
 * with exactly one `done` or `error`.
 */
export function serveTasks(control: Duplex): void {
	const send = (message: RuntimeMessage) => control.write(serializeMessage(message));

	const handleStart = async ({ taskId, dir }: StartMessage) => {
		try {
			const error = await runTaskInDir(dir);
			send(error ? { type: 'error', taskId, error } : { type: 'done', taskId });
		} catch (e) {
			// The task could not run, e.g. because its input file is invalid
			send({ type: 'error', taskId, error: { message: errorMessage(e) } });
		}
	};

	// Not `node:readline`, because Node.js does not verify it in a V8 snapshot
	let partialLine = '';
	control.setEncoding('utf8');
	control.on('data', (chunk: string) => {
		const lines = `${partialLine}${chunk}`.split('\n');
		partialLine = lines.pop() ?? '';

		// The daemon ignores unknown messages, so the runtime does the same
		for (const line of lines) {
			const message = parseStartMessage(line);
			if (message) void handleStart(message);
		}
	});

	send({ type: 'ready' });
}

export function startRuntime(): void {
	const control = new Socket({ fd: CONTROL_FD, readable: true, writable: true });

	// Without the daemon, no result can reach n8n
	control.once('close', () => process.exit(0));
	control.once('error', () => process.exit(1));

	// A stray throw or rejection in user code, e.g. in a timer, must not stop the process
	// and the other tasks. The error can hold user data, so the runtime does not log it.
	process.on('uncaughtException', () => {});
	process.on('unhandledRejection', () => {});

	serveTasks(control);
}
