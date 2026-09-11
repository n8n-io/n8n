import { Logger, ModulesConfig } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';

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
		// Imported before the receiver check, so the route exists whenever the
		// module is loaded. The client gates off `enabled` in the module settings.
		await import('./instance-reporting.controller.js');

		// The daily figure is read from insights, so the reporter cannot run without it.
		if (Container.get(ModulesConfig).disabledModules.includes('insights')) {
			throw new UserError(
				'The `instance-reporting` module requires the `insights` module, but it is listed in N8N_DISABLED_MODULES. Remove `insights` from N8N_DISABLED_MODULES or remove `instance-reporting` from N8N_ENABLED_MODULES.',
			);
		}

		if (!(await this.isConfigured())) {
			Container.get(Logger)
				.scoped('instance-reporting')
				.warn(
					'Instance reporting is enabled but N8N_INSTANCE_REPORTING_BASE_URL is unset, so no reports will be sent',
				);
			return;
		}

		const { InstanceReportingScheduler } = await import(
			'./instance-reporting-scheduler.service.js'
		);

		Container.get(InstanceReportingScheduler).init();
	}

	/**
	 * Settings exposed to the frontend under `/rest/module-settings`.
	 *
	 * The response shape is `{ enabled: boolean, reportTime?: string }`. A
	 * consumer reads the three states as: key absent, so the module is not
	 * enabled on this instance; `enabled: false`, so it is loaded but has no
	 * receiver; `enabled: true`, so it reports daily at `reportTime`.
	 *
	 * These settings are built once, at startup, and served from a cache after
	 * that, so only values fixed for the process lifetime belong here. For the
	 * last delivery time, which moves while the process runs, read
	 * `GET /rest/instance-reporting/status`.
	 */
	async settings() {
		if (!(await this.isConfigured())) return { enabled: false };

		const { InstanceReportingSettingsService } = await import(
			'./instance-reporting-settings.service.js'
		);

		// Resolved on every main, not only the leader. The claim is conditional
		// and the compaction heal is derived from the stored value, so concurrent
		// mains settle on one time.
		const reportTime = await Container.get(InstanceReportingSettingsService).getReportTime();

		return { enabled: true, reportTime };
	}

	async entities() {
		const { InstanceMonitoringReport } = await import(
			'./database/entities/instance-monitoring-report.js'
		);

		return [InstanceMonitoringReport];
	}

	/** Whether a receiver is configured, i.e. whether reports are actually sent. */
	private async isConfigured(): Promise<boolean> {
		const { InstanceReportingConfig } = await import('./instance-reporting.config.js');

		return Container.get(InstanceReportingConfig).instanceReportingBaseUrl !== '';
	}
}
