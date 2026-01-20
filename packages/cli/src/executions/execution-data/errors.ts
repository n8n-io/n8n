import { UnexpectedError } from 'n8n-workflow';

import type { ExecutionRef } from './types';

export class CorruptedExecutionDataError extends UnexpectedError {
	constructor(ref: ExecutionRef, cause: unknown) {
		super('Found corrupted execution data', { extra: { ...ref }, cause });
	}
}

export class ExecutionDataWriteError extends UnexpectedError {
	constructor(ref: ExecutionRef, cause: unknown) {
		super('Failed to write execution data', { extra: { ...ref }, cause });
	}
}
