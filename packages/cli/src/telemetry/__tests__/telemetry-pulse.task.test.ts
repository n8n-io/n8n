import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import { resolveSystemTaskRunOptions } from '@n8n/decorators';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import { TelemetryPulseTask } from '../telemetry-pulse.task';

describe('TelemetryPulseTask', () => {
	let telemetry = mock<Telemetry>();
	let task = new TelemetryPulseTask(telemetry);

	beforeEach(() => {
		telemetry = mock<Telemetry>();
		task = new TelemetryPulseTask(telemetry);
	});

	it('should send one packet for the whole cluster every 6 hours', () => {
		expect(task.name).toBe('telemetry-pulse');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 21600 });
		expect(task.effects).toBe('non-idempotent');
		expect(task.placement).toEqual({ scope: 'cluster', durable: true });
	});

	it('should keep a missed occurrence for an hour, coalesce a longer backlog and never retry a failed one', () => {
		expect(task.misfireGraceSeconds).toBe(3600);
		expect(resolveSystemTaskRunOptions(task)).toEqual({
			misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
			misfireGraceSeconds: 3600,
			maxAttempts: 1,
		});
	});

	it('should send one pulse packet', async () => {
		await task.run();

		expect(telemetry.sendPulsePacket).toHaveBeenCalledTimes(1);
	});
});
