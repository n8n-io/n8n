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
	setFilters,
} = vi.hoisted(() => ({
	routerPush: vi.fn(),
	storeState: {
		threads: [] as unknown[],
		loading: false,
		nextCursor: null as string | null,
		autoRefresh: true,
		filters: { status: 'all', origin: 'all', startDate: '', endDate: '' },
	},
	fetchThreads: vi.fn(),
	startAutoRefresh: vi.fn(),
	stopAutoRefresh: vi.fn(),
	refreshThreads: vi.fn(),
	loadMore: vi.fn(),
	deleteThread: vi.fn(),
	setFilters: vi.fn(),
}));

let documentAddEventListenerSpy: ReturnType<typeof vi.spyOn>;
let documentRemoveEventListenerSpy: ReturnType<typeof vi.spyOn>;

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string | number> }) => {
			if (key === 'executionDetails.runningTimeFinished') {
				return `in ${options?.interpolate?.time}`;
			}
			return (
				{
					'agentSessions.viewTrace': 'View session trace',
					'agentSessions.origin.preview': 'Preview',
					'agentSessions.origin.instanceAi': 'n8n Assistant',
					'agentSessions.origin.mcp': 'MCP',
					'agentSessions.origin.subAgent': 'Sub-agent',
					'agentSessions.origin.schedule': 'Schedule',
					'agentSessions.origin.workflow': 'Workflow',
					'agentSessions.origin.n8nChat': 'n8n Chat',
					'agentSessions.empty': 'No agent sessions',
					'agentSessions.emptyDescription':
						'Sessions will appear here after you preview your agent.',
					'agentSessions.emptyWithFilters': 'No sessions match these filters',
					'agentSessions.status.running': 'Running',
					'ai.thinking.active': 'Thinking',
					'agentSessions.activity.responding': 'Responding',
					'agentSessions.status.succeeded': 'Succeeded',
					'agentSessions.status.error': 'Error',
					'agentSessions.status.cancelled': 'Canceled',
					'agentSessions.status.interrupted': 'Interrupted',
				}[key] ?? key
			);
		},
	}),
}));

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: {} }),
	useRouter: () => ({ push: routerPush }),
	RouterLink: {
		name: 'RouterLink',
		props: ['to'],
		template: '<a><slot /></a>',
	},
}));

vi.mock('@n8n/design-system', () => ({
	N8nActionDropdown: {
		name: 'N8nActionDropdown',
		template: '<div data-test-id="agent-session-actions" />',
		props: ['items', 'activatorIcon'],
		emits: ['select'],
	},
	N8nBadge: {
		props: ['leadingIcon'],
		template: '<span><span :data-icon="leadingIcon" /><slot /></span>',
	},
	N8nButton: { template: '<button><slot /><slot name="icon" /></button>' },
	N8nTooltip: { props: ['content', 'placement'], template: '<span><slot /></span>' },
	N8nCheckbox: {
		props: ['modelValue', 'label'],
		emits: ['update:modelValue'],
		template:
			'<label><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />{{ label }}</label>',
	},
	N8nIcon: {
		template: '<span :data-icon="icon" :data-color="color" />',
		props: ['icon', 'size', 'color'],
	},
	N8nSpinner: { template: '<span data-spinner />', props: ['size'] },
	N8nIconButton: {
		template: '<button v-bind="$attrs"><slot /></button>',
	},
	N8nText: {
		props: ['color'],
		template: '<span :data-color="color"><slot /></span>',
	},
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
		get autoRefresh() {
			return storeState.autoRefresh;
		},
		set autoRefresh(value: boolean) {
			storeState.autoRefresh = value;
		},
		get filters() {
			return storeState.filters;
		},
		fetchThreads,
		startAutoRefresh,
		stopAutoRefresh,
		refreshThreads,
		loadMore,
		deleteThread,
		setFilters,
	}),
}));

