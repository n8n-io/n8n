import { i18nInstance } from '@n8n/i18n';
/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { N8nIcon } from '@n8n/design-system';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import SessionTimelineTable from '../components/SessionTimelineTable.vue';
import type { TimelineItem } from '../session-timeline.types';

vi.mock('@/app/stores/nodeTypes.store', function () {
	return {
		useNodeTypesStore() {
			return { getNodeType() {} };
		},
	};
});

vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	N8nRecycleScroller: {
		name: 'N8nRecycleScroller',
		props: ['items'],
		setup() {
			return { updateItemSize: vi.fn(), scrollToKey: vi.fn() };
		},
		template:
			'<div class="recycle-scroller-wrapper" v-bind="$attrs"><slot v-for="item in items" :item="item" :update-item-size="updateItemSize" /></div>',
	},
	N8nTooltip: {
		name: 'N8nTooltip',
		template: '<span><slot /></span>',
	},
}));

function makeRouter(): Router {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{
				path: '/workflow/:workflowId',
				name: 'NodeViewExisting',
				component: { template: '<div/>' },
			},
		],
	});
}

function makeItems(): TimelineItem[] {
	return [
		{
			id: 'event-0',
			kind: 'user',
			executionId: 'e1',
			timestamp: 0,
			content: '[Read notes](https://example.com/notes)',
		},
		{ id: 'event-1', kind: 'agent', executionId: 'e1', timestamp: 500, content: 'hello' },
		{
			id: 'event-2',
			kind: 'tool',
			executionId: 'e1',
			timestamp: 1000,
			toolName: 'http',
			endTimestamp: 1100,
		},
		{
			id: 'event-3',
			kind: 'workflow',
			executionId: 'e1',
			timestamp: 2000,
			endTimestamp: 2500,
			workflowId: 'wf-1',
			workflowName: 'My WF',
			workflowExecutionId: 'exec-1',
		},
	];
}

function mountTable(
	props: InstanceType<typeof SessionTimelineTable>['$props'],
	attachTo?: HTMLElement,
) {
	return mount(SessionTimelineTable, {
		...(attachTo ? { attachTo } : {}),
		props,
		global: { plugins: [makeRouter(), i18nInstance] },
	});
}

