import type { ErrorLike } from './error-like';
import { SerializableError } from './serializable-error';

/**
 * Matches the header row of a stack, e.g. `TypeError: x is not a function` or
 * `Error [ERR_X]: ...`. Error names are not always `Error`-suffixed - `pg`'s
 * `DatabaseError` sets `name` to `error` - so match any name followed by the
 * message, instead of looking for an `Error:` prefix.
 */
const STACK_HEADER_REGEX = /^(?<errorType>[\w$]+(?: \[[^\]]+\])?): (?<errorDetails>.+)$/;

const STACK_FRAME_REGEX = /^\s+at\s/;

export class ExecutionError extends SerializableError {
	description: string | null = null;

	itemIndex: number | undefined = undefined;

	context: { itemIndex: number } | undefined = undefined;

	lineNumber: number | undefined = undefined;

	constructor(error: ErrorLike, itemIndex?: number) {
		super(error.message);
		this.itemIndex = itemIndex;

		if (this.itemIndex !== undefined) {
			this.context = { itemIndex: this.itemIndex };
		}

		// Override the stack trace with the given error's stack trace. Since
		// node v22 it's not writable, so we can't assign it directly
		Object.defineProperty(this, 'stack', {
			value: error.stack,
			enumerable: true,
		});

		this.populateFromStack();
	}

	/**
	 * Populate error `message` and `description` from error `stack`.
	 */
	private populateFromStack() {
		const stackRows = (this.stack ?? '').split('\n');

		if (stackRows.length === 0) {
			this.message = 'Unknown error';
			return;
		}

		const messageRow = this.toMessageRow(stackRows);
		const lineNumberDisplay = this.toLineNumberDisplay(stackRows);

		if (!messageRow) {
			this.message = `Unknown error ${lineNumberDisplay}`.trim();
			return;
		}

		const [errorDetails, errorType] = this.toErrorDetailsAndType(messageRow);

		if (errorType) this.description = errorType;

		if (!errorDetails) {
			this.message = `Unknown error ${lineNumberDisplay}`.trim();
			return;
		}

		this.message = `${errorDetails} ${lineNumberDisplay}`.trim();
	}

	/**
	 * Find the row holding `<error name>: <error message>`. V8 can prefix the
	 * stack with a source excerpt, e.g. for syntax errors, so take the last
	 * header row before the first stack frame.
	 */
	private toMessageRow(stackRows: string[]) {
		const firstFrameIndex = stackRows.findIndex((row) => STACK_FRAME_REGEX.test(row));
		const headerRows = firstFrameIndex === -1 ? stackRows : stackRows.slice(0, firstFrameIndex);

		return headerRows.filter((row) => STACK_HEADER_REGEX.test(row)).at(-1);
	}

	private toLineNumberDisplay(stackRows: string[]) {
		if (!stackRows || stackRows.length === 0) return '';

		const userFnLine = stackRows.find(
			(row) => row.match(/\(evalmachine\.<anonymous>:\d+:\d+\)/) && !row.includes('VmCodeWrapper'),
		);

		if (userFnLine) {
			const match = userFnLine.match(/evalmachine\.<anonymous>:(\d+):/);
			if (match) this.lineNumber = Number(match[1]);
		}

		if (this.lineNumber === undefined) {
			const topLevelLine = stackRows.find(
				(row) => row.includes('VmCodeWrapper') && row.includes('evalmachine.<anonymous>'),
			);

			if (topLevelLine) {
				const match = topLevelLine.match(/evalmachine\.<anonymous>:(\d+):/);
				if (match) this.lineNumber = Number(match[1]);
			}
		}

		if (this.lineNumber === undefined) return '';

		return this.itemIndex === undefined
			? `[line ${this.lineNumber}]`
			: `[line ${this.lineNumber}, for item ${this.itemIndex}]`;
	}

	private toErrorDetailsAndType(messageRow?: string) {
		const groups = messageRow?.match(STACK_HEADER_REGEX)?.groups;

		if (!groups) return [null, null];

		const { errorType, errorDetails } = groups;

		// `Error`, and driver names like `error`, tell the user nothing
		return [errorDetails.trim(), errorType.toLowerCase() === 'error' ? null : errorType];
	}
}
