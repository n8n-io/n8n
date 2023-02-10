export class ValidationError extends Error {
	description = '';

	itemIndex: number | undefined = undefined;

	context: { itemIndex: number } | undefined = undefined;

	lineNumber: number | undefined = undefined;

	constructor({
		message,
		description,
		itemIndex,
		lineNumber,
	}: {
		message: string;
		description: string;
		itemIndex?: number;
		lineNumber?: number;
	}) {
		super();

		this.lineNumber = lineNumber;
		this.itemIndex = itemIndex;

		if (this.lineNumber !== undefined && this.itemIndex !== undefined) {
			this.message = `${message} [line ${lineNumber}, for item ${itemIndex}]`;
		} else if (this.lineNumber !== undefined) {
			this.message = `${message} [line ${lineNumber}]`;
		} else if (this.itemIndex !== undefined) {
			this.message = `${message} [item ${itemIndex}]`;
		} else {
			this.message = message;
		}

		this.description = description;

		if (this.itemIndex !== undefined) {
			this.context = { itemIndex: this.itemIndex };
		}
	}
}