describe('SessionTimelineTable', () => {
	it('keeps row instances when a late background task sorts before existing events', async () => {
		const items = makeItems();
		const w = mount(SessionTimelineTable, {
			props: { items, selectedIndex: null, visibleKinds: new Set<string>() },
			global: { plugins: [makeRouter(), i18nInstance], stubs: { SessionTimelineRow: true } },
		});
		const original = w.get('[data-timeline-row-id="event-1"]').element;
		const task: TimelineItem = {
			kind: 'background-task',
			executionId: 'e1',
			timestamp: 250,
			backgroundTask: { id: 'late-task' } as NonNullable<TimelineItem['backgroundTask']>,
		};
		await w.setProps({ items: [...items, task].sort((a, b) => a.timestamp - b.timestamp) });
		expect(w.get('[data-timeline-row-id="event-1"]').element).toBe(original);
		expect(
			w.findAll('[data-timeline-row-id]').map((row) => row.attributes('data-timeline-row-id')),
		).toEqual(['event-0', 'background-task-late-task', 'event-1', 'event-2', 'event-3']);
		w.unmount();
	});

	it.each([0, 101])('supports inline approvals with %i other rows', async (otherRows) => {
		const respondToApproval = vi.fn().mockResolvedValue(undefined);
		const item: TimelineItem = {
			kind: 'background-task',
			executionId: 'job-1',
			timestamp: 0,
			backgroundTask: {
				id: 'job-1',
				title: 'Send update',
				kind: 'subagent',
				status: 'suspended',
				startedAt: '2026-08-03T12:00:00.000Z',
				approval: {
					runId: 'run-1',
					toolCallId: 'gate-1',
					suspendPayload: { type: 'approval', toolName: 'send_message', args: {} },
				},
			},
		};
		const items = [
			item,
			...Array.from(
				{ length: otherRows },
				(_, index): TimelineItem => ({
					kind: 'user',
					executionId: `event-${index}`,
					timestamp: index + 1,
					content: 'Message',
				}),
			),
		];
		const wrapper = mountTable({
			items,
			selectedIndex: null,
			visibleKinds: new Set<string>(),
			respondToApproval,
			pendingApprovalRunIds: new Set(['run-1']),
		});
		try {
			const choice = wrapper.get('[data-test-id="approval-card-allow-once"]');
			await choice.trigger('click');
			expect(respondToApproval).not.toHaveBeenCalled();
			await wrapper.setProps({ pendingApprovalRunIds: new Set<string>() });
			await wrapper.get('[role="toolbar"]').trigger('keydown', { key: 'ArrowDown' });
			await wrapper.get('[data-test-id="approval-card-deny"]').trigger('click');
			expect(respondToApproval).toHaveBeenCalledWith({
				runId: 'run-1',
				toolCallId: 'gate-1',
				resumeData: { approved: false },
			});
			expect(wrapper.emitted('select')).toBeUndefined();
		} finally {
			wrapper.unmount();
		}
	});

	it('forwards virtual row size changes to the scroller', async () => {
		const resizeCallbacks = new Map<Element, (height: number) => void>();
		vi.stubGlobal(
			'ResizeObserver',
			class implements ResizeObserver {
				constructor(private callback: ResizeObserverCallback) {}

				observe(target: Element) {
					resizeCallbacks.set(target, (height) => {
						const size = [{ inlineSize: 400, blockSize: height }];
						this.callback(
							[
								{
									target,
									contentRect: new DOMRect(0, 0, 400, height),
									borderBoxSize: size,
									contentBoxSize: size,
									devicePixelContentBoxSize: size,
								},
							],
							this,
						);
					});
				}

				unobserve(target: Element) {
					resizeCallbacks.delete(target);
				}

				disconnect() {}
			},
		);
		const items = Array.from(
			{ length: 101 },
			(_, index): TimelineItem => ({
				kind: 'user',
				id: `event-${index}`,
				executionId: `e${index}`,
				timestamp: index,
				content: `message ${index}`,
			}),
		);
		const w = mountTable({ items, selectedIndex: null, visibleKinds: new Set<string>() });

		try {
			await w.vm.$nextTick();
			const row = w.get('[data-timeline-row-id="event-0"]');
			const notifyResize = resizeCallbacks.get(row.element);
			const scroller = w.getComponent({ name: 'N8nRecycleScroller' });
			/** The scroller stub exposes the callback from setup. */
			const { updateItemSize } = scroller.vm as typeof scroller.vm & {
				updateItemSize: ReturnType<typeof vi.fn>;
			};

			expect(notifyResize).toBeDefined();
			updateItemSize.mockClear();
			for (const height of [640, 280, 400]) {
				notifyResize?.(height);
				await w.vm.$nextTick();
				expect(updateItemSize).toHaveBeenLastCalledWith({ id: 'event-0' });
			}
			expect(updateItemSize).toHaveBeenCalledTimes(3);
		} finally {
			w.unmount();
			vi.unstubAllGlobals();
		}
	});

	it('renders one row per item when no filter is active', () => {
		const w = mountTable({
			items: makeItems(),
			selectedIndex: null,
			visibleKinds: new Set<string>(),
		});
		expect(w.findAll('[data-test-id="timeline-row"]')).toHaveLength(4);
	});

	it('renders workflow and tool rows from the same turn', () => {
		const w = mountTable({
			items: [
				{
					kind: 'workflow',
					executionId: 'e1',
					timestamp: 1000,
					endTimestamp: 1500,
					toolName: 'giphy-gif-search',
					workflowId: 'wf-1',
					workflowName: 'Giphy GIF Search',
					workflowExecutionId: '234',
				},
				{
					kind: 'tool',
					executionId: 'e1',
					timestamp: 2000,
					endTimestamp: 2050,
					toolName: 'card_sender',
					toolOutput: { ok: true },
				},
			],
			selectedIndex: null,
			visibleKinds: new Set<string>(),
		});

		expect(w.findAll('[data-test-id="timeline-row"]')).toHaveLength(2);
		expect(w.text()).toContain('Giphy GIF Search');
		expect(w.text()).toContain('Card sender');
	});

	it('renders the decision on the HITL response, not the tool call or request', () => {
		const w = mountTable({
			items: [
				{
					kind: 'node',
					executionId: 'e1',
					timestamp: 1000,
					toolName: 'protected_action',
				},
				{
					kind: 'suspension',
					executionId: 'e1',
					timestamp: 2000,
					toolName: 'protected_action',
					hitlRequestType: 'approval',
				},
				{
					kind: 'hitl-response',
					executionId: 'e2',
					timestamp: 3000,
					toolName: 'protected_action',
					hitlRequestType: 'approval',
					hitlResponseStatus: 'declined',
				},
			],
			selectedIndex: null,
			visibleKinds: new Set<string>(),
		});

		const badges = w.findAll('[data-test-id="timeline-hitl-response-badge"]');
		expect(badges).toHaveLength(1);
		expect(badges[0].text()).toBe('Declined');
		const rows = w.findAll('[data-test-id="timeline-row"]');
		expect(
			rows[0]
				.findAllComponents(N8nIcon)
				.some(
					(icon: VueWrapper<InstanceType<typeof N8nIcon>>) => icon.props('icon') === 'circle-alert',
				),
		).toBe(false);
		expect(rows[0].text()).toContain('Protected action');
		expect(rows[0].text()).not.toContain('Approval');
		expect(rows[1].text()).toContain('Approval request for Protected action');
		expect(rows[2].text()).toContain('Approval response for Protected action');
	});

	it.each(['tool', 'node', 'workflow'] as const)(
		'shows a danger alert only on failed %s calls',
		(kind) => {
			const w = mountTable({
				items: [
					{
						kind,
						executionId: 'e1',
						timestamp: 1000,
						toolName: 'failed_tool',
						toolOutcome: 'error',
					},
					{
						kind,
						executionId: 'e1',
						timestamp: 2000,
						toolName: 'successful_tool',
						toolOutcome: 'success',
					},
				],
				selectedIndex: null,
				visibleKinds: new Set<string>(),
			});

			const rows = w.findAll('[data-test-id="timeline-row"]');
			const errorIcon = rows[0]
				.findAllComponents(N8nIcon)
				.find(
					(icon: VueWrapper<InstanceType<typeof N8nIcon>>) => icon.props('icon') === 'circle-alert',
				);
			expect(errorIcon?.props('color')).toBe('danger');
			expect(
				rows[1]
					.findAllComponents(N8nIcon)
					.some(
						(icon: VueWrapper<InstanceType<typeof N8nIcon>>) =>
							icon.props('icon') === 'circle-alert',
					),
			).toBe(false);
		},
	);

	it('shows a danger alert when a workflow tool returns an error status', () => {
		const w = mountTable({
			items: [
				{
					kind: 'workflow',
					executionId: 'e1',
					timestamp: 1000,
					toolName: 'run_workflow',
					toolOutcome: 'success',
					toolOutput: { executionId: 'exec-1', status: 'error' },
				},
			],
			selectedIndex: null,
			visibleKinds: new Set<string>(),
		});

		const errorIcon = w
			.findAllComponents(N8nIcon)
			.find(
				(icon: VueWrapper<InstanceType<typeof N8nIcon>>) => icon.props('icon') === 'circle-alert',
			);
		expect(errorIcon?.props('color')).toBe('danger');
	});

	it('renders a fatal execution as an error row', () => {
		const w = mountTable({
			items: [
				{
					kind: 'execution-error',
					executionId: 'e1',
					executionStatus: 'error',
					timestamp: 1000,
					content: 'Model request failed',
				},
			],
			selectedIndex: null,
			visibleKinds: new Set<string>(),
		});

		expect(w.get('[data-test-id="timeline-row"]').text()).toContain('Model request failed');
		const errorIcon = w
			.findAllComponents(N8nIcon)
			.find(
				(icon: VueWrapper<InstanceType<typeof N8nIcon>>) => icon.props('icon') === 'circle-alert',
			);
		expect(errorIcon?.props('color')).toBe('danger');
	});

	it.each([
		['approved', 'Approved'],
		['declined', 'Declined'],
		['error', 'Failed tool'],
	] as const)('filters timeline rows by %s status', (filterKey, label) => {
		const w = mountTable({
			items: [
				{
					kind: 'hitl-response',
					executionId: 'e1',
					timestamp: 1000,
					toolName: 'approved_action',
					hitlRequestType: 'approval',
					hitlResponseStatus: 'approved',
				},
				{
					kind: 'hitl-response',
					executionId: 'e1',
					timestamp: 2000,
					toolName: 'declined_action',
					hitlRequestType: 'approval',
					hitlResponseStatus: 'declined',
				},
				{
					kind: 'tool',
					executionId: 'e1',
					timestamp: 3000,
					toolName: 'failed_tool',
					toolOutcome: 'error',
				},
			],
			selectedIndex: null,
			visibleKinds: new Set<string>([filterKey]),
		});

		expect(w.findAll('[data-test-id="timeline-row"]')).toHaveLength(1);
		if (filterKey === 'error') {
			const errorIcon = w
				.findAllComponents(N8nIcon)
				.find(
					(icon: VueWrapper<InstanceType<typeof N8nIcon>>) => icon.props('icon') === 'circle-alert',
				);
			expect(errorIcon?.props('color')).toBe('danger');
		} else {
			expect(w.text()).toContain(label);
		}
	});

	it('hides items whose filterKey is not in visibleKinds', () => {
		const w = mountTable({
			items: makeItems(),
			selectedIndex: null,
			visibleKinds: new Set<string>(['workflow']),
		});
		expect(w.findAll('[data-test-id="timeline-row"]')).toHaveLength(1);
	});

	it('emits select with the absolute (pre-filter) index when a row is clicked', async () => {
		const w = mountTable({
			items: makeItems(),
			selectedIndex: null,
			visibleKinds: new Set<string>(),
		});
		// Click the 3rd row (tool at index 2)
		await w.findAll('[data-test-id="timeline-row"]')[2].trigger('click');
		expect(w.emitted('select')).toEqual([[2]]);
	});

	it('emits select with the absolute index even when rows are filtered', async () => {
		const w = mountTable({
			items: makeItems(),
			selectedIndex: null,
			visibleKinds: new Set<string>(['workflow']),
		});
		// Only the workflow row is visible, at absolute index 3.
		await w.findAll('[data-test-id="timeline-row"]')[0].trigger('click');
		expect(w.emitted('select')).toEqual([[3]]);
	});

	it.each([
		['direct', makeItems()],
		[
			'virtualized',
			Array.from(
				{ length: 101 },
				(_, index): TimelineItem => ({
					kind: 'user',
					id: `event-${index}`,
					executionId: `e${index}`,
					timestamp: index,
					content: `message ${index}`,
				}),
			),
		],
	])('supports roving keyboard selection for %s events', async (_renderingMode, items) => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const w = mountTable(
			{
				items,
				selectedIndex: 1,
				visibleKinds: new Set<string>(),
			},
			host,
		);

		try {
			const grid = w.get('[role="grid"]');
			const rows = w.findAll('[data-test-id="timeline-row"]');

			expect(grid.attributes('aria-label')).toBe('Events');
			expect(grid.element.querySelector('[role="rowgroup"]')).not.toBeNull();
			expect(rows[0].attributes('role')).toBe('row');
			expect(rows[0].attributes('tabindex')).toBe('-1');
			expect(rows[1].attributes('tabindex')).toBe('0');
			expect(rows[2].attributes('tabindex')).toBe('-1');
			expect(rows[0].attributes('aria-selected')).toBe('false');
			expect(rows[1].attributes('aria-selected')).toBe('true');
			expect(rows[0].element.querySelector('[role="gridcell"]')).not.toBeNull();

			await rows[0].trigger('click');
			(rows[1].element as HTMLElement).focus();
			await rows[1].trigger('keydown', { key: 'Enter' });
			await rows[2].trigger('keydown', { key: ' ' });
			expect(w.emitted('select')).toEqual([[0], [1], [2]]);

			await w.setProps({ selectedIndex: 2 });
			await w.vm.$nextTick();
			await w.vm.$nextTick();

			const updatedRows = w.findAll('[data-test-id="timeline-row"]');
			expect(document.activeElement).toBe(updatedRows[2].element);
			expect(updatedRows[1].attributes('tabindex')).toBe('-1');
			expect(updatedRows[2].attributes('tabindex')).toBe('0');
		} finally {
			w.unmount();
			host.remove();
		}
	});

	it.each(['direct', 'virtualized'] as const)(
		'keeps keyboard navigation on the %s row that has focus',
		async (mode) => {
			const items = makeItems();
			if (mode === 'virtualized') {
				items.push(
					...Array.from(
						{ length: 97 },
						(_, index): TimelineItem => ({
							kind: 'user',
							id: `event-${index + 4}`,
							executionId: `extra-${index}`,
							timestamp: 3000 + index,
							content: 'Message',
						}),
					),
				);
			}
			const w = mountTable({ items, selectedIndex: 1, visibleKinds: new Set<string>() });

			try {
				const row = w.get('[data-timeline-row-id="event-1"]');
				await row.trigger('keydown', { key: 'ArrowDown' });
				await row.trigger('keydown', { key: 'ArrowUp' });
				await row.trigger('keydown', { key: 'ArrowDown', metaKey: true });
				await row.trigger('keydown', { key: 'ArrowUp', metaKey: true });
				await row.trigger('keydown', { key: 'Escape' });
				expect(w.emitted('select')).toEqual([[2], [0], [items.length - 1], [0], [null]]);

				for (const modifier of ['ctrlKey', 'altKey', 'shiftKey']) {
					await row.trigger('keydown', { key: 'ArrowDown', [modifier]: true });
				}
				const link = w.get('a');
				for (const key of ['ArrowDown', 'ArrowUp', 'Escape', 'Enter', ' ']) {
					await link.trigger('keydown', { key });
				}
				expect(w.emitted('select')).toHaveLength(5);

				await w.setProps({ selectedIndex: null });
				await row.trigger('keydown', { key: 'Escape' });
				expect(w.emitted('select')).toHaveLength(5);
				expect(w.get('[data-timeline-row-id="event-0"]').attributes('tabindex')).toBe('0');

				await w.setProps({ selectedIndex: 0 });
				await w.get('[data-timeline-row-id="event-0"]').trigger('keydown', { key: 'ArrowUp' });
				await w.setProps({ selectedIndex: items.length - 1 });
				await w.get(`[data-timeline-row-id="event-${items.length - 1}"]`).trigger('keydown', {
					key: 'ArrowDown',
				});
				expect(w.emitted('select')?.slice(-2)).toEqual([[0], [items.length - 1]]);
			} finally {
				w.unmount();
			}
		},
	);

	it.each([
		{ position: 'inside', top: 150, expectedTop: null },
		{ position: 'above', top: 80, expectedTop: 180 },
		{ position: 'below', top: 280, expectedTop: 220 },
	])(
		'adjusts scrolling for a rendered virtual row $position the viewport',
		async ({ top, expectedTop }) => {
			const items = Array.from(
				{ length: 101 },
				(_, index): TimelineItem => ({
					kind: 'user',
					id: `event-${index}`,
					executionId: `e${index}`,
					timestamp: index,
					content: 'Message',
				}),
			);
			const w = mountTable({ items, selectedIndex: null, visibleKinds: new Set<string>() });
			try {
				const scroller = w.getComponent({ name: 'N8nRecycleScroller' });
				const { scrollToKey } = scroller.vm as typeof scroller.vm & {
					scrollToKey: ReturnType<typeof vi.fn>;
				};
				const container = w.get<HTMLElement>('.recycle-scroller-wrapper').element;
				container.scrollTop = 200;
				vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 400, 200));
				vi.spyOn(
					w.get('[data-timeline-row-id="event-1"]').element,
					'getBoundingClientRect',
				).mockReturnValue(new DOMRect(0, top, 400, 40));
				const scrollTo = vi.spyOn(container, 'scrollTo');
				await w.setProps({ selectedIndex: 1 });
				await w.vm.$nextTick();
				expect(scrollToKey).not.toHaveBeenCalled();
				if (expectedTop === null) {
					expect(scrollTo).not.toHaveBeenCalled();
				} else {
					expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: expectedTop, behavior: 'auto' });
				}
			} finally {
				w.unmount();
				vi.restoreAllMocks();
			}
		},
	);

	it('jumps to an unrendered virtual row without a smooth scroll', async () => {
		const items = Array.from(
			{ length: 101 },
			(_, index): TimelineItem => ({
				kind: 'user',
				id: `event-${index}`,
				executionId: `e${index}`,
				timestamp: index,
				content: 'Message',
			}),
		);
		const w = mountTable({ items, selectedIndex: null, visibleKinds: new Set<string>() });

		try {
			const scroller = w.getComponent({ name: 'N8nRecycleScroller' });
			const { scrollToKey } = scroller.vm as typeof scroller.vm & {
				scrollToKey: ReturnType<typeof vi.fn>;
			};

			/** Simulate a row outside the virtual scroller's rendered range. */
			w.get('[data-timeline-row-id="event-100"]').element.remove();
			await w.setProps({ selectedIndex: 100 });
			await w.vm.$nextTick();

			expect(scrollToKey).toHaveBeenLastCalledWith('event-100', 'auto');
		} finally {
			w.unmount();
		}
	});

	it('renders transcript events in time order with their absolute selection indices', async () => {
		const w = mountTable({
			items: makeItems().reverse(),
			selectedIndex: null,
			visibleKinds: new Set<string>(),
		});
		const rows = w.findAll('[data-test-id="timeline-row"]');

		expect(rows.map((row) => row.attributes('data-timeline-row-id'))).toEqual([
			'event-0',
			'event-1',
			'event-2',
			'event-3',
		]);
		for (const row of rows) {
			await row.trigger('click');
		}
		expect(w.emitted('select')).toEqual([[3], [2], [1], [0]]);
	});

	it('renders a message Markdown link that does not select its row when activated', async () => {
		const w = mountTable({
			items: makeItems(),
			selectedIndex: null,
			visibleKinds: new Set<string>(),
		});
		const messageLink = w.get('a');
		const messageRow = messageLink.element.closest('[role="row"]');

		expect(messageLink.attributes('href')).toBe('https://example.com/notes');
		expect(messageLink.attributes('target')).toBe('_blank');
		expect(messageRow?.getAttribute('aria-selected')).toBe('false');
		await messageLink.trigger('click');
		await messageLink.trigger('keydown', { key: 'Enter' });
		await messageLink.trigger('keydown', { key: ' ' });

		expect(w.emitted('select')).toBeUndefined();
	});
	describe('notice slot', () => {
		function mountWithNotice(visibleKinds = new Set<string>()) {
			return mount(SessionTimelineTable, {
				props: { items: makeItems(), selectedIndex: null, visibleKinds, noticeIndex: 2 },
				slots: { notice: '<div data-test-id="notice-content" />' },
				global: { plugins: [makeRouter(), i18nInstance] },
			});
		}

		it('renders one notice row directly below the matching event row', () => {
			const w = mountWithNotice();

			const noticeRows = w.findAll('[data-test-id="timeline-notice-row"]');
			expect(noticeRows).toHaveLength(1);
			expect(
				noticeRows[0].element.previousElementSibling?.getAttribute('data-timeline-row-id'),
			).toBe('event-2');
			expect(noticeRows[0].find('[data-test-id="notice-content"]').exists()).toBe(true);
		});

		it('omits the notice when its event row is filtered out', () => {
			const w = mountWithNotice(new Set<string>(['workflow']));

			expect(w.find('[data-test-id="timeline-notice-row"]').exists()).toBe(false);
		});

		it('keeps the notice inside the measured virtual row', async () => {
			const w = mountWithNotice();
			await w.setProps({
				items: [
					...makeItems(),
					...Array.from(
						{ length: 100 },
						(_, index): TimelineItem => ({
							kind: 'agent',
							executionId: 'e1',
							timestamp: 3000 + index,
							content: 'Update',
						}),
					),
				],
			});

			const noticeRows = w.findAll('[data-test-id="timeline-notice-row"]');
			expect(noticeRows).toHaveLength(1);
			expect(
				w.get('[data-timeline-row-id="event-2"]').find('[data-test-id="notice-content"]').exists(),
			).toBe(true);
		});
	});
});
