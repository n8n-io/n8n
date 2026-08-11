/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import SessionTimelineTable from '../components/SessionTimelineTable.vue';
import type { TimelineItem } from '../session-timeline.types';

vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	N8nRecycleScroller: {
		name: 'N8nRecycleScroller',
		props: ['items'],
		template:
			'<div class="recycle-scroller-wrapper" v-bind="$attrs"><slot v-for="item in items" :item="item" /></div>',
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
		{ kind: 'user', executionId: 'e1', timestamp: 0, content: 'hi' },
		{ kind: 'agent', executionId: 'e1', timestamp: 500, content: 'hello' },
		{
			kind: 'tool',
			executionId: 'e1',
			timestamp: 1000,
			toolName: 'http',
			endTimestamp: 1100,
		},
		{
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
		global: { plugins: [makeRouter()] },
	});
}

describe('SessionTimelineTable', () => {
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

			(rows[1].element as HTMLElement).focus();
			await rows[1].trigger('keydown', { key: 'Enter' });
			await rows[2].trigger('keydown', { key: ' ' });
			expect(w.emitted('select')).toEqual([[1], [2]]);

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

	it('renders idle periods as non-selectable grid rows', () => {
		const w = mountTable({
			items: makeItems(),
			selectedIndex: null,
			visibleKinds: new Set<string>(),
			idleRanges: [{ start: 250, end: 400 }],
		});
		const idleRow = w.get('[data-test-id="timeline-idle-row"]');

		expect(idleRow.attributes('role')).toBe('row');
		expect(idleRow.attributes('tabindex')).toBeUndefined();
		expect(idleRow.attributes('aria-selected')).toBeUndefined();
		expect(idleRow.element.querySelector('[role="gridcell"]')).not.toBeNull();
	});

	it('renders a workflow hyperlink that does not select its row when activated', async () => {
		const w = mountTable({
			items: makeItems(),
			selectedIndex: null,
			visibleKinds: new Set<string>(),
		});
		const workflowLink = w.get('a');
		const workflowRow = workflowLink.element.closest('[role="row"]');

		expect(workflowLink.attributes('href')).toContain('/workflow/wf-1');
		expect(workflowLink.attributes('target')).toBe('_blank');
		expect(workflowLink.element.closest('[role="gridcell"]')).not.toBeNull();
		expect(workflowRow?.getAttribute('aria-selected')).toBe('false');
		await workflowLink.trigger('click');
		await workflowLink.trigger('keydown', { key: 'Enter' });
		await workflowLink.trigger('keydown', { key: ' ' });

		expect(w.emitted('select')).toBeUndefined();
	});
});
