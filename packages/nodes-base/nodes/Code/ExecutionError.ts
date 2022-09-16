export class ExecutionError extends Error {
	description: string | null = null;
	itemIndex: number | undefined = undefined;
	context: { itemIndex: number } | undefined = undefined;
	stack = '';

	constructor(error: Error & { stack: string }, itemIndex?: number) {
		super();
		this.itemIndex = itemIndex;

		if (this.itemIndex !== undefined) {
			this.context = { itemIndex: this.itemIndex };
		}

		this.stack = error.stack;

		this.populateFromStack();
	}

	/**
	 * Populate error `message` and `description` from error `stack`.
	 */
	private populateFromStack() {
		const stackRows = this.stack.split('\n');

		if (stackRows.length === 0) {
			this.message = 'Unknown error';
		}

		const messageRow = stackRows.find((line) => line.includes('Error:'));
		const lineNumberRow = stackRows.find((line) => line.includes('Code:'));
		const lineNumber = this.toLineNumber(lineNumberRow);

		if (!messageRow) {
			this.message = `Unknown error ${lineNumber}`;
			return;
		}

		const [errorDetails, errorType] = this.toErrorDetailsAndType(messageRow);

		if (errorType) this.description = errorType;

		if (!errorDetails) {
			this.message = `Unknown error ${lineNumber}`;
			return;
		}

		this.message = `${errorDetails} ${lineNumber}`;
	}

	private toLineNumber(lineNumberRow?: string) {
		const errorLineNumberMatch = lineNumberRow?.match(/Code:(?<lineNumber>\d+)/);

		if (!errorLineNumberMatch?.groups?.lineNumber) return null;

		const lineNumber = errorLineNumberMatch.groups.lineNumber;

		if (!lineNumber) return '';

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
