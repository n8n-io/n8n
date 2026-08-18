/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

// Hoisted mock state so vi.mock factories (which run before any imports)
// can reference these without hitting a temporal-dead-zone error.
const {
	routerPush,
	storeState,
	fetchThreads,
	startAutoRefresh,
	stopAutoRefresh,
	refreshThreads,
	loadMore,
	deleteThread,
} = vi.hoisted(() => ({
	routerPush: vi.fn(),
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

let documentAddEventListenerSpy: ReturnType<typeof vi.spyOn>;
let documentRemoveEventListenerSpy: ReturnType<typeof vi.spyOn>;

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agentSessions.viewTrace': 'View session trace',
				'agentSessions.origin.preview': 'Preview',
				'agentSessions.origin.instanceAi': 'AI Assistant',
				'agentSessions.origin.mcp': 'MCP',
				'agentSessions.origin.subAgent': 'Sub-agent',
				'agentSessions.origin.schedule': 'Schedule',
				'agentSessions.origin.workflow': 'Workflow',
				'agentSessions.empty': 'No agent sessions',
			})[key] ?? key,
	}),
}));

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: {} }),
	useRouter: () => ({ push: routerPush }),
}));

vi.mock('@n8n/design-system', () => ({
	N8nActionDropdown: {
		name: 'N8nActionDropdown',
		template: '<div data-test-id="agent-session-actions" />',
		props: ['items', 'activatorIcon'],
		emits: ['select'],
	},
	N8nButton: { template: '<button><slot /><slot name="icon" /></button>' },
	N8nIcon: { template: '<span :data-icon="icon" />', props: ['icon', 'size'] },
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
	manageStoreLifecycle = true,
}: {
	threads?: AgentExecutionThread[];
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
			manageStoreLifecycle,
		},
		global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
	});
}

describe('AgentSessionsListView', () => {
	beforeEach(() => {
		fetchThreads.mockReset();
		fetchThreads.mockResolvedValue(undefined);
		documentAddEventListenerSpy = vi.spyOn(document, 'addEventListener');
		documentRemoveEventListenerSpy = vi.spyOn(document, 'removeEventListener');
		vi.clearAllMocks();
	});

	afterEach(() => {
		documentAddEventListenerSpy.mockRestore();
		documentRemoveEventListenerSpy.mockRestore();
	});

	it('opens the trace from the row and keeps a native title button', async () => {
		const wrapper = await mountView();
		const row = wrapper.get('[data-test-id="agent-session-list-item"]');
		const expectedRoute = {
			name: 'AgentSessionDetailView',
			params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
		};

		expect(wrapper.find('[data-test-id="agent-session-new-chat"]').exists()).toBe(false);
		expect(row.attributes('role')).toBeUndefined();
		expect(row.attributes('tabindex')).toBeUndefined();

		await row.trigger('click');

		expect(routerPush).toHaveBeenCalledExactlyOnceWith(expectedRoute);

		const traceButton = wrapper.get('[data-test-id="agent-session-open"]');

		expect(traceButton.element.tagName).toBe('BUTTON');
		expect(traceButton.attributes('type')).toBe('button');
		expect(traceButton.text()).toBe('My session');

		routerPush.mockClear();
		await traceButton.trigger('click');

		expect(routerPush).toHaveBeenCalledExactlyOnceWith(expectedRoute);
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

	it.each([
		[{ source: 'slack' }, 'Slack', 'slack'],
		[{ source: 'telegram' }, 'Telegram', 'telegram'],
		[{ source: 'linear' }, 'Linear', 'linear'],
		[{ source: 'discord' }, 'Discord', 'discord'],
		[{ source: 'instance-ai' }, 'AI Assistant', 'flask-conical'],
		[{ source: 'mcp' }, 'MCP', 'flask-conical'],
		[{ source: null }, 'Preview', 'flask-conical'],
		[{ source: 'chat' }, 'Preview', 'flask-conical'],
		[{ source: 'n8n_chat' }, 'Preview', 'flask-conical'],
		[{ source: 'workflow' }, 'Workflow', 'workflow'],
		[{ source: 'subagent' }, 'Sub-agent', 'bot'],
		[{ parentThreadId: 'parent-1', source: 'slack' }, 'Sub-agent', 'bot'],
		[{ source: 'task' }, 'Schedule', 'clock'],
		[{ taskId: 'task-1', source: 'slack' }, 'Schedule', 'clock'],
		[{ source: 'teams' }, 'Teams', 'plug'],
		[{ source: ' Slack ' }, 'Slack', 'slack'],
	] as const)(
		'renders origin chip for %j as %s with the %s icon',
		async (overrides, expectedLabel, expectedIcon) => {
			const wrapper = await mountView({ threads: [makeThread(overrides)] });
			const originPill = wrapper.get('[data-test-id="agent-session-origin-pill"]');

			expect(originPill.text()).toContain(expectedLabel);
			expect(originPill.get('[data-icon]').attributes('data-icon')).toBe(expectedIcon);
		},
	);
});
