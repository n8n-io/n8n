import type { SystemTask } from '@n8n/decorators';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

import { observeSystemTaskRun } from '../system-task-run-observer';

describe('observeSystemTaskRun', () => {
	it('settles a run that throws synchronously as a failure, rather than rejecting', async () => {
		const eventService = mock<EventService>();
		const error = new Error('failed');
		const task: Pick<SystemTask, 'name' | 'run'> = {
			name: 'dummy',
			// A `run` that is not declared `async`, which the interface accepts.
			run: () => {
				throw error;
			},
		};

		const outcome = await observeSystemTaskRun(
			eventService,
			task,
			'in_memory',
			new AbortController().signal,
		);

		expect(outcome).toEqual({ result: 'failure', rejected: true, error });
		expect(eventService.emit).toHaveBeenCalledWith(
			'system-task-run-settled',
			expect.objectContaining({ name: 'dummy', mode: 'in_memory', result: 'failure' }),
		);
	});
});
