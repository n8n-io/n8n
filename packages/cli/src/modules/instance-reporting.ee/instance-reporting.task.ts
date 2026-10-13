import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { InstanceReportingService } from './instance-reporting.service';

@SystemTask()
export class InstanceReportingTask implements SystemTask {
	readonly name = 'instance-reporting';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(15 * Time.minutes.toSeconds);

	readonly target = clusterTarget({
		scheduler: { retryOnFailure: false },
		leaderTimer: { runOnTakeover: true },
	});

	constructor(private readonly reportingService: InstanceReportingService) {}

	async run(): Promise<void> {
		await this.reportingService.sendDueReport(new Date());
	}
}
