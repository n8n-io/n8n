import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import type { License } from '@/license';

import { LicenseRenewalTask } from '../license-renewal.task';

describe('LicenseRenewalTask', () => {
	let license = mock<License>();
	let task = new LicenseRenewalTask(license);

	beforeEach(() => {
		license = mock<License>();
		task = new LicenseRenewalTask(license);
	});

	it('should declare the SDK renewal check cadence', () => {
		expect(task.name).toBe('license-renewal');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 900 });
		expect(task.effects).toBe('non-idempotent');
		expect(task.misfirePolicy).toBe(ScheduledJobMisfirePolicy.Coalesce);
		expect(task.misfireGraceSeconds).toBe(300);
		expect(task.placement).toEqual({ scope: 'cluster', durable: true, runOnTakeover: true });
	});

	it('should run one renewal pass', async () => {
		await task.run();

		expect(license.renewIfDue).toHaveBeenCalledTimes(1);
	});
});
