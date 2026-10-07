import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import type { AgentN8nChatThreadSummary } from '@n8n/api-types';

import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { useAgentN8nChatThreadsStore } from './n8nChatThreads.store';
import { useRecentChats } from './useRecentChats';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return { ...actual, useRoute: () => ({ name: undefined, params: {} }) };
});

vi.mock('../composables/useAgentsN8nChatFlag', () => ({
	useAgentsN8nChatFlag: () => ({ value: true }),
}));

const makeThread = (id: string, updatedAt: string): AgentN8nChatThreadSummary => ({
	id,
	title: `Thread ${id}`,
	updatedAt,
	agent: { id: 'agent-1', name: 'Support', projectId: 'project-1' },
});

describe('useRecentChats', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	it('includes a thread opened by URL that only lives in openedThreads, not recentThreads', () => {
		const instanceAiStore = useInstanceAiStore();
		instanceAiStore.threads = [];
		const agentThreadsStore = useAgentN8nChatThreadsStore();
		agentThreadsStore.recentThreads = [makeThread('recent', '2025-01-02T00:00:00.000Z')];
		agentThreadsStore.openedThreads = [makeThread('opened', '2025-01-03T00:00:00.000Z')];

		const scope = effectScope();
		const { recentChats } = scope.run(() => useRecentChats())!;

		const ids = recentChats.value.map((item) => item.thread.id);
		expect(ids).toEqual(['opened', 'recent']);

		scope.stop();
	});
});
