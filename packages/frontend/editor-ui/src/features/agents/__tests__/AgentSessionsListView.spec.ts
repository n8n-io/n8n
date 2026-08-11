/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

// Hoisted mock state so vi.mock factories (which run before any imports)
// can reference these without hitting a temporal-dead-zone error.
const {
	routerPush,
	routerResolve,
	storeState,
	fetchThreads,
	startAutoRefresh,
	stopAutoRefresh,
	refreshThreads,
	loadMore,
	deleteThread,
} = vi.hoisted(() => ({
	routerPush: vi.fn(),
	routerResolve: vi.fn((target: { href?: string }) => ({ href: target?.href ?? '/resolved' })),
	storeState: {
		threads: [] as unknown[],
		loading: false,
		nextCursor: null as string | null,
	},
	fetchThreads: vi.fn(),
	startAutoRefresh: vi.fn(),
	stopAutoRefresh: vi.fn(),
	refreshThreads: vi.fn(),
	loadMore: vi.fn(),
	deleteThread: vi.fn(),
}));

let windowOpenSpy: ReturnType<typeof vi.spyOn>;
let documentAddEventListenerSpy: ReturnType<typeof vi.spyOn>;
let documentRemoveEventListenerSpy: ReturnType<typeof vi.spyOn>;

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agentSessions.viewTrace': 'View session trace',
				'agentSessions.origin.agent': 'Agent',
				'agentSessions.origin.instanceAi': 'AI Assistant',
				'agentSessions.origin.mcp': 'MCP',
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
		name: 'N8nActionDropdown',
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
		fetchThreads,
		startAutoRefresh,
		stopAutoRefresh,
		refreshThreads,
		loadMore,
		deleteThread,
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
	manageStoreLifecycle = true,
}: {
	threads?: AgentExecutionThread[];
	openSessionInNewTab?: boolean;
	manageStoreLifecycle?: boolean;
} = {}) {
	storeState.threads = threads;
	storeState.loading = false;
	storeState.nextCursor = null;

	return mount(AgentSessionsListView, {
		props: {
			embedded: true,
			projectId: 'project-1',
			agentId: 'agent-1',
			openSessionInNewTab,
			manageStoreLifecycle,
		},
		global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
	});
}

