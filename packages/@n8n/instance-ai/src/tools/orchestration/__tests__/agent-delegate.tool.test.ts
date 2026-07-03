import { INLINE_SUB_AGENT_ID } from '@n8n/agents';

import { executeTool } from '../../../__tests__/tool-test-utils';
import { runInstanceAiSubAgent } from '../../../subagents/runner';
import type { OrchestrationContext } from '../../../types';
import { createAgentDelegateTool } from '../agent-delegate.tool';

vi.mock('../../../subagents/runner', () => ({ runInstanceAiSubAgent: vi.fn() }));

const runInstanceAiSubAgentMock = vi.mocked(runInstanceAiSubAgent);

beforeEach(() => {
	runInstanceAiSubAgentMock.mockReset();
});

describe('createAgentDelegateTool', () => {
	it('registers the tool under the name "agent"', () => {
		const tool = createAgentDelegateTool({} as OrchestrationContext);
		expect(tool.name).toBe('agent');
	});

	it('lists configured specialists but excludes hidden built-ins', () => {
		const tool = createAgentDelegateTool({} as OrchestrationContext);
		expect(tool.systemInstruction).toContain('instance-explorer');
		expect(tool.systemInstruction).toContain('execution-debugger');
		expect(tool.systemInstruction).not.toContain('general-purpose');
		expect(tool.systemInstruction).not.toContain('workflow-context-scout');
	});

	it('routes every subAgentId through runInstanceAiSubAgent with the orchestration context', async () => {
		runInstanceAiSubAgentMock.mockResolvedValue({
			status: 'completed',
			taskPath: '/root/task_0',
			answer: 'done',
		});
		const context = { threadId: 'thread-1' } as unknown as OrchestrationContext;
		const tool = createAgentDelegateTool(context);

		await executeTool(
			tool,
			{ subAgentId: INLINE_SUB_AGENT_ID, taskName: 'task', goal: 'Find it.' },
			{ runId: 'run-1' },
		);

		expect(runInstanceAiSubAgentMock).toHaveBeenCalledTimes(1);
		expect(runInstanceAiSubAgentMock.mock.calls[0][0]).toMatchObject({
			subAgentId: INLINE_SUB_AGENT_ID,
			goal: 'Find it.',
		});
		expect(runInstanceAiSubAgentMock.mock.calls[0][1]).toBe(context);
	});

	it('caps concurrent delegations at the configured maxChildren', () => {
		const tool = createAgentDelegateTool({} as OrchestrationContext);
		expect(tool.systemInstruction).toContain('Up to 3 child sub-agent runs');
	});
});
