import { i18nInstance } from '@n8n/i18n';
/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AgentBackgroundJobDto, AgentChatResumeDto, PushMessage } from '@n8n/api-types';
import { enableAutoUnmount, mount, flushPromises } from '@vue/test-utils';
import { reactive, ref } from 'vue';
import { createPinia } from 'pinia';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import AgentSessionTimelinePanel from '../components/AgentSessionTimelinePanel.vue';
import AgentBudgetNoticeCard from '../components/AgentBudgetNoticeCard.vue';
import type { ThreadDetail } from '../composables/useAgentThreadsApi';
import type { FilterOption } from '../session-timeline.types';

const getThreadDetail = vi.fn();
const showError = vi.fn();
const track = vi.fn();
const backgroundJobs = ref<AgentBackgroundJobDto[]>([]);
const respondToApproval = vi.fn<(payload: AgentChatResumeDto) => Promise<void>>();
const approvalJob: AgentBackgroundJobDto = {
	id: 'job-1',
	title: 'Send update',
	kind: 'subagent',
	status: 'suspended',
	startedAt: '2026-08-03T12:00:00.000Z',
	approval: {
		runId: 'run-1',
		toolCallId: 'gate-1',
		suspendPayload: { type: 'approval', toolName: 'send_message', args: { message: 'Ready' } },
	},
};
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

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ pushRef: 'session-xyz' }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

vi.mock('@/features/agents/agentSessions.store', () => ({
	useAgentSessionsStore: () => ({ getThreadDetail }),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => pushStore,
}));

vi.mock('@/features/agents/composables/useAgentBackgroundJobs', () => ({
	useAgentBackgroundJobs: () => ({ allJobs: backgroundJobs, respondToApproval }),
}));

vi.mock('@/app/stores/nodeTypes.store', function () {
	return {
		useNodeTypesStore() {
			return { getNodeType() {} };
		},
	};
});

// Avoid the project-agents list dependency — the panel only reads `.value`.
vi.mock('@/features/agents/composables/useSubAgentNames', () => ({
	useSubAgentNames: () => ({ subAgentNameById: { value: new Map() } }),
}));

