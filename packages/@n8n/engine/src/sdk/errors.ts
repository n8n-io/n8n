export class NonRetriableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NonRetriableError';
	}
}
