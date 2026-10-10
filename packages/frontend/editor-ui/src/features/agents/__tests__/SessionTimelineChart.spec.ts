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

	it('renders a synthetic execution error as a danger block', () => {
		const w = mountChart({
			items: [
				item({
					kind: 'execution-error',
					executionStatus: 'error',
					content: 'Model request failed',
					timestamp: 1000,
				}),
			],
		});
		const block = w.get('[data-test-id="timeline-block"]');

		expect(block.attributes('data-error')).toBe('true');
		expect(block.attributes('style')).toContain('var(--color--red-600)');
	});

	it('renders only event cells across a gap between events', () => {
		const w = mountChart();
		expect(w.findAll('[data-test-id="timeline-cell"]')).toHaveLength(3);
		expect(w.findAll('[data-test-id="timeline-idle"]')).toHaveLength(0);
	});

	it('scrolls a selected block into view without adding a selected marker', async () => {
		const w = mountChart();
		try {
			const blocks = w.findAll('[data-test-id="timeline-block"]');
			const chart = w.get('[data-test-id="timeline-cell"]').element.parentElement;
			if (!chart) throw new Error('Chart container is missing');
			Object.defineProperty(chart, 'clientWidth', { configurable: true, value: 200 });
			Object.defineProperty(blocks[2].element, 'offsetLeft', { configurable: true, value: 300 });
			Object.defineProperty(blocks[2].element, 'offsetWidth', { configurable: true, value: 50 });

			await w.setProps({ selectedIndex: 2 });
			await w.vm.$nextTick();

			expect(chart.scrollLeft).toBe(198);
			for (const block of blocks) {
				expect(block.attributes('data-selected')).toBeUndefined();
			}
		} finally {
			w.unmount();
		}
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
		expect(block.attributes('style')).toContain('var(--color--red-600)');
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
		expect(block.attributes('style')).toContain('var(--color--red-600)');
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
			await vi.advanceTimersByTimeAsync(99);
			expect(hoverCard.attributes('data-open')).toBe('true');
			await vi.advanceTimersByTimeAsync(1);
			expect(hoverCard.attributes('data-open')).toBe('false');
			expect(hoverCard.text()).not.toContain('Keyboard details');
		} finally {
			w.unmount();
			vi.useRealTimers();
		}
	});

	it('opens after 300ms and closes 100ms after mouseleave', async () => {
		vi.useFakeTimers();
		const w = mountChart();
		try {
			const block = w.get('[data-test-id="timeline-block"]');
			const hoverCard = w.get('[data-test-id="timeline-hover-card"]');

			await block.trigger('mouseenter');
			await vi.advanceTimersByTimeAsync(299);
			expect(hoverCard.attributes('data-open')).toBe('false');
			await vi.advanceTimersByTimeAsync(1);
			expect(hoverCard.attributes('data-open')).toBe('true');

			await block.trigger('mouseleave');
			await vi.advanceTimersByTimeAsync(99);
			expect(hoverCard.attributes('data-open')).toBe('true');
			await vi.advanceTimersByTimeAsync(1);
			expect(hoverCard.attributes('data-open')).toBe('false');
			expect(hoverCard.text()).toBe('');
		} finally {
			w.unmount();
			vi.useRealTimers();
		}
	});

	it('cancels opening when the pointer leaves before 300ms', async () => {
		vi.useFakeTimers();
		const w = mountChart();
		try {
			const block = w.get('[data-test-id="timeline-block"]');
			await block.trigger('mouseenter');
			await vi.advanceTimersByTimeAsync(299);
			await block.trigger('mouseleave');
			await vi.runAllTimersAsync();

			expect(w.get('[data-test-id="timeline-hover-card"]').attributes('data-open')).toBe('false');
		} finally {
			w.unmount();
			vi.useRealTimers();
		}
	});

	it.each([
		['another cell', 1, 'Second details'],
		['the same cell', 0, 'First details'],
	])(
		'keeps the card open when the pointer enters %s during the close delay',
		async (_, index, content) => {
			vi.useFakeTimers();
			const w = mountChart({
				items: [
					item({ content: 'First details' }),
					item({ content: 'Second details', timestamp: 1000 }),
				],
			});
			try {
				const blocks = w.findAll('[data-test-id="timeline-block"]');
				const hoverCard = w.get('[data-test-id="timeline-hover-card"]');
				await blocks[0].trigger('mouseenter');
				await vi.advanceTimersByTimeAsync(300);
				await blocks[0].trigger('mouseleave');
				await vi.advanceTimersByTimeAsync(50);
				await blocks[index].trigger('mouseenter');

				expect(hoverCard.attributes('data-open')).toBe('true');
				expect(hoverCard.text()).toContain(content);
				await vi.advanceTimersByTimeAsync(300);
				expect(hoverCard.attributes('data-open')).toBe('true');
				expect(hoverCard.text()).toContain(content);
			} finally {
				w.unmount();
				vi.useRealTimers();
			}
		},
	);

	it.each(['opening', 'closing'])('clears the pending %s timer on unmount', async (phase) => {
		vi.useFakeTimers();
		const w = mountChart();
		try {
			const block = w.get('[data-test-id="timeline-block"]');
			await block.trigger('mouseenter');
			if (phase === 'closing') {
				await vi.advanceTimersByTimeAsync(300);
				await block.trigger('mouseleave');
			}

			const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
			try {
				w.unmount();
				expect(clearTimeoutSpy).toHaveBeenCalled();
			} finally {
				clearTimeoutSpy.mockRestore();
			}
		} finally {
			w.unmount();
			vi.useRealTimers();
		}
	});

	it.each(['tool', 'workflow'] as const)(
		'renders a successful %s block with a neutral color',
		(kind) => {
			const w = mountChart({ items: [item({ kind, toolOutcome: 'success' })] });
			try {
				expect(w.get('[data-test-id="timeline-block"]').attributes('style')).toContain(
					'var(--color--neutral-600)',
				);
			} finally {
				w.unmount();
			}
		},
	);

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

	it('shows the skill label and name in the block details', async () => {
		vi.useFakeTimers();
		const w = mountChart({
			items: [item({ kind: 'skill', skillName: 'Triage', timestamp: 1000, endTimestamp: 1200 })],
		});

		try {
			const block = w.get('[data-test-id="timeline-block"]');
			expect(block.attributes('aria-label')).toContain('Skill');
			expect(block.attributes('aria-label')).toContain('Triage');

			await block.trigger('focus');
			await vi.runAllTimersAsync();

			expect(w.get('[data-test-id="timeline-hover-card"]').text()).toContain('Triage');
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

it('shows the signal label and task status in the chart popover', async () => {
	vi.useFakeTimers();
	const wrapper = mountChart({
		items: [
			item({
				kind: 'background-task-signal',
				timestamp: 1000,
				backgroundJobSignal: {
					tasks: [{ id: 'job-1', title: 'Check invoices', kind: 'subagent', status: 'failed' }],
				},
			}),
		],
	});
	try {
		await wrapper.get('[data-test-id="timeline-block"]').trigger('focus');
		await vi.runAllTimersAsync();
		expect(wrapper.get('[data-test-id="timeline-hover-card"]').attributes('data-open')).toBe(
			'true',
		);
		expect(wrapper.text()).toContain('Background task results received');
		expect(wrapper.text()).toContain('Check invoices — Failed');
	} finally {
		wrapper.unmount();
		vi.useRealTimers();
	}
});
