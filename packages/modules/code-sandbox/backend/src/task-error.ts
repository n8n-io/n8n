import { OperationalError } from '@n8n/errors';
import { SandboxServiceError, type CodeTaskErrorEvent } from '@n8n/sandbox-client';
import { isRecord } from '@n8n/utils/is-record';

export class CodeSandboxUnavailableError extends OperationalError {
	constructor(cause: SandboxServiceError) {
		super('The code sandbox service is not available', { cause });
	}
}

export class CodeSandboxCrashedError extends OperationalError {
	description =
		'The code sandbox stopped while it ran the code. Run the node again. If the problem continues, process fewer items at a time with a loop node.';

	constructor(reason: string) {
		super(`Node execution failed: ${reason}`);
	}
}

export class CodeSandboxTaskFailedError extends OperationalError {
	constructor(reason: string) {
		super(`The code sandbox could not run the task: ${reason}`);
	}
}

export function toTaskError(failure: CodeTaskErrorEvent): unknown {
	switch (failure.code) {
		case 'user_error':
			return isRecord(failure.userError) ? failure.userError : { message: failure.message };
		case 'crashed':
			return new CodeSandboxCrashedError(failure.message);
		default:
			return new CodeSandboxTaskFailedError(failure.message);
	}
}

export function toServiceError(error: unknown, signal?: AbortSignal): unknown {
	const isUnavailable =
		!signal?.aborted &&
		error instanceof SandboxServiceError &&
		(error.status === 0 || error.status === 429 || error.status >= 500);

	return isUnavailable ? new CodeSandboxUnavailableError(error) : error;
}
