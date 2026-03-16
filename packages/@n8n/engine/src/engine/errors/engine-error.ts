export type ErrorCategory = 'step' | 'infrastructure' | 'timeout' | 'validation';

export abstract class EngineError extends Error {
	abstract readonly code: string;
	abstract readonly retriable: boolean;
	abstract readonly category: ErrorCategory;

	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
	}
}
