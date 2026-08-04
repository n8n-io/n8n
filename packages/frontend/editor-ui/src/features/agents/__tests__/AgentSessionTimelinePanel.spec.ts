/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AgentSessionTimelinePanel from '../components/AgentSessionTimelinePanel.vue';
import type { ThreadDetail } from '../composables/useAgentThreadsApi';

const getThreadDetail = vi.fn();
const showError = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

vi.mock('@/features/agents/agentSessions.store', () => ({
	useAgentSessionsStore: () => ({ getThreadDetail }),
}));

// Avoid the project-agents list dependency — the panel only reads `.value`.
vi.mock('@/features/agents/composables/useSubAgentNames', () => ({
	useSubAgentNames: () => ({ subAgentNameById: { value: new Map() } }),
}));

const stubs = {
	SessionTimelineChart: { template: '<div data-test-id="chart-stub" />' },
	SessionTimelineTable: {
		name: 'SessionTimelineTable',
		props: ['selectedIndex'],
		template: '<div data-test-id="table-stub" :data-selected-index="selectedIndex ?? undefined" />',
	},
	SessionEventFilter: { template: '<div data-test-id="filter-stub" />' },
	SessionDetailPanel: { template: '<div data-test-id="detail-stub" />' },
	N8nInput: { template: '<input data-test-id="search-stub" />' },
	N8nIcon: { template: '<i />' },
};

const detail: ThreadDetail = {
	thread: { id: 't1' } as ThreadDetail['thread'],
	executions: [],
};

function mountPanel(props: Partial<{ projectId: string; agentId: string; threadId: string }> = {}) {
	return mount(AgentSessionTimelinePanel, {
		props: { projectId: 'p1', agentId: 'a1', threadId: 't1', ...props },
		global: { stubs },
	});
}

describe('AgentSessionTimelinePanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getThreadDetail.mockResolvedValue(detail);
	});

	afterEach(() => {
		vi.useRealTimers();
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

	it('polls the complete thread so simultaneous executions update together', async () => {
		vi.useFakeTimers();
		const initial = {
			...detail,
			executions: [
				{ id: 'exec-3', status: 'running', timeline: [] },
				{ id: 'exec-4', status: 'running', timeline: [] },
			],
		} as ThreadDetail;
		const refreshed = {
			...detail,
			executions: [
				{
					id: 'exec-3',
					status: 'running',
					timeline: [{ type: 'text', content: 'Third', timestamp: 1 }],
				},
				{
					id: 'exec-4',
					status: 'success',
					timeline: [{ type: 'text', content: 'Fourth', timestamp: 2 }],
				},
			],
		} as ThreadDetail;
		getThreadDetail.mockResolvedValueOnce(initial).mockResolvedValueOnce(refreshed);
		const wrapper = mountPanel();
		await flushPromises();

		await vi.advanceTimersByTimeAsync(5_000);
		await flushPromises();

		expect(getThreadDetail).toHaveBeenCalledTimes(2);
		expect(wrapper.emitted('loaded')?.at(-1)).toEqual([refreshed]);
		wrapper.unmount();
	});

	it('stops polling after the panel unmounts', async () => {
		vi.useFakeTimers();
		let resolveRefresh!: (value: ThreadDetail) => void;
		getThreadDetail
			.mockResolvedValueOnce(detail)
			.mockReturnValueOnce(new Promise<ThreadDetail>((resolve) => (resolveRefresh = resolve)));
		const wrapper = mountPanel();
		await flushPromises();
		vi.advanceTimersByTime(5_000);
		await flushPromises();
		expect(getThreadDetail).toHaveBeenCalledTimes(2);
		wrapper.unmount();
		resolveRefresh(detail);
		await flushPromises();

		await vi.advanceTimersByTimeAsync(10_000);

		expect(getThreadDetail).toHaveBeenCalledTimes(2);
	});

	it('does not restore a stale selection when a refresh resolves', async () => {
		vi.useFakeTimers();
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
		const runningDetail = { ...detail, executions: [execution] } as ThreadDetail;
		let resolveRefresh!: (value: ThreadDetail) => void;
		getThreadDetail
			.mockResolvedValueOnce(runningDetail)
			.mockReturnValueOnce(new Promise<ThreadDetail>((resolve) => (resolveRefresh = resolve)));
		const wrapper = mountPanel();
		await flushPromises();
		const table = wrapper.findComponent({ name: 'SessionTimelineTable' });
		table.vm.$emit('select', 0);
		vi.advanceTimersByTime(5_000);
		await flushPromises();

		table.vm.$emit('select', 1);
		resolveRefresh(runningDetail);
		await flushPromises();

		expect(wrapper.find('[data-test-id="table-stub"]').attributes('data-selected-index')).toBe('1');
		wrapper.unmount();
	});
});
