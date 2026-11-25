import type { CodeTaskUserError } from '@n8n/code-task-contract';

// Copy of `ExecutionError` in the task runner. Keep the two the same.

/** Matches the header row of a stack, `<error name>: <error message>`. */
const STACK_HEADER_REGEX = /^(?<errorType>\S.*?): (?<errorDetails>.+)$/;

/** Matches a stack frame row, e.g. `    at Object.foo (/a/b.js:1:2)`. */
const STACK_FRAME_REGEX = /^\s+at\s/;

/** Matches the caret row after the source excerpt in the stack of a syntax error. */
const SOURCE_EXCERPT_CARET_REGEX = /^\s*\^+\s*$/;

const USER_CODE_FRAME_REGEX = /\(evalmachine\.<anonymous>:\d+:\d+\)/;

const LINE_NUMBER_REGEX = /evalmachine\.<anonymous>:(\d+):/;

/** The first row after the source excerpt and before the first frame that is a header row. */
function findMessageRow(stackRows: string[]) {
	const firstFrameIndex = stackRows.findIndex((row) => STACK_FRAME_REGEX.test(row));
	const headerRows = firstFrameIndex === -1 ? stackRows : stackRows.slice(0, firstFrameIndex);
	const excerptEndIndex = headerRows.reduce(
		(lastCaretIndex, row, index) =>
			SOURCE_EXCERPT_CARET_REGEX.test(row) ? index + 1 : lastCaretIndex,
		0,
	);

	return headerRows.slice(excerptEndIndex).find((row) => STACK_HEADER_REGEX.test(row));
}

/** Line of the user code in the first frame of a user function, else in the frame of the wrapper. */
function findLineNumber(stackRows: string[]) {
	const row =
		stackRows.find((r) => USER_CODE_FRAME_REGEX.test(r) && !r.includes('VmCodeWrapper')) ??
		stackRows.find((r) => r.includes('VmCodeWrapper') && r.includes('evalmachine.<anonymous>'));
	const match = row?.match(LINE_NUMBER_REGEX);

	return match ? Number(match[1]) : undefined;
}

function fromStack(message: string, stack?: string): CodeTaskUserError {
	const stackRows = (stack ?? '').split(/\r?\n/);
	const lineNumber = findLineNumber(stackRows);
	const groups = findMessageRow(stackRows)?.match(STACK_HEADER_REGEX)?.groups;
	const errorDetails = groups?.errorDetails.trim() || message || 'Unknown error';
	// `Error`, and driver names like `error`, tell the user nothing
	const description =
		groups && groups.errorType.toLowerCase() !== 'error' ? groups.errorType : null;
	const lineNumberDisplay = lineNumber === undefined ? '' : `[line ${lineNumber}]`;

	return {
		message: `${errorDetails} ${lineNumberDisplay}`.trim(),
		description,
		stack,
		lineNumber,
	};
}

/** Converts what the user code threw to a user error, as the task runner does. */
export function toUserError(error: unknown): CodeTaskUserError | Error {
	// An error from the runtime process, e.g. from `$('Node')`, stays as it is, so the
	// result file holds its JSON. An error from the user code comes from the task
	// context, so it is not an `Error` here.
	if (error instanceof Error) {
		Object.defineProperties(error, {
			message: { value: error.message, enumerable: true, configurable: true },
			stack: { value: error.stack, enumerable: true, configurable: true },
		});
		return error;
	}

	// Read the values, not check for the keys, because a proxy can have values without keys
	const message: unknown =
		typeof error === 'object' && error !== null ? Reflect.get(error, 'message') : undefined;
	if (typeof message === 'string') {
		const stack: unknown = Reflect.get(Object(error), 'stack');
		return fromStack(message, typeof stack === 'string' ? stack : undefined);
	}

	return fromStack(JSON.stringify(error) ?? '');
}
