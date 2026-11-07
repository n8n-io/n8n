import { mock } from 'vitest-mock-extended';

import type { InstanceMonitoringReportRepository } from '../database/repositories/instance-monitoring-report.repository';
import { InstanceReportingController } from '../instance-reporting.controller';

const LAST_DELIVERY = new Date('2026-03-25T07:42:13.000Z');

describe('InstanceReportingController', () => {
	describe('getStatus()', () => {
		it('reports when the receiver last accepted a report', async () => {
			const reportRepository = mock<InstanceMonitoringReportRepository>();
			reportRepository.findLastDeliveryTime.mockResolvedValue(LAST_DELIVERY);

			const status = await new InstanceReportingController(reportRepository).getStatus();

			expect(status).toEqual({ lastSuccessfulReport: LAST_DELIVERY.toISOString() });
		});

		it('reports a null last delivery until the receiver accepts a report', async () => {
			const reportRepository = mock<InstanceMonitoringReportRepository>();
			reportRepository.findLastDeliveryTime.mockResolvedValue(null);

			const status = await new InstanceReportingController(reportRepository).getStatus();

			expect(status).toEqual({ lastSuccessfulReport: null });
		});
	});
});
