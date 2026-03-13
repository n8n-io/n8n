import type { GraphStepConfig } from '../../graph/graph.types';
import { NonRetriableError } from '../../sdk/errors';
import { EngineError, type ErrorCategory } from './engine-error';
import { StepTimeoutError } from './step-timeout.error';

export interface ErrorData {
	message: string;
	stack?: string;
	code: string;
	category: ErrorCategory;
	retriable: boolean;
	originalLine?: number;
}

/**
 * Normalizes any thrown value into a structured `ErrorData`.
 *
 * Classification order:
 * 1. EngineError subclasses -- use their code/category/retriable directly
 * 2. Native JS errors (TypeError, ReferenceError, SyntaxError) -- code bugs, never retriable
 * 3. Node.js system errors with an `errno` code -- retriable for network-related codes
 * 4. NonRetriableError from SDK -- workflow author explicitly marked as non-retriable
 * 5. Unknown shape -- default to retriable (assume transient)
 */
export function buildErrorData(error: unknown, sourceMap?: string): ErrorData {
	// 1. If it's already an EngineError, use its properties directly
	if (error instanceof EngineError) {
		return {
			message: error.message,
			stack: sourceMap ? remapStack(error.stack, sourceMap) : error.stack,
			code: error.code,
			category: error.category,
			retriable: error.retriable,
		};
	}

	// 2. Classify native JS errors -- never retriable (code bugs)
	if (
		error instanceof TypeError ||
		error instanceof ReferenceError ||
		error instanceof SyntaxError
	) {
		return {
			message: error.message,
			stack: sourceMap ? remapStack(error.stack, sourceMap) : error.stack,
			code: error.constructor.name.toUpperCase(),
			category: 'step',
			retriable: false,
		};
	}

	// 3. Classify Node.js system errors by errno code
	if (error instanceof Error && 'code' in error) {
		const errno = (error as NodeJS.ErrnoException).code;
		const retriableCodes = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND'];
		return {
			message: error.message,
			stack: sourceMap ? remapStack(error.stack, sourceMap) : error.stack,
			code: errno ?? 'UNKNOWN',
			category: 'step',
			retriable: retriableCodes.includes(errno ?? ''),
		};
	}

	// 4. NonRetriableError from SDK -- workflow author explicitly marked as non-retriable
	if (error instanceof NonRetriableError) {
		return {
			message: error.message,
			stack: sourceMap ? remapStack(error.stack, sourceMap) : error.stack,
			code: 'NON_RETRIABLE',
			category: 'step',
			retriable: false,
		};
	}

	// 5. Unknown error shape
	return {
		message: error instanceof Error ? error.message : String(error),
		stack:
			error instanceof Error
				? sourceMap
					? remapStack(error.stack, sourceMap)
					: error.stack
				: undefined,
		code: 'UNKNOWN',
		category: 'step',
		retriable: true, // Default: assume transient
	};
}

/**
 * Determines if an error should trigger a retry.
 * Uses `buildErrorData` for base classification, then applies step-level overrides.
 * This is the function called in processStep's catch block.
 */
export function classifyError(error: unknown, stepConfig: GraphStepConfig): boolean {
	const errorData = buildErrorData(error);

	// Step-level overrides:
	// 1. StepTimeoutError: only retriable if step config says so
	if (error instanceof StepTimeoutError) {
		return stepConfig.retryOnTimeout ?? false;
	}

	// 2. Custom retriable error codes from step config
	if (stepConfig.retriableErrors?.includes(errorData.code)) {
		return true;
	}

	// 3. Fall back to the base classification from buildErrorData
	return errorData.retriable;
}

/**
 * Calculates the backoff delay for a retry attempt using exponential backoff.
 *
 * @param attempt - The current attempt number (1-based)
 * @param config - Backoff configuration
 * @returns The delay in milliseconds before the next retry
 */
export function calculateBackoff(
	attempt: number,
	config: { baseDelay: number; maxDelay?: number; jitter?: boolean },
): number {
	const delay = Math.min(config.baseDelay * Math.pow(2, attempt - 1), config.maxDelay ?? 60_000);
	if (config.jitter) {
		return delay * (0.5 + Math.random() * 0.5);
	}
	return delay;
}

/**
 * Remaps an error stack trace using a source map.
 * For PoC: source map remapping is handled by source-map-support at runtime.
 * This function is a placeholder for manual remapping if needed.
 */
function remapStack(stack: string | undefined, _sourceMap: string): string | undefined {
	return stack;
}
