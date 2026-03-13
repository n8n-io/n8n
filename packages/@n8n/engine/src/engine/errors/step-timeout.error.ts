import { EngineError } from './engine-error';
import type { ErrorCategory } from './engine-error';

export class StepTimeoutError extends EngineError {
	readonly code = 'STEP_TIMEOUT';
	readonly category: ErrorCategory = 'timeout';
	readonly retriable: boolean;

	constructor(
		public readonly stepId: string,
		public readonly timeoutMs: number,
		retriable = false,
	) {
		super(`Step '${stepId}' timed out after ${timeoutMs}ms`);
		this.retriable = retriable;
	}
}
