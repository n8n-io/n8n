/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import type { PushMessage } from '@n8n/api-types';
import { N8nEmptyState } from '@n8n/design-system';
import AgentSessionTimelineView from '../views/AgentSessionTimelineView.vue';
import AgentSessionTimelinePanel from '../components/AgentSessionTimelinePanel.vue';
import AgentPreviewDock from '../components/AgentPreviewDock.vue';
import { AGENT_SESSION_DETAIL_VIEW } from '../constants';

interface SessionThread {
	id: string;
	updatedAt: string;
}

const routeParams = reactive({ projectId: 'p1', agentId: 'a1', threadId: 'thread-a' });
const routerPush = vi.fn();
const routerReplace = vi.fn();
const sessionThreads = reactive<SessionThread[]>([]);
const pushListeners = new Set<(event: PushMessage) => void>();

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: routeParams, query: {} }),
	useRouter: () => ({
		push: routerPush,
		replace: routerReplace,
		resolve: () => ({ href: '#' }),
		options: { history: { state: {} } },
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({ personalProject: { id: 'p1' }, currentProject: null, myProjects: [] }),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		pushConnect: vi.fn(),
		pushDisconnect: vi.fn(),
		addEventListener: (listener: (event: PushMessage) => void) => {
			pushListeners.add(listener);
			return () => pushListeners.delete(listener);
		},
	}),
}));

vi.mock('@/features/agents/agentSessions.store', () => ({
	useAgentSessionsStore: () => ({
		threads: sessionThreads,
		fetchThreads: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock('@/features/agents/composables/useAgentSessionLangSmithExport', () => ({
	useAgentSessionLangSmithExport: () => ({
		isEnabled: false,
		isExporting: false,
		sendSession: vi.fn(),
	}),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	getAgent: vi.fn().mockResolvedValue({ id: 'a1', name: 'Agent One' }),
}));

vi.mock('@/features/agents/composables/useAgentConfig', () => ({
	useAgentConfig: () => ({
		config: { value: null },
		fetchConfig: vi.fn().mockResolvedValue(undefined),
	}),
}));

/** Mimic the backend recording a turn for `threadId`. */
function emitExecutionUpdate(threadId: string) {
	const event: PushMessage = {
		type: 'agentExecutionUpdated',
		data: { projectId: 'p1', agentId: 'a1', threadId, executionId: 'e1' },
	};
	for (const listener of [...pushListeners]) listener(event);
}

describe('AgentSessionTimelineView', () => {
	beforeEach(() => {
		routeParams.threadId = 'thread-a';
		sessionThreads.splice(
			0,
			sessionThreads.length,
			{ id: 'thread-a', updatedAt: '2026-01-01T00:00:00.000Z' },
			{ id: 'thread-c', updatedAt: '2026-01-03T00:00:00.000Z' },
		);
		vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
			'thread-b' as unknown as ReturnType<typeof globalThis.crypto.randomUUID>,
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		pushListeners.clear();
		routerPush.mockClear();
		routerReplace.mockClear();
	});

	it('replaces the stale thread with an empty state when a new preview session starts', async () => {
		const wrapper = shallowMount(AgentSessionTimelineView);
		await flushPromises();

		expect(wrapper.findComponent(AgentSessionTimelinePanel).exists()).toBe(true);
		expect(wrapper.findComponent(N8nEmptyState).exists()).toBe(false);

		await wrapper.findComponent(AgentPreviewDock).vm.$emit('new-session');
		await nextTick();

		// The previous thread's error markers must not linger next to the new session.
		expect(wrapper.findComponent(AgentSessionTimelinePanel).exists()).toBe(false);
		expect(wrapper.findComponent(N8nEmptyState).exists()).toBe(true);
		// Nothing to navigate to yet — the new session has no thread to fetch.
		expect(routerReplace).not.toHaveBeenCalled();
	});

	it('re-binds to the new session once the backend records its first turn', async () => {
		const wrapper = shallowMount(AgentSessionTimelineView);
		await flushPromises();
		await wrapper.findComponent(AgentPreviewDock).vm.$emit('new-session');
		await nextTick();

		// A turn in some other thread of the same agent must not re-route this page.
		emitExecutionUpdate('thread-c');
		await flushPromises();
		expect(routerReplace).not.toHaveBeenCalled();

		emitExecutionUpdate('thread-b');
		await flushPromises();

		expect(routerReplace).toHaveBeenCalledWith({
			name: AGENT_SESSION_DETAIL_VIEW,
			params: { projectId: 'p1', agentId: 'a1', threadId: 'thread-b' },
		});
	});

	it('lets the dock name and act on the loaded thread even when the list lacks it', async () => {
		const wrapper = shallowMount(AgentSessionTimelineView);
		await flushPromises();
		// Drop the route's thread from the list, as for a session outside the first page.
		sessionThreads.splice(0, sessionThreads.length);
		await nextTick();

		const dock = wrapper.findComponent(AgentPreviewDock);
		const panel = wrapper.findComponent(AgentSessionTimelinePanel);
		expect(dock.props('hasSession')).toBe(false);

		// A loaded thread that is not the live session must not stand in for it.
		await panel.vm.$emit('loaded', {
			thread: { id: 'thread-z', title: 'Other', updatedAt: '2026-01-01T00:00:00.000Z' },
			executions: [],
		});
		await nextTick();
		expect(dock.props('hasSession')).toBe(false);
		expect(dock.props('sessionTitle')).not.toBe('Other');

		await panel.vm.$emit('loaded', {
			thread: { id: 'thread-a', title: 'Digimon villains', updatedAt: '2026-01-01T00:00:00.000Z' },
			executions: [],
		});
		await nextTick();
		expect(dock.props('hasSession')).toBe(true);
		expect(dock.props('sessionTitle')).toBe('Digimon villains');
	});

	it('keeps the timeline when the preview switches to an existing session', async () => {
		const wrapper = shallowMount(AgentSessionTimelineView);
		await flushPromises();

		await wrapper.findComponent(AgentPreviewDock).vm.$emit('session-select', 'thread-c');
		await nextTick();

		// That session already has a thread, so the dock's own trace action owns the
		// navigation — this page must not blank out or re-route on its own.
		expect(wrapper.findComponent(AgentSessionTimelinePanel).exists()).toBe(true);
		expect(wrapper.findComponent(N8nEmptyState).exists()).toBe(false);
		expect(routerReplace).not.toHaveBeenCalled();
	});
});
