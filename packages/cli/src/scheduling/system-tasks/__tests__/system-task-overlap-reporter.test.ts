import type { RetiredTask } from '@n8n/scheduler';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

import { reportSystemTaskOverlaps } from '../system-task-overlap-reporter';

describe('reportSystemTaskOverlaps', () => {
	const occurrence = (taskType: string, id = '1'): RetiredTask => ({
		id,
		jobId: 3,
		taskType,
	});

	it('reports one overlap skip for each task, counting its occurrences', () => {
		const eventService = mock<EventService>();

		reportSystemTaskOverlaps(eventService, [
			occurrence('system:prune-executions', '1'),
			occurrence('system:prune-executions', '2'),
			occurrence('system:prune-insights', '3'),
		]);

		expect(eventService.emit).toHaveBeenCalledTimes(2);
		expect(eventService.emit).toHaveBeenCalledWith('system-task-run-skipped', {
			name: 'prune-executions',
			reason: 'overlap',
			count: 2,
		});
		expect(eventService.emit).toHaveBeenCalledWith('system-task-run-skipped', {
			name: 'prune-insights',
			reason: 'overlap',
			count: 1,
		});
	});

	it('ignores an occurrence that is not a system task', () => {
		const eventService = mock<EventService>();

		reportSystemTaskOverlaps(eventService, [occurrence('schedule-trigger')]);

		expect(eventService.emit).not.toHaveBeenCalled();
	});

	it('keeps reporting when a listener throws', () => {
		const eventService = mock<EventService>();
		eventService.emit.mockImplementationOnce(() => {
			throw new Error('sink down');
		});

		expect(() =>
			reportSystemTaskOverlaps(eventService, [
				occurrence('system:prune-executions', '1'),
				occurrence('system:prune-insights', '2'),
			]),
		).not.toThrow();
		expect(eventService.emit).toHaveBeenCalledTimes(2);
	});
});
