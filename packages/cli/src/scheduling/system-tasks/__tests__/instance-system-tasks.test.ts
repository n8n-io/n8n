import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { TelemetryBufferFlushTask } from '@/telemetry/telemetry-buffer-flush.task';

import { instanceSystemTasks } from '../instance-system-tasks';

const configWith = ({ diagnosticsEnabled = true } = {}) =>
	mock<GlobalConfig>({ diagnostics: { enabled: diagnosticsEnabled } });

it('should return the telemetry buffer flush when diagnostics are on', async () => {
	const tasks = await instanceSystemTasks(configWith());

	expect(tasks).toEqual([TelemetryBufferFlushTask]);
});

it('should return nothing when diagnostics are off', async () => {
	const tasks = await instanceSystemTasks(configWith({ diagnosticsEnabled: false }));

	expect(tasks).toEqual([]);
});
