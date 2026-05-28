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
			'<div class="recycle-scroller-wrapper"><slot v-for="item in items" :item="item" /></div>',
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
			{ path: '/workflow/:name', name: 'NodeViewExisting', component: { template: '<div/>' } },
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

function mountTable(props: InstanceType<typeof SessionTimelineTable>['$props']) {
	return mount(SessionTimelineTable, {
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

	it('renders a workflow hyperlink with target="_blank"', () => {
		const w = mountTable({
			items: makeItems(),
			selectedIndex: null,
			visibleKinds: new Set<string>(),
		});
		const links = w.findAll('a[target="_blank"]');
		expect(links.length).toBeGreaterThan(0);
		expect(links[0].attributes('href')).toContain('/workflow/wf-1');
	});

	it('does not emit select when the workflow hyperlink is clicked', async () => {
		const w = mountTable({
			items: makeItems(),
			selectedIndex: null,
			visibleKinds: new Set<string>(),
		});
		await w.find('a[target="_blank"]').trigger('click');
		expect(w.emitted('select')).toBeUndefined();
	});
});
