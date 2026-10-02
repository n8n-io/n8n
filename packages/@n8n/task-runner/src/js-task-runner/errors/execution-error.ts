import type { ErrorLike } from './error-like';
import { SerializableError } from './serializable-error';

/**
 * Matches the header row of a stack, i.e. `<error name>: <error message>`. The
 * name is whatever the thrown error's `name` is, which is not always
 * `Error`-suffixed - `pg`'s `DatabaseError` sets it to `error`, and a custom
 * error may contain spaces, dots or dashes - so accept any name up to the first
 * `': '`, instead of looking for an `Error:` prefix.
 */
const STACK_HEADER_REGEX = /^(?<errorType>\S.*?): (?<errorDetails>.+)$/;

/** Matches a stack frame row, e.g. `    at Object.foo (/a/b.js:1:2)`. */
const STACK_FRAME_REGEX = /^\s+at\s/;

/**
 * Matches the caret row that closes the source excerpt V8 prefixes a syntax
 * error's stack with. The excerpt holds user code, which can look like a header
 * row, so the header is only searched for past the caret.
 */
const SOURCE_EXCERPT_CARET_REGEX = /^\s*\^+\s*$/;

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
	 * Populate error `message` and `description` from error `stack`. The stack is
	 * the richer source - it carries the error name and the line number - but the
	 * error's own `message` is always present, so keep it as the fallback for a
	 * stack we cannot parse, rather than discarding it.
	 */
	private populateFromStack() {
		const fallbackMessage = this.message || 'Unknown error';
		const stackRows = (this.stack ?? '').split(/\r?\n/);

		const lineNumberDisplay = this.toLineNumberDisplay(stackRows);
		const [errorDetails, errorType] = this.toErrorDetailsAndType(this.toMessageRow(stackRows));

		if (errorType) this.description = errorType;

		this.message = `${errorDetails ?? fallbackMessage} ${lineNumberDisplay}`.trim();
	}

	/**
	 * Find the row holding `<error name>: <error message>`, i.e. the first row
	 * past any source excerpt and before the first stack frame. Rows after it can
	 * be continuation rows of a multi-line message, which must not be mistaken
	 * for the header.
	 */
	private toMessageRow(stackRows: string[]) {
		const firstFrameIndex = stackRows.findIndex((row) => STACK_FRAME_REGEX.test(row));
		const headerRows = firstFrameIndex === -1 ? stackRows : stackRows.slice(0, firstFrameIndex);

		const excerptEndIndex = headerRows.reduce(
			(lastCaretIndex, row, index) =>
				SOURCE_EXCERPT_CARET_REGEX.test(row) ? index + 1 : lastCaretIndex,
			0,
		);

		return headerRows.slice(excerptEndIndex).find((row) => STACK_HEADER_REGEX.test(row));
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
		return [errorDetails.trim() || null, errorType.toLowerCase() === 'error' ? null : errorType];
	}
}
