import { describe, it, expect, vi } from 'vitest';
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
		global: {
			stubs: {
				N8nHoverCard: {
					props: ['open'],
					template:
						'<div data-test-id="timeline-hover-card" :data-open="open"><slot name="content" /></div>',
				},
			},
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

	it('keeps only failed calls active when filtering by Error', () => {
		const w = mountChart({
			items: [
				item({ kind: 'tool', toolName: 'successful_tool', toolOutcome: 'success' }),
				item({ kind: 'tool', toolName: 'failed_tool', toolOutcome: 'error' }),
			],
			visibleKinds: new Set(['error']),
		});
		const blocks = w.findAll('[data-test-id="timeline-block"]');

		expect(blocks[0].attributes('style')).toMatch(/opacity:\s*0\.15/);
		expect(blocks[1].attributes('style')).not.toMatch(/opacity:\s*0\.15/);
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

	it('marks a generic tool soft-failure block as failed', () => {
		const w = mountChart({
			items: [
				item({
					kind: 'tool',
					toolSuccess: true,
					toolOutput: { success: false, error: 'boom' },
				}),
			],
		});
		const block = w.get('[data-test-id="timeline-block"]');
		expect(block.attributes('data-error')).toBe('true');
		expect(block.classes()).toContain('error');
	});

	it('marks a workflow soft-failure block as failed', () => {
		const w = mountChart({
			items: [
				item({
					kind: 'workflow',
					toolSuccess: true,
					toolOutput: { status: 'error', error: 'boom' },
				}),
			],
		});
		const block = w.get('[data-test-id="timeline-block"]');
		expect(block.attributes('data-error')).toBe('true');
		expect(block.classes()).toContain('error');
	});

	it('does not mark a successful tool block as failed', () => {
		const w = mountChart({
			items: [
				item({
					kind: 'tool',
					toolSuccess: true,
					toolOutput: { ok: true },
				}),
			],
		});
		const block = w.get('[data-test-id="timeline-block"]');
		expect(block.attributes('data-error')).toBeUndefined();
		expect(block.classes()).not.toContain('error');
	});

	it('renders the localized "Idle" pill text inside each idle segment', () => {
		const w = mountChart({ idleRanges: [{ start: 1500, end: 2000 }] });
		const idle = w.find('[data-test-id="timeline-idle"]');
		expect(idle.text()).toContain('Idle');
	});

	it('reveals event details on keyboard focus and hides them on blur', async () => {
		vi.useFakeTimers();
		const w = mountChart({
			items: [
				item({
					kind: 'agent',
					content: 'Keyboard details',
					timestamp: 1000,
					endTimestamp: 1500,
				}),
			],
		});

		try {
			const block = w.get('[data-test-id="timeline-block"]');
			const hoverCard = w.get('[data-test-id="timeline-hover-card"]');

			await block.trigger('focus');
			await vi.runAllTimersAsync();
			expect(hoverCard.attributes('data-open')).toBe('true');
			expect(hoverCard.text()).toContain('Keyboard details');
			expect(hoverCard.text()).toContain('500ms');

			await block.trigger('mouseleave');
			expect(hoverCard.attributes('data-open')).toBe('true');

			await block.trigger('blur');
			expect(hoverCard.attributes('data-open')).toBe('false');
			expect(hoverCard.text()).not.toContain('Keyboard details');
		} finally {
			w.unmount();
			vi.useRealTimers();
		}
	});

	it('exposes the HITL response status in the block label and hover card', async () => {
		vi.useFakeTimers();
		const w = mountChart({
			items: [
				item({
					kind: 'hitl-response',
					toolName: 'protected_action',
					hitlRequestType: 'approval',
					hitlResponseStatus: 'declined',
					timestamp: 1000,
					endTimestamp: 1000,
				}),
			],
		});

		try {
			const block = w.get('[data-test-id="timeline-block"]');
			expect(block.attributes('aria-label')).toContain('Declined');
			expect(block.attributes('aria-label')).toContain('Approval response for Protected action');

			await block.trigger('focus');
			await vi.runAllTimersAsync();

			const badge = w.get('[data-test-id="timeline-popover-hitl-response-badge"]');
			expect(badge.text()).toBe('Declined');
			expect(w.get('[data-test-id="timeline-hover-card"]').text()).toContain(
				'Approval response for Protected action',
			);
		} finally {
			w.unmount();
			vi.useRealTimers();
		}
	});

	it('exposes a failed tool call as an error in the block label and hover card', async () => {
		vi.useFakeTimers();
		const w = mountChart({
			items: [
				item({
					kind: 'tool',
					toolName: 'http_request',
					toolOutcome: 'error',
					timestamp: 1000,
					endTimestamp: 1200,
				}),
			],
		});

		try {
			const block = w.get('[data-test-id="timeline-block"]');
			expect(block.attributes('aria-label')).toContain('Error');
			expect(block.attributes('data-error')).toBe('true');

			await block.trigger('focus');
			await vi.runAllTimersAsync();

			expect(w.get('[data-test-id="timeline-popover-tool-error-badge"]').text()).toBe('Error');
		} finally {
			w.unmount();
			vi.useRealTimers();
		}
	});
});
