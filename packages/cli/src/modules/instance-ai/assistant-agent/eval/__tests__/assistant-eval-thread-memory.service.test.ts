import { mock } from 'vitest-mock-extended';

import type { N8nMemory, N8nMemoryImpl } from '@/modules/agents/integrations/n8n-memory';

import { AssistantEvalThreadMemoryService } from '../assistant-eval-thread-memory.service';

describe('AssistantEvalThreadMemoryService', () => {
	function setup() {
		const impl = mock<N8nMemoryImpl>();
		const memory = mock<N8nMemory>();
		memory.getImplementation.mockReturnValue(impl);
		return { impl, memory, service: new AssistantEvalThreadMemoryService(memory) };
	}

	it('reads the active observations and the cursor of the Assistant agent thread', async () => {
		const { impl, memory, service } = setup();
		impl.getActiveObservationLog.mockResolvedValue([
			{
				id: 'obs-1',
				observationScopeId: 'thread-1',
				marker: 'important',
				text: 'User builds a Slack bot',
				tokenCount: 7,
				parentId: null,
				status: 'active',
				supersededBy: null,
				createdAt: new Date('2026-01-01T00:00:00.000Z'),
			},
		]);
		impl.getCursor.mockResolvedValue({
			observationScopeId: 'thread-1',
			lastObservedMessageId: 'msg-1',
			lastObservedAt: new Date('2026-01-02T00:00:00.000Z'),
			updatedAt: new Date('2026-01-02T00:00:00.000Z'),
		});

		const result = await service.getThreadMemory('thread-1');

		expect(memory.getImplementation).toHaveBeenCalledWith('assistant');
		expect(impl.getActiveObservationLog).toHaveBeenCalledWith({
			observationScopeId: 'thread-1',
			order: 'asc',
		});
		expect(impl.getCursor).toHaveBeenCalledWith('thread-1');
		expect(result).toEqual({
			observations: [{ marker: 'important', text: 'User builds a Slack bot', tokenCount: 7 }],
			cursor: { lastObservedMessageId: 'msg-1', lastObservedAt: '2026-01-02T00:00:00.000Z' },
		});
	});

	it('returns no cursor before the observer runs', async () => {
		const { impl, service } = setup();
		impl.getActiveObservationLog.mockResolvedValue([]);
		impl.getCursor.mockResolvedValue(null);

		await expect(service.getThreadMemory('thread-1')).resolves.toEqual({
			observations: [],
			cursor: null,
		});
	});
});
