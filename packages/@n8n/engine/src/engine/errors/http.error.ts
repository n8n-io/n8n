import { EngineError } from './engine-error';
import type { ErrorCategory } from './engine-error';

const RETRIABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

export class HttpError extends EngineError {
	readonly code: string;
	readonly retriable: boolean;
	readonly category: ErrorCategory = 'step';

	constructor(
		public readonly statusCode: number,
		message?: string,
	) {
		super(message ?? `HTTP ${statusCode}`);
		this.code = `HTTP_${statusCode}`;
		this.retriable = RETRIABLE_STATUS_CODES.includes(statusCode);
	}
}
