import type { ClaimedTask, DispatchDecision, DispatchReporter } from '@n8n/scheduler';
import { mock } from 'vitest-mock-extended';

import { InstanceReportTaskHandler } from '../instance-report-task-handler';
import type { InstanceReportingService } from '../instance-reporting.service';

const DISPATCHED = 'dispatched' as unknown as DispatchDecision;

function makeReporter(): DispatchReporter {
	const reporter = mock<DispatchReporter>();
	reporter.dispatched.mockReturnValue(DISPATCHED);
	return reporter;
}

const TASK = mock<ClaimedTask>({ id: 'task-1', jobId: 1 });

describe('InstanceReportTaskHandler', () => {
	test('sends a report and reports the dispatch', async () => {
		const service = mock<InstanceReportingService>();
		const handler = new InstanceReportTaskHandler(service);

		await expect(handler.execute(TASK, makeReporter())).resolves.toBe(DISPATCHED);

		expect(service.sendReport).toHaveBeenCalledTimes(1);
	});

	test('lets a delivery failure through so the scheduler retries it', async () => {
		const service = mock<InstanceReportingService>();
		service.sendReport.mockRejectedValue(new Error('Network error'));
		const handler = new InstanceReportTaskHandler(service);

		await expect(handler.execute(TASK, makeReporter())).rejects.toThrow('Network error');
	});
});