vi.mock('../components/AgentSessionsFilter.vue', () => ({
	default: {
		name: 'AgentSessionsFilter',
		emits: ['filterChanged'],
		template:
			"<button data-test-id=\"agent-sessions-filter\" @click=\"$emit('filterChanged', { status: 'error', origin: 'all', startDate: '', endDate: '' })\" />",
	},
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
		canContinueInPreview: true,
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
		failureSummary: null,
		status: 'succeeded',
		...overrides,
	};
}

async function mountView({
	threads = [makeThread()],
	manageStoreLifecycle = true,
	filters = { status: 'all', origin: 'all', startDate: '', endDate: '' },
}: {
	threads?: AgentExecutionThread[];
	manageStoreLifecycle?: boolean;
	filters?: typeof storeState.filters;
} = {}) {
	storeState.threads = threads;
	storeState.loading = false;
	storeState.nextCursor = null;
	storeState.filters = filters;

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
		storeState.autoRefresh = true;
		fetchThreads.mockReset();
		fetchThreads.mockResolvedValue(undefined);
		setFilters.mockReset();
		setFilters.mockResolvedValue(undefined);
		documentAddEventListenerSpy = vi.spyOn(document, 'addEventListener');
		documentRemoveEventListenerSpy = vi.spyOn(document, 'removeEventListener');
		vi.clearAllMocks();
	});

	afterEach(() => {
		documentAddEventListenerSpy.mockRestore();
		documentRemoveEventListenerSpy.mockRestore();
	});

	it.each([
		{
			status: 'running',
			latestActivity: { type: 'reasoning' },
			expected: 'instanceAi.agentPreview.building.',
		},
		{ status: 'running', latestActivity: { type: 'text' }, expected: 'Responding' },
		{
			status: 'running',
			latestActivity: { type: 'tool-call', toolName: 'web_search' },
			expected: 'Web search',
		},
		{
			status: 'running',
			latestActivity: {
				type: 'tool-call',
				toolName: 'send_mail',
				displayName: 'Send weekly report',
			},
			expected: 'Send weekly report',
		},
		{ status: 'running', latestActivity: null, expected: 'My session' },
		{ status: 'succeeded', latestActivity: { type: 'reasoning' }, expected: 'My session' },
	] satisfies Array<
		Pick<AgentExecutionThread, 'status' | 'latestActivity'> & { expected: string }
	>)('shows $expected for $status activity', async ({ status, latestActivity, expected }) => {
		const wrapper = await mountView({ threads: [makeThread({ status, latestActivity })] });
		expect(wrapper.get('[data-test-id="agent-session-list-item"]').text()).toContain(expected);
		wrapper.unmount();
	});

	it('keeps separate reasoning labels stable across renders', async () => {
		const wrapper = await mountView({
			threads: [
				makeThread({ id: 'reasoning-1', status: 'running', latestActivity: { type: 'reasoning' } }),
				makeThread({ id: 'reasoning-2', status: 'running', latestActivity: { type: 'reasoning' } }),
			],
		});
		function reasoningRowLabels() {
			return wrapper
				.findAll('[data-test-id="agent-session-list-item"]')
				.flatMap((row) =>
					row.text().includes('instanceAi.agentPreview.building.') ? [row.text()] : [],
				);
		}

		const labels = reasoningRowLabels();
		expect(labels).toHaveLength(2);
		for (const label of labels) {
			expect(label).toContain('instanceAi.agentPreview.building.');
		}

		wrapper.vm.$forceUpdate();
		await flushPromises();

		expect(reasoningRowLabels()).toEqual(labels);
		wrapper.unmount();
	});

	it('links each row to its trace', async () => {
		const wrapper = await mountView();
		const row = wrapper.get('[data-test-id="agent-session-list-item"]');

		expect(wrapper.find('[data-test-id="agent-session-new-chat"]').exists()).toBe(false);
		expect(row.attributes('role')).toBeUndefined();
		expect(row.attributes('tabindex')).toBeUndefined();
		expect(row.getComponent({ name: 'RouterLink' }).props('to')).toEqual({
			name: 'AgentSessionDetailView',
			params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
		});
		expect(wrapper.get('[data-test-id="agent-session-title"]').text()).toBe('My session');
	});

	it.each([
		['succeeded', 'Succeeded', 'success'],
		['error', 'Error', 'danger'],
		['cancelled', 'Canceled', 'text-xlight'],
		['interrupted', 'Interrupted', 'text-xlight'],
		['running', 'Running', undefined],
	] as const)('renders the %s session state', async (status, label, color) => {
		const wrapper = await mountView({
			threads: [makeThread({ status })],
		});
		const indicator = wrapper.get('[data-testid="agent-session-status-indicator"]');

		expect(indicator.attributes('aria-label')).toBe(label);
		expect(indicator.attributes('data-color')).toBe(color);
	});

	it('requests filtered results when the filter changes', async () => {
		const wrapper = await mountView();

		await wrapper.get('[data-test-id="agent-sessions-filter"]').trigger('click');

		expect(setFilters).toHaveBeenCalledWith('project-1', 'agent-1', {
			status: 'error',
			origin: 'all',
			startDate: '',
			endDate: '',
		});
	});

	it('shows guidance in the empty state when there are no sessions', async () => {
		const wrapper = await mountView({
			threads: [],
		});

		expect(wrapper.get('[data-test-id="agent-sessions-empty"]').text()).toBe('No agent sessions');
		expect(wrapper.get('[data-test-id="agent-sessions-empty-description"]').text()).toBe(
			'Sessions will appear here after you preview your agent.',
		);
	});

	it('shows the filtered empty state when no sessions match', async () => {
		const wrapper = await mountView({
			threads: [],
			filters: { status: 'error', origin: 'all', startDate: '', endDate: '' },
		});

		expect(wrapper.get('[data-test-id="agent-sessions-empty"]').text()).toBe(
			'No sessions match these filters',
		);
		expect(wrapper.find('[data-test-id="agent-sessions-empty-description"]').exists()).toBe(false);
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

	it('fetches, polls, and refreshes visible tabs only while auto refresh is enabled', async () => {
		const wrapper = await mountView();
		await flushPromises();

		expect(fetchThreads).toHaveBeenCalledExactlyOnceWith('project-1', 'agent-1');
		expect(startAutoRefresh).toHaveBeenCalledTimes(1);
		const visibilityListenerCall = documentAddEventListenerSpy.mock.calls.find(
			(call: unknown[]) => call[0] === 'visibilitychange',
		);
		expect(visibilityListenerCall).toBeDefined();
		const visibilityListener = visibilityListenerCall?.[1] as EventListener;
		visibilityListener(new Event('visibilitychange'));
		expect(refreshThreads).toHaveBeenCalledExactlyOnceWith('project-1', 'agent-1');

		storeState.autoRefresh = false;
		visibilityListener(new Event('visibilitychange'));
		expect(refreshThreads).toHaveBeenCalledTimes(1);

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

		const visibilityListener = documentAddEventListenerSpy.mock.calls.find(
			(call: unknown[]) => call[0] === 'visibilitychange',
		)?.[1] as EventListener | undefined;
		visibilityListener?.(new Event('visibilitychange'));
		expect(refreshThreads).not.toHaveBeenCalled();

		wrapper.unmount();

		expect(stopAutoRefresh).not.toHaveBeenCalled();
	});

	it.each([
		[{ source: 'slack' }, 'Slack', 'slack'],
		[{ source: 'telegram' }, 'Telegram', 'telegram'],
		[{ source: 'linear' }, 'Linear', 'linear'],
		[{ source: 'discord' }, 'Discord', 'discord'],
		[{ source: 'whatsapp' }, 'WhatsApp', 'whatsapp'],
		[{ source: 'instance-ai' }, 'n8n Assistant', 'n8n-assistant'],
		[{ source: 'mcp' }, 'MCP', 'flask-conical'],
		[{ source: null }, 'Preview', 'flask-conical'],
		[{ source: 'chat' }, 'Preview', 'flask-conical'],
		[{ source: 'n8n_chat' }, 'Preview', 'flask-conical'],
		[{ source: 'n8n_chat_production' }, 'n8n Chat', 'message-square'],
		[{ source: 'workflow' }, 'Workflow', 'workflow'],
		[{ source: 'subagent' }, 'Sub-agent', 'bot'],
		[{ parentThreadId: 'parent-1', source: 'slack' }, 'Sub-agent', 'bot'],
		[{ source: 'task' }, 'Schedule', 'clock'],
		[{ taskId: 'task-1', source: 'slack' }, 'Schedule', 'clock'],
		[{ source: 'teams' }, 'Teams', 'teams'],
		[{ source: 'future-channel' }, 'Future-channel', 'plug'],
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
	describe('sub-agent tree', () => {
		/** Builds a session whose title equals its id, so rows are easy to identify. */
		function makeNode(
			id: string,
			parentThreadId: string | null = null,
			createdAt = '2026-07-20T10:00:00.000Z',
		) {
			return makeThread({
				id,
				title: id,
				parentThreadId,
				parentAgentId: parentThreadId ? 'agent-1' : null,
				createdAt,
			});
		}

		function rows(wrapper: Awaited<ReturnType<typeof mountView>>) {
			return wrapper.findAll('[data-test-id="agent-session-list-item"]');
		}

		function rowOrder(wrapper: Awaited<ReturnType<typeof mountView>>) {
			return rows(wrapper).map((row) => [
				row.get('[data-test-id="agent-session-title"]').text(),
				row.attributes('data-depth'),
			]);
		}

		function rowById(wrapper: Awaited<ReturnType<typeof mountView>>, id: string) {
			const row = rows(wrapper).find(
				(item) => item.get('[data-test-id="agent-session-title"]').text() === id,
			);
			if (!row) throw new Error(`Row ${id} not found`);
			return row;
		}

		it('renders a child directly after its parent, even when the store lists it first', async () => {
			const wrapper = await mountView({
				threads: [makeNode('child', 'parent'), makeNode('other'), makeNode('parent')],
			});

			expect(rowOrder(wrapper)).toEqual([
				['other', '0'],
				['parent', '0'],
				['child', '1'],
			]);
		});

		it('sorts children by start time and keeps the store order for roots', async () => {
			const wrapper = await mountView({
				threads: [
					makeNode('root-b'),
					makeNode('late', 'root-b', '2026-07-20T10:03:00.000Z'),
					makeNode('early', 'root-b', '2026-07-20T10:01:00.000Z'),
					makeNode('root-a'),
				],
			});

			expect(rowOrder(wrapper)).toEqual([
				['root-b', '0'],
				['early', '1'],
				['late', '1'],
				['root-a', '0'],
			]);
		});

		it('nests grandchildren under their own parent', async () => {
			const wrapper = await mountView({
				threads: [
					makeNode('root'),
					makeNode('child-a', 'root', '2026-07-20T10:01:00.000Z'),
					makeNode('child-b', 'root', '2026-07-20T10:02:00.000Z'),
					makeNode('grandchild', 'child-a'),
				],
			});

			expect(rowOrder(wrapper)).toEqual([
				['root', '0'],
				['child-a', '1'],
				['grandchild', '2'],
				['child-b', '1'],
			]);
		});

		it('renders a session as a root when its parent is not loaded', async () => {
			const wrapper = await mountView({ threads: [makeNode('orphan', 'missing-parent')] });

			expect(rowOrder(wrapper)).toEqual([['orphan', '0']]);
			expect(wrapper.find('[data-test-id="agent-session-rail"]').exists()).toBe(false);
		});

		it('renders each session once when parent links form a cycle', async () => {
			const wrapper = await mountView({
				threads: [makeNode('self', 'self'), makeNode('a', 'b'), makeNode('b', 'a')],
			});

			const titles = rowOrder(wrapper).map(([title]) => title);
			expect(titles).toHaveLength(new Set(titles).size);
			expect(titles).toEqual(expect.arrayContaining(['self', 'a', 'b']));
		});

		it('draws one rail cell for each level of depth and none for roots', async () => {
			const wrapper = await mountView({
				threads: [makeNode('root'), makeNode('child', 'root'), makeNode('grandchild', 'child')],
			});

			expect(rowById(wrapper, 'root').find('[data-test-id="agent-session-rail"]').exists()).toBe(
				false,
			);

			const child = rowById(wrapper, 'child');
			expect(child.findAll('[data-test-id="agent-session-rail-guide"]')).toHaveLength(0);
			expect(child.findAll('[data-test-id="agent-session-rail-branch"]')).toHaveLength(1);

			const grandchild = rowById(wrapper, 'grandchild');
			expect(grandchild.findAll('[data-test-id="agent-session-rail-guide"]')).toHaveLength(1);
			expect(grandchild.findAll('[data-test-id="agent-session-rail-branch"]')).toHaveLength(1);
		});

		it('draws a middle branch for earlier children and a last branch for the final child', async () => {
			const wrapper = await mountView({
				threads: [
					makeNode('root'),
					makeNode('first', 'root', '2026-07-20T10:01:00.000Z'),
					makeNode('second', 'root', '2026-07-20T10:02:00.000Z'),
				],
			});

			function branchOf(id: string) {
				return rowById(wrapper, id)
					.get('[data-test-id="agent-session-rail-branch"]')
					.attributes('data-branch');
			}

			expect(branchOf('first')).toBe('middle');
			expect(branchOf('second')).toBe('last');
		});

		it('continues an ancestor rail only while that ancestor has siblings below', async () => {
			const wrapper = await mountView({
				threads: [
					makeNode('root'),
					makeNode('child-a', 'root', '2026-07-20T10:01:00.000Z'),
					makeNode('child-b', 'root', '2026-07-20T10:02:00.000Z'),
					makeNode('under-a', 'child-a'),
					makeNode('under-b', 'child-b'),
				],
			});

			function guideOf(id: string) {
				return rowById(wrapper, id)
					.get('[data-test-id="agent-session-rail-guide"]')
					.attributes('data-continues');
			}

			expect(guideOf('under-a')).toBe('true');
			expect(guideOf('under-b')).toBe('false');
		});

		it('draws the stub under the status icon only for parents', async () => {
			const wrapper = await mountView({
				threads: [makeNode('root'), makeNode('child', 'root'), makeNode('lonely')],
			});

			function hasStub(id: string) {
				return rowById(wrapper, id).find('[data-test-id="agent-session-rail-stub"]').exists();
			}

			expect(hasStub('root')).toBe(true);
			expect(hasStub('child')).toBe(false);
			expect(hasStub('lonely')).toBe(false);
		});

		it('keeps the link and parent action on child rows', async () => {
			const wrapper = await mountView({
				threads: [makeNode('root'), makeNode('child', 'root')],
			});
			const child = rowById(wrapper, 'child');

			expect(child.getComponent({ name: 'RouterLink' }).props('to')).toEqual({
				name: 'AgentSessionDetailView',
				params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'child' },
			});

			child.getComponent({ name: 'N8nActionDropdown' }).vm.$emit('select', 'goToParentRun');
			await flushPromises();

			expect(routerPush).toHaveBeenCalledExactlyOnceWith({
				name: 'AgentSessionDetailView',
				params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'root' },
			});
		});
	});
});
