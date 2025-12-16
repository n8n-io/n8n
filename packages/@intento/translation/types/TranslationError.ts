export class TranslationError extends Error {
	constructor(message: string) {
		super(message);
	}

	static fromAPI(location: URL, code: number, message: string, latency: number): TranslationError {
		const error = `Request to ${location.toString()} failed in ${latency} ms with status code ${code}: ${message}`;
		return new TranslationError(error);
	}

	static fromLocal(code: number, message: string, latency: number): TranslationError {
		const error = `Local translation failed in ${latency} ms with status code ${code}: ${message}`;
		return new TranslationError(error);
	}
}
