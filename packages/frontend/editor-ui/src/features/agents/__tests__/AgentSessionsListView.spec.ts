/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';

// Hoisted mock state so vi.mock factories (which run before any imports)
// can reference these without hitting a temporal-dead-zone error.
const { routerPush, routerResolve, storeState } = vi.hoisted(() => ({
	routerPush: vi.fn(),
	routerResolve: vi.fn((target: { href?: string }) => ({ href: target?.href ?? '/resolved' })),
	storeState: {
		threads: [] as unknown[],
		loading: false,
		nextCursor: null as string | null,
	},
}));

let windowOpenSpy: ReturnType<typeof vi.spyOn>;

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agentSessions.viewTrace': 'View session trace',
				'agentSessions.origin.agent': 'Agent',
				'agentSessions.origin.subAgent': 'Sub-agent',
				'agentSessions.origin.task': 'Task',
				'agentSessions.empty': 'No agent sessions',
			})[key] ?? key,
	}),
}));

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: {} }),
	useRouter: () => ({ push: routerPush, resolve: routerResolve }),
}));

vi.mock('@n8n/design-system', () => ({
	N8nActionDropdown: {
		template: '<div data-test-id="agent-session-actions" />',
		props: ['items', 'activatorIcon'],
		emits: ['select'],
	},
	N8nButton: { template: '<button><slot /><slot name="icon" /></button>' },
	N8nIcon: { template: '<span />', props: ['icon', 'size'] },
	N8nIconButton: {
		template: '<button v-bind="$attrs"><slot /></button>',
	},
	N8nTableBase: { template: '<table><slot /></table>' },
	N8nTooltip: { template: '<div><slot /></div>' },
}));

