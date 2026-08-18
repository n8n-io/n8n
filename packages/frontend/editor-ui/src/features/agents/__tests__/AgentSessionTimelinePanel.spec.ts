/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PushMessage } from '@n8n/api-types';
import { enableAutoUnmount, mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';
import AgentSessionTimelinePanel from '../components/AgentSessionTimelinePanel.vue';
import type { ThreadDetail } from '../composables/useAgentThreadsApi';
import type { FilterOption } from '../session-timeline.types';

const getThreadDetail = vi.fn();
const showError = vi.fn();
const pushHandlers = new Set<(event: PushMessage) => void>();
const pushStore = reactive({
	isConnected: false,
	pushConnect: vi.fn(),
	pushDisconnect: vi.fn(),
	addEventListener: vi.fn((handler: (event: PushMessage) => void) => {
		pushHandlers.add(handler);
		return () => pushHandlers.delete(handler);
	}),
});

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

vi.mock('@/features/agents/agentSessions.store', () => ({
	useAgentSessionsStore: () => ({ getThreadDetail }),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => pushStore,
}));

// Avoid the project-agents list dependency — the panel only reads `.value`.
vi.mock('@/features/agents/composables/useSubAgentNames', () => ({
	useSubAgentNames: () => ({ subAgentNameById: { value: new Map() } }),
}));

const stubs = {
	SessionTimelineChart: { template: '<div data-test-id="chart-stub" />' },
	SessionTimelineTable: {
		name: 'SessionTimelineTable',
		props: ['selectedIndex', 'items'],
		template:
			'<div data-test-id="table-stub" :data-selected-index="selectedIndex ?? undefined" :data-item-count="items.length" />',
	},
	SessionEventFilter: {
		name: 'SessionEventFilter',
		props: ['available'],
		template: '<div data-test-id="filter-stub" />',
	},
	SessionDetailPanel: { template: '<div data-test-id="detail-stub" />' },
	N8nInput: { template: '<input data-test-id="search-stub" />' },
	N8nIcon: { template: '<i />' },
};

const detail: ThreadDetail = {
	thread: { id: 't1' } as ThreadDetail['thread'],
	executions: [],
};

const keyboardExecution = {
	id: 'execution-1',
	threadId: 't1',
	agentId: 'a1',
	status: 'success',
	createdAt: '2026-08-03T12:00:00.000Z',
	startedAt: '2026-08-03T12:00:00.000Z',
	stoppedAt: null,
	duration: 0,
	userMessage: 'Hello',
	attachments: null,
	model: null,
	promptTokens: null,
	completionTokens: null,
	totalTokens: null,
	cost: null,
	timeline: [
		{
			type: 'text',
			content: 'Hello back',
			timestamp: Date.parse('2026-08-03T12:00:01.000Z'),
		},
	],
	error: null,
	hitlStatus: null,
	source: null,
} satisfies ThreadDetail['executions'][number];

const errorFilterExecution = {
	...keyboardExecution,
	status: 'error',
	userMessage: null,
	error: 'A tool failed',
	timeline: [
		{
			type: 'tool-call',
			kind: 'tool',
			name: 'failed_tool',
			toolCallId: 'failed-call',
			input: {},
			output: { error: 'A tool failed' },
			startTime: 100,
			endTime: 200,
			success: false,
		},
	],
} satisfies ThreadDetail['executions'][number];

function dispatchKeyboardEvent(type: 'keydown' | 'keyup', key: string) {
	const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
	document.dispatchEvent(event);
	return event;
}

const update: PushMessage = {
	type: 'agentExecutionUpdated',
	data: {
		projectId: 'p1',
		agentId: 'a1',
		threadId: 't1',
		executionId: 'exec-1',
	},
};

enableAutoUnmount(afterEach);

function mountPanel(
	props: Partial<{ projectId: string; agentId: string; threadId: string }> = {},
	options: { attachTo?: HTMLElement; renderTimelineTable?: boolean } = {},
) {
	return mount(AgentSessionTimelinePanel, {
		...(options.attachTo ? { attachTo: options.attachTo } : {}),
		props: { projectId: 'p1', agentId: 'a1', threadId: 't1', ...props },
		global: {
			stubs: {
				...stubs,
				...(options.renderTimelineTable ? { SessionTimelineTable: false } : {}),
			},
		},
	});
}

function emitPush(message: PushMessage = update) {
	pushHandlers.forEach((handler) => handler(message));
}

describe('AgentSessionTimelinePanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pushHandlers.clear();
		pushStore.isConnected = false;
		getThreadDetail.mockResolvedValue(detail);
	});

	it('loads the thread detail on mount for its props', async () => {
		mountPanel();
		await flushPromises();

		expect(getThreadDetail).toHaveBeenCalledWith('p1', 'a1', 't1');
	});

	it('emits loaded(null) at load start and the detail once resolved', async () => {
		const wrapper = mountPanel();

		// The immediate watch resets the header synchronously during mount.
		expect(wrapper.emitted('loaded')?.[0]).toEqual([null]);

		await flushPromises();

		const events = wrapper.emitted('loaded') ?? [];
		expect(events.at(-1)).toEqual([detail]);
	});

	it('renders the timeline table once loading finishes', async () => {
		const wrapper = mountPanel();
		await flushPromises();

		expect(wrapper.find('[data-test-id="table-stub"]').exists()).toBe(true);
	});

	it('offers status pills only for statuses present in the session', async () => {
		getThreadDetail.mockResolvedValueOnce({
			...detail,
			executions: [errorFilterExecution],
		});
		const wrapper = mountPanel();
		await flushPromises();

		const options = wrapper
			.getComponent({ name: 'SessionEventFilter' })
			.props('available') as FilterOption[];
		expect(
			options
				.filter((option) => option.presentation === 'badge')
				.map(({ key, count }) => [key, count]),
		).toEqual([['error', 1]]);
	});

	it('omits status pills when the session has no matching statuses', async () => {
		getThreadDetail.mockResolvedValueOnce({ ...detail, executions: [keyboardExecution] });
		const wrapper = mountPanel();
		await flushPromises();

		const options = wrapper
			.getComponent({ name: 'SessionEventFilter' })
			.props('available') as FilterOption[];
		expect(options.every((option) => option.presentation === 'swatch')).toBe(true);
	});

	it('reloads when the threadId prop changes', async () => {
		const wrapper = mountPanel();
		await flushPromises();
		expect(getThreadDetail).toHaveBeenCalledTimes(1);

		await wrapper.setProps({ threadId: 't2' });
		await flushPromises();

		expect(getThreadDetail).toHaveBeenLastCalledWith('p1', 'a1', 't2');
	});

	it('surfaces a toast when the detail fails to load', async () => {
		getThreadDetail.mockRejectedValueOnce(new Error('boom'));
		mountPanel();
		await flushPromises();

		expect(showError).toHaveBeenCalled();
	});

	it('handles timeline shortcuts only while focus is within the panel', async () => {
		getThreadDetail.mockResolvedValueOnce({
			...detail,
			executions: [keyboardExecution],
		});
		const host = document.createElement('div');
		const outsideButton = document.createElement('button');
		document.body.append(host, outsideButton);
		const wrapper = mountPanel({}, { attachTo: host, renderTimelineTable: true });

		try {
			await flushPromises();
			outsideButton.focus();
			const outsideKeydown = dispatchKeyboardEvent('keydown', 'ArrowDown');
			expect(outsideKeydown.defaultPrevented).toBe(false);

			const timelineRows = wrapper.findAll('[data-test-id="timeline-row"]');
			const timelineRow = timelineRows[0];
			expect(timelineRows).toHaveLength(2);
			(timelineRow.element as HTMLElement).focus();
			expect(document.activeElement).toBe(timelineRow.element);
			const insideKeydown = dispatchKeyboardEvent('keydown', 'ArrowDown');
			expect(insideKeydown.defaultPrevented).toBe(true);
			expect(wrapper.find('[data-test-id="detail-stub"]').exists()).toBe(false);

			outsideButton.focus();
			const outsideKeyup = dispatchKeyboardEvent('keyup', 'ArrowDown');
			expect(outsideKeyup.defaultPrevented).toBe(false);
			expect(wrapper.find('[data-test-id="detail-stub"]').exists()).toBe(false);

			(timelineRow.element as HTMLElement).focus();
			const insideKeyup = dispatchKeyboardEvent('keyup', 'ArrowDown');
			expect(insideKeyup.defaultPrevented).toBe(true);
			await flushPromises();
			expect(wrapper.find('[data-test-id="detail-stub"]').exists()).toBe(true);

			const moveKeydown = dispatchKeyboardEvent('keydown', 'ArrowDown');
			expect(moveKeydown.defaultPrevented).toBe(true);
			await flushPromises();
			expect(document.activeElement).toBe(timelineRows[1].element);
			const moveKeyup = dispatchKeyboardEvent('keyup', 'ArrowDown');
			expect(moveKeyup.defaultPrevented).toBe(true);

			(wrapper.get('[data-test-id="search-stub"]').element as HTMLInputElement).focus();
			const inputEscape = dispatchKeyboardEvent('keydown', 'Escape');
			expect(inputEscape.defaultPrevented).toBe(false);
			expect(wrapper.find('[data-test-id="detail-stub"]').exists()).toBe(true);

			outsideButton.focus();
			const outsideEscape = dispatchKeyboardEvent('keydown', 'Escape');
			expect(outsideEscape.defaultPrevented).toBe(false);
			expect(wrapper.find('[data-test-id="detail-stub"]').exists()).toBe(true);
		} finally {
			wrapper.unmount();
			host.remove();
			outsideButton.remove();
		}
	});

	it('refreshes the rendered thread only for matching invalidations', async () => {
		const refreshed = {
			...detail,
			executions: [
				{
					id: 'exec-1',
					status: 'running',
					timeline: [{ type: 'text', content: 'Working', timestamp: 1 }],
				},
			],
		} as unknown as ThreadDetail;
		const wrapper = mountPanel();
		await flushPromises();

		for (const data of [
			{ ...update.data, projectId: 'other-project' },
			{ ...update.data, agentId: 'other-agent' },
			{ ...update.data, threadId: 'other-thread' },
		]) {
			emitPush({ type: 'agentExecutionUpdated', data });
		}
		await flushPromises();
		expect(getThreadDetail).toHaveBeenCalledTimes(1);

		getThreadDetail.mockResolvedValueOnce(refreshed);
		emitPush();
		await flushPromises();

		expect(getThreadDetail).toHaveBeenCalledTimes(2);
		expect(wrapper.emitted('loaded')?.at(-1)).toEqual([refreshed]);
		expect(wrapper.find('[data-test-id="table-stub"]').attributes('data-item-count')).toBe('1');
	});

	it('reconciles state after the push connection reconnects', async () => {
		const refreshed = { ...detail, thread: { ...detail.thread, title: 'Updated' } };
		getThreadDetail.mockResolvedValueOnce(detail).mockResolvedValueOnce(refreshed);
		const wrapper = mountPanel();
		await flushPromises();

		pushStore.isConnected = true;
		await flushPromises();

		expect(getThreadDetail).toHaveBeenCalledTimes(2);
		expect(wrapper.emitted('loaded')?.at(-1)).toEqual([refreshed]);
	});

	it('coalesces invalidations while a refresh is in flight', async () => {
		let resolveRefresh!: (value: ThreadDetail) => void;
		const refreshed = { ...detail, thread: { ...detail.thread, title: 'Refreshed' } };
		getThreadDetail
			.mockResolvedValueOnce(detail)
			.mockReturnValueOnce(new Promise<ThreadDetail>((resolve) => (resolveRefresh = resolve)))
			.mockResolvedValueOnce(refreshed);
		const wrapper = mountPanel();
		await flushPromises();

		emitPush();
		emitPush();
		emitPush();
		await flushPromises();
		expect(getThreadDetail).toHaveBeenCalledTimes(2);

		resolveRefresh(detail);
		await flushPromises();

		expect(getThreadDetail).toHaveBeenCalledTimes(3);
		expect(wrapper.emitted('loaded')?.at(-1)).toEqual([refreshed]);
	});

	it('ignores stale responses and invalidations after the selected thread changes', async () => {
		let resolveStaleRefresh!: (value: ThreadDetail) => void;
		const nextDetail = {
			...detail,
			thread: { ...detail.thread, id: 't2', title: 'Current thread' },
		} as ThreadDetail;
		const staleDetail = {
			...detail,
			thread: { ...detail.thread, title: 'Stale thread' },
		} as ThreadDetail;
		getThreadDetail
			.mockResolvedValueOnce(detail)
			.mockReturnValueOnce(new Promise<ThreadDetail>((resolve) => (resolveStaleRefresh = resolve)))
			.mockResolvedValueOnce(nextDetail);
		const wrapper = mountPanel();
		await flushPromises();

		emitPush();
		await flushPromises();
		await wrapper.setProps({ threadId: 't2' });
		await flushPromises();
		emitPush();
		resolveStaleRefresh(staleDetail);
		await flushPromises();

		expect(getThreadDetail).toHaveBeenCalledTimes(3);
		expect(getThreadDetail).toHaveBeenLastCalledWith('p1', 'a1', 't2');
		expect(wrapper.emitted('loaded')?.at(-1)).toEqual([nextDetail]);
	});

	it('disconnects and ignores invalidations after unmount', async () => {
		const wrapper = mountPanel();
		await flushPromises();

		wrapper.unmount();
		emitPush();
		await flushPromises();

		expect(pushStore.pushConnect).toHaveBeenCalledOnce();
		expect(pushStore.pushDisconnect).toHaveBeenCalledOnce();
		expect(pushHandlers.size).toBe(0);
		expect(getThreadDetail).toHaveBeenCalledOnce();
	});

	it('keeps the selected timeline item through reconciliation', async () => {
		const execution = {
			id: 'exec-1',
			status: 'running',
			createdAt: '2026-08-04T07:00:00.000Z',
			startedAt: '2026-08-04T07:00:00.000Z',
			stoppedAt: null,
			duration: 0,
			userMessage: 'Question',
			timeline: [{ type: 'text', content: 'Answer', timestamp: 1 }],
		};
		const runningDetail = { ...detail, executions: [execution] } as unknown as ThreadDetail;
		const refreshedDetail = {
			...detail,
			executions: [
				{
					...execution,
					timeline: [
						{ type: 'text', content: 'Earlier update', timestamp: 0 },
						{ type: 'text', content: 'Answer', timestamp: 1 },
					],
				},
			],
		} as unknown as ThreadDetail;
		getThreadDetail.mockResolvedValueOnce(runningDetail).mockResolvedValueOnce(refreshedDetail);
		const wrapper = mountPanel();
		await flushPromises();
		const table = wrapper.findComponent({ name: 'SessionTimelineTable' });
		table.vm.$emit('select', 1);
		emitPush();
		await flushPromises();

		expect(wrapper.find('[data-test-id="table-stub"]').attributes('data-selected-index')).toBe('2');
	});
});
