import type { RetiredTask } from '@n8n/scheduler';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

import { SystemTaskOverlapReporter } from '../system-task-overlap-reporter';

describe('SystemTaskOverlapReporter', () => {
	const occurrence = (taskType: string, id = '1'): RetiredTask => ({
		id,
		jobId: 3,
		taskType,
	});

	const setup = () => {
		const eventService = mock<EventService>();
		return { eventService, reporter: new SystemTaskOverlapReporter(eventService) };
	};

	it('reports one overlap skip for each occurrence, named after its task', () => {
		const { eventService, reporter } = setup();

		reporter.report([
			occurrence('system:prune-executions', '1'),
			occurrence('system:prune-executions', '2'),
		]);

		expect(eventService.emit).toHaveBeenCalledTimes(2);
		expect(eventService.emit).toHaveBeenCalledWith('system-task-run-skipped', {
			name: 'prune-executions',
			reason: 'overlap',
		});
	});

	it('ignores an occurrence that is not a system task', () => {
		const { eventService, reporter } = setup();

		reporter.report([occurrence('schedule-trigger')]);

		expect(eventService.emit).not.toHaveBeenCalled();
	});

	it('keeps reporting when a listener throws', () => {
		const { eventService, reporter } = setup();
		eventService.emit.mockImplementationOnce(() => {
			throw new Error('sink down');
		});

		expect(() =>
			reporter.report([
				occurrence('system:prune-executions', '1'),
				occurrence('system:prune-executions', '2'),
			]),
		).not.toThrow();
		expect(eventService.emit).toHaveBeenCalledTimes(2);
	});
});
