import { UnexpectedError } from 'n8n-workflow';

import { isWrappableError, WrappedExecutionError } from './errors/WrappedExecutionError';

export function throwExecutionError(error: unknown): never {
	if (error instanceof Error) {
		throw error;
	} else if (isWrappableError(error)) {
		// The error coming from task runner is not an instance of error,
		// so we need to wrap it in an error instance.
		throw new WrappedExecutionError(error);
	}

	throw new UnexpectedError(`Unknown error: ${JSON.stringify(error)}`);
}
