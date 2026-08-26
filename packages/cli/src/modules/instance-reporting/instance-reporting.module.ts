import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Reports this instance's billable execution numbers to a central monitoring
 * receiver, once a day.
 *
 * Opt-in: not a default module, so it runs only when an operator lists it in
 * `N8N_ENABLED_MODULES`. Main-only, because the report goes out as a durable
 * scheduler job and the scheduler's loops run on mains.
 *
 * Today the daily figure comes from the insights module, but that is an
 * implementation detail of `InstanceReportingService` rather than of the
 * reporting contract — the receiver only sees data points, so the source can be
 * swapped without touching anything else here.
 */
@BackendModule({ name: 'instance-reporting', instanceTypes: ['main'] })
export class InstanceReportingModule implements ModuleInterface {
	async init() {
		const { InstanceReportingService } = await import('./instance-reporting.service.js');

		await Container.get(InstanceReportingService).init();
	}

	async entities() {
		const { CentralInstanceMonitoringReport } = await import(
			'./database/entities/central-instance-monitoring-report.js'
		);

		return [CentralInstanceMonitoringReport];
	}
}