vi.mock('../agentSessions.store', () => ({
	useAgentSessionsStore: () => ({
		get threads() {
			return storeState.threads;
		},
		get loading() {
			return storeState.loading;
		},
		get nextCursor() {
			return storeState.nextCursor;
		},
		fetchThreads: vi.fn(),
		startAutoRefresh: vi.fn(),
		stopAutoRefresh: vi.fn(),
		refreshThreads: vi.fn(),
		loadMore: vi.fn(),
		deleteThread: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: vi.fn() }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('../utils/thread-title', () => ({
	useThreadTitle: () => (thread: { title?: string | null; firstMessage?: string | null }) =>
		thread.title ?? thread.firstMessage ?? 'Session',
}));

vi.mock('@/app/constants', () => ({
	MODAL_CONFIRM: 'modal-confirm',
}));

vi.mock('@/app/utils/formatters/dateFormatter', () => ({
	convertToDisplayDate: () => ({ date: '2026-07-20', time: '10:05' }),
}));

vi.mock('@/features/agents/constants', () => ({
	AGENT_PREVIEW_VIEW: 'AgentPreviewView',
	AGENT_SESSION_DETAIL_VIEW: 'AgentSessionDetailView',
	CONTINUE_SESSION_ID_PARAM: 'continueSessionId',
	EXECUTIONS_SECTION_KEY: '__executions',
}));

vi.mock('@n8n/api-types', () => ({}));

vi.mock('element-plus', () => ({
	ElSkeletonItem: { template: '<div />' },
}));

import type { AgentExecutionThread } from '../composables/useAgentThreadsApi';
import AgentSessionsListView from '../views/AgentSessionsListView.vue';

function makeThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return {
		id: 'thread-1',
		agentId: 'agent-1',
		agentName: 'Agent',
		parentThreadId: null,
		parentAgentId: null,
		projectId: 'project-1',
		taskId: null,
		sessionNumber: 1,
		title: 'My session',
		emoji: null,
		totalPromptTokens: 100,
		totalCompletionTokens: 50,
		totalCost: 0,
		totalDuration: 2_000,
		createdAt: '2026-07-20T10:00:00.000Z',
		updatedAt: '2026-07-20T10:05:00.000Z',
		firstMessage: null,
		...overrides,
	};
}

async function mountView({
	threads = [makeThread()],
	openSessionInNewTab = false,
	embedded = true,
}: {
	threads?: AgentExecutionThread[];
	openSessionInNewTab?: boolean;
	embedded?: boolean;
} = {}) {
	storeState.threads = threads;
	storeState.loading = false;
	storeState.nextCursor = null;

	return mount(AgentSessionsListView, {
		props: {
			embedded,
			projectId: 'project-1',
			agentId: 'agent-1',
			openSessionInNewTab,
		},
		global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
	});
}

describe('AgentSessionsListView', () => {
	beforeEach(() => {
		routerPush.mockClear();
		routerResolve.mockClear();
		windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		vi.clearAllMocks();
	});

	afterEach(() => {
		windowOpenSpy.mockRestore();
	});

	it('opens the conversation (preview chat) when a session row is clicked', async () => {
		const wrapper = await mountView();

		await wrapper.find('[data-test-id="agent-session-list-item"]').trigger('click');

		expect(routerPush).toHaveBeenCalledTimes(1);
		expect(routerPush).toHaveBeenCalledWith({
			name: 'AgentPreviewView',
			params: { projectId: 'project-1', agentId: 'agent-1' },
			query: { continueSessionId: 'thread-1', section: '__executions' },
		});
	});

	it('opens the trace timeline when the trace icon button is clicked', async () => {
		const wrapper = await mountView();

		await wrapper.find('[data-test-id="agent-session-view-trace"]').trigger('click');

		expect(routerPush).toHaveBeenCalledTimes(1);
		expect(routerPush).toHaveBeenCalledWith({
			name: 'AgentSessionDetailView',
			params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
		});
	});

	it('does not trigger row navigation when the trace button is clicked', async () => {
		const wrapper = await mountView();

		await wrapper.find('[data-test-id="agent-session-view-trace"]').trigger('click');

		expect(routerPush).toHaveBeenCalledTimes(1);
		expect(routerPush).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'AgentSessionDetailView' }),
		);
	});

	it('opens the conversation in a new tab when openSessionInNewTab is set', async () => {
		const wrapper = await mountView({ openSessionInNewTab: true });

		await wrapper.find('[data-test-id="agent-session-list-item"]').trigger('click');

		expect(routerPush).not.toHaveBeenCalled();
		expect(routerResolve).toHaveBeenCalledTimes(1);
		expect(windowOpenSpy).toHaveBeenCalledTimes(1);
	});

	it('opens the trace in a new tab when openSessionInNewTab is set', async () => {
		const wrapper = await mountView({ openSessionInNewTab: true });

		await wrapper.find('[data-test-id="agent-session-view-trace"]').trigger('click');

		expect(routerPush).not.toHaveBeenCalled();
		expect(routerResolve).toHaveBeenCalledTimes(1);
		expect(windowOpenSpy).toHaveBeenCalledTimes(1);
	});

	it('renders the trace button with the view-trace aria label', async () => {
		const wrapper = await mountView();

		const traceButton = wrapper.find('[data-test-id="agent-session-view-trace"]');
		expect(traceButton.exists()).toBe(true);
		expect(traceButton.attributes('aria-label')).toBe('View session trace');
	});

	it.each([
		[{ source: 'slack' }, 'Slack'],
		[{ source: 'telegram' }, 'Telegram'],
		[{ source: null }, 'Agent'],
		[{ source: 'chat' }, 'Agent'],
		[{ parentThreadId: 'parent-1', source: 'slack' }, 'Sub-agent'],
		[{ taskId: 'task-1', source: 'slack' }, 'Task'],
	] as const)('renders origin chip label for %j as %s', async (overrides, expectedLabel) => {
		const wrapper = await mountView({ threads: [makeThread(overrides)] });

		expect(wrapper.find('[data-test-id="agent-session-origin-pill"]').text()).toContain(
			expectedLabel,
		);
	});
});
