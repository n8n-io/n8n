import { mock } from 'vitest-mock-extended';
import type { ErrorReporter } from 'n8n-core';

import {
	AgentExecutionLogStore,
	type AgentExecutionLogFsByteStore,
} from '../agent-execution-log-store';

describe('AgentExecutionLogStore', () => {
	it('keeps a threadId carrying path separators within the agent prefix', async () => {
		const fsByteStore = mock<AgentExecutionLogFsByteStore>();
		const store = new AgentExecutionLogStore(fsByteStore, mock<ErrorReporter>());

		await store.write(
			{ agentId: 'agent-1', threadId: '../../other-agent/threads/x', executionId: 'exec-1' },
			{ timeline: [] },
			'fs',
		);

		const [key] = fsByteStore.write.mock.calls[0];
		expect(key).toBe(
			'agents/agent-1/threads/..%2F..%2Fother-agent%2Fthreads%2Fx/executions/exec-1/log.json',
		);
	});
});
