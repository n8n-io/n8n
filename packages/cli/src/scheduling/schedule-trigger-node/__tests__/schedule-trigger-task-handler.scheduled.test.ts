import { ScheduledMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ScheduleTriggerTaskHandler } from '../schedule-trigger-task-handler';
import { SCHEDULE_TRIGGER_TASK_TYPE } from '../schedule-trigger-task';

// Importing the handler above fires its @Scheduled decorator, which registers
// into the container's ScheduledMetadata singleton at load time.
describe('ScheduleTriggerTaskHandler @Scheduled registration', () => {
	test('registers the schedule-trigger task type via the decorator, scoped to main', () => {
		const entry = Container.get(ScheduledMetadata)
			.getHandlers()
			.find((h) => h.taskType === SCHEDULE_TRIGGER_TASK_TYPE);

		expect(entry).toBeDefined();
		expect(entry).toMatchObject({
			handlerClass: ScheduleTriggerTaskHandler,
			methodName: 'execute',
			instanceTypes: ['main'],
		});
	});
});
