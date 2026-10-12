import type { InstanceReportingStatus } from '@n8n/api-types';
import { Get, RestController } from '@n8n/decorators';

import { InstanceMonitoringReportRepository } from './database/repositories/instance-monitoring-report.repository';

@RestController('/instance-reporting')
export class InstanceReportingController {
	constructor(private readonly reportRepository: InstanceMonitoringReportRepository) {}

	@Get('/status')
	async getStatus(): Promise<InstanceReportingStatus> {
		const lastDelivery = await this.reportRepository.findLastDeliveryTime();

		return { lastSuccessfulReport: lastDelivery?.toISOString() ?? null };
	}
}