const stubs = {
	SessionTimelineChart: {
		name: 'SessionTimelineChart',
		props: ['selectedIndex'],
		template: '<div data-test-id="chart-stub" :data-selected-index="selectedIndex" />',
	},
	SessionTimelineTable: {
		name: 'SessionTimelineTable',
		props: ['selectedIndex', 'items'],
		emits: ['select'],
		methods: { scrollSelectedIntoView: vi.fn() },
		template:
			'<div data-test-id="table-stub" :data-selected-index="selectedIndex ?? undefined" :data-item-count="items.length" />',
	},
	SessionEventFilter: {
		name: 'SessionEventFilter',
		props: ['available'],
		template: '<div data-test-id="filter-stub" />',
	},
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
	author: null,
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
	failureSummary: null,
	hitlStatus: null,
	source: null,
	finishReason: null,
	guardrailCode: null,
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

function budgetStopExecution(code: string, id = 'execution-2') {
	return {
		...keyboardExecution,
		id,
		finishReason: 'guardrail',
		guardrailCode: code,
		timeline: [{ type: 'guardrail', code, timestamp: Date.parse('2026-08-03T12:00:02.000Z') }],
	} satisfies ThreadDetail['executions'][number];
}

function dispatchKeyboardEvent(type: 'keydown' | 'keyup', key: string) {
	const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
	(document.activeElement ?? document).dispatchEvent(event);
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
	props: Partial<InstanceType<typeof AgentSessionTimelinePanel>['$props']> = {},
	options: { attachTo?: HTMLElement; renderTimelineTable?: boolean } = {},
) {
	return mount(AgentSessionTimelinePanel, {
		...(options.attachTo ? { attachTo: options.attachTo } : {}),
		props: { projectId: 'p1', agentId: 'a1', threadId: 't1', ...props },
		global: {
			plugins: [createPinia(), i18nInstance],
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
		backgroundJobs.value = [];
		respondToApproval.mockReset().mockResolvedValue(undefined);
		pushHandlers.clear();
		pushStore.isConnected = false;
		getThreadDetail.mockResolvedValue(detail);
	});

	it('submits inline approvals once while a response is pending', async () => {
		backgroundJobs.value = [approvalJob];
		let resolveResponse: (() => void) | undefined;
		respondToApproval.mockImplementation(
			async () =>
				await new Promise<void>((resolve) => {
					resolveResponse = resolve;
				}),
		);
		const wrapper = mountPanel({}, { renderTimelineTable: true });
		await flushPromises();
		const choice = wrapper.get('[data-test-id="approval-card-allow-once"]');
		await choice.trigger('click');
		await choice.trigger('click');
		expect(respondToApproval).toHaveBeenCalledExactlyOnceWith({
			runId: 'run-1',
			toolCallId: 'gate-1',
			resumeData: { approved: true },
		});
		resolveResponse?.();
		await flushPromises();
	});

	it('shows a submission error and permits a retry', async () => {
		backgroundJobs.value = [approvalJob];
		const error = new Error('Request failed');
		respondToApproval.mockRejectedValueOnce(error);
		const wrapper = mountPanel({}, { renderTimelineTable: true });
		await flushPromises();
		await wrapper.get('[data-test-id="approval-card-deny"]').trigger('click');
		await flushPromises();
		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
		await wrapper.get('[data-test-id="approval-card-deny"]').trigger('click');
		expect(respondToApproval).toHaveBeenCalledTimes(2);
	});

	it('does not show an old approval error after the session changes', async () => {
		backgroundJobs.value = [approvalJob];
		let rejectResponse: ((error: Error) => void) | undefined;
		respondToApproval.mockImplementation(
			async () =>
				await new Promise<void>((_resolve, reject) => {
					rejectResponse = reject;
				}),
		);
		const wrapper = mountPanel({}, { renderTimelineTable: true });
		await flushPromises();
		await wrapper.get('[data-test-id="approval-card-allow-once"]').trigger('click');
		await wrapper.setProps({ threadId: 'other-thread' });
		rejectResponse?.(new Error('Request failed'));
		await flushPromises();
		expect(showError).not.toHaveBeenCalled();
	});

	it('loads the thread detail on mount for its props', async () => {
		mountPanel();
		await flushPromises();

		expect(getThreadDetail).toHaveBeenCalledWith('p1', 'a1', 't1');
		expect(track).not.toHaveBeenCalled();
	});

	it.each(['SessionTimelineChart', 'SessionTimelineTable'])(
		'tracks user selection from %s but not deselection',
		async (component) => {
			getThreadDetail.mockResolvedValueOnce({ ...detail, executions: [keyboardExecution] });
			const wrapper = mountPanel();
			await flushPromises();

			wrapper.getComponent({ name: component }).vm.$emit('select', 1);
			await flushPromises();
			wrapper.getComponent({ name: component }).vm.$emit('select', null);
			await flushPromises();

			expect(track).toHaveBeenCalledExactlyOnceWith(
				TELEMETRY_EVENT.AGENTS.USER_CLICKED_TRACE_ITEM,
				{ agent_id: 'a1', push_ref: 'session-xyz', item_type: 'agent' },
			);
		},
	);

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
		).toEqual([['error', 2]]);
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

	it('keeps row and chart selection in sync after row activation', async () => {
		getThreadDetail.mockResolvedValueOnce({ ...detail, executions: [keyboardExecution] });
		const wrapper = mountPanel({}, { renderTimelineTable: true });
		await flushPromises();

		const rows = wrapper.findAll('[data-test-id="timeline-row"]');
		await rows[1].trigger('click');
		expect(rows[1].attributes('aria-selected')).toBe('true');
		expect(wrapper.get('[data-test-id="chart-stub"]').attributes('data-selected-index')).toBe('1');

		await rows[0].trigger('keydown', { key: 'Enter' });
		expect(rows[0].attributes('aria-selected')).toBe('true');
		expect(rows[1].attributes('aria-selected')).toBe('false');
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
			await flushPromises();
			expect(timelineRow.attributes('aria-selected')).toBe('true');

			outsideButton.focus();
			const outsideKeyup = dispatchKeyboardEvent('keyup', 'ArrowDown');
			expect(outsideKeyup.defaultPrevented).toBe(false);
			expect(timelineRow.attributes('aria-selected')).toBe('true');

			(timelineRow.element as HTMLElement).focus();

			const moveKeydown = dispatchKeyboardEvent('keydown', 'ArrowDown');
			expect(moveKeydown.defaultPrevented).toBe(true);
			await flushPromises();
			expect(document.activeElement).toBe(timelineRows[1].element);
			expect(timelineRows[1].attributes('aria-selected')).toBe('true');
			const moveKeyup = dispatchKeyboardEvent('keyup', 'ArrowDown');
			expect(moveKeyup.defaultPrevented).toBe(false);

			(wrapper.get('[data-test-id="search-stub"]').element as HTMLInputElement).focus();
			const inputEscape = dispatchKeyboardEvent('keydown', 'Escape');
			expect(inputEscape.defaultPrevented).toBe(false);
			expect(timelineRows[1].attributes('aria-selected')).toBe('true');

			outsideButton.focus();
			const outsideEscape = dispatchKeyboardEvent('keydown', 'Escape');
			expect(outsideEscape.defaultPrevented).toBe(false);
			expect(timelineRows[1].attributes('aria-selected')).toBe('true');

			(timelineRows[1].element as HTMLElement).focus();
			expect(dispatchKeyboardEvent('keydown', 'Escape').defaultPrevented).toBe(true);
			await flushPromises();
			expect(timelineRows.every((row) => row.attributes('aria-selected') === 'false')).toBe(true);
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
			...keyboardExecution,
			id: 'exec-1',
			status: 'running',
			userMessage: 'Question',
			timeline: [
				{ type: 'text', content: 'Answer', timestamp: Date.parse('2026-08-03T12:00:01.000Z') },
			],
		} satisfies ThreadDetail['executions'][number];
		const runningDetail: ThreadDetail = { ...detail, executions: [execution] };
		const refreshedDetail: ThreadDetail = {
			...detail,
			executions: [
				{
					...execution,
					timeline: [
						{
							type: 'text',
							content: 'Earlier update',
							timestamp: Date.parse('2026-08-03T12:00:00.500Z'),
						},
						...execution.timeline,
					],
				},
			],
		};
		getThreadDetail.mockResolvedValueOnce(runningDetail).mockResolvedValueOnce(refreshedDetail);
		const wrapper = mountPanel();
		await flushPromises();
		const table = wrapper.findComponent({ name: 'SessionTimelineTable' });
		table.vm.$emit('select', 1);
		emitPush();
		await flushPromises();

		expect(wrapper.find('[data-test-id="table-stub"]').attributes('data-selected-index')).toBe('2');
		expect(track).toHaveBeenCalledExactlyOnceWith(TELEMETRY_EVENT.AGENTS.USER_CLICKED_TRACE_ITEM, {
			agent_id: 'a1',
			push_ref: 'session-xyz',
			item_type: 'agent',
		});
	});
	describe('budget notice', () => {
		const budgetCard = '[data-testid="agent-budget-notice-card"]';

		async function mountWithExecutions(
			executions: ThreadDetail['executions'],
			props: Partial<InstanceType<typeof AgentSessionTimelinePanel>['$props']> = {},
		) {
			getThreadDetail.mockResolvedValue({ ...detail, executions });
			const wrapper = mountPanel(props, { renderTimelineTable: true });
			await flushPromises();
			return wrapper;
		}

		it('renders the card directly below a budget stop in the latest run', async () => {
			const wrapper = await mountWithExecutions([
				keyboardExecution,
				budgetStopExecution('budget.session'),
			]);

			const noticeRow = wrapper.get('[data-test-id="timeline-notice-row"]');
			const stopRow = noticeRow.element.previousElementSibling;
			expect(stopRow?.getAttribute('data-test-id')).toBe('timeline-row');
			expect(stopRow?.textContent).toContain('The session reached its cost cap.');
			expect(noticeRow.find(budgetCard).exists()).toBe(true);
		});

		it('does not render the card for a stop without budget copy', async () => {
			const wrapper = await mountWithExecutions([budgetStopExecution('budget.credits')]);

			expect(wrapper.find(budgetCard).exists()).toBe(false);
		});

		it('does not render the card when a later run got past the stop', async () => {
			const wrapper = await mountWithExecutions([
				budgetStopExecution('budget.monthly', 'execution-0'),
				keyboardExecution,
			]);

			expect(wrapper.find(budgetCard).exists()).toBe(false);
		});

		it('hides the increase action when the user cannot raise the cap', async () => {
			const wrapper = await mountWithExecutions([budgetStopExecution('budget.session')]);

			expect(wrapper.find(budgetCard).exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-budget-notice-increase"]').exists()).toBe(false);
		});

		it.each([
			[true, false],
			[false, true],
		])('when the save resolves %s, the card stays: %s', async (saved, cardStays) => {
			const increaseBudget = vi.fn().mockResolvedValue(saved);
			const wrapper = await mountWithExecutions([budgetStopExecution('budget.session')], {
				increaseBudget,
			});

			const payload = { field: 'sessionCostCapUsd', amount: 20 };
			wrapper.getComponent(AgentBudgetNoticeCard).vm.$emit('increase', payload);
			await flushPromises();

			expect(increaseBudget).toHaveBeenCalledWith(payload);
			expect(wrapper.find(budgetCard).exists()).toBe(cardStays);
		});

		it('shows the card again when a newer run stops at the raised cap', async () => {
			const increaseBudget = vi.fn().mockResolvedValue(true);
			const firstStop = budgetStopExecution('budget.session', 'execution-2');
			const wrapper = await mountWithExecutions([firstStop], { increaseBudget });

			wrapper
				.getComponent(AgentBudgetNoticeCard)
				.vm.$emit('increase', { field: 'sessionCostCapUsd', amount: 20 });
			await flushPromises();
			expect(wrapper.find(budgetCard).exists()).toBe(false);

			getThreadDetail.mockResolvedValue({
				...detail,
				executions: [firstStop, budgetStopExecution('budget.session', 'execution-3')],
			});
			emitPush();
			await flushPromises();

			expect(wrapper.find(budgetCard).exists()).toBe(true);
		});
	});
});
