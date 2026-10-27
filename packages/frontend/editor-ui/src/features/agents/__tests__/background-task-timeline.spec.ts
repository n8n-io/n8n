import { describe, expect, it } from 'vitest';
import type { TimelineItem } from '../session-timeline.types';
import { insertBackgroundTaskTimelineItems } from '../utils/background-task-timeline';

function event(id: string, timestamp: number, kind: TimelineItem['kind'] = 'agent'): TimelineItem {
	return { id, kind, executionId: id, timestamp };
}

function task(id: string, timestamp: number): TimelineItem {
	return event(id, timestamp, 'background-task');
}

describe('insertBackgroundTaskTimelineItems', () => {
	it('preserves nonmonotonic execution order and zero timestamps', () => {
		const executions = [event('first', 30), event('thinking', 0), event('last', 10)];
		const tasks = [task('later', 40), task('earlier', 20)];
		const result = insertBackgroundTaskTimelineItems(executions, tasks);

		expect(result.map((item) => item.id)).toEqual([
			'earlier',
			'first',
			'thinking',
			'last',
			'later',
		]);
		expect(result.filter((item) => item.kind !== 'background-task')).toEqual(executions);
		expect(executions.map((item) => item.timestamp)).toEqual([30, 0, 10]);
		expect(tasks.map((item) => item.id)).toEqual(['later', 'earlier']);
	});

	it('inserts tasks before later events and keeps equal task timestamps stable', () => {
		const result = insertBackgroundTaskTimelineItems(
			[event('zero', 0), event('middle', 10), event('end', 30)],
			[task('second', 20), task('first', 0), task('third', 20), task('equal', 10)],
		);

		expect(result.map((item) => item.id)).toEqual([
			'zero',
			'first',
			'middle',
			'equal',
			'second',
			'third',
			'end',
		]);
	});

	it('skips missing execution timestamps and appends tasks with missing timestamps', () => {
		const missing = event('missing', Number.NaN);
		const result = insertBackgroundTaskTimelineItems(
			[missing, event('valid', 10)],
			[task('unknown', Number.NaN), task('known', 0), task('infinite', Infinity)],
		);

		expect(result.map((item) => item.id)).toEqual([
			'missing',
			'known',
			'valid',
			'unknown',
			'infinite',
		]);
		expect(result[0]).toBe(missing);
	});

	it('handles empty inputs', () => {
		const execution = event('execution', 0);
		const earlier = task('earlier', 0);
		const later = task('later', 10);

		expect(insertBackgroundTaskTimelineItems([], [])).toEqual([]);
		expect(insertBackgroundTaskTimelineItems([execution], [])).toEqual([execution]);
		expect(insertBackgroundTaskTimelineItems([], [later, earlier])).toEqual([earlier, later]);
	});
});
