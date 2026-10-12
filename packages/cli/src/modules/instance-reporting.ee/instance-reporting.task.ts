import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { InstanceReportingService } from './instance-reporting.service';

@SystemTask()
export class InstanceReportingTask implements SystemTask {
	readonly name = 'instance-reporting';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(15 * Time.minutes.toSeconds);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: true,
		runOnTakeover: true,
	};

	readonly maxAttempts = 1;

	constructor(private readonly reportingService: InstanceReportingService) {}

	async run(): Promise<void> {
		await this.reportingService.sendDueReport(new Date());
	}
}
