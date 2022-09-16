export class ValidationError extends Error {
	description = '';
	itemIndex: number | undefined = undefined;
	context: { itemIndex: number } | undefined = undefined;

	constructor({
		message,
		description,
		itemIndex,
	}: {
		message: string;
		description: string;
		itemIndex: number | undefined;
	}) {
		super();
		this.message = itemIndex ? [message, `[item ${itemIndex}]`].join(' ') : message;
		this.description = description;
		this.itemIndex = itemIndex;

		if (this.itemIndex !== undefined) {
			this.context = { itemIndex: this.itemIndex };
		}
	}
}
