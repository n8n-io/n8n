import { UnexpectedError } from 'n8n-workflow';

import type { AgentExecutionLogRef } from './types';

export class CorruptedAgentExecutionLogError extends UnexpectedError {
	constructor(ref: AgentExecutionLogRef, cause: unknown) {
		super('Agent execution log bundle is corrupted', {
			cause,
			extra: {
				agentId: ref.agentId,
				threadId: ref.threadId,
				executionId: ref.executionId,
			},
		});
	}
}
