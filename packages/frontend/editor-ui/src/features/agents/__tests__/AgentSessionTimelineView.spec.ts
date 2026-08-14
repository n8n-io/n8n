import { shallowMount } from '@vue/test-utils';
import { nextTick } from 'vue';

import AgentSessionTimelineHeader from '../components/AgentSessionTimelineHeader.vue';
import AgentSessionTimelinePanel from '../components/AgentSessionTimelinePanel.vue';
import AgentSessionTimelineView from '../views/AgentSessionTimelineView.vue';
import type { ThreadDetail } from '../composables/useAgentThreadsApi';

const { fetchThreads, sendSession, route, router } = vi.hoisted(() => ({
	fetchThreads: vi.fn(),
	sendSession: vi.fn(),
	route: {
		params: {
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
		},
	},
	router: {
		resolve: vi.fn(() => ({ href: '/agents/session', matched: [] })),
		push: vi.fn(),
		back: vi.fn(),
		options: { history: { state: { back: null } } },
	},
}));

vi.mock('vue-router', () => ({
	useRoute: () => route,
	useRouter: () => router,
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		personalProject: { id: 'project-1' },
		currentProject: null,
		myProjects: [],
	}),
}));

vi.mock('../agentSessions.store', () => ({
	useAgentSessionsStore: () => ({
		threads: [],
		fetchThreads,
	}),
}));

vi.mock('../composables/useAgentSessionLangSmithExport', () => ({
	useAgentSessionLangSmithExport: () => ({
		isEnabled: true,
		isExporting: false,
		sendSession,
	}),
}));

vi.mock('../utils/thread-title', () => ({
	useThreadTitle: () => (thread: { title: string | null; agentName: string }) =>
		thread.title ?? thread.agentName,
}));

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

describe('AgentSessionTimelineView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchThreads.mockResolvedValue(undefined);
	});

	it('exports the loaded route session through the shared flow', async () => {
		const wrapper = shallowMount(AgentSessionTimelineView);
		const header = wrapper.findComponent(AgentSessionTimelineHeader);
		expect(header.props('showLangsmithExport')).toBe(false);

		const detail: ThreadDetail = {
			thread: {
				id: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				parentThreadId: null,
				parentAgentId: null,
				projectId: 'project-1',
				taskId: null,
				sessionNumber: 1,
				title: 'Session',
				emoji: null,
				totalPromptTokens: 1,
				totalCompletionTokens: 2,
				totalCost: 0.01,
				totalDuration: 100,
				createdAt: '2026-08-14T09:00:00.000Z',
				updatedAt: '2026-08-14T09:00:01.000Z',
			},
			executions: [],
		};
		wrapper.findComponent(AgentSessionTimelinePanel).vm.$emit('loaded', detail);
		await nextTick();

		expect(header.props('showLangsmithExport')).toBe(true);
		header.vm.$emit('langsmith-export');

		expect(sendSession).toHaveBeenCalledWith({
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
		});
	});
});
