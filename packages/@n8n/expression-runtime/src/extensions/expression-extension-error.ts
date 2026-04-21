export class ExpressionExtensionError extends Error {
	description?: string;

	constructor(message: string, options?: { description?: string }) {
		super(message);
		this.name = 'ExpressionExtensionError';
		if (options?.description !== undefined) {
			this.description = options.description;
		}
	}
}
