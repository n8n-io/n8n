import { UnexpectedError } from 'n8n-workflow';

import type { AgentExecutionLogRef } from './agent-execution-log-store';

/**
 * Thrown when an agent execution log read from a blob store
 * cannot be parsed as valid JSON.
 */
export class CorruptedAgentExecutionLogError extends UnexpectedError {
	constructor(ref: AgentExecutionLogRef, cause: unknown) {
		super('Found corrupted agent execution log', { extra: { ...ref }, cause });
	}
}
