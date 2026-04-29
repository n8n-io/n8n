/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import SessionTimelineTable from '../components/SessionTimelineTable.vue';
import type { TimelineItem } from '../session-timeline.types';

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

describe('SessionTimelineTable', () => {
	it('renders one row per item when no filter is active', () => {
		const w = mount(SessionTimelineTable, {
			props: { items: makeItems(), selectedIndex: null, visibleKinds: new Set<string>() },
			global: { plugins: [makeRouter()] },
		});
		expect(w.findAll('[data-test-id="timeline-row"]')).toHaveLength(4);
	});

	it('hides items whose filterKey is not in visibleKinds', () => {
		const w = mount(SessionTimelineTable, {
			props: {
				items: makeItems(),
				selectedIndex: null,
				visibleKinds: new Set<string>(['workflow']),
			},
			global: { plugins: [makeRouter()] },
		});
		expect(w.findAll('[data-test-id="timeline-row"]')).toHaveLength(1);
	});

	it('emits select with the absolute (pre-filter) index when a row is clicked', async () => {
		const w = mount(SessionTimelineTable, {
			props: { items: makeItems(), selectedIndex: null, visibleKinds: new Set<string>() },
			global: { plugins: [makeRouter()] },
		});
		// Click the 3rd row (tool at index 2)
		await w.findAll('[data-test-id="timeline-row"]')[2].trigger('click');
		expect(w.emitted('select')).toEqual([[2]]);
	});

	it('emits select with the absolute index even when rows are filtered', async () => {
		const w = mount(SessionTimelineTable, {
			props: {
				items: makeItems(),
				selectedIndex: null,
				visibleKinds: new Set<string>(['workflow']),
			},
			global: { plugins: [makeRouter()] },
		});
		// Only the workflow row is visible, at absolute index 3.
		await w.findAll('[data-test-id="timeline-row"]')[0].trigger('click');
		expect(w.emitted('select')).toEqual([[3]]);
	});

	it('renders a workflow hyperlink with target="_blank"', () => {
		const w = mount(SessionTimelineTable, {
			props: { items: makeItems(), selectedIndex: null, visibleKinds: new Set<string>() },
			global: { plugins: [makeRouter()] },
		});
		const links = w.findAll('a[target="_blank"]');
		expect(links.length).toBeGreaterThan(0);
		expect(links[0].attributes('href')).toContain('/workflow/wf-1');
	});

	it('does not emit select when the workflow hyperlink is clicked', async () => {
		const w = mount(SessionTimelineTable, {
			props: { items: makeItems(), selectedIndex: null, visibleKinds: new Set<string>() },
			global: { plugins: [makeRouter()] },
		});
		await w.find('a[target="_blank"]').trigger('click');
		expect(w.emitted('select')).toBeUndefined();
	});
});
