/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
	SessionTimelineTable: { template: '<div data-test-id="table-stub" />' },
	SessionEventFilter: { template: '<div data-test-id="filter-stub" />' },
	SessionDetailPanel: { template: '<div data-test-id="detail-stub" />' },
	N8nInput: { template: '<input data-test-id="search-stub" />' },
	N8nIcon: { template: '<i />' },
};

const detail: ThreadDetail = {
	thread: { id: 't1' } as ThreadDetail['thread'],
	executions: [],
};

const execution = {
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
	timeline: null,
	error: null,
	hitlStatus: null,
	source: null,
} satisfies ThreadDetail['executions'][number];

function dispatchKeyboardEvent(type: 'keydown' | 'keyup', key: string) {
	const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
	document.dispatchEvent(event);
	return event;
}

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

describe('AgentSessionTimelinePanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
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
			executions: [execution],
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

			const timelineRow = wrapper.get('[data-test-id="timeline-row"]');
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
});
