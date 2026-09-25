import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { EventBusUnsentMessageFlushTask } from '../event-bus-unsent-message-flush.task';
import type { MessageEventBus } from '../message-event-bus';

describe('EventBusUnsentMessageFlushTask', () => {
	const config = mock<GlobalConfig>({ eventBus: { checkUnsentInterval: 30_000 } });
	let eventBus = mock<MessageEventBus>();
	let task = new EventBusUnsentMessageFlushTask(config, eventBus);

	beforeEach(() => {
		eventBus = mock<MessageEventBus>();
		task = new EventBusUnsentMessageFlushTask(config, eventBus);
	});

	it('should retry in every kind of instance at the configured interval', () => {
		expect(task.name).toBe('event-bus-unsent-message-flush');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 30 });
		expect(task.effects).toBe('non-idempotent');
		expect(task.placement).toEqual({
			scope: 'instance',
			instanceTypes: ['main', 'worker', 'webhook'],
		});
	});

	it('should keep a sub-second interval', () => {
		const subSecondTask = new EventBusUnsentMessageFlushTask(
			mock<GlobalConfig>({ eventBus: { checkUnsentInterval: 500 } }),
			eventBus,
		);

		expect(subSecondTask.schedule).toEqual({ kind: 'interval', intervalSeconds: 0.5 });
	});

	it('should send again the unsent messages of its own process', async () => {
		await task.run();

		expect(eventBus.trySendingUnsent).toHaveBeenCalledTimes(1);
	});
});
