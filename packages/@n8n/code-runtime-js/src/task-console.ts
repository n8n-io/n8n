import { jsonStringify } from 'n8n-workflow';

/** Max `console.log` calls recorded per task. Later calls only mark the output as truncated. */
export const MAX_LOGGED_CALLS = 100;

/** Max length of the output of one `console.log` call, in UTF-16 code units. A cut call also gets the cut marker. */
export const MAX_LOGGED_CALL_LENGTH = 64 * 1024;

const CONSOLE_METHODS = [
	'log',
	'warn',
	'error',
	'info',
	'debug',
	'trace',
	'dir',
	'time',
	'timeEnd',
	'timeLog',
	'assert',
	'clear',
	'count',
	'countReset',
	'group',
	'groupEnd',
	'groupCollapsed',
	'table',
	'dirxml',
	'profile',
	'profileEnd',
	'timeStamp',
];

/** The formatted arguments of one `console.log` call. */
export type LoggedCall = string[];

/** The console output of a task, in the shape of the `console` field of the task result. */
export interface ConsoleOutput {
	entries: LoggedCall[];
	truncated?: true;
}

export interface TaskConsole {
	/** The `console` global of the task. Only `log` records, the other methods exist so that calls do not throw. */
	console: Record<string, (...args: unknown[]) => void>;

	/** The recorded calls, and `truncated` if the task made more than the max. */
	getOutput(): ConsoleOutput;
}

const CUT_MARKER = '... [truncated]';

/** Copies the text. V8 keeps the full source string alive while a slice of it exists. */
function detach(text: string): string {
	return Buffer.from(text, 'utf16le').toString('utf16le');
}

function formatArg(arg: unknown, maxLength: number): string {
	if (typeof arg === 'object' && arg !== null && '__isExecutionContext' in arg) {
		return '[[ExecutionContext]]';
	}
	// Slice first, so a large string is not copied in full
	if (typeof arg === 'string') return detach(`'${arg.slice(0, maxLength)}'`);

	// A value with no JSON text, such as `undefined` or a function, shows as `null` in the UI today
	const json: string | undefined = jsonStringify(arg, { replaceCircularRefs: true });
	return json ?? 'null';
}

/** Cuts the text at `maxLength` and appends the cut marker. */
function cut(text: string, maxLength: number): string {
	const lastCode = text.charCodeAt(maxLength - 1);
	const end = lastCode >= 0xd800 && lastCode <= 0xdbff ? maxLength - 1 : maxLength; // Keep surrogate pairs whole

	return detach(`${text.slice(0, end)}${CUT_MARKER}`);
}

/** Formats the arguments of one `console.log` call, up to the max length. */
function formatCall(args: unknown[]): LoggedCall {
	const formatted: LoggedCall = [];
	let remaining = MAX_LOGGED_CALL_LENGTH;

	for (const arg of args) {
		if (remaining === 0) {
			formatted.push(CUT_MARKER);
			break;
		}

		const text = formatArg(arg, remaining);
		if (text.length > remaining) {
			formatted.push(cut(text, remaining));
			break;
		}

		formatted.push(text);
		remaining -= text.length;
	}

	return formatted;
}

/** Creates a `console` for one task that records the output of `console.log`. */
export function createTaskConsole(): TaskConsole {
	const loggedCalls: LoggedCall[] = [];
	let truncated = false;

	const console: Record<string, (...args: unknown[]) => void> = {};
	for (const name of CONSOLE_METHODS) console[name] = () => {};

	console.log = (...args: unknown[]) => {
		if (loggedCalls.length >= MAX_LOGGED_CALLS) {
			truncated = true;
			return;
		}

		// Take a place before formatting, because a getter or `toJSON` in user code can log too
		const slot = loggedCalls.push([]) - 1;
		try {
			loggedCalls[slot] = formatCall(args);
		} catch (error) {
			loggedCalls.splice(slot, 1);
			throw error;
		}
	};

	return {
		console,
		getOutput: () =>
			truncated ? { entries: [...loggedCalls], truncated } : { entries: [...loggedCalls] },
	};
}
