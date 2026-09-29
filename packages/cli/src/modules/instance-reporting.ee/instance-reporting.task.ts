import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import {
	InstanceReportAlreadyCreatedError,
	InstanceReportingService,
} from './instance-reporting.service';

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
		const { expiredReport, reportDue } = await this.reportingService.findDueWork(new Date());

		if (expiredReport) {
			await this.reportingService.skip(
				expiredReport.id,
				expiredReport.attempts,
				'slot-passed',
				expiredReport.lastError,
			);
		}
		if (reportDue) {
			await this.sendReport();
		}
	}

	private async sendReport(): Promise<void> {
		try {
			await this.reportingService.sendReport();
		} catch (error) {
			// A concurrent pass created the row. A later pass can resume that same batch.
			if (!(error instanceof InstanceReportAlreadyCreatedError)) {
				throw error;
			}
		}
	}
}
