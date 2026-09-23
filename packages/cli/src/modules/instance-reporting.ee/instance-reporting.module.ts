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

		const logger = Container.get(Logger).scoped('instance-reporting');

		if (!(await this.hasReceiver())) {
			logger.warn(
				'Instance reporting is enabled but N8N_INSTANCE_REPORTING_BASE_URL is unset, so no reports will be sent',
			);
			return;
		}

		if (!(await this.hasCredential())) {
			logger.warn(
				'Instance reporting is enabled but this instance has no license certificate, so no reports will be sent. The receiver accepts reports only from licensed instances. Set N8N_LICENSE_CERT, activate a license, or set N8N_INSTANCE_REPORTING_AUTH_TOKEN.',
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
	 * Return values:
	 * { enabled: false } - module loaded but no receiver configured, or neither an auth token nor a license certificate
	 * { enabled: true, reportTime: 'HH:mm' } - module loaded, receiver configured, credential present
	 *
	 * Built once at startup and cached for the process lifetime.
	 **/
	async settings() {
		if (!(await this.isConfigured())) return { enabled: false };

		const { InstanceReportingSettingsService } = await import(
			'./instance-reporting-settings.service.js'
		);

		const reportTime = await Container.get(InstanceReportingSettingsService).getReportTime();

		return { enabled: true, reportTime };
	}

	async entities() {
		const { InstanceMonitoringReport } = await import(
			'./database/entities/instance-monitoring-report.js'
		);

		return [InstanceMonitoringReport];
	}

	/** Whether reports are actually sent: a receiver is configured and there is a credential to authenticate with. */
	private async isConfigured(): Promise<boolean> {
		return (await this.hasReceiver()) && (await this.hasCredential());
	}

	private async hasReceiver(): Promise<boolean> {
		const { InstanceReportingConfig } = await import('./instance-reporting.config.js');

		return Container.get(InstanceReportingConfig).instanceReportingBaseUrl !== '';
	}

	/**
	 * A configured auth token is a credential on its own. Without one, the
	 * license certificate is the credential the receiver checks, so an
	 * unlicensed (community) instance cannot report.
	 */
	private async hasCredential(): Promise<boolean> {
		const { InstanceReportingConfig } = await import('./instance-reporting.config.js');
		if (Container.get(InstanceReportingConfig).instanceReportingAuthToken !== '') return true;

		const { License } = await import('@/license.js');

		return (await Container.get(License).loadCertStr()) !== '';
	}
}
