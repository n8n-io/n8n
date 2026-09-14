import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Reports this instance's billable execution numbers to a central monitoring
 * receiver, once a day.
 *
 * Opt-in: not a default module, so it runs only when an operator lists it in
 * `N8N_ENABLED_MODULES`. Main-only, and within a multi-main deployment only the
 * leader holds the timer, so a cluster reports once rather than once per main.
 *
 * The daily figure comes from the insights module, but the receiver only sees
 * data points, so that source is an implementation detail of
 * `InstanceReportingService` rather than part of the reporting contract.
 */
@BackendModule({ name: 'instance-reporting', instanceTypes: ['main'] })
export class InstanceReportingModule implements ModuleInterface {
	async init() {
		const { InstanceReportingScheduler } = await import(
			'./instance-reporting-scheduler.service.js'
		);

		await Container.get(InstanceReportingScheduler).init();
	}

	async entities() {
		const { InstanceMonitoringReport } = await import(
			'./database/entities/instance-monitoring-report.js'
		);

		return [InstanceMonitoringReport];
	}
}
