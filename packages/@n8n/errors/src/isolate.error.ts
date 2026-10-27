export class IsolateError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'IsolateError';
	}
}
