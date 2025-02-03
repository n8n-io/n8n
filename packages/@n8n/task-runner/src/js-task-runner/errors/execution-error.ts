import type { ErrorLike } from './error-like';
import { SerializableError } from './serializable-error';

const VM_WRAPPER_FN_NAME = 'VmCodeWrapper';

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

		const messageRow = stackRows.find((line) => line.includes('Error:'));
		const lineNumberRow = stackRows.find((line) => line.includes(`at ${VM_WRAPPER_FN_NAME} `));
		const lineNumberDisplay = this.toLineNumberDisplay(lineNumberRow);

		if (!messageRow) {
			this.message = `Unknown error ${lineNumberDisplay}`;
			return;
		}

		const [errorDetails, errorType] = this.toErrorDetailsAndType(messageRow);

		if (errorType) this.description = errorType;

		if (!errorDetails) {
			this.message = `Unknown error ${lineNumberDisplay}`;
			return;
		}

		this.message = `${errorDetails} ${lineNumberDisplay}`;
	}

	private toLineNumberDisplay(lineNumberRow?: string) {
		if (!lineNumberRow) return '';

		// TODO: This doesn't work if there is a function definition in the code
		// and the error is thrown from that function.

		const regex = new RegExp(
			`at ${VM_WRAPPER_FN_NAME} \\(evalmachine\\.<anonymous>:(?<lineNumber>\\d+):`,
		);
		const errorLineNumberMatch = lineNumberRow.match(regex);
		if (!errorLineNumberMatch?.groups?.lineNumber) return null;

		const lineNumber = errorLineNumberMatch.groups.lineNumber;
		if (!lineNumber) return '';

		this.lineNumber = Number(lineNumber);

		return this.itemIndex === undefined
			? `[line ${lineNumber}]`
			: `[line ${lineNumber}, for item ${this.itemIndex}]`;
	}

	private toErrorDetailsAndType(messageRow?: string) {
		if (!messageRow) return [null, null];

		const [errorDetails, errorType] = messageRow
			.split(':')
			.reverse()
			.map((i) => i.trim());

		return [errorDetails, errorType === 'Error' ? null : errorType];
	}
}
