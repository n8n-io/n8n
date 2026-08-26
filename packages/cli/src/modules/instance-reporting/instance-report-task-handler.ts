import type { ClaimedTask, DispatchDecision, DispatchReporter, TaskHandler } from '@n8n/scheduler';

import { INSTANCE_REPORT_TASK_TYPE } from './instance-reporting.constants';
import type { InstanceReportingService } from './instance-reporting.service';

/**
 * Turns a due occurrence of the daily reporting job into one delivered instance
 * report. The occurrence itself carries nothing the report needs: which day is
 * covered follows from when the report is generated, so the handler only has to
 * fire the send and map its outcome.
 *
 * Not a DI service: it is a thin adapter the reporting service constructs for
 * itself, which also keeps the two from forming a dependency cycle.
 */
export class InstanceReportTaskHandler implements TaskHandler {
	readonly taskType = INSTANCE_REPORT_TASK_TYPE;

	constructor(private readonly instanceReportingService: InstanceReportingService) {}

	async execute(_task: ClaimedTask, report: DispatchReporter): Promise<DispatchDecision> {
		await this.instanceReportingService.sendReport();

		return report.dispatched();
	}
}
