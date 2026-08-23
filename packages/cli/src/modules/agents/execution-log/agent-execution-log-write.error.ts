import { UnexpectedError } from 'n8n-workflow';

import type { AgentExecutionLogRef } from './agent-execution-log-store';

/**
 * Thrown when a blob store fails to persist an agent execution log,
 * e.g. due to permission issues or disk space.
 */
export class AgentExecutionLogWriteError extends UnexpectedError {
	constructor(ref: AgentExecutionLogRef, cause: unknown) {
		super('Failed to write agent execution log', { extra: { ...ref }, cause });
	}
}