describe('AgentSessionsListView', () => {
	beforeEach(() => {
		fetchThreads.mockReset();
		fetchThreads.mockResolvedValue(undefined);
		windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		documentAddEventListenerSpy = vi.spyOn(document, 'addEventListener');
		documentRemoveEventListenerSpy = vi.spyOn(document, 'removeEventListener');
		vi.clearAllMocks();
	});

	afterEach(() => {
		windowOpenSpy.mockRestore();
		documentAddEventListenerSpy.mockRestore();
		documentRemoveEventListenerSpy.mockRestore();
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
		expect(windowOpenSpy).not.toHaveBeenCalled();
	});

	it('uses a native title button while leaving the table row out of the tab order', async () => {
		const wrapper = await mountView();
		const row = wrapper.get('[data-test-id="agent-session-list-item"]');

		expect(row.attributes('tabindex')).toBeUndefined();

		await row.trigger('keydown', { key: 'Enter' });
		await row.trigger('keydown', { key: ' ' });

		expect(routerPush).not.toHaveBeenCalled();

		const openButton = wrapper.get('[data-test-id="agent-session-open"]');

		expect(openButton.element.tagName).toBe('BUTTON');
		expect(openButton.attributes('type')).toBe('button');
		expect(openButton.text()).toBe('My session');

		await openButton.trigger('click');

		expect(routerPush).toHaveBeenCalledExactlyOnceWith({
			name: 'AgentPreviewView',
			params: { projectId: 'project-1', agentId: 'agent-1' },
			query: { continueSessionId: 'thread-1', section: '__executions' },
		});
	});

	it('opens the conversation in a new tab when requested', async () => {
		const wrapper = await mountView({ openSessionInNewTab: true });
		const target = {
			name: 'AgentPreviewView',
			params: { projectId: 'project-1', agentId: 'agent-1' },
			query: { continueSessionId: 'thread-1', section: '__executions' },
		};

		await wrapper.find('[data-test-id="agent-session-list-item"]').trigger('click');

		expect(routerPush).not.toHaveBeenCalled();
		expect(routerResolve).toHaveBeenCalledExactlyOnceWith(target);
		expect(windowOpenSpy).toHaveBeenCalledExactlyOnceWith('/resolved', '_blank');
	});

	it('opens the trace timeline when the trace icon button is clicked', async () => {
		const wrapper = await mountView();

		await wrapper.get('[data-test-id="agent-session-view-trace"]').trigger('click');

		expect(routerPush).toHaveBeenCalledExactlyOnceWith({
			name: 'AgentSessionDetailView',
			params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
		});
		expect(windowOpenSpy).not.toHaveBeenCalled();
	});

	it('opens the trace in a new tab when requested', async () => {
		const wrapper = await mountView({ openSessionInNewTab: true });
		const target = {
			name: 'AgentSessionDetailView',
			params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
		};

		await wrapper.get('[data-test-id="agent-session-view-trace"]').trigger('click');

		expect(routerPush).not.toHaveBeenCalled();
		expect(routerResolve).toHaveBeenCalledExactlyOnceWith(target);
		expect(windowOpenSpy).toHaveBeenCalledExactlyOnceWith('/resolved', '_blank');
	});

	it('opens the parent trace in the current tab by default', async () => {
		const wrapper = await mountView({
			threads: [makeThread({ parentAgentId: 'parent-agent-1', parentThreadId: 'parent-thread-1' })],
		});

		wrapper.getComponent({ name: 'N8nActionDropdown' }).vm.$emit('select', 'goToParentRun');
		await flushPromises();

		expect(routerPush).toHaveBeenCalledExactlyOnceWith({
			name: 'AgentSessionDetailView',
			params: {
				projectId: 'project-1',
				agentId: 'parent-agent-1',
				threadId: 'parent-thread-1',
			},
		});
		expect(windowOpenSpy).not.toHaveBeenCalled();
	});

	it('fetches, polls, and manages the visibility listener by default', async () => {
		const wrapper = await mountView();
		await flushPromises();

		expect(fetchThreads).toHaveBeenCalledExactlyOnceWith('project-1', 'agent-1');
		expect(startAutoRefresh).toHaveBeenCalledTimes(1);
		const visibilityListenerCall = documentAddEventListenerSpy.mock.calls.find(
			(call: unknown[]) => call[0] === 'visibilitychange',
		);
		expect(visibilityListenerCall).toBeDefined();

		wrapper.unmount();

		expect(documentRemoveEventListenerSpy).toHaveBeenCalledWith(
			'visibilitychange',
			visibilityListenerCall?.[1],
		);
		expect(stopAutoRefresh).toHaveBeenCalledTimes(1);
	});

	it('does not re-arm lifecycle work when a pending fetch resolves after unmount', async () => {
		const deferredFetch = Promise.withResolvers<undefined>();
		fetchThreads.mockReturnValueOnce(deferredFetch.promise);
		const wrapper = await mountView();

		expect(documentAddEventListenerSpy).toHaveBeenCalledWith(
			'visibilitychange',
			expect.any(Function),
		);
		wrapper.unmount();
		expect(documentRemoveEventListenerSpy).toHaveBeenCalledWith(
			'visibilitychange',
			expect.any(Function),
		);
		expect(stopAutoRefresh).toHaveBeenCalledTimes(1);

		deferredFetch.resolve(undefined);
		await flushPromises();

		expect(startAutoRefresh).not.toHaveBeenCalled();
		expect(documentAddEventListenerSpy).toHaveBeenCalledTimes(1);
	});

	it('does not manage the session store lifecycle when ownership is disabled', async () => {
		const wrapper = await mountView({ manageStoreLifecycle: false });
		await flushPromises();

		expect(fetchThreads).not.toHaveBeenCalled();
		expect(startAutoRefresh).not.toHaveBeenCalled();
		expect(documentAddEventListenerSpy).not.toHaveBeenCalledWith(
			'visibilitychange',
			expect.any(Function),
		);

		wrapper.unmount();

		expect(stopAutoRefresh).not.toHaveBeenCalled();
		expect(documentRemoveEventListenerSpy).not.toHaveBeenCalledWith(
			'visibilitychange',
			expect.any(Function),
		);
	});

	it('renders the trace button with the view-trace aria label', async () => {
		const wrapper = await mountView();
		const traceButton = wrapper.get('[data-test-id="agent-session-view-trace"]');

		expect(traceButton.attributes('aria-label')).toBe('View session trace');
	});

	it.each([
		[{ source: 'slack' }, 'Slack'],
		[{ source: 'telegram' }, 'Telegram'],
		[{ source: 'instance-ai' }, 'AI Assistant'],
		[{ source: 'mcp' }, 'MCP'],
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
