import { mock } from 'vitest-mock-extended';

import type { SystemAgentEvalService } from '@/modules/agents/system-agents/system-agent-eval.service';

import { AssistantEvalThreadMemoryService } from '../assistant-eval-thread-memory.service';

describe('AssistantEvalThreadMemoryService', () => {
	function setup() {
		const systemAgentEval = mock<SystemAgentEvalService>();
		return { systemAgentEval, service: new AssistantEvalThreadMemoryService(systemAgentEval) };
	}

	it('reads the active observations and the cursor of the Assistant agent thread', async () => {
		const { systemAgentEval, service } = setup();
		systemAgentEval.getThreadMemory.mockResolvedValue({
			observations: [{ marker: 'important', text: 'User builds a Slack bot', tokenCount: 7 }],
			cursor: {
				lastObservedMessageId: 'msg-1',
				lastObservedAt: new Date('2026-01-02T00:00:00.000Z'),
			},
		});

		const result = await service.getThreadMemory('thread-1');

		expect(systemAgentEval.getThreadMemory).toHaveBeenCalledWith('assistant', 'thread-1');
		expect(result).toEqual({
			observations: [{ marker: 'important', text: 'User builds a Slack bot', tokenCount: 7 }],
			cursor: { lastObservedMessageId: 'msg-1', lastObservedAt: '2026-01-02T00:00:00.000Z' },
		});
	});

	it('returns no cursor before the observer runs', async () => {
		const { systemAgentEval, service } = setup();
		systemAgentEval.getThreadMemory.mockResolvedValue({ observations: [], cursor: null });

		await expect(service.getThreadMemory('thread-1')).resolves.toEqual({
			observations: [],
			cursor: null,
		});
	});
});
