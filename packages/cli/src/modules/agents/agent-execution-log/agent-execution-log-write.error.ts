import { UnexpectedError } from 'n8n-workflow';

import type { AgentExecutionLogRef } from './types';

export class AgentExecutionLogWriteError extends UnexpectedError {
	constructor(ref: AgentExecutionLogRef, cause: unknown) {
		super('Failed to write agent execution log bundle', {
			cause,
			extra: {
				agentId: ref.agentId,
				threadId: ref.threadId,
				executionId: ref.executionId,
			},
		});
	}
}
