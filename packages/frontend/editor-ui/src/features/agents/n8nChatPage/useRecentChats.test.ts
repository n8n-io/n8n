import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import type { AgentN8nChatThreadSummary } from '@n8n/api-types';

import { useSettingsStore } from '@n8n/stores/settings.store';

import { useAssistantAgentThreadsStore } from '@/features/ai/instanceAi/assistantAgent/assistantAgentThreads.store';
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

	describe('Assistant agent threads', () => {
		function setAssistantAgentEnabled(enabled: boolean) {
			useSettingsStore().moduleSettings = {
				'instance-ai': {
					enabled: true,
					mcpConnectionsAvailable: false,
					browserUseEnabled: false,
					proxyEnabled: false,
					cloudManaged: false,
					sandboxEnabled: true,
					workflowBuilderAvailable: true,
					sandboxUnavailableReason: null,
					runDebugEnabled: false,
					workflowSuggestionsEnabled: false,
					assistantAgentEnabled: enabled,
				},
			};
		}

		function recentIds() {
			const scope = effectScope();
			const { recentChats } = scope.run(() => useRecentChats())!;
			const ids = recentChats.value.map((item) => `${item.kind}:${item.thread.id}`);
			scope.stop();
			return ids;
		}

		beforeEach(() => {
			useInstanceAiStore().threads = [];
			useAssistantAgentThreadsStore().recentThreads = [
				{ id: 'aa1', title: null, updatedAt: '2025-01-04T00:00:00.000Z', projectId: 'p1' },
			];
		});

		it('merges them in while the Assistant agent is on', () => {
			setAssistantAgentEnabled(true);

			expect(recentIds()).toEqual(['assistant-agent:aa1']);
		});

		it('leaves them out while the Assistant agent is off', () => {
			setAssistantAgentEnabled(false);

			expect(recentIds()).toEqual([]);
		});
	});
});
