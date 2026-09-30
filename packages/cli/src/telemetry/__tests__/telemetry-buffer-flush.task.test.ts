import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import { TelemetryBufferFlushTask } from '../telemetry-buffer-flush.task';

describe('TelemetryBufferFlushTask', () => {
	let telemetry = mock<Telemetry>();
	let task = new TelemetryBufferFlushTask(telemetry);

	beforeEach(() => {
		telemetry = mock<Telemetry>();
		task = new TelemetryBufferFlushTask(telemetry);
	});

	it('should flush in every kind of instance every 6 hours', () => {
		expect(task.name).toBe('telemetry-buffer-flush');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 21600 });
		expect(task.effects).toBe('non-idempotent');
		expect(task.placement).toEqual({
			scope: 'instance',
			instanceTypes: ['main', 'worker', 'webhook'],
		});
	});

	it('should flush the buffers of its own process', async () => {
		await task.run();

		expect(telemetry.flushBuffers).toHaveBeenCalledTimes(1);
	});
});
