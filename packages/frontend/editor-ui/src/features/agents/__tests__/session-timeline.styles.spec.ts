import { describe, expect, it } from 'vitest';
import { chartBlockStyleForItem, timelineColors } from '../session-timeline.styles';
import type { EventKind, TimelineItem } from '../session-timeline.types';

function item(overrides: Partial<TimelineItem>): TimelineItem {
	return { kind: 'tool', executionId: 'e1', timestamp: 0, ...overrides };
}

describe('timelineColors', () => {
	it.each([
		['user', 'blue', 'blue'],
		['agent', 'purple', 'purple'],
		['skill', 'neutral', 'orange'],
		['tool', 'neutral', 'green'],
		['memory', 'neutral', 'yellow'],
		['node', 'neutral', 'neutral'],
		['workflow', 'neutral', 'pink'],
		['suspension', 'neutral', 'yellow'],
		['hitl-response', 'neutral', 'blue'],
		['background-task-signal', 'neutral', 'mint'],
		['background-task', 'neutral', 'mint'],
	] satisfies Array<[EventKind, string, string]>)(
		'uses the chart policy and keeps the pill palette for %s',
		(kind, chartFamily, pillFamily) => {
			const colors = timelineColors(kind);
			expect(colors.chart).toBe(`var(--color--${chartFamily}-600)`);
			expect(colors.pill).toEqual({
				backgroundColor: `var(--color--${pillFamily}-200)`,
				color: `var(--color--${pillFamily}-950)`,
			});
			expect(chartBlockStyleForItem(item({ kind }))).toEqual({
				'--session-timeline-chart-block-color': colors.chart,
			});
		},
	);

	it('keeps status swatches green, neutral, and red', () => {
		expect(timelineColors('approved').chart).toBe('var(--color--green-600)');
		expect(timelineColors('declined').chart).toBe('var(--color--neutral-600)');
		expect(timelineColors('error').chart).toBe(timelineColors('execution-error').chart);
		expect(timelineColors('error').chart).toBe('var(--color--red-600)');
		expect(timelineColors('execution-error').pill).toEqual({
			backgroundColor: 'var(--color--red-150)',
			color: 'var(--text-color--danger)',
		});
	});

	it('keeps idle and sub-agent pill colors', () => {
		expect(timelineColors('idle').pill).toEqual(timelineColors('suspension').pill);
		expect(timelineColors('subagent').pill).toEqual(timelineColors('background-task-signal').pill);
	});

	it('keeps the tool group neutral but colors individual sub-agents mint', () => {
		expect(timelineColors('tool').chart).toBe('var(--color--neutral-600)');
		expect(chartBlockStyleForItem(item({ toolName: 'delegate_subagent' }))).toEqual({
			'--session-timeline-chart-block-color': 'var(--color--mint-600)',
		});
	});

	it.each([
		{ toolOutcome: 'error' },
		{ toolSuccess: false },
		{ toolOutput: { isError: true } },
		{ toolName: 'delegate_subagent', toolOutput: { status: 'failed' } },
		{ kind: 'execution-error' },
	] satisfies Array<Partial<TimelineItem>>)(
		'gives errors priority over event colors: %j',
		(overrides) => {
			expect(chartBlockStyleForItem(item(overrides))).toEqual({
				'--session-timeline-chart-block-color': timelineColors('error').chart,
			});
		},
	);
});
