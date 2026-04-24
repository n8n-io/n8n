/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SessionTimelineChart from '../components/SessionTimelineChart.vue';
import type { TimelineItem } from '../session-timeline.types';

function item(partial: Partial<TimelineItem>): TimelineItem {
	return { kind: 'agent', executionId: 'e1', timestamp: 0, ...partial };
}

function mountChart(overrides: Partial<InstanceType<typeof SessionTimelineChart>['$props']> = {}) {
	const items: TimelineItem[] = [
		item({ kind: 'user', timestamp: 0 }),
		item({ kind: 'tool', toolName: 'http', timestamp: 1000, endTimestamp: 1500 }),
		item({ kind: 'workflow', toolName: 'run-wf', timestamp: 2000, endTimestamp: 3000 }),
	];
	return mount(SessionTimelineChart, {
		props: {
			items,
			idleRanges: [],
			sessionStart: 0,
			sessionEnd: 3000,
			visibleKinds: new Set<string>(),
			selectedIndex: null,
			...overrides,
		},
	});
}

describe('SessionTimelineChart', () => {
	it('renders one block per item', () => {
		const w = mountChart();
		expect(w.findAll('[data-test-id="timeline-block"]')).toHaveLength(3);
	});

	it('positions blocks proportionally to duration within the session window', () => {
		const w = mountChart();
		const blocks = w.findAll('[data-test-id="timeline-block"]');
		// Second block starts at 1000/3000 ≈ 33.3% with width 500/3000 ≈ 16.7%
		const style = blocks[1].attributes('style') ?? '';
		expect(style).toMatch(/left:\s*33\./);
	});

	it('emits select with the block index on click', async () => {
		const w = mountChart();
		await w.findAll('[data-test-id="timeline-block"]')[1].trigger('click');
		expect(w.emitted('select')).toEqual([[1]]);
	});

	it('dims items outside visibleKinds when the filter set is non-empty', () => {
		const w = mountChart({ visibleKinds: new Set(['workflow']) });
		const blocks = w.findAll('[data-test-id="timeline-block"]');
		// index 0 (user) dimmed, index 2 (workflow) visible
		const style0 = blocks[0].attributes('style') ?? '';
		const style2 = blocks[2].attributes('style') ?? '';
		expect(style0).toMatch(/opacity:\s*0\.15/);
		expect(style2).not.toMatch(/opacity:\s*0\.15/);
	});

	it('does not emit select when clicking a dimmed block', async () => {
		const w = mountChart({ visibleKinds: new Set(['workflow']) });
		await w.findAll('[data-test-id="timeline-block"]')[0].trigger('click');
		expect(w.emitted('select')).toBeUndefined();
	});

	it('renders one idle element per idle range', () => {
		const w = mountChart({ idleRanges: [{ start: 1500, end: 2000 }] });
		expect(w.findAll('[data-test-id="timeline-idle"]')).toHaveLength(1);
	});

	it('applies a selected marker when selectedIndex matches', () => {
		const w = mountChart({ selectedIndex: 2 });
		const blocks = w.findAll('[data-test-id="timeline-block"]');
		// Selected block should carry some distinguishing attribute — check classes
		const classes = blocks[2].classes().join(' ');
		expect(classes.length).toBeGreaterThan(0);
		// Other blocks should NOT have that selected marker
		expect(blocks[0].element.getAttribute('data-selected')).not.toBe('true');
		expect(blocks[2].element.getAttribute('data-selected')).toBe('true');
	});
});
