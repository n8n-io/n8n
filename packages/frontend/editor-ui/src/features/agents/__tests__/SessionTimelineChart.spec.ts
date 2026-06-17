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

	it('sizes cells proportionally to event duration via flex-grow', () => {
		// Durations: user=100ms (point default), tool=500ms, workflow=1000ms
		const w = mountChart();
		const cells = w.findAll('[data-test-id="timeline-cell"]');
		const flex0 = cells[0].attributes('style') ?? '';
		const flex1 = cells[1].attributes('style') ?? '';
		const flex2 = cells[2].attributes('style') ?? '';
		expect(flex0).toMatch(/flex:\s*100\s+1\s+0/);
		expect(flex1).toMatch(/flex:\s*500\s+1\s+0/);
		expect(flex2).toMatch(/flex:\s*1000\s+1\s+0/);
	});

	it('renders idle cells as fixed-width 56px segments', () => {
		const w = mountChart({ idleRanges: [{ start: 1500, end: 2000 }] });
		const cells = w.findAll('[data-test-id="timeline-cell"]');
		// Cell at index 2 contains the idle segment.
		const idleCellStyle = cells[2].attributes('style') ?? '';
		expect(idleCellStyle).toMatch(/flex:\s*0\s+0\s+56px/);
	});

	it('emits select with the block index on click', async () => {
		const w = mountChart();
		await w.findAll('[data-test-id="timeline-block"]')[1].trigger('click');
		expect(w.emitted('select')).toEqual([[1]]);
	});

	it('dims items outside visibleKinds when the filter set is non-empty', () => {
		const w = mountChart({ visibleKinds: new Set(['workflow']) });
		const blocks = w.findAll('[data-test-id="timeline-block"]');
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

	it('renders idle blobs interleaved with events in chronological order', () => {
		const w = mountChart({ idleRanges: [{ start: 1500, end: 2000 }] });
		expect(w.findAll('[data-test-id="timeline-idle"]')).toHaveLength(1);
		const all = w.findAll('[data-test-id="timeline-block"], [data-test-id="timeline-idle"]');
		expect(all.map((el) => el.attributes('data-test-id'))).toEqual([
			'timeline-block',
			'timeline-block',
			'timeline-idle',
			'timeline-block',
		]);
	});

	it('applies a selected marker when selectedIndex matches', () => {
		const w = mountChart({ selectedIndex: 2 });
		const blocks = w.findAll('[data-test-id="timeline-block"]');
		expect(blocks[0].element.getAttribute('data-selected')).not.toBe('true');
		expect(blocks[2].element.getAttribute('data-selected')).toBe('true');
	});

	it('renders the localized "Idle" pill text inside each idle segment', () => {
		const w = mountChart({ idleRanges: [{ start: 1500, end: 2000 }] });
		const idle = w.find('[data-test-id="timeline-idle"]');
		expect(idle.text()).toContain('Idle');
	});
});
