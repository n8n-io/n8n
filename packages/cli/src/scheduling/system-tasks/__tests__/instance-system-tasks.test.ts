import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { EventBusUnsentMessageFlushTask } from '@/eventbus/message-event-bus/event-bus-unsent-message-flush.task';
import { TelemetryBufferFlushTask } from '@/telemetry/telemetry-buffer-flush.task';

import { instanceSystemTasks } from '../instance-system-tasks';

const configWith = ({ diagnosticsEnabled = true, checkUnsentInterval = 0 } = {}) =>
	mock<GlobalConfig>({
		diagnostics: { enabled: diagnosticsEnabled },
		eventBus: { checkUnsentInterval },
	});

it('should return the telemetry buffer flush when diagnostics are on', async () => {
	const tasks = await instanceSystemTasks(configWith());

	expect(tasks).toEqual([TelemetryBufferFlushTask]);
});

it('should return the event bus unsent message flush when its interval is set', async () => {
	const tasks = await instanceSystemTasks(
		configWith({ diagnosticsEnabled: false, checkUnsentInterval: 5000 }),
	);

	expect(tasks).toEqual([EventBusUnsentMessageFlushTask]);
});

it('should return nothing when diagnostics are off and the unsent interval is 0', async () => {
	const tasks = await instanceSystemTasks(configWith({ diagnosticsEnabled: false }));

	expect(tasks).toEqual([]);
});
