import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AgentContextService } from '@/modules/agents/agent-context.service';
import type {
	AgentContextReader,
	AgentContextResult,
	AgentSessionDetail,
} from '@/modules/agents/agent-context.contracts';

import { InstanceAiAgentContextAdapterService } from '../instance-ai-agent-context.adapter';

vi.mock('@/modules/agents/agent-context.service', () => ({
	AgentContextService: class AgentContextService {},
}));

describe('InstanceAiAgentContextAdapterService', () => {
	it('formats a requested session without returning the raw session data', async () => {
		const agents = mock<AgentContextService>();
		const reader = mock<AgentContextReader>();
		agents.createReader.mockReturnValue(reader);
		const sessionDetail: AgentSessionDetail = {
			thread: {
				id: 'session-1',
				agentId: 'agent-1',
				agentName: 'Support',
				title: 'Question',
				sessionNumber: 1,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			executions: [
				{
					id: 'turn-1',
					status: 'success',
					userMessage: 'Help me',
					model: 'test',
					duration: 100,
					totalTokens: 10,
					error: null,
					timeline: [{ type: 'text', content: 'Done', timestamp: 1 }],
				},
			],
		};
		reader.lookup.mockResolvedValue({ session: { threadId: 'session-1' }, sessionDetail });
		const adapter = new InstanceAiAgentContextAdapterService(agents).createReader(
			mock<User>(),
			'project-1',
		);
		const input = {
			type: 'session' as const,
			agentId: 'agent-1',
			threadId: 'session-1',
			executionId: 'turn-1',
		};
		expect(await adapter.lookup(input)).toEqual({
			session: { threadId: 'session-1' },
			transcript: expect.stringContaining('Done'),
		});
		expect(await adapter.lookup({ ...input, executionId: 'missing' })).toEqual({ notFound: true });

		const notFound: AgentContextResult = { notFound: true };
		reader.lookup.mockResolvedValue(notFound);
		expect(await adapter.lookup(input)).toEqual(notFound);
	});
});
